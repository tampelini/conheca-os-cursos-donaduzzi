import type { CategoryId, GameRecord, ProfileOption, Question, SurveyItem } from '../types';
import { CATEGORIES, categoryLabel } from '../data/categories';
import { SURVEY_SCALE, scaleLabel } from '../data/survey';

export interface QuestionStats {
  questionId: string;
  shown: number;
  correct: number;
  wrong: number;
  timeouts: number;
  /** Contagem por ID original da alternativa (a, b, c, d…). */
  choices: Record<string, number>;
  avgTimeMs: number;
}

export interface Summary {
  started: number;
  completed: number;
  avgScore: number;
  avgDurationMs: number;
  scoreDistribution: Record<number, number>;
  perQuestion: QuestionStats[];
}

export function summarize(games: readonly GameRecord[]): Summary {
  const completed = games.filter((g) => g.completed);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const scoreDistribution: Record<number, number> = {};
  for (const g of completed) scoreDistribution[g.score] = (scoreDistribution[g.score] ?? 0) + 1;

  const map = new Map<string, QuestionStats & { totalTime: number }>();
  for (const g of games) {
    for (const a of g.answers) {
      let s = map.get(a.questionId);
      if (!s) {
        s = { questionId: a.questionId, shown: 0, correct: 0, wrong: 0, timeouts: 0, choices: {}, avgTimeMs: 0, totalTime: 0 };
        map.set(a.questionId, s);
      }
      s.shown++;
      s.totalTime += a.timeMs;
      if (a.correct) s.correct++;
      else if (a.timedOut) s.timeouts++;
      else s.wrong++;
      if (a.chosenOptionId) s.choices[a.chosenOptionId] = (s.choices[a.chosenOptionId] ?? 0) + 1;
    }
  }
  const perQuestion = [...map.values()].map(({ totalTime, ...s }) => ({ ...s, avgTimeMs: s.shown ? totalTime / s.shown : 0 }));

  return {
    started: games.length,
    completed: completed.length,
    avgScore: avg(completed.map((g) => g.score)),
    avgDurationMs: avg(completed.map((g) => g.durationMs ?? 0)),
    scoreDistribution,
    perQuestion,
  };
}

// CSV com ";" e BOM UTF-8: abre corretamente no Excel em português.
const SEP = ';';
function cell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCsv(rows: unknown[][]): string {
  return '﻿' + rows.map((r) => r.map(cell).join(SEP)).join('\r\n');
}
const iso = (t: number | null) => (t ? new Date(t).toLocaleString('pt-BR') : '');

export function gamesToCsv(
  games: readonly GameRecord[],
  surveyItems: readonly SurveyItem[] = [],
  profiles: readonly ProfileOption[] = [],
): string {
  const rows: unknown[][] = [[
    'id', 'inicio', 'fim', 'concluida', 'perfil', 'pontuacao', 'acertos', 'total_perguntas', 'duracao_segundos',
    ...surveyItems.map((it) => `pesquisa_${it.id}`),
  ]];
  for (const g of games) {
    rows.push([
      g.id, iso(g.startedAt), iso(g.endedAt), g.completed ? 'sim' : 'nao', profileLabel(g.profile, profiles), g.score, g.correctCount, g.totalQuestions,
      g.durationMs !== null ? (g.durationMs / 1000).toFixed(1) : '',
      ...surveyItems.map((it) => {
        if (g.survey === undefined) return '';
        if (g.survey === null) return 'pulou';
        const r = g.survey[it.id];
        return r ? `${r} - ${scaleLabel(r)}` : '';
      }),
    ]);
  }
  return toCsv(rows);
}

// ---------- Acerto por tema e por perfil ----------

export interface GroupStats {
  id: string;
  label: string;
  /** Partidas iniciadas pelo grupo (só no agrupamento por perfil). */
  games: number;
  completed: number;
  /** Respostas dadas (inclui tempo esgotado). */
  answers: number;
  correct: number;
  /** Percentual de acerto (0–100); 0 quando não há respostas. */
  percent: number;
}

const NO_PROFILE = '(sem perfil)';

export function profileLabel(id: string | undefined, profiles: readonly ProfileOption[]): string {
  if (id === undefined) return '';
  // Opção removida do painel depois da partida: mostra o ID gravado.
  return profiles.find((p) => p.id === id)?.label ?? id;
}

const percentOf = (correct: number, answers: number) => (answers ? (correct / answers) * 100 : 0);

/** Acerto por tema: mostra o que os participantes sabem (ou não) de cada assunto. */
export function summarizeByCategory(games: readonly GameRecord[], questions: readonly Question[]): GroupStats[] {
  const categoryOf = new Map(questions.map((q) => [q.id, q.category]));
  const acc = new Map<CategoryId, { answers: number; correct: number }>(CATEGORIES.map((c) => [c.id, { answers: 0, correct: 0 }]));
  for (const g of games) {
    for (const a of g.answers) {
      const slot = acc.get(categoryOf.get(a.questionId) as CategoryId);
      if (!slot) continue; // pergunta removida do banco
      slot.answers++;
      if (a.correct) slot.correct++;
    }
  }
  return CATEGORIES.map((c) => {
    const s = acc.get(c.id)!;
    return { id: c.id, label: c.label, games: 0, completed: 0, answers: s.answers, correct: s.correct, percent: percentOf(s.correct, s.answers) };
  });
}

