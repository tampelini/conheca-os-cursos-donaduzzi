import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from '../App';
import * as db from '../services/db';
import { __resetDBForTests, getAllGames } from '../services/db';
import { DEFAULT_MASSA_CONFIG, DEFAULT_MASSA_EVENTS, DEFAULT_MASSA_SURVEYS } from '../massa/defaults';
import {
  __resetMassaForTests, anonymizeParticipant, filterParticipants, listParticipants, loadMassa, participantsToCsv, phoneAlreadyInEvent, resolveActive,
  saveMassaConfig, saveMassaEvents, saveMassaSurveys, submitParticipation, totalsByQuestion, totalsToCsv, DuplicatePhoneError,
} from '../massa/store';
import { maskPhone, nameError, normalizePhone, phoneError } from '../massa/validation';
import type { MassaDraftAnswers } from '../massa/types';

const NAME = 'Maria Aparecida Souza';
const PHONE = '45999887766';

beforeEach(async () => {
  await __resetDBForTests();
  __resetMassaForTests();
  window.location.hash = '#/massa';
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function renderMassa() {
  const utils = render(<App />);
  await screen.findByRole('button', { name: 'COMEÇAR' });
  await waitFor(() => expect(screen.getByRole('button', { name: 'COMEÇAR' })).toBeEnabled());
  return utils;
}

async function identify(name = NAME, phone = PHONE) {
  fireEvent.click(screen.getByRole('button', { name: 'COMEÇAR' }));
  fireEvent.change(await screen.findByLabelText('Nome completo'), { target: { value: name } });
  fireEvent.change(screen.getByLabelText(/Telefone com DDD/), { target: { value: phone } });
  fireEvent.click(screen.getByRole('button', { name: 'CONTINUAR' }));
}

/** Responde as perguntas de escolha única tocando na alternativa informada (ou na primeira). */
async function answerQuestions(total: number, pick: string[] = []) {
  for (let i = 1; i <= total; i++) {
    await screen.findByText(`Pergunta ${i} de ${total}`);
    const group = screen.getByRole('radiogroup');
    const option = pick[i - 1] ? within(group).getByRole('radio', { name: pick[i - 1] }) : within(group).getAllByRole('radio')[0];
    fireEvent.click(option);
    fireEvent.click(screen.getByRole('button', { name: 'CONTINUAR' }));
  }
}

async function participate(name = NAME, phone = PHONE, pick: string[] = [], marketing = false) {
  await identify(name, phone);
  await answerQuestions(3, pick);
  fireEvent.click(await screen.findByTestId('massa-consent'));
  if (marketing) fireEvent.click(screen.getByTestId('massa-marketing'));
  fireEvent.click(screen.getByRole('button', { name: 'FINALIZAR' }));
  await screen.findByText('Obrigado por participar!');
}

describe('telefone e nome', () => {
  it('aplica a máscara de telefone brasileiro', () => {
    expect(maskPhone('4')).toBe('(4');
    expect(maskPhone('4599')).toBe('(45) 99');
    expect(maskPhone('4532771234')).toBe('(45) 3277-1234');
    expect(maskPhone('45999887766')).toBe('(45) 99988-7766');
    expect(maskPhone('+55 (45) 99988-7766')).toBe('(45) 99988-7766');
    expect(normalizePhone('045 99988-7766 123')).toBe('45999887766');
  });

  it('valida DDD, tamanho e formato', () => {
    expect(phoneError('')).toMatch(/Informe/);
    expect(phoneError('459998877')).toMatch(/incompleto/);
    expect(phoneError('05999887766')).toMatch(/DDD/);
    expect(phoneError('10999887766')).toMatch(/DDD/);
    expect(phoneError('45899887766')).toMatch(/começar com 9/);
    expect(phoneError('4599887766')).toMatch(/inválido/);
    expect(phoneError('45999999999')).toMatch(/inválido/);
    expect(phoneError('45999887766')).toBeNull();
    expect(phoneError('(45) 3277-1234')).toBeNull();
  });

  it('exige nome e sobrenome', () => {
    expect(nameError('')).toMatch(/Informe/);
    expect(nameError('Maria')).toMatch(/sobrenome/);
    expect(nameError('Maria S')).toMatch(/sobrenome/);
    expect(nameError('Maria 123')).toMatch(/letras/);
    expect(nameError("  João  d'Ávila Conceição ")).toBeNull();
  });
});

describe('totem: fluxo do participante', () => {
  it('mostra a tela inicial com o logotipo oficial da rádio e o rodapé de créditos', async () => {
    await renderMassa();
    expect(screen.getByRole('heading', { name: 'Participe da Pesquisa Massa FM' })).toBeInTheDocument();
    // Logotipo oficial embutido: arquivo quadrado, exibido sem distorção.
    const logo = screen.getByRole('img', { name: 'Massa FM Toledo 98.5' });
    expect(logo).toHaveAttribute('src', './assets/logo-massa-fm-toledo.png');
    expect(logo).toHaveAttribute('width', '512');
    expect(logo).toHaveAttribute('height', '512');
    expect(logo.className).toContain('object-contain');
    const footer = screen.getByTestId('massa-footer');
    expect(within(footer).getByText('Desenvolvido pela Faculdade Donaduzzi — Curso de Ciência de Dados e Inteligência Artificial.')).toBeInTheDocument();
    expect(within(footer).getByRole('img', { name: 'Faculdade Donaduzzi' })).toBeInTheDocument();
    // O logotipo do Biopark não foi fornecido: o parceiro aparece só pelo nome, em texto.
    expect(within(footer).getByText('Biopark')).toBeInTheDocument();
    expect(within(footer).queryByRole('img', { name: /Biopark/ })).not.toBeInTheDocument();
  });

  it('logotipos enviados no painel substituem o embutido e o espaço reservado', async () => {
    await loadMassa();
    await saveMassaConfig({ ...DEFAULT_MASSA_CONFIG, logoMassa: 'data:image/png;base64,AAAA', logoBiopark: 'data:image/png;base64,BBBB' });
    await renderMassa();
    expect(screen.getByRole('img', { name: 'Massa FM Toledo 98.5' })).toHaveAttribute('src', 'data:image/png;base64,AAAA');
    expect(within(screen.getByTestId('massa-footer')).getByRole('img', { name: 'Biopark' })).toHaveAttribute('src', 'data:image/png;base64,BBBB');
  });

  it('participa do início ao fim, grava no banco e limpa a tela para a próxima pessoa', async () => {
    const logs = [vi.spyOn(console, 'log'), vi.spyOn(console, 'info'), vi.spyOn(console, 'warn'), vi.spyOn(console, 'error'), vi.spyOn(console, 'debug')];
    await renderMassa();
    fireEvent.click(screen.getByRole('button', { name: 'COMEÇAR' }));

    // Identificação: botão só libera com nome e telefone válidos; a máscara é aplicada.
    const name = await screen.findByLabelText('Nome completo');
    const phone = screen.getByLabelText(/Telefone com DDD/);
    const next = screen.getByRole('button', { name: 'CONTINUAR' });
    expect(next).toBeDisabled();
    fireEvent.change(name, { target: { value: 'Maria' } });
    fireEvent.blur(name);
    expect(await screen.findByText('Informe nome e sobrenome.')).toBeInTheDocument();
    fireEvent.change(name, { target: { value: NAME } });
    fireEvent.change(phone, { target: { value: '4599988' } });
    expect(phone).toHaveValue('(45) 99988');
    expect(next).toBeDisabled();
    fireEvent.change(phone, { target: { value: PHONE } });
    expect(phone).toHaveValue('(45) 99988-7766');
    expect(next).toBeEnabled();
    expect(screen.getByTestId('massa-footer')).toBeInTheDocument();
    fireEvent.click(next);

    // Perguntas obrigatórias: só avança depois de responder.
    await screen.findByText('Pergunta 1 de 3');
    expect(screen.getByRole('heading', { name: 'Em qual período do dia você mais ouve rádio?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CONTINUAR' })).toBeDisabled();
    expect(screen.getAllByRole('radio').map((r) => r.textContent)).toEqual(['Manhã', 'Tarde', 'Noite', 'Não tenho horário definido']);
    fireEvent.click(screen.getByRole('radio', { name: 'Noite' }));
    expect(screen.getByRole('radio', { name: 'Noite' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'CONTINUAR' }));
    await screen.findByText('Pergunta 2 de 3');
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    fireEvent.click(screen.getByRole('radio', { name: 'Promoções' }));
    fireEvent.click(screen.getByRole('button', { name: 'CONTINUAR' }));
    await screen.findByText('Pergunta 3 de 3');
    expect(screen.getAllByRole('radio')).toHaveLength(6);
    fireEvent.click(screen.getByRole('radio', { name: 'Sertanejo' }));
    expect(screen.getByTestId('massa-footer')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'CONTINUAR' }));

    // Consentimento: caixas desmarcadas; finalizar só com a obrigatória.
    const consent = await screen.findByTestId('massa-consent');
    const marketing = screen.getByTestId('massa-marketing');
    expect(consent).toHaveAttribute('aria-checked', 'false');
    expect(marketing).toHaveAttribute('aria-checked', 'false');
    expect(consent).toHaveTextContent(DEFAULT_MASSA_CONFIG.consent.requiredText);
    expect(marketing).toHaveTextContent(DEFAULT_MASSA_CONFIG.consent.optionalText);
    expect(screen.getByRole('link', { name: 'Ler a Política de Privacidade' })).toHaveAttribute('href', 'https://massa.com.br/politica-de-privacidade-grupo-massa/');
    const finish = screen.getByRole('button', { name: 'FINALIZAR' });
    expect(finish).toBeDisabled();
    fireEvent.click(marketing);
    expect(finish).toBeDisabled();
    fireEvent.click(consent);
    expect(finish).toBeEnabled();
    fireEvent.click(consent);
    expect(finish).toBeDisabled();
    fireEvent.click(consent);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const before = Date.now();
    fireEvent.click(finish);

    expect(await screen.findByText('Obrigado por participar!')).toBeInTheDocument();
    expect(screen.getByText('Agora você está ainda mais perto da Massa FM Toledo.')).toBeInTheDocument();
    expect(screen.getByTestId('massa-footer')).toBeInTheDocument();

    const saved = await listParticipants();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      eventId: 'evento-padrao',
      eventName: 'Evento Massa FM',
      surveyId: 'pesquisa-padrao',
      surveyName: 'Pesquisa Massa FM',
      name: NAME,
      phone: PHONE,
      consentVersion: 'v1',
      consentText: DEFAULT_MASSA_CONFIG.consent.requiredText,
      marketingOptIn: true,
    });
    expect(saved[0].createdAt).toBeGreaterThanOrEqual(before);
    expect(saved[0].answers.map((a) => [a.prompt, a.values])).toEqual([
      ['Em qual período do dia você mais ouve rádio?', ['Noite']],
      ['Qual tipo de conteúdo você mais gosta de ouvir na rádio?', ['Promoções']],
      ['Qual estilo musical você mais gosta?', ['Sertanejo']],
    ]);
    // A pesquisa não interfere nas partidas do quiz.
    expect(await getAllGames()).toHaveLength(0);

    // Volta sozinho ao início e o próximo participante encontra tudo em branco.
    await act(async () => {
      vi.advanceTimersByTime(6_500);
    });
    fireEvent.click(await screen.findByRole('button', { name: 'COMEÇAR' }));
    expect(await screen.findByLabelText('Nome completo')).toHaveValue('');
    expect(screen.getByLabelText(/Telefone com DDD/)).toHaveValue('');
    expect(document.body.textContent).not.toContain('Maria');

    // Nenhum dado pessoal vai para o console.
    const printed = logs.flatMap((l) => l.mock.calls).map((c) => JSON.stringify(c)).join(' ');
    expect(printed).not.toContain('Maria');
    expect(printed).not.toContain('99988');
  });

  it('não aceita o mesmo telefone duas vezes no mesmo evento, sem revelar dados', async () => {
    await renderMassa();
    await participate();
    fireEvent.click(screen.getByRole('button', { name: 'Concluir' }));
    await identify('Outra Pessoa Silva', '(45) 99988-7766');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Este telefone já participou desta pesquisa neste evento.');
    expect(alert).not.toHaveTextContent('Maria');
    expect(screen.queryByText(/Pergunta 1 de/)).not.toBeInTheDocument();
    expect(await listParticipants()).toHaveLength(1);
  });

  it('o mesmo telefone pode participar de outro evento (dados separados por evento)', async () => {
    await loadMassa();
    const active = resolveActive({ config: DEFAULT_MASSA_CONFIG, events: DEFAULT_MASSA_EVENTS, surveys: DEFAULT_MASSA_SURVEYS })!;
    const answers: MassaDraftAnswers = { 'q-periodo': ['q-periodo-o1'], 'q-conteudo': ['q-conteudo-o1'], 'q-estilo': ['q-estilo-o1'] };
    const base = { active, name: NAME, phone: PHONE, answers, consent: DEFAULT_MASSA_CONFIG.consent, marketingOptIn: false };
    await submitParticipation(base);
    await expect(submitParticipation({ ...base, name: 'Outro Nome Qualquer' })).rejects.toBeInstanceOf(DuplicatePhoneError);
    const other = { ...active, event: { ...active.event, id: 'evento-2', name: 'Segundo evento' } };
    await submitParticipation({ ...base, active: other });
    expect(await phoneAlreadyInEvent('evento-padrao', '(45) 99988-7766')).toBe(true);
    expect(await phoneAlreadyInEvent('evento-3', PHONE)).toBe(false);
    expect((await listParticipants()).map((p) => p.eventName)).toEqual(['Evento Massa FM', 'Segundo evento']);
  });

  it('se a gravação falhar, mantém o preenchimento e permite tentar de novo', async () => {
    await renderMassa();
    await identify();
    await answerQuestions(3);
    fireEvent.click(await screen.findByTestId('massa-consent'));
    const spy = vi.spyOn(db, 'putParticipant').mockRejectedValueOnce(new Error('sem espaço'));
    fireEvent.click(screen.getByRole('button', { name: 'FINALIZAR' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar agora. Seus dados continuam na tela');
    expect(screen.getByTestId('massa-consent')).toHaveAttribute('aria-checked', 'true');
    expect(await listParticipants()).toHaveLength(0);
    spy.mockRestore();
    fireEvent.click(screen.getByRole('button', { name: 'FINALIZAR' }));
    expect(await screen.findByText('Obrigado por participar!')).toBeInTheDocument();
    expect(await listParticipants()).toHaveLength(1);
  });

  it('abandono: volta ao início após a inatividade configurada e apaga o que foi digitado', async () => {
    await loadMassa();
    await saveMassaConfig({ ...DEFAULT_MASSA_CONFIG, idleSeconds: 20 });
    await renderMassa();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await identify();
    await screen.findByText('Pergunta 1 de 3');
    await act(async () => {
      vi.advanceTimersByTime(19_000);
    });
    expect(screen.getByText('Pergunta 1 de 3')).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(2_000);
    });
    fireEvent.click(await screen.findByRole('button', { name: 'COMEÇAR' }));
    expect(await screen.findByLabelText('Nome completo')).toHaveValue('');
    expect(await listParticipants()).toHaveLength(0);
  });

  it('respeita tipos de pergunta, perguntas opcionais e inativas definidas no painel', async () => {
    await loadMassa();
    await saveMassaSurveys([
      {
        id: 'pesquisa-padrao',
        name: 'Pesquisa do evento',
        questions: [
          { id: 'm1', prompt: 'Quais redes você usa?', type: 'multiple', required: true, active: true, options: [{ id: 'a', text: 'Instagram' }, { id: 'b', text: 'TikTok' }, { id: 'c', text: 'Facebook' }] },
          { id: 'x1', prompt: 'Pergunta desativada', type: 'single', required: true, active: false, options: [{ id: 'a', text: 'Sim' }, { id: 'b', text: 'Não' }] },
          { id: 't1', prompt: 'Deixe um recado para a rádio', type: 'text', required: false, active: true, options: [] },
        ],
      },
    ]);
    await renderMassa();
    await identify();
    await screen.findByText('Pergunta 1 de 2');
    expect(screen.getByText(/Você pode marcar mais de uma opção/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Instagram' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Facebook' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'TikTok' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'TikTok' }));
    fireEvent.click(screen.getByRole('button', { name: 'CONTINUAR' }));
    await screen.findByText('Pergunta 2 de 2');
    // Opcional e sem resposta: pode pular.
    fireEvent.click(screen.getByRole('button', { name: 'PULAR' }));
    fireEvent.click(await screen.findByTestId('massa-consent'));
    // Voltar preserva o que já foi preenchido.
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    fireEvent.change(await screen.findByRole('textbox'), { target: { value: '  Toca mais modão!  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'CONTINUAR' }));
    expect(await screen.findByTestId('massa-consent')).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'FINALIZAR' }));
    await screen.findByText('Obrigado por participar!');
    const [p] = await listParticipants();
    expect(p.surveyName).toBe('Pesquisa do evento');
    expect(p.answers.map((a) => [a.questionId, a.values])).toEqual([
      ['m1', ['Instagram', 'Facebook']],
      ['t1', ['Toca mais modão!']],
    ]);
  });

  it('sem evento ativo, a pesquisa fica indisponível', async () => {
    await loadMassa();
    await saveMassaEvents(DEFAULT_MASSA_EVENTS.map((e) => ({ ...e, active: false })));
    render(<App />);
    expect(await screen.findByText(/Pesquisa indisponível no momento/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'COMEÇAR' })).toBeDisabled();
  });

  it('abre direto na pesquisa quando o painel define essa experiência; #/quiz mantém o quiz', async () => {
    await loadMassa();
    await saveMassaConfig({ ...DEFAULT_MASSA_CONFIG, startExperience: 'massa' });
    window.location.hash = '';
    const first = render(<App />);
    expect(await screen.findByRole('heading', { name: 'Participe da Pesquisa Massa FM' })).toBeInTheDocument();
    first.unmount();
    window.location.hash = '#/quiz';
    render(<App />);
    expect(await screen.findByRole('button', { name: /TOQUE PARA/ })).toBeInTheDocument();
    expect(screen.queryByTestId('massa-footer')).not.toBeInTheDocument();
  });
});

