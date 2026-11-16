import { __resetDBForTests, getAllGames, putGame } from '../services/db';
import { getRecentQuestionIds, loadAppData, pushRecentGame, saveCourses, saveQuestions, saveSettings } from '../services/repository';
import { DEFAULT_SETTINGS } from '../data/defaultSettings';
import { DEFAULT_QUESTIONS } from '../data/questions';
import { gamesToCsv, groupsToCsv, questionStatsToCsv, summarize, summarizeByCategory, summarizeByProfile } from '../services/stats';
import { DEFAULT_PIN, isDefaultPin, setPin, sha256Hex, verifyPin } from '../services/pin';
import type { GameRecord } from '../types';

beforeEach(() => __resetDBForTests());

describe('persistência local (IndexedDB)', () => {
  it('carrega padrões na primeira execução', async () => {
    const data = await loadAppData();
    expect(data.settings).toEqual(DEFAULT_SETTINGS);
    expect(data.questions).toHaveLength(65);
    expect(data.questions.filter((q) => q.active)).toHaveLength(60);
    expect(data.courses).toHaveLength(10);
    expect(data.settings.profile.options.map((o) => o.id)).toEqual(['docente', 'tecnico', 'estudante', 'visitante']);
  });

  it('salva e recarrega configurações, perguntas e cursos', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, timePerQuestion: 0, qrUrl: 'https://exemplo.edu.br/cursos' });
    await saveQuestions(DEFAULT_QUESTIONS.slice(0, 12));
    await saveCourses([]);
    const data = await loadAppData();
    expect(data.settings.timePerQuestion).toBe(0);
    expect(data.settings.qrUrl).toBe('https://exemplo.edu.br/cursos');
    expect(data.questions).toHaveLength(12);
    expect(data.courses).toEqual([]);
  });

  it('mescla configurações antigas com novos campos padrão', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await saveSettings({ gameName: 'X' } as any);
    const data = await loadAppData();
    expect(data.settings.gameName).toBe('X');
    expect(data.settings.distribution).toEqual(DEFAULT_SETTINGS.distribution);
    expect(data.settings.profile).toEqual(DEFAULT_SETTINGS.profile);
  });

  it('mantém apenas as N partidas recentes no histórico anti-repetição', async () => {
    await pushRecentGame(['a'], 2);
    await pushRecentGame(['b'], 2);
    await pushRecentGame(['c'], 2);
    expect(await getRecentQuestionIds()).toEqual(['b', 'c']);
  });
});

describe('cursos salvos', () => {
  it('não altera cursos já salvos', async () => {
    const current = [{ id: 'a', name: 'A', description: '', icon: 'cpu' as const, enabled: true, highlight: false }];
    await saveCourses(current);
    expect((await loadAppData()).courses).toEqual(current);
  });
});

describe('estatísticas', () => {
  const game = (id: string, completed: boolean, score: number, profile?: string): GameRecord => ({
    id,
    startedAt: Date.UTC(2026, 10, 3, 12),
    endedAt: completed ? Date.UTC(2026, 10, 3, 12, 2) : null,
    completed,
    score,
    correctCount: score / 100,
    totalQuestions: 10,
    durationMs: completed ? 120_000 : null,
    answers: [
      { questionId: 'inst-01', chosenOptionId: 'b', correct: true, timedOut: false, timeMs: 4000 },
      { questionId: 'cpa-01', chosenOptionId: null, correct: false, timedOut: true, timeMs: 20000 },
    ],
    ...(profile !== undefined ? { profile } : {}),
  });

  it('registra e resume partidas', async () => {
    await putGame(game('g1', true, 800));
    await putGame(game('g2', true, 600));
    await putGame(game('g3', false, 100));
    const games = await getAllGames();
    const s = summarize(games);
    expect(s.started).toBe(3);
    expect(s.completed).toBe(2);
    expect(s.avgScore).toBe(700);
    expect(s.avgDurationMs).toBe(120_000);
    const fac = s.perQuestion.find((q) => q.questionId === 'inst-01')!;
    expect(fac).toMatchObject({ shown: 3, correct: 3, choices: { b: 3 } });
    expect(s.perQuestion.find((q) => q.questionId === 'cpa-01')!.timeouts).toBe(3);
  });

  it('resume o acerto por tema e por perfil anônimo', () => {
    const profiles = DEFAULT_SETTINGS.profile.options;
    const games = [game('g1', true, 100, 'docente'), game('g2', false, 100, 'docente'), game('g3', true, 100, 'tecnico'), game('g4', true, 100)];
    const byCategory = summarizeByCategory(games, DEFAULT_QUESTIONS);
    expect(byCategory.map((c) => c.id)).toEqual(['institucional', 'cpa', 'tecnologia', 'saude', 'gestao', 'metodologia']);
    expect(byCategory[0]).toMatchObject({ label: 'A Faculdade', answers: 4, correct: 4, percent: 100 });
    expect(byCategory[1]).toMatchObject({ label: 'CPA e Avaliação', answers: 4, correct: 0, percent: 0 });
    expect(byCategory[2]).toMatchObject({ answers: 0, percent: 0 });

    const byProfile = summarizeByProfile(games, profiles);
    expect(byProfile.map((p) => [p.label, p.games, p.completed, p.percent])).toEqual([
      ['Docente', 2, 1, 50],
      ['Técnico-administrativo', 1, 1, 50],
      ['Estudante', 0, 0, 0],
      ['Visitante', 0, 0, 0],
      ['(sem perfil)', 1, 1, 50],
    ]);

    const csv = groupsToCsv(byCategory, byProfile).split('\r\n');
    expect(csv[0]).toBe('\uFEFFagrupamento;grupo;partidas;concluidas;respostas;acertos;percentual_acerto');
    expect(csv).toContain('tema;CPA e Avaliação;;;4;0;0.0');
    expect(csv).toContain('perfil;Docente;2;1;4;2;50.0');
    // O perfil sai como coluna no CSV de partidas (vazio quando a tela estava desligada).
    const rows = gamesToCsv(games, [], profiles).split('\r\n');
    expect(rows[0]).toContain(';concluida;perfil;pontuacao;');
    expect(rows[1]).toContain(';sim;Docente;100;');
    expect(rows[4]).toContain(';sim;;100;');
  });

  it('exporta CSV com cabeçalho e uma linha por item', () => {
    const games = [game('g1', true, 800)];
    const csv = gamesToCsv(games);
    expect(csv.startsWith('﻿id;inicio')).toBe(true);
    expect(csv.split('\r\n')).toHaveLength(2);
    const qcsv = questionStatsToCsv(summarize(games), DEFAULT_QUESTIONS);
    expect(qcsv.split('\r\n')).toHaveLength(3);
    expect(qcsv).toContain('Onde está localizada a Faculdade Donaduzzi?');
  });
});

describe('PIN administrativo', () => {
  it('SHA-256 confere com vetor conhecido', () => {
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('usa PIN padrão até ser alterado', async () => {
    expect(await isDefaultPin()).toBe(true);
    expect(await verifyPin(DEFAULT_PIN)).toBe(true);
    await setPin('987654');
    expect(await isDefaultPin()).toBe(false);
    expect(await verifyPin(DEFAULT_PIN)).toBe(false);
    expect(await verifyPin('987654')).toBe(true);
    await expect(setPin('12')).rejects.toThrow();
  });
});