/** Participação e acerto por perfil anônimo (docente, técnico-administrativo…). */
export function summarizeByProfile(games: readonly GameRecord[], profiles: readonly ProfileOption[]): GroupStats[] {
  const order = [...profiles.map((p) => p.id)];
  const acc = new Map<string, GroupStats>();
  const slot = (id: string, label: string) => {
    let s = acc.get(id);
    if (!s) {
      s = { id, label, games: 0, completed: 0, answers: 0, correct: 0, percent: 0 };
      acc.set(id, s);
      if (!order.includes(id)) order.push(id);
    }
    return s;
  };
  profiles.forEach((p) => slot(p.id, p.label));
  for (const g of games) {
    const s = g.profile === undefined ? slot(NO_PROFILE, NO_PROFILE) : slot(g.profile, profileLabel(g.profile, profiles));
    s.games++;
    if (g.completed) s.completed++;
    s.answers += g.answers.length;
    s.correct += g.answers.filter((a) => a.correct).length;
  }
  return order.map((id) => acc.get(id)!).map((s) => ({ ...s, percent: percentOf(s.correct, s.answers) }));
}

export function groupsToCsv(byCategory: readonly GroupStats[], byProfile: readonly GroupStats[]): string {
  const rows: unknown[][] = [['agrupamento', 'grupo', 'partidas', 'concluidas', 'respostas', 'acertos', 'percentual_acerto']];
  for (const s of byCategory) rows.push(['tema', s.label, '', '', s.answers, s.correct, s.percent.toFixed(1)]);
  for (const s of byProfile) rows.push(['perfil', s.label, s.games, s.completed, s.answers, s.correct, s.percent.toFixed(1)]);
  return toCsv(rows);
}

// ---------- Pesquisa "o quanto você conhece…" ----------

export interface SurveyCross {
  rating: number;
  games: number;
  correct: number;
  total: number;
}

export interface SurveyItemStats {
  item: SurveyItem;
  responses: number;
  /** Quantidade por nota (índice 0 = nota 1 … índice 4 = nota 5). */
  counts: number[];
  average: number;
  /** Acerto nas perguntas da categoria do item, por nota de autoavaliação. */
  cross: SurveyCross[];
}

export interface SurveySummary {
  /** Partidas em que a pesquisa foi exibida. */
  shown: number;
  answered: number;
  skipped: number;
  items: SurveyItemStats[];
}

export function summarizeSurvey(
  games: readonly GameRecord[],
  items: readonly SurveyItem[],
  questions: readonly Question[],
): SurveySummary {
  const categoryOf = new Map(questions.map((q) => [q.id, q.category]));
  const withSurvey = games.filter((g) => g.survey !== undefined);
  const answered = withSurvey.filter((g) => g.survey);
  return {
    shown: withSurvey.length,
    answered: answered.length,
    skipped: withSurvey.length - answered.length,
    items: items.map((item) => {
      const counts = SURVEY_SCALE.map(() => 0);
      const cross: SurveyCross[] = SURVEY_SCALE.map((_, i) => ({ rating: i + 1, games: 0, correct: 0, total: 0 }));
      let sum = 0;
      for (const g of answered) {
        const r = g.survey?.[item.id];
        if (!r || r < 1 || r > 5) continue;
        counts[r - 1]++;
        sum += r;
        if (item.category && g.completed) {
          const mine = g.answers.filter((a) => categoryOf.get(a.questionId) === item.category);
          if (mine.length) {
            const c = cross[r - 1];
            c.games++;
            c.total += mine.length;
            c.correct += mine.filter((a) => a.correct).length;
          }
        }
      }
      const responses = counts.reduce((a, b) => a + b, 0);
      return { item, responses, counts, average: responses ? sum / responses : 0, cross };
    }),
  };
}

export function surveyToCsv(summary: SurveySummary): string {
  const rows: unknown[][] = [['pergunta', 'resposta', 'quantidade', 'percentual']];
  for (const s of summary.items) {
    SURVEY_SCALE.forEach((label, i) => {
      rows.push([s.item.prompt, `${i + 1} - ${label}`, s.counts[i], s.responses ? ((s.counts[i] / s.responses) * 100).toFixed(1) : '0']);
    });
    rows.push([s.item.prompt, 'média (1 a 5)', s.responses, s.average.toFixed(2)]);
  }
  rows.push(['(geral)', 'pularam a pesquisa', summary.skipped, summary.shown ? ((summary.skipped / summary.shown) * 100).toFixed(1) : '0']);
  return toCsv(rows);
}

export function questionStatsToCsv(summary: Summary, questions: readonly Question[]): string {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const rows: unknown[][] = [[
    'id', 'categoria', 'enunciado', 'exibida', 'acertos', 'erros', 'tempo_esgotado', 'percentual_acerto',
    'tempo_medio_s', 'escolhas_a', 'escolhas_b', 'escolhas_c', 'escolhas_d',
  ]];
  for (const s of summary.perQuestion) {
    const q = byId.get(s.questionId);
    rows.push([
      s.questionId, q ? categoryLabel(q.category) : '', q?.prompt ?? '(removida)', s.shown, s.correct, s.wrong, s.timeouts,
      s.shown ? ((s.correct / s.shown) * 100).toFixed(1) : '0', (s.avgTimeMs / 1000).toFixed(1),
      s.choices.a ?? 0, s.choices.b ?? 0, s.choices.c ?? 0, s.choices.d ?? 0,
    ]);
  }
  return toCsv(rows);
}
