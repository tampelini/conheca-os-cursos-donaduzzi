import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Btn, Notice } from '../../admin/ui';
import { resolveActive, useMassa } from '../store';
import { EventsPanel } from './EventsPanel';
import { SurveysPanel } from './SurveysPanel';
import { TotemPanel } from './TotemPanel';
import { ParticipantsPanel } from './ParticipantsPanel';

const SECTIONS = [
  { id: 'events', label: 'Eventos' },
  { id: 'surveys', label: 'Pesquisas e perguntas' },
  { id: 'totem', label: 'Totem, textos e consentimento' },
  { id: 'participants', label: 'Participantes e resultados' },
] as const;
type SectionId = (typeof SECTIONS)[number]['id'];

export function MassaAdmin() {
  const massa = useMassa();
  const [section, setSection] = useState<SectionId>('events');
  const active = resolveActive(massa);

  if (!massa.ready) return <p>Carregando…</p>;

  return (
    <div className="flex flex-col gap-4">
      <Notice tone={active ? 'info' : 'warn'}>
        {active ? (
          <>
            No totem agora: evento <strong>{active.event.name}</strong>, pesquisa <strong>{active.survey.name}</strong> ({active.questions.length}{' '}
            {active.questions.length === 1 ? 'pergunta ativa' : 'perguntas ativas'}).
          </>
        ) : (
          <>Nenhum evento ativo com pesquisa vinculada está em uso no totem. Em Eventos, toque em "Usar no totem".</>
        )}{' '}
        {massa.config.startExperience === 'massa' ? 'O totem abre direto na Pesquisa Massa FM.' : 'O totem abre no quiz; a pesquisa fica em #/massa.'}
      </Notice>
      <div className="flex flex-wrap items-center gap-2">
        <nav className="flex flex-wrap gap-2" aria-label="Seções da Pesquisa Massa FM">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              aria-current={section === s.id ? 'page' : undefined}
              className={`min-h-[44px] rounded-full px-4 font-semibold ${section === s.id ? 'bg-primary text-bg' : 'border border-primary/30 bg-surface text-ink'}`}
            >
              {s.label}
            </button>
          ))}
        </nav>
        <Btn
          className="ml-auto"
          onClick={() => {
            window.location.hash = '#/massa';
          }}
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" /> Abrir a pesquisa no totem
        </Btn>
      </div>
      {section === 'events' && <EventsPanel />}
      {section === 'surveys' && <SurveysPanel />}
      {section === 'totem' && <TotemPanel />}
      {section === 'participants' && <ParticipantsPanel />}
    </div>
  );
}
