import { DEFAULT_QUESTIONS, hasPlaceholder } from '../data/questions';
import { CATEGORY_IDS } from '../data/categories';
import { validateQuestion, parseQuestionBank } from '../services/validation';

describe('banco de perguntas padrão', () => {
  const active = DEFAULT_QUESTIONS.filter((q) => q.active);

  it('tem 60 perguntas ativas e IDs únicos em todo o banco', () => {
    expect(active).toHaveLength(60);
    expect(new Set(DEFAULT_QUESTIONS.map((q) => q.id)).size).toBe(DEFAULT_QUESTIONS.length);
  });

  it('tem 10 perguntas ativas em cada uma das 6 categorias', () => {
    for (const c of CATEGORY_IDS) expect(active.filter((q) => q.category === c)).toHaveLength(10);
  });

  it('dados não confirmados no site ficam pendentes e inativos', () => {
    const pend = DEFAULT_QUESTIONS.filter((q) => q.pending);
    expect(pend.map((q) => q.id)).toEqual(['pend-psi-coord', 'pend-dir-coord', 'pend-ped-coord', 'pend-bio-coord', 'pend-far-turno']);
    expect(pend.every((q) => !q.active)).toBe(true);
    // Nenhuma pergunta ativa carrega o marcador "PREENCHER".
    expect(active.some(hasPlaceholder)).toBe(false);
  });

  it('todas as perguntas passam na validação', () => {
    for (const q of DEFAULT_QUESTIONS) expect(validateQuestion(q)).toEqual([]);
  });

  it('respostas corretas conferem com o site oficial (amostra)', () => {
    const answer = (id: string) => {
      const q = DEFAULT_QUESTIONS.find((x) => x.id === id)!;
      return q.options.find((o) => o.id === q.correctOptionId)!.text;
    };
expect(answer('inst-02')).toBe('Transformar a sociedade por meio da excelência na educação, garantindo acessibilidade a todos');
    expect(answer('cpa-01')).toBe('Comissão Própria de Avaliação');
    expect(answer('cpa-02')).toBe('Lei nº 10.861/2004');
    expect(answer('tec-02')).toBe('5 semestres (2 anos e meio)');
    expect(answer('sau-01')).toBe('10 semestres');
    expect(answer('ges-04')).toBe('Pedagogia');
    expect(answer('met-03')).toBe('Professores-mentores');
  });
});

describe('validação de perguntas', () => {
  const base = structuredClone(DEFAULT_QUESTIONS[0]);

  it('rejeita alternativa correta inexistente', () => {
    expect(validateQuestion({ ...base, correctOptionId: 'z' })).toContain('Defina a alternativa correta.');
  });
  it('rejeita alternativas vazias e enunciado vazio', () => {
    const errs = validateQuestion({ ...base, prompt: ' ', options: base.options.map((o, i) => (i === 0 ? { ...o, text: '' } : o)) });
    expect(errs).toContain('O enunciado é obrigatório.');
    expect(errs).toContain('Todas as alternativas precisam de texto.');
  });
  it('rejeita ID duplicado', () => {
    expect(validateQuestion(base, [base.id]).join()).toMatch(/já existe/);
  });
  it('importa JSON válido e aponta itens inválidos', () => {
    const json = JSON.stringify([base, { ...base, id: 'x-1', options: [] }]);
    const res = parseQuestionBank(json);
    expect(res.questions).toHaveLength(1);
    expect(res.errors).toHaveLength(1);
    expect(parseQuestionBank('{oops').errors[0]).toMatch(/inválido/);
  });
});
