import type { Category, CategoryId } from '../types';

export const CATEGORIES: Category[] = [
  { id: 'institucional', label: 'A Faculdade' },
  { id: 'cpa', label: 'CPA e Avaliação' },
  { id: 'tecnologia', label: 'Cursos de Tecnologia' },
  { id: 'saude', label: 'Saúde e Biociências' },
  { id: 'gestao', label: 'Gestão, Educação e Direito' },
  { id: 'metodologia', label: 'Metodologia e Pós-graduação' },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export function categoryLabel(id: CategoryId): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}
