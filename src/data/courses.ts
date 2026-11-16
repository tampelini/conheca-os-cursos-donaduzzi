import type { Course } from '../types';

// Dados conferidos nas páginas dos cursos em faculdadedonaduzzi.com.br (grau,
// duração, modalidade, turno e coordenação). Onde o site não informa ou se
// contradiz (coordenação de Psicologia, Direito, Pedagogia e Eng. de Bioprocessos;
// turno de Farmácia e de Pedagogia), o dado fica de fora: complete no painel.
const c = (id: string, name: string, description: string, icon: Course['icon']): Course => ({
  id,
  name,
  description,
  icon,
  enabled: true,
  highlight: true,
});

export const DEFAULT_COURSES: Course[] = [
  c('administracao', 'Administração', 'Bacharelado · 8 semestres · Presencial, noturno · Coordenação: Angélica Meurer', 'briefcase'),
  c('ads', 'Análise e Desenvolvimento de Sistemas', 'Tecnólogo · 5 semestres · Presencial, noturno · Coordenação: Fabiane Sorbar', 'monitor'),
  c('ciencia-de-dados', 'Ciência de Dados', 'Tecnólogo · 5 semestres · Presencial, noturno · Coordenação: Leonardo Garcia Tampelini', 'database'),
  c('direito', 'Direito', 'Bacharelado · 10 semestres · Presencial, matutino e noturno', 'scale'),
  c('engenharia-de-bioprocessos-e-biotecnologia', 'Engenharia de Bioprocessos e Biotecnologia', 'Bacharelado · 10 semestres · Presencial, noturno', 'dna'),
  c('engenharia-de-software', 'Engenharia de Software', 'Bacharelado · 8 semestres · Presencial, noturno · Coordenação: Fabiane Sorbar', 'code'),
  c('farmacia', 'Farmácia', 'Bacharelado · 10 semestres · Presencial · Coordenação: Me. Schirlei Diana Kleinubing Silva', 'pill'),
  c('inteligencia-artificial', 'Inteligência Artificial', 'Bacharelado · 8 semestres · Presencial, noturno · Coordenação: Leonardo Garcia Tampelini', 'brain'),
  c('pedagogia', 'Pedagogia', 'Licenciatura · 8 semestres · Presencial', 'book'),
  c('psicologia', 'Psicologia', 'Bacharelado · 10 semestres · Presencial, noturno', 'users'),
];