describe('participantes: filtros, totais e exportação', () => {
  async function seed() {
    await loadMassa();
    const active = resolveActive({ config: DEFAULT_MASSA_CONFIG, events: DEFAULT_MASSA_EVENTS, surveys: DEFAULT_MASSA_SURVEYS })!;
    const other = { ...active, event: { ...active.event, id: 'evento-2', name: 'Show na praça' } };
    const mk = (period: number, style: number): MassaDraftAnswers => ({ 'q-periodo': [`q-periodo-o${period}`], 'q-conteudo': ['q-conteudo-o1'], 'q-estilo': [`q-estilo-o${style}`] });
    const consent = DEFAULT_MASSA_CONFIG.consent;
    await submitParticipation({ active, name: 'Ana Paula Lima', phone: '45999110001', answers: mk(1, 1), consent, marketingOptIn: true }, new Date('2026-11-20T10:00:00').getTime());
    await submitParticipation({ active, name: 'Bruno César Reis', phone: '45999110002', answers: mk(1, 2), consent, marketingOptIn: false }, new Date('2026-11-21T15:00:00').getTime());
    await submitParticipation({ active, name: 'Carla Dias Mota', phone: '45999110003', answers: mk(3, 1), consent, marketingOptIn: true }, new Date('2026-11-22T20:00:00').getTime());
    await submitParticipation({ active: other, name: 'José Antônio Faria', phone: '44988220004', answers: mk(2, 1), consent, marketingOptIn: false }, new Date('2026-11-22T21:00:00').getTime());
    return listParticipants();
  }

  it('filtra por evento, pesquisa, data, resposta, nome e telefone', async () => {
    const all = await seed();
    expect(all).toHaveLength(4);
    expect(filterParticipants(all, { eventId: 'evento-2' }).map((p) => p.name)).toEqual(['José Antônio Faria']);
    expect(filterParticipants(all, { surveyId: 'pesquisa-padrao' })).toHaveLength(4);
    expect(filterParticipants(all, { from: '2026-11-21', to: '2026-11-21' }).map((p) => p.name)).toEqual(['Bruno César Reis']);
    expect(filterParticipants(all, { from: '2026-11-22' })).toHaveLength(2);
    expect(filterParticipants(all, { questionId: 'q-periodo', answer: 'Manhã' }).map((p) => p.name)).toEqual(['Ana Paula Lima', 'Bruno César Reis']);
    expect(filterParticipants(all, { search: 'jose antonio' }).map((p) => p.name)).toEqual(['José Antônio Faria']);
    expect(filterParticipants(all, { search: '(45) 99911-0003' }).map((p) => p.name)).toEqual(['Carla Dias Mota']);
    expect(filterParticipants(all, { eventId: 'evento-padrao', search: 'faria' })).toHaveLength(0);
  });

  it('calcula totais e percentuais e exporta CSV que abre no Excel', async () => {
    const all = await seed();
    const mine = filterParticipants(all, { eventId: 'evento-padrao' });
    const totals = totalsByQuestion(mine);
    const period = totals.find((t) => t.questionId === 'q-periodo')!;
    expect(period.respondents).toBe(3);
    expect(period.options.map((o) => [o.value, o.count, Math.round(o.percent)])).toEqual([['Manhã', 2, 67], ['Noite', 1, 33]]);

    const csv = participantsToCsv(mine).split('\r\n');
    expect(csv[0]).toBe('﻿data_hora;evento;pesquisa;nome;telefone;aceita_comunicacoes;versao_consentimento;anonimizado;Em qual período do dia você mais ouve rádio?;Qual tipo de conteúdo você mais gosta de ouvir na rádio?;Qual estilo musical você mais gosta?');
    expect(csv).toHaveLength(4);
    expect(csv[1]).toContain(';Evento Massa FM;Pesquisa Massa FM;Ana Paula Lima;(45) 99911-0001;sim;v1;nao;Manhã;Música;Sertanejo');
    const tcsv = totalsToCsv(totals, mine.length);
    expect(tcsv).toContain('(geral);participantes;3;');
    expect(tcsv).toContain('Em qual período do dia você mais ouve rádio?;Manhã;2;66.7');
  });

  it('anonimizar apaga nome e telefone, mantém as respostas e libera o telefone', async () => {
    const all = await seed();
    await anonymizeParticipant(all[0]);
    const [first] = await listParticipants();
    expect(first).toMatchObject({ name: 'Anonimizado', phone: '', marketingOptIn: false });
    expect(first.anonymizedAt).toBeTypeOf('number');
    expect(first.answers).toHaveLength(3);
    expect(await phoneAlreadyInEvent('evento-padrao', '45999110001')).toBe(false);
  });
});

