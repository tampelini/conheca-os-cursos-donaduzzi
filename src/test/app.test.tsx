import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from '../App';
import { __resetDBForTests, getAllGames } from '../services/db';
import { loadAppData, saveSettings } from '../services/repository';
import { DEFAULT_SETTINGS } from '../data/defaultSettings';

async function renderLoaded() {
  const utils = render(<App />);
  await screen.findByRole('button', { name: /TOQUE PARA/ });
  return utils;
}

async function startGame(profile = 'Docente') {
  fireEvent.click(screen.getByRole('button', { name: /TOQUE PARA/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'CONTINUAR' }));
  fireEvent.click(await screen.findByRole('button', { name: profile }));
  fireEvent.click(await screen.findByRole('button', { name: 'Pular e começar' }));
  await screen.findByText('Pergunta 1 de 10');
}

async function answerAll() {
  for (let i = 1; i <= 10; i++) {
    await screen.findByText(`Pergunta ${i} de 10`);
    fireEvent.click(within(screen.getByRole('list', { name: 'Alternativas' })).getAllByRole('button')[0]);
    fireEvent.click(await screen.findByRole('button', { name: i === 10 ? 'VER RESULTADO' : 'PRÓXIMA PERGUNTA' }));
  }
}

beforeEach(async () => {
  await __resetDBForTests();
  window.location.hash = '';
});
afterEach(() => vi.useRealTimers());

describe('aplicação completa', () => {
  it('joga uma partida inteira, registra estatísticas e mostra os cursos', async () => {
    await renderLoaded();
    expect(screen.getByText('CONHEÇA OS CURSOS')).toBeInTheDocument();
    expect(screen.getByText(/10 perguntas • Aproximadamente 3 minutos/)).toBeInTheDocument();
    await startGame();

    for (let i = 1; i <= 10; i++) {
      await screen.findByText(`Pergunta ${i} de 10`);
      const list = screen.getByRole('list', { name: 'Alternativas' });
      const options = within(list).getAllByRole('button');
      expect(options).toHaveLength(4);
      fireEvent.click(options[0]);
      // Todas as alternativas ficam bloqueadas após responder.
      within(list).getAllByRole('button').forEach((b) => expect(b).toBeDisabled());
      expect(await screen.findByText(/Resposta correta!|Resposta incorreta/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: i === 10 ? 'VER RESULTADO' : 'PRÓXIMA PERGUNTA' }));
    }

    expect(await screen.findByText('QUIZ CONCLUÍDO!')).toBeInTheDocument();
    expect(screen.getByText('PONTOS')).toBeInTheDocument();
    expect(screen.getByText('respostas corretas')).toBeInTheDocument();

    await waitFor(async () => {
      const games = await getAllGames();
      expect(games).toHaveLength(1);
      expect(games[0].completed).toBe(true);
      expect(games[0].answers).toHaveLength(10);
      expect(games[0].profile).toBe('docente');
    });

    fireEvent.click(screen.getByRole('button', { name: /VER TODOS OS CURSOS/ }));
    expect(await screen.findByText('Ciência de Dados')).toBeInTheDocument();
    expect(screen.getByText('Análise e Desenvolvimento de Sistemas')).toBeInTheDocument();
    expect(screen.getByText('CONHEÇA PARA INDICAR!')).toBeInTheDocument();
    // Todos os cursos de graduação, com os dados conferidos no site.
    const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(titles).toHaveLength(10);
    expect(titles).toContain('Direito');
    expect(titles).toContain('Engenharia de Bioprocessos e Biotecnologia');
    expect(screen.getByText('Bacharelado · 8 semestres · Presencial, noturno · Coordenação: Angélica Meurer')).toBeInTheDocument();
    // QR Code da página oficial de cursos, gerado no próprio aparelho.
    expect(await screen.findByRole('img', { name: /QR Code/ })).toBeInTheDocument();
  });

  it('sem URL cadastrada, nenhum QR Code é exibido', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, qrUrl: '', survey: { ...DEFAULT_SETTINGS.survey, enabled: false }, profile: { ...DEFAULT_SETTINGS.profile, enabled: false } });
    await renderLoaded();
    fireEvent.click(screen.getByRole('button', { name: /TOQUE PARA/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'COMEÇAR' }));
    await answerAll();
    fireEvent.click(await screen.findByRole('button', { name: /VER TODOS OS CURSOS/ }));
    await screen.findByText('CONHEÇA PARA INDICAR!');
    expect(screen.queryByRole('img', { name: /QR Code/ })).not.toBeInTheDocument();
    // Com a tela de perfil desligada, a partida fica sem o campo.
    await waitFor(async () => expect('profile' in (await getAllGames())[0]).toBe(false));
  });

  it('encerra a pergunta quando o tempo acaba e permite avançar', async () => {
    await renderLoaded();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await startGame();
    await act(async () => {
      vi.advanceTimersByTime(20_500);
    });
    expect(await screen.findByText('Tempo esgotado!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Resposta correta\)/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'PRÓXIMA PERGUNTA' }));
    expect(await screen.findByText('Pergunta 2 de 10')).toBeInTheDocument();
  });

  it('sem temporizador, a pergunta não expira', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, timePerQuestion: 0 });
    await renderLoaded();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await startGame();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(40_000);
    });
    expect(screen.queryByText('Tempo esgotado!')).not.toBeInTheDocument();
  });

  it('volta sozinho à tela inicial após inatividade e limpa a partida', async () => {
    await renderLoaded();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await startGame();
    await act(async () => {
      vi.advanceTimersByTime(61_000);
    });
    expect(await screen.findByRole('button', { name: /TOQUE PARA/ })).toBeInTheDocument();
    await startGame(); // nova partida começa do zero
    expect(screen.getByLabelText('Pontuação: 0')).toBeInTheDocument();
  });

  it('a tela de cursos retorna ao início após 30 s', async () => {
    await renderLoaded();
    await startGame();
    for (let i = 1; i <= 10; i++) {
      await screen.findByText(`Pergunta ${i} de 10`);
      fireEvent.click(within(screen.getByRole('list', { name: 'Alternativas' })).getAllByRole('button')[1]);
      fireEvent.click(await screen.findByRole('button', { name: i === 10 ? 'VER RESULTADO' : 'PRÓXIMA PERGUNTA' }));
    }
    const coursesBtn = await screen.findByRole('button', { name: /VER TODOS OS CURSOS/ });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fireEvent.click(coursesBtn);
    await screen.findByText('CONHEÇA PARA INDICAR!');
    await act(async () => {
      vi.advanceTimersByTime(29_000);
    });
    expect(screen.getByText('CONHEÇA PARA INDICAR!')).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(2_000);
    });
    expect(await screen.findByRole('button', { name: /TOQUE PARA/ })).toBeInTheDocument();
  });
});

