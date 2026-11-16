import type { Settings } from '../types';

// Paleta extraída de faculdadedonaduzzi.com.br (vinho, carmim, rosa, creme).
export const DEFAULT_COLORS = {
  brand: '#541822',
  cream: '#f7ebb5',
  bg: '#ffffff',
  surface: '#f1f1f1',
  primary: '#a31938',
  accent: '#cc3366',
  success: '#15803d',
  danger: '#dc2626',
  gold: '#e9b949',
  ink: '#333333',
};

export const DEFAULT_SETTINGS: Settings = {
  institutionName: 'FACULDADE DONADUZZI',
  gameName: 'CONHEÇA OS CURSOS',
  tagline: 'O quanto você conhece a nossa Faculdade?',
  intro: 'Teste o que você sabe sobre os cursos, a CPA e a Faculdade Donaduzzi. É rápido e anônimo!',
  // Logotipo oficial (public/assets), empacotado no app para funcionar offline.
  logo: './assets/logo-donaduzzi.png',
  logoOnDark: '',
  logoLinkUrl: 'https://faculdadedonaduzzi.com.br/cursos-de-graduacao/',
  colors: DEFAULT_COLORS,
  questionsPerGame: 10,
  distribution: { institucional: 2, cpa: 3, tecnologia: 2, saude: 1, gestao: 1, metodologia: 1 },
  pointsPerQuestion: 100,
  timePerQuestion: 20,
  idleSeconds: 60,
  coursesIdleSeconds: 30,
  soundEnabled: true,
  fullscreenOnStart: true,
  // Página oficial dos cursos de graduação (QR Code gerado no próprio aparelho).
  qrUrl: 'https://faculdadedonaduzzi.com.br/cursos-de-graduacao/',
  qrLabel: 'Aponte a câmera do celular e veja todos os cursos no site',
  coursesTitle: 'CONHEÇA PARA INDICAR!',
  resultTiers: [
    { minPercent: 0, title: 'BOA TENTATIVA!', message: 'Agora você já sabe um pouco mais sobre a nossa Faculdade. Que tal jogar de novo?' },
    { minPercent: 40, title: 'MUITO BEM!', message: 'Você já conhece bastante. Veja os cursos e descubra o que faltou!' },
    { minPercent: 70, title: 'VOCÊ MANDOU MUITO BEM!', message: 'Excelente! Você conhece de verdade os cursos e a instituição.' },
    { minPercent: 100, title: 'PONTUAÇÃO MÁXIMA!', message: 'Incrível! Você sabe tudo sobre a Faculdade Donaduzzi!' },
  ],
  avoidRecentGames: 3,
  survey: {
    enabled: true,
    allowSkip: true,
    items: [
      { id: 'cursos', prompt: 'O quanto você conhece os cursos da Faculdade Donaduzzi?', subject: 'os cursos da Faculdade', category: null },
      { id: 'cpa', prompt: 'O quanto você conhece a CPA?', subject: 'a CPA', category: 'cpa' },
    ],
  },
  profile: {
    enabled: true,
    prompt: 'Qual é o seu vínculo com a Faculdade?',
    options: [
      { id: 'docente', label: 'Docente' },
      { id: 'tecnico', label: 'Técnico-administrativo' },
      { id: 'estudante', label: 'Estudante' },
      { id: 'visitante', label: 'Visitante' },
    ],
  },
};
