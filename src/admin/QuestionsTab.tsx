import { useMemo, useRef, useState } from 'react';
import { Download, Pencil, Plus, RotateCcw, Trash2, Upload } from 'lucide-react';
import type { CategoryId, Question } from '../types';
import { useAppData } from '../store/AppDataContext';
import { CATEGORIES, categoryLabel } from '../data/categories';
import { DEFAULT_QUESTIONS, hasPlaceholder, PLACEHOLDER } from '../data/questions';
import { parseQuestionBank } from '../services/validation';
import { downloadText, newId, readFileAsText, timestampForFile } from '../services/files';
import { QuestionEditor } from './QuestionEditor';
import { Btn, Card, Notice } from './ui';

/** Pendente: sinalizada como "a confirmar" ou ainda com o marcador "PREENCHER". */
const isPending = (q: Question) => Boolean(q.pending) || hasPlaceholder(q);

export function QuestionsTab() {
  const { questions, updateQuestions, settings } = useAppData();
  const [filter, setFilter] = useState<CategoryId | 'all'>('all');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Question | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error' | 'warn'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const importMode = useRef<'replace' | 'merge'>('merge');

  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    return questions.filter(
      (q) =>
        (filter === 'all' || q.category === filter) &&
        (status === 'all' || (status === 'pending' ? isPending(q) : status === 'active' ? q.active : !q.active)) &&
        (!s || q.prompt.toLowerCase().includes(s) || q.id.toLowerCase().includes(s)),
    );
  }, [questions, filter, status, search]);

  const pendingCount = questions.filter(isPending).length;

  const shortages = CATEGORIES.filter((c) => {
    const need = settings.distribution[c.id] ?? 0;
    return need > 0 && questions.filter((q) => q.active && q.category === c.id).length < need;
  });

  async function save(q: Question) {
    const exists = questions.some((x) => x.id === (isNew ? q.id : editing?.id));
    // Ao salvar, a pergunta deixa de ser pendente, a não ser que ainda tenha "PREENCHER";
    // nesse caso continua inativa, para nunca aparecer incompleta no totem.
    const still = hasPlaceholder(q);
    const { pending: _pending, ...rest } = q;
    const saved: Question = still ? { ...rest, pending: true, active: false } : rest;
    const next = isNew || !exists ? [...questions, saved] : questions.map((x) => (x.id === editing?.id ? saved : x));
    await updateQuestions(next);
    setEditing(null);
    setMessage(
      still
        ? { tone: 'warn', text: `Pergunta "${q.id}" salva, mas ainda contém "${PLACEHOLDER}": continua inativa até o texto ser substituído.` }
        : { tone: 'ok', text: `Pergunta "${q.id}" salva.` },
    );
  }

  async function remove(q: Question) {
    if (!window.confirm(`Excluir definitivamente a pergunta "${q.prompt}"?`)) return;
    await updateQuestions(questions.filter((x) => x.id !== q.id));
    setMessage({ tone: 'ok', text: 'Pergunta excluída.' });
  }

  async function toggle(q: Question) {
    if (!q.active && hasPlaceholder(q)) {
      setMessage({ tone: 'warn', text: `A pergunta "${q.id}" ainda contém "${PLACEHOLDER}". Toque em Editar, substitua o texto e salve para poder ativá-la.` });
      return;
    }
    // Ativar uma pergunta pendente (já sem "PREENCHER") confirma o dado.
    await updateQuestions(
      questions.map((x) => {
        if (x.id !== q.id) return x;
        const { pending: _pending, ...rest } = x;
        return x.active ? { ...x, active: false } : { ...rest, active: true };
      }),
    );
  }

  async function onImport(file: File) {
    const { questions: imported, errors } = parseQuestionBank(await readFileAsText(file));
    if (!imported.length) {
      setMessage({ tone: 'error', text: errors.join(' ') || 'Nenhuma pergunta válida encontrada.' });
      return;
    }
    let next: Question[];
    if (importMode.current === 'replace') next = imported;
    else {
      const byId = new Map(questions.map((q) => [q.id, q]));
      imported.forEach((q) => byId.set(q.id, q));
      next = [...byId.values()];
    }
    await updateQuestions(next);
    setMessage({
      tone: errors.length ? 'warn' : 'ok',
      text: `${imported.length} pergunta(s) importada(s).${errors.length ? ` ${errors.length} ignorada(s): ${errors.slice(0, 3).join(' | ')}` : ''}`,
    });
  }

  const startImport = (mode: 'replace' | 'merge') => {
    importMode.current = mode;
    fileRef.current?.click();
  };

  if (editing) {
    return (
      <QuestionEditor
        initial={editing}
        isNew={isNew}
        otherIds={questions.filter((q) => q.id !== editing.id).map((q) => q.id)}
        onSave={save}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      {pendingCount > 0 && (
        <Notice tone="warn">
          {pendingCount === 1 ? 'Há 1 pergunta aguardando' : `Há ${pendingCount} perguntas aguardando`} um dado que o site oficial não confirma (ex.:
          coordenação de um curso). Elas ficam inativas: toque em Editar, substitua o texto "{PLACEHOLDER}" pelo dado correto, salve e marque
          "Ativa".{' '}
          <button type="button" className="font-bold underline" onClick={() => setStatus('pending')}>
            Ver pendentes
          </button>
        </Notice>
      )}
      {shortages.length > 0 && (
        <Notice tone="warn">
          Perguntas ativas insuficientes para a distribuição configurada em: {shortages.map((c) => c.label).join(', ')}. O sorteio completará
          com outras categorias.
        </Notice>
      )}

      <Card
        title={`Banco de perguntas (${questions.filter((q) => q.active).length} ativas de ${questions.length})`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Btn
              tone="primary"
              onClick={() => {
                setIsNew(true);
                setEditing({
                  id: newId('q-'),
                  category: filter === 'all' ? 'institucional' : filter,
                  prompt: '',
                  options: ['a', 'b', 'c', 'd'].map((id) => ({ id, text: '' })),
                  correctOptionId: 'a',
                  explanation: '',
                  active: true,
                });
              }}
            >
              <Plus className="h-5 w-5" aria-hidden="true" /> Nova pergunta
            </Btn>
            <Btn onClick={() => downloadText(`perguntas-${timestampForFile()}.json`, JSON.stringify(questions, null, 2), 'application/json')}>
              <Download className="h-5 w-5" aria-hidden="true" /> Exportar JSON
            </Btn>
            <Btn onClick={() => startImport('merge')}>
              <Upload className="h-5 w-5" aria-hidden="true" /> Importar (mesclar)
            </Btn>
            <Btn onClick={() => startImport('replace')}>
              <Upload className="h-5 w-5" aria-hidden="true" /> Importar (substituir)
            </Btn>
            <Btn
              onClick={async () => {
                if (!window.confirm('Restaurar as perguntas originais? As alterações no banco serão perdidas.')) return;
                await updateQuestions(structuredClone(DEFAULT_QUESTIONS));
                setMessage({ tone: 'ok', text: 'Banco original restaurado.' });
              }}
            >
              <RotateCcw className="h-5 w-5" aria-hidden="true" /> Restaurar padrão
            </Btn>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onImport(f);
                e.target.value = '';
              }}
            />
          </div>
        }
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <select value={filter} onChange={(e) => setFilter(e.target.value as CategoryId | 'all')} aria-label="Filtrar por categoria">
            <option value="all">Todas as categorias</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} ({questions.filter((q) => q.category === c.id).length})
              </option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Filtrar por status">
            <option value="all">Ativas e inativas</option>
            <option value="active">Somente ativas</option>
            <option value="inactive">Somente inativas</option>
            <option value="pending">A confirmar (pendentes)</option>
          </select>
          <input type="search" placeholder="Buscar por texto ou ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <ul className="divide-y divide-primary/15">
          {list.map((q) => {
            const correct = q.options.find((o) => o.id === q.correctOptionId);
            return (
              <li key={q.id} className={`flex flex-wrap items-start gap-3 py-3 ${q.active ? '' : 'opacity-55'}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-wide text-primary">
                    {q.id} · {categoryLabel(q.category)}
                    {isPending(q) && <span className="ml-2 rounded-full bg-gold/25 px-2 py-0.5 font-bold normal-case tracking-normal text-ink">A confirmar</span>}
                  </p>
                  <p className="font-semibold">{q.prompt}</p>
                  <p className="text-sm text-success">✔ {correct?.text}</p>
                </div>
                <label className="flex min-h-[44px] items-center gap-2 text-sm">
                  <input type="checkbox" checked={q.active} onChange={() => void toggle(q)} /> Ativa
                </label>
                <Btn
                  aria-label={`Editar ${q.id}`}
                  onClick={() => {
                    setIsNew(false);
                    setEditing(q);
                  }}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" /> Editar
                </Btn>
                <Btn tone="danger" aria-label={`Excluir ${q.id}`} onClick={() => void remove(q)}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Btn>
              </li>
            );
          })}
          {list.length === 0 && <li className="py-6 text-center text-ink/60">Nenhuma pergunta encontrada.</li>}
        </ul>
      </Card>
    </div>
  );
}