describe('perfil anônimo do participante', () => {
  it('mostra as opções, guarda só a categoria e ignora toques repetidos', async () => {
    await renderLoaded();
    fireEvent.click(screen.getByRole('button', { name: /TOQUE PARA/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'CONTINUAR' }));
    expect(await screen.findByText('Qual é o seu vínculo com a Faculdade?')).toBeInTheDocument();
    expect(screen.getByText(/não pedimos nome nem dados pessoais/)).toBeInTheDocument();
    for (const label of ['Docente', 'Técnico-administrativo', 'Estudante', 'Visitante']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    // Toque duplo (ou em duas opções em sequência): vale só o primeiro.
    fireEvent.click(screen.getByRole('button', { name: 'Técnico-administrativo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Visitante' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Pular e começar' }));
    await answerAll();
    await screen.findByText('QUIZ CONCLUÍDO!');
    await waitFor(async () => {
      const games = await getAllGames();
      expect(games).toHaveLength(1);
      expect(games[0].profile).toBe('tecnico');
      // Nada além da categoria: nenhum campo de identificação na partida.
      expect(Object.keys(games[0]).sort()).toEqual(
        ['answers', 'completed', 'correctCount', 'durationMs', 'endedAt', 'id', 'profile', 'score', 'startedAt', 'survey', 'totalQuestions'],
      );
    });
  });

  it('voltar ao início e recomeçar permite escolher outro perfil', async () => {
    await renderLoaded();
    fireEvent.click(screen.getByRole('button', { name: /TOQUE PARA/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'CONTINUAR' }));
    await screen.findByText('Qual é o seu vínculo com a Faculdade?');
    fireEvent.click(screen.getByRole('button', { name: 'Voltar à tela inicial' }));
    await screen.findByRole('button', { name: /TOQUE PARA/ });
    await startGame('Estudante');
    await waitFor(async () => expect((await getAllGames())[0].profile).toBe('estudante'));
  });
});

describe('pesquisa antes das perguntas', () => {
  it('pede as duas notas, guarda na partida e compara no resultado', async () => {
    await renderLoaded();
    fireEvent.click(screen.getByRole('button', { name: /TOQUE PARA/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'CONTINUAR' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Docente' }));
    expect(await screen.findByText('Conte pra gente!')).toBeInTheDocument();
    const start = screen.getByRole('button', { name: 'COMEÇAR' });
    expect(start).toBeDisabled();

    const biopark = screen.getByRole('radiogroup', { name: 'O quanto você conhece os cursos da Faculdade Donaduzzi?' });
    const faculdade = screen.getByRole('radiogroup', { name: 'O quanto você conhece a CPA?' });
    fireEvent.click(within(biopark).getByRole('radio', { name: 'Conheço bem' }));
    expect(within(biopark).getByRole('radio', { name: 'Conheço bem' })).toHaveAttribute('aria-checked', 'true');
    expect(start).toBeDisabled();
    fireEvent.click(within(faculdade).getByRole('radio', { name: 'Já ouvi falar' }));
    expect(start).toBeEnabled();
    fireEvent.click(start);

    await answerAll();
    expect(await screen.findByText('QUIZ CONCLUÍDO!')).toBeInTheDocument();
    expect(screen.getByTestId('self-check')).toHaveTextContent(
      /Você disse “Já ouvi falar” sobre a CPA e acertou \d de 3 perguntas/,
    );
    await waitFor(async () => {
      const games = await getAllGames();
      expect(games[0].survey).toEqual({ cursos: 4, cpa: 2 });
    });
  });

  it('pular registra a partida sem notas e sem comparação', async () => {
    await renderLoaded();
    await startGame();
    await answerAll();
    expect(await screen.findByText('QUIZ CONCLUÍDO!')).toBeInTheDocument();
    expect(screen.queryByTestId('self-check')).not.toBeInTheDocument();
    await waitFor(async () => expect((await getAllGames())[0].survey).toBeNull());
  });

  it('desligada no painel, vai do perfil direto às perguntas', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, survey: { ...DEFAULT_SETTINGS.survey, enabled: false } });
    await renderLoaded();
    fireEvent.click(screen.getByRole('button', { name: /TOQUE PARA/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'CONTINUAR' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Docente' }));
    expect(await screen.findByText('Pergunta 1 de 10')).toBeInTheDocument();
  });

  it('sem a opção de pular, o botão de pular não aparece', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, survey: { ...DEFAULT_SETTINGS.survey, allowSkip: false } });
    await renderLoaded();
    fireEvent.click(screen.getByRole('button', { name: /TOQUE PARA/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'CONTINUAR' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Docente' }));
    await screen.findByText('Conte pra gente!');
    expect(screen.queryByRole('button', { name: 'Pular e começar' })).not.toBeInTheDocument();
  });
});

describe('logotipo com link', () => {
  it('abre a página de cursos de graduação em outra aba', async () => {
    await renderLoaded();
    const link = screen.getByRole('link', { name: /conheça os cursos de graduação/ });
    expect(link).toHaveAttribute('href', 'https://faculdadedonaduzzi.com.br/cursos-de-graduacao/');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('ao tocar, abre a página em nova aba', async () => {
    const fake = {} as Window;
    const open = vi.spyOn(window, 'open').mockReturnValue(fake);
    await renderLoaded();
    fireEvent.click(screen.getByRole('link', { name: /conheça os cursos de graduação/ }));
    await waitFor(() => expect(open).toHaveBeenCalledWith('https://faculdadedonaduzzi.com.br/cursos-de-graduacao/', '_blank'));
    expect(fake.opener).toBeNull();
    // O toque no logotipo não inicia o jogo.
    expect(screen.queryByRole('button', { name: 'CONTINUAR' })).not.toBeInTheDocument();
    open.mockRestore();
  });

  it('se a nova aba for bloqueada, abre na mesma aba', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...original, assign } });
    try {
      await renderLoaded();
      fireEvent.click(screen.getByRole('link', { name: /conheça os cursos de graduação/ }));
      await waitFor(() => expect(assign).toHaveBeenCalledWith('https://faculdadedonaduzzi.com.br/cursos-de-graduacao/'));
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: original });
      open.mockRestore();
    }
  });

  it('sem link configurado, o logotipo não é clicável', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, logoLinkUrl: '' });
    await renderLoaded();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: DEFAULT_SETTINGS.institutionName })).toBeInTheDocument();
  });
});