describe('painel administrativo da pesquisa', () => {
  async function openMassaAdmin(section?: string) {
    window.location.hash = '#/admin';
    render(<App />);
    await screen.findByText('Área administrativa');
    // Créditos na tela de login.
    expect(within(screen.getByTestId('credits')).getByText(/Desenvolvido pela Faculdade Donaduzzi/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('PIN'), { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    fireEvent.click(await screen.findByRole('button', { name: /Pesquisa Massa FM/ }));
    await screen.findByText(/No totem agora: evento/);
    if (section) fireEvent.click(screen.getByRole('button', { name: section }));
  }

  it('o painel exige PIN: sem login, nenhum participante aparece', async () => {
    await loadMassa();
    const active = resolveActive({ config: DEFAULT_MASSA_CONFIG, events: DEFAULT_MASSA_EVENTS, surveys: DEFAULT_MASSA_SURVEYS })!;
    await submitParticipation({ active, name: NAME, phone: PHONE, answers: {}, consent: DEFAULT_MASSA_CONFIG.consent, marketingOptIn: false });
    window.location.hash = '#/admin';
    render(<App />);
    await screen.findByText('Área administrativa');
    expect(document.body.textContent).not.toContain('Maria');
    fireEvent.change(screen.getByLabelText('PIN'), { target: { value: '9999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('PIN incorreto.')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('Maria');
  });

  it('cria evento, vincula pesquisa e define o que roda no totem', async () => {
    await openMassaAdmin();
    fireEvent.click(screen.getByRole('button', { name: /Novo evento/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar evento' }));
    expect(await screen.findByText(/Informe o nome do evento/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Nome do evento'), { target: { value: 'Expo Toledo 2026' } });
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Estande da rádio' } });
    fireEvent.change(screen.getByLabelText('Local'), { target: { value: 'Parque de Exposições' } });
    fireEvent.change(screen.getByLabelText('Data de início'), { target: { value: '2026-12-10' } });
    fireEvent.change(screen.getByLabelText('Data de término'), { target: { value: '2026-12-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar evento' }));
    expect(await screen.findByText(/término não pode ser anterior/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Data de término'), { target: { value: '2026-12-13' } });
    expect(screen.getByLabelText(/Pesquisa vinculada/)).toHaveValue('pesquisa-padrao');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar evento' }));
    expect(await screen.findByText('Evento "Expo Toledo 2026" salvo.')).toBeInTheDocument();
    expect(screen.getByText('Parque de Exposições · 10/12/2026 a 13/12/2026')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Usar Expo Toledo 2026 no totem' }));
    expect(await screen.findByText(/O totem agora usa o evento "Expo Toledo 2026"/)).toBeInTheDocument();
    await waitFor(async () => {
      const kv = await db.getKV<typeof DEFAULT_MASSA_CONFIG>('massaConfig');
      const events = await db.getKV<typeof DEFAULT_MASSA_EVENTS>('massaEvents');
      expect(events).toHaveLength(2);
      expect(kv?.activeEventId).toBe(events![1].id);
      expect(events![1]).toMatchObject({ name: 'Expo Toledo 2026', location: 'Parque de Exposições', startDate: '2026-12-10', endDate: '2026-12-13', active: true, surveyId: 'pesquisa-padrao' });
    });
  });

  it('edita perguntas e alternativas sem mexer no código, e o totem passa a usá-las', async () => {
    await openMassaAdmin('Pesquisas e perguntas');
    expect(await screen.findByLabelText('Texto da pergunta 1')).toHaveValue('Em qual período do dia você mais ouve rádio?');
    // Edita o texto, reordena, troca o tipo, torna opcional e mexe nas alternativas.
    fireEvent.change(screen.getByLabelText('Texto da pergunta 1'), { target: { value: 'Quando você mais ouve a Massa?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Descer a pergunta 1' }));
    expect(screen.getByLabelText('Texto da pergunta 2')).toHaveValue('Quando você mais ouve a Massa?');
    fireEvent.change(screen.getByLabelText('Tipo da pergunta 1'), { target: { value: 'multiple' } });
    fireEvent.click(screen.getByRole('button', { name: 'Excluir a alternativa 2 da pergunta 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar alternativa à pergunta 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar pesquisa' }));
    expect(await screen.findByText(/preencha ou remova as alternativas vazias/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Alternativa 5 da pergunta 1'), { target: { value: 'Podcasts' } });
    fireEvent.click(screen.getByRole('button', { name: 'Subir a alternativa 5 da pergunta 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Excluir a pergunta 3' }));
    fireEvent.click(screen.getByRole('button', { name: /Adicionar pergunta/ }));
    fireEvent.change(screen.getByLabelText('Texto da pergunta 3'), { target: { value: 'Quer mandar um recado?' } });
    fireEvent.change(screen.getByLabelText('Tipo da pergunta 3'), { target: { value: 'text' } });
    fireEvent.click(within(screen.getByRole('group', { name: 'Pergunta 3' })).getByLabelText('Obrigatória'));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar pesquisa' }));
    expect(await screen.findByText(/Pesquisa "Pesquisa Massa FM" salva/)).toBeInTheDocument();

    const saved = (await db.getKV<typeof DEFAULT_MASSA_SURVEYS>('massaSurveys'))![0];
    expect(saved.questions.map((q) => [q.prompt, q.type, q.required])).toEqual([
      ['Qual tipo de conteúdo você mais gosta de ouvir na rádio?', 'multiple', true],
      ['Quando você mais ouve a Massa?', 'single', true],
      ['Quer mandar um recado?', 'text', false],
    ]);
    expect(saved.questions[0].options.map((o) => o.text)).toEqual(['Música', 'Entretenimento', 'Promoções', 'Podcasts', 'Esportes']);

    // Nova pesquisa para outro evento.
    fireEvent.click(screen.getByRole('button', { name: /Nova pesquisa/ }));
    expect(await screen.findByText(/Pesquisa "Nova pesquisa" criada/)).toBeInTheDocument();
    await waitFor(async () => expect(await db.getKV<unknown[]>('massaSurveys')).toHaveLength(2));

    // O totem usa a versão salva.
    fireEvent.click(screen.getByRole('button', { name: /Abrir a pesquisa no totem/ }));
    act(() => window.dispatchEvent(new HashChangeEvent('hashchange')));
    await screen.findByRole('button', { name: 'COMEÇAR' });
    await identify();
    await screen.findByText('Pergunta 1 de 3');
    expect(screen.getAllByRole('checkbox').map((c) => c.textContent)).toEqual(['Música', 'Entretenimento', 'Promoções', 'Podcasts', 'Esportes']);
  });

  it('edita consentimento, versão, link e tempo de retorno', async () => {
    await openMassaAdmin('Totem, textos e consentimento');
    fireEvent.change(await screen.findByLabelText(/^Consentimento obrigatório/), { target: { value: 'Concordo com o novo regulamento.' } });
    expect(await screen.findByText(/mude também a versão/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^Versão do texto/), { target: { value: 'v2' } });
    fireEvent.change(screen.getByLabelText('Link da Política de Privacidade'), { target: { value: 'sem-link' } });
    fireEvent.change(screen.getByLabelText(/Retorno à tela inicial por inatividade/), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar configurações da pesquisa' }));
    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent('O link da Política de Privacidade deve começar com http');
    expect(error).toHaveTextContent('entre 15 e 600 segundos');
    fireEvent.change(screen.getByLabelText('Link da Política de Privacidade'), { target: { value: 'https://exemplo.com.br/privacidade' } });
    fireEvent.change(screen.getByLabelText(/Retorno à tela inicial por inatividade/), { target: { value: '45' } });
    fireEvent.change(screen.getByLabelText(/^Experiência ao ligar o totem/), { target: { value: 'massa' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar configurações da pesquisa' }));
    expect(await screen.findByText('Configurações da Pesquisa Massa FM salvas.')).toBeInTheDocument();
    const cfg = (await db.getKV<typeof DEFAULT_MASSA_CONFIG>('massaConfig'))!;
    expect(cfg).toMatchObject({ idleSeconds: 45, startExperience: 'massa' });
    expect(cfg.consent).toMatchObject({ version: 'v2', requiredText: 'Concordo com o novo regulamento.', privacyUrl: 'https://exemplo.com.br/privacidade' });

    // A participação seguinte registra a nova versão do consentimento.
    fireEvent.click(screen.getByRole('button', { name: /Abrir a pesquisa no totem/ }));
    act(() => window.dispatchEvent(new HashChangeEvent('hashchange')));
    await screen.findByRole('button', { name: 'COMEÇAR' });
    await participate();
    const [p] = await listParticipants();
    expect(p).toMatchObject({ consentVersion: 'v2', consentText: 'Concordo com o novo regulamento.' });
  });

  it('lista, filtra, anonimiza e exclui participantes; mostra totais', async () => {
    await loadMassa();
    const active = resolveActive({ config: DEFAULT_MASSA_CONFIG, events: DEFAULT_MASSA_EVENTS, surveys: DEFAULT_MASSA_SURVEYS })!;
    const consent = DEFAULT_MASSA_CONFIG.consent;
    const a1: MassaDraftAnswers = { 'q-periodo': ['q-periodo-o1'], 'q-conteudo': ['q-conteudo-o1'], 'q-estilo': ['q-estilo-o1'] };
    const a2: MassaDraftAnswers = { 'q-periodo': ['q-periodo-o3'], 'q-conteudo': ['q-conteudo-o1'], 'q-estilo': ['q-estilo-o4'] };
    await submitParticipation({ active, name: 'Ana Paula Lima', phone: '45999110001', answers: a1, consent, marketingOptIn: true });
    await submitParticipation({ active, name: 'Bruno César Reis', phone: '45999110002', answers: a2, consent, marketingOptIn: false });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    await openMassaAdmin('Participantes e resultados');
    expect(await screen.findByText('Ana Paula Lima')).toBeInTheDocument();
    expect(screen.getByText('(45) 99911-0002')).toBeInTheDocument();
    expect(screen.getByText('Totais e percentuais (2 participantes)')).toBeInTheDocument();
    expect(screen.getByText(/Aceitaram receber comunicações:/)).toHaveTextContent('1 de 2 (50%)');
    expect(screen.getByRole('img', { name: 'Manhã: 50%' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Música: 100%' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Buscar por nome ou telefone'), { target: { value: 'bruno' } });
    expect(screen.queryByText('Ana Paula Lima')).not.toBeInTheDocument();
    expect(screen.getByText('Totais e percentuais (1 participante)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    fireEvent.change(screen.getByLabelText('Pergunta'), { target: { value: 'q-estilo' } });
    fireEvent.change(screen.getByLabelText('Resposta'), { target: { value: 'Rock' } });
    expect(screen.queryByText('Ana Paula Lima')).not.toBeInTheDocument();
    expect(screen.getByText('Bruno César Reis')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));

    fireEvent.click(screen.getByRole('button', { name: 'Anonimizar Ana Paula Lima' }));
    expect(await screen.findByText('Cadastro anonimizado.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Ana Paula Lima')).not.toBeInTheDocument());
    expect(screen.queryByText('(45) 99911-0001')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir Bruno César Reis' }));
    expect(await screen.findByText('Cadastro excluído.')).toBeInTheDocument();
    await waitFor(async () => expect((await listParticipants()).map((p) => p.name)).toEqual(['Anonimizado']));
    expect(screen.getByText('Totais e percentuais (1 participante)')).toBeInTheDocument();
  });

  it('mostra os créditos em "Sobre o sistema"', async () => {
    await openMassaAdmin();
    fireEvent.click(screen.getByRole('button', { name: /Sobre o sistema/ }));
    expect(await screen.findByRole('heading', { name: 'Sobre o sistema' })).toBeInTheDocument();
    expect(within(screen.getByTestId('credits')).getByText('Desenvolvido pela Faculdade Donaduzzi — Curso de Ciência de Dados e Inteligência Artificial.')).toBeInTheDocument();
  });
});
