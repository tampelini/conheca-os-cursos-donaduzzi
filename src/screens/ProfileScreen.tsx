import { motion } from 'framer-motion';
import { ArrowLeft, ChevronRight, EyeOff } from 'lucide-react';
import { useAppData } from '../store/AppDataContext';
import { Logo } from '../components/Logo';

interface Props {
  onChoose: (profileId: string) => void;
  onBack: () => void;
}

/**
 * Perfil anônimo do participante: um toque em uma categoria (sem nome nem dado
 * pessoal). Serve apenas para separar as estatísticas por grupo.
 */
export function ProfileScreen({ onChoose, onBack }: Props) {
  const { settings } = useAppData();
  const { prompt, options } = settings.profile;
  // Com muitas opções, os botões encolhem para caber sem rolagem.
  const compact = options.length > 5;

  return (
    <div className="relative flex h-full flex-col px-[2rem] pb-[2rem] pt-[2rem]">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex min-h-[3.5rem] items-center gap-2 rounded-xl px-3 text-[1.1rem] font-semibold text-primary active:bg-primary/10"
          aria-label="Voltar à tela inicial"
        >
          <ArrowLeft className="h-[1.5rem] w-[1.5rem]" /> Voltar
        </button>
        <Logo size="sm" />
      </div>

      <p className="mt-[1.5rem] text-center font-display text-[1.2rem] font-bold uppercase tracking-[0.2em] text-primary">Antes de começar</p>
      <h1 id="profile-title" className="text-center font-display text-[2.6rem] font-extrabold leading-tight text-heading">
        {prompt}
      </h1>

      <ul aria-labelledby="profile-title" className={`mt-[1.2rem] flex min-h-0 flex-1 flex-col justify-center ${compact ? 'gap-[0.6rem]' : 'gap-[1rem]'}`}>
        {options.map((opt, i) => (
          <motion.li key={opt.id} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.06 * i, duration: 0.3 }}>
            <button
              type="button"
              onClick={() => onChoose(opt.id)}
              className={`glass flex w-full items-center justify-between gap-[1rem] rounded-2xl border-[0.15rem] border-primary/25 px-[1.6rem] text-left font-display font-bold text-heading transition-transform active:scale-[0.97] active:border-primary active:bg-primary/10 ${
                compact ? 'min-h-[4.2rem] text-[1.5rem]' : 'min-h-[6rem] text-[1.9rem]'
              }`}
            >
              <span className="min-w-0 leading-tight">{opt.label}</span>
              <ChevronRight aria-hidden="true" className="h-[2rem] w-[2rem] shrink-0 text-primary" />
            </button>
          </motion.li>
        ))}
      </ul>

      <p className="mt-[1rem] flex items-center justify-center gap-[0.6rem] text-center text-[1.15rem] text-ink/75">
        <EyeOff aria-hidden="true" className="h-[1.4rem] w-[1.4rem] shrink-0 text-primary" />
        Resposta anônima: não pedimos nome nem dados pessoais.
      </p>
    </div>
  );
}