describe('painel administrativo', () => {
  async function openAdmin() {
    await renderLoaded();
    act(() => {
      window.location.hash = '#/admin';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    await screen.findByText('Área administrativa');
  }

  it('exige PIN e rejeita PIN incorreto', async () => {
    await openAdmin();
    fireEvent.change(screen.getByLabelText('PIN'), { target: { value: '0000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('PIN incorreto.')).toBeInTheDocument();
    expect(screen.queryByText(/Painel administrativo/)).not.toBeInTheDocument();
  });

  it('abre com acesso secreto (5 toques no canto) e gerencia perguntas', async () => {
    await renderLoaded();
    const stage = document.querySelector('main.stage') as HTMLElement;
    for (let i = 0; i < 5; i++) fireEvent.pointerDown(stage, { clientX: 10, clientY: 10 });
    await screen.findByText('Área administrativa');
    fireEvent.change(screen.getByLabelText('PIN'), { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText(/Painel administrativo/)).toBeInTheDocument();
    expect(screen.getByText('Banco de perguntas (60 ativas de 65)')).toBeInTheDocument();
    expect(screen.getByText(/Há 5 perguntas aguardando/)).toBeInTheDocument();

    // Desativa uma pergunta e confere a persistência.
    const checkbox = screen.getAllByRole('checkbox', { name: 'Ativa' })[0];
    fireEvent.click(checkbox);
    expect(await screen.findByText('Banco de perguntas (59 ativas de 65)')).toBeInTheDocument();
    await waitFor(async () => expect((await loadAppData()).questions.filter((q) => q.active)).toHaveLength(59));

    // Pendentes: não podem ser ativadas enquanto tiverem "PREENCHER".
    fireEvent.click(screen.getByRole('button', { name: 'Ver pendentes' }));
    expect(await screen.findByText('Quem coordena o curso de Psicologia?')).toBeInTheDocument();
    expect(screen.getAllByText('A confirmar')).toHaveLength(5);
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'Ativa' })[0]);
    expect(await screen.findByText(/ainda contém "PREENCHER"/)).toBeInTheDocument();
    expect((await loadAppData()).questions.find((q) => q.id === 'pend-psi-coord')!.active).toBe(false);

    // Substituir o texto e salvar libera a pergunta: deixa de ser pendente e pode ser ativada.
    fireEvent.click(screen.getByRole('button', { name: 'Editar pend-psi-coord' }));
    fireEvent.change(screen.getByLabelText('Texto da alternativa A'), { target: { value: 'Nome de Teste' } });
    fireEvent.change(screen.getByLabelText(/Explicação educativa/), { target: { value: 'Nome de Teste coordena o curso.' } });
    fireEvent.click(screen.getByLabelText('Pergunta ativa'));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar pergunta' }));
    expect(await screen.findByText('Pergunta "pend-psi-coord" salva.')).toBeInTheDocument();
    await waitFor(async () => {
      const saved = (await loadAppData()).questions.find((q) => q.id === 'pend-psi-coord')!;
      expect(saved.active).toBe(true);
      expect(saved.pending).toBeUndefined();
    });
    expect(screen.getAllByText('A confirmar')).toHaveLength(4);

    // Criação com validação.
    fireEvent.click(screen.getByRole('button', { name: /Nova pergunta/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar pergunta' }));
    expect(await screen.findByText('O enunciado é obrigatório.')).toBeInTheDocument();
  });

  it('salva configurações (tempo e URL do QR Code)', async () => {
    await openAdmin();
    fireEvent.change(screen.getByLabelText('PIN'), { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    fireEvent.click(await screen.findByRole('button', { name: /Configurações/ }));
    fireEvent.change(screen.getByLabelText(/URL do QR Code/), { target: { value: 'nao-e-url' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar configurações' }));
    expect(await screen.findByText(/deve começar com http/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/URL do QR Code/), { target: { value: 'https://exemplo.edu.br/cursos' } });
    fireEvent.change(screen.getByLabelText('Segundos por pergunta'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar configurações' }));
    expect(await screen.findByText('Configurações salvas e aplicadas.')).toBeInTheDocument();
    const { settings } = await loadAppData();
    expect(settings.qrUrl).toBe('https://exemplo.edu.br/cursos');
    expect(settings.timePerQuestion).toBe(30);
  });
});
