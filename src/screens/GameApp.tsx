import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { enterFullscreen, useSecretCorner } from '../hooks/kiosk';
import { useAppData } from '../store/AppDataContext';
import { gameReducer, initialGameState, sessionToRecord } from '../store/gameReducer';
import { selectQuestions } from '../game/selection';
import { getRecentQuestionIds, pushRecentGame } from '../services/repository';
import { putGame } from '../services/db';
import { playSound, unlockAudio } from '../services/sound';
import { applyUpdate, onUpdateAvailable } from '../services/pwa';
import { newId } from '../services/files';
import type { SurveyAnswers } from '../types';
import { useIdle } from '../hooks/useIdle';
import { TechBackground } from '../components/TechBackground';
import { AttractScreen } from './AttractScreen';
import { InstructionsScreen } from './InstructionsScreen';
import { SurveyScreen } from './SurveyScreen';
import { ProfileScreen } from './ProfileScreen';
import { QuestionScreen } from './QuestionScreen';
import { ResultScreen } from './ResultScreen';
import { CoursesScreen } from './CoursesScreen';

export function GameApp() {
  const { settings, questions } = useAppData();
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const recentIds = useRef<string[]>([]);
  const updatePending = useRef(false);
  /** Perfil anônimo escolhido nesta rodada (undefined = tela de perfil desativada). */
  const profile = useRef<string | undefined>(undefined);
  const secretTap = useSecretCorner();
  const { phase, session } = state;

  // Atualizações da aplicação só são aplicadas na tela inicial.
  useEffect(() => onUpdateAvailable((a) => (updatePending.current = a)), []);
  useEffect(() => {
    if (phase === 'attract' && updatePending.current) {
      const t = window.setTimeout(applyUpdate, 1500);
      return () => window.clearTimeout(t);
    }
  }, [phase]);

  // Persistência anônima da partida (inclusive partidas abandonadas).
  const answeredCount = session?.answers.length ?? 0;
  useEffect(() => {
    if (!session) return;
    void putGame(sessionToRecord(session, settings.pointsPerQuestion));
    if (session.endedAt !== null && answeredCount === session.questions.length) {
      void pushRecentGame(session.questions.map((q) => q.id), settings.avoidRecentGames);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, answeredCount]);

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  // Retorno automático à tela inicial após inatividade.
  const idleMs =
    phase === 'courses' ? settings.coursesIdleSeconds * 1000 : phase === 'attract' ? 0 : settings.idleSeconds * 1000;
  useIdle(idleMs, reset, phase !== 'attract', `${phase}-${session?.index ?? ''}`);

  const openInstructions = useCallback(() => {
    unlockAudio();
    if (settings.fullscreenOnStart) enterFullscreen();
    getRecentQuestionIds()
      .then((ids) => (recentIds.current = ids))
      .catch(() => (recentIds.current = []));
    profile.current = undefined;
    dispatch({ type: 'OPEN_INSTRUCTIONS' });
  }, [settings.fullscreenOnStart]);

  const surveyOn = settings.survey.enabled && settings.survey.items.length > 0;

  const begin = useCallback((survey?: SurveyAnswers | null) => {
    unlockAudio();
    const picked = selectQuestions(questions, {
      questionsPerGame: settings.questionsPerGame,
      distribution: settings.distribution,
      recentIds: recentIds.current,
    });
    if (picked.length === 0) return;
    playSound('start');
    dispatch({ type: 'BEGIN', id: newId('g-'), questions: picked, now: Date.now(), survey, profile: profile.current });
  }, [questions, settings.questionsPerGame, settings.distribution]);

  const profileOn = settings.profile.enabled && settings.profile.options.length > 0;

  // Instruções → perfil (se ligado) → pesquisa (se ligada) → perguntas.
  const afterProfile = useCallback(() => {
    if (surveyOn) dispatch({ type: 'OPEN_SURVEY' });
    else begin();
  }, [surveyOn, begin]);

  const afterInstructions = useCallback(() => {
    if (profileOn) dispatch({ type: 'OPEN_PROFILE' });
    else afterProfile();
  }, [profileOn, afterProfile]);

  const chooseProfile = useCallback(
    (id: string) => {
      // Toques repetidos na mesma tela não trocam a escolha nem avançam duas vezes.
      if (profile.current !== undefined) return;
      profile.current = id;
      playSound('next');
      afterProfile();
    },
    [afterProfile],
  );

  const answer = useCallback(
    (optionId: string | null) => {
      dispatch({ type: 'ANSWER', optionId, now: Date.now() });
    },
    [],
  );

  const next = useCallback(() => {
    if (session && session.index >= session.questions.length - 1) playSound('finish');
    else playSound('next');
    dispatch({ type: 'NEXT', now: Date.now() });
  }, [session]);

  const noQuestions = questions.filter((q) => q.active).length === 0;

  return (
    <div className="stage-backdrop">
      <main className="stage" onContextMenu={(e) => e.preventDefault()} onPointerDownCapture={secretTap}>
        {/* Fundo estático atrás das telas claras: animá-lo forçaria redesenho contínuo. */}
        <TechBackground intensity={0.35} animated={false} />
        {/* Faixa vinho no topo, como a barra superior do site. */}
        <div aria-hidden="true" className="absolute inset-x-0 top-0 z-10 h-[0.5rem] bg-gradient-to-r from-brand via-primary to-brand" />
        {/* Sem "wait": a tela nova surge enquanto a anterior some (esmaecimento cruzado). */}
        <AnimatePresence initial={false}>
          <motion.div
            key={phase}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {phase === 'attract' && <AttractScreen onStart={openInstructions} disabled={noQuestions} />}
            {phase === 'instructions' && (
              <InstructionsScreen onBegin={afterInstructions} beginLabel={profileOn || surveyOn ? 'CONTINUAR' : 'COMEÇAR'} onBack={reset} />
            )}
            {phase === 'profile' && <ProfileScreen onChoose={chooseProfile} onBack={reset} />}
            {phase === 'survey' && <SurveyScreen onBegin={begin} onBack={reset} />}
            {phase === 'question' && session && (
              <QuestionScreen session={session} revealed={state.revealed} onAnswer={answer} onNext={next} />
            )}
            {phase === 'result' && session && (
              <ResultScreen
                session={session}
                onCourses={() => dispatch({ type: 'SHOW_COURSES' })}
                onPlayAgain={openInstructions}
              />
            )}
            {phase === 'courses' && <CoursesScreen onPlayAgain={openInstructions} onHome={reset} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
