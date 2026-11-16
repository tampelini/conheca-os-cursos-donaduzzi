import { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, Trash2 } from 'lucide-react';
import type { GameRecord } from '../types';
import { useAppData } from '../store/AppDataContext';
import { clearGames, getAllGames } from '../services/db';
import {
  gamesToCsv, groupsToCsv, profileLabel, questionStatsToCsv, summarize, summarizeByCategory, summarizeByProfile, summarizeSurvey,
  type GroupStats,
} from '../services/stats';
import { SurveyStats } from './SurveyStats';
import { downloadText, timestampForFile } from '../services/files';
import { formatDuration } from '../game/scoring';
import { categoryLabel } from '../data/categories';
import { Btn, Card, Notice } from './ui';

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-primary/20 bg-bg/40 p-4">
      <p className="text-sm text-ink/70">{label}</p>
      <p className="font-display text-2xl font-bold">{value}</p>
    </div>
  );
}

/** Barras horizontais de % de acerto (tema ou perfil). */
function PercentBars({ rows, showGames }: { rows: GroupStats[]; showGames?: boolean }) {
  return (
    <ul className="grid gap-3">
      {rows.map((s) => (
        <li key={s.id}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 text-sm">
            <span className="font-semibold">{s.label}</span>
            <span className="text-ink/70">
              {showGames ? `${s.games} ${s.games === 1 ? 'partida' : 'partidas'} · ` : ''}
              {s.answers ? `${s.correct} de ${s.answers} respostas certas · ` : ''}
              <strong className="text-ink">{s.answers ? `${Math.round(s.percent)}%` : 'sem respostas'}</strong>
            </span>
          </div>
          <div className="mt-1 h-3 overflow-hidden rounded-full bg-primary/10" role="img" aria-label={`${s.label}: ${Math.round(s.percent)}% de acerto`}>
            <div className="h-full rounded-full bg-primary" style={{ width: `${s.percent}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function StatsTab() {
  const { questions, settings } = useAppData();
  const [games, setGames] = useState<GameRecord[] | null>(null);
  const load = () => getAllGames().then(setGames).catch(() => setGames([]));
  useEffect(() => {
    void load();
  }, []);

  const summary = useMemo(() => summarize(games ?? []), [games]);
  const survey = useMemo(() => summarizeSurvey(games ?? [], settings.survey.items, questions), [games, settings.survey.items, questions]);
  const byCategory = useMemo(() => summarizeByCategory(games ?? [], questions), [games, questions]);
  const byProfile = useMemo(() => summarizeByProfile(games ?? [], settings.profile.options), [games, settings.profile.options]);
  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
  const maxScore = settings.questionsPerGame * settings.pointsPerQuestion;
  const buckets = Array.from({ length: settings.questionsPerGame + 1 }, (_, i) => i * settings.pointsPerQuestion);
  const maxBucket = Math.max(1, ...buckets.map((b) => summary.scoreDistribution[b] ?? 0));

  if (!games) return <p>Carregando estatísticas…</p>;
  const stamp = timestampForFile();

  return (
    <div className="flex flex-col gap-4">
      <Notice tone="info">Estatísticas anônimas, armazenadas apenas neste aparelho. Nenhum dado pessoal é coletado.</Notice>
      <Card
        title="Resumo"
        actions={
          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => void load()}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Atualizar
            </Btn>
            <Btn onClick={() => downloadText(`partidas-${stamp}.csv`, gamesToCsv(games, settings.survey.items, settings.profile.options), 'text/csv')}>
              <Download className="h-4 w-4" aria-hidden="true" /> CSV de partidas
            </Btn>
            <Btn onClick={() => downloadText(`perguntas-estatisticas-${stamp}.csv`, questionStatsToCsv(summary, questions), 'text/csv')}>
              <Download className="h-4 w-4" aria-hidden="true" /> CSV por pergunta
            </Btn>
            <Btn onClick={() => downloadText(`temas-e-perfis-${stamp}.csv`, groupsToCsv(byCategory, byProfile), 'text/csv')}>
              <Download className="h-4 w-4" aria-hidden="true" /> CSV por tema e perfil
            </Btn>
            <Btn
              tone="danger"
              onClick={async () => {
                if (!window.confirm('Apagar todas as estatísticas deste aparelho? Exporte o CSV antes, se necessário.')) return;
                await clearGames();
                void load();
              }}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Zerar
            </Btn>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Participantes (partidas iniciadas)" value={summary.started} />
          <Stat label="Partidas concluídas" value={summary.completed} />
          <Stat label="Taxa de conclusão" value={summary.started ? `${Math.round((summary.completed / summary.started) * 100)}%` : '—'} />
          <Stat label="Pontuação média" value={summary.completed ? `${Math.round(summary.avgScore)} / ${maxScore}` : '—'} />
          <Stat label="Tempo médio" value={summary.completed ? formatDuration(summary.avgDurationMs) : '—'} />
        </div>
      </Card>

      <Card title="Acerto por tema">
        <p className="mb-3 text-sm text-ink/70">Quanto menor o percentual, menos os participantes conhecem o assunto.</p>
        <PercentBars rows={byCategory} />
      </Card>

      <Card title="Participantes e acerto por perfil">
        {!settings.profile.enabled && <p className="mb-3 text-sm text-gold">A tela de perfil está desligada (Configurações → Perfil do participante).</p>}
        <PercentBars rows={byProfile} showGames />
      </Card>

      <SurveyStats summary={survey} enabled={settings.survey.enabled} />

      <Card title="Distribuição de pontuações (partidas concluídas)">
        <div className="flex h-40 items-end gap-1" role="img" aria-label="Histograma de pontuações">
          {buckets.map((b) => {
            const n = summary.scoreDistribution[b] ?? 0;
            return (
              <div key={b} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs">{n || ''}</span>
                <div className="w-full rounded-t bg-gold" style={{ height: `${(n / maxBucket) * 100}%`, minHeight: n ? 4 : 0 }} />
                <span className="text-[10px] text-ink/60">{b}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Desempenho por pergunta (menor acerto primeiro)">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-ink/70">
              <tr>
                <th className="p-2">Pergunta</th>
                <th className="p-2">Exibida</th>
                <th className="p-2">Acertos</th>
                <th className="p-2">Erros</th>
                <th className="p-2">Tempo esgotado</th>
                <th className="p-2">% acerto</th>
                <th className="p-2">Respostas (A/B/C/D originais)</th>
              </tr>
            </thead>
            <tbody>
              {summary.perQuestion
                .slice()
                .sort((a, b) => a.correct / a.shown - b.correct / b.shown || b.shown - a.shown)
                .map((s) => {
                  const q = byId.get(s.questionId);
                  return (
                    <tr key={s.questionId} className="border-t border-primary/15">
                      <td className="max-w-[320px] p-2">
                        <span className="block text-xs text-primary">
                          {s.questionId} {q ? `· ${categoryLabel(q.category)}` : ''}
                        </span>
                        {q?.prompt ?? '(pergunta removida)'}
                      </td>
                      <td className="p-2">{s.shown}</td>
                      <td className="p-2 text-success">{s.correct}</td>
                      <td className="p-2 text-danger">{s.wrong}</td>
                      <td className="p-2">{s.timeouts}</td>
                      <td className="p-2">{s.shown ? `${Math.round((s.correct / s.shown) * 100)}%` : '—'}</td>
                      <td className="p-2 font-mono">
                        {['a', 'b', 'c', 'd'].map((id) => (
                          <span key={id} className={q?.correctOptionId === id ? 'font-bold text-success' : ''}>
                            {s.choices[id] ?? 0}
                            {id !== 'd' ? ' / ' : ''}
                          </span>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              {summary.perQuestion.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-ink/60">
                    Ainda não há partidas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Últimas partidas">
        <ul className="divide-y divide-primary/15 text-sm">
          {games
            .slice(-30)
            .reverse()
            .map((g) => (
              <li key={g.id} className="flex flex-wrap gap-x-6 gap-y-1 py-2">
                <span>{new Date(g.startedAt).toLocaleString('pt-BR')}</span>
                <span className={g.completed ? 'text-success' : 'text-gold'}>{g.completed ? 'Concluída' : 'Abandonada'}</span>
                {g.profile !== undefined && <span>{profileLabel(g.profile, settings.profile.options)}</span>}
                <span>
                  {g.score} pts · {g.correctCount}/{g.totalQuestions}
                </span>
                {g.durationMs !== null && <span>{formatDuration(g.durationMs)}</span>}
              </li>
            ))}
        </ul>
      </Card>
    </div>
  );
}
