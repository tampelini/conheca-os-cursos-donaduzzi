import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, Check, ExternalLink, PartyPopper, X } from 'lucide-react';
import { useIdle } from '../hooks/useIdle';
import { enterFullscreenAnyOrientation, useSecretCorner } from '../hooks/kiosk';
import { openExternal } from '../services/externalLink';
import { playSound, unlockAudio } from '../services/sound';
import { QrCode } from '../components/QrCode';
import { useAppData } from '../store/AppDataContext';
import { MassaFooter, MassaLogo, massaThemeStyle } from './MassaBrand';
import { DuplicatePhoneError, phoneAlreadyInEvent, resolveActive, submitParticipation, useMassa } from './store';
import { isAnswered, isWebUrl, maskPhone, missingRequired, nameError, phoneError } from './validation';
import type { MassaDraftAnswers, MassaQuestion } from './types';

type Phase = 'start' | 'identify' | 'questions' | 'consent' | 'thanks';

const DUPLICATE_MESSAGE = 'Este telefone já participou desta pesquisa neste evento. Obrigado pelo carinho! Cada pessoa participa uma vez.';
const SAVE_ERROR_MESSAGE = 'Não foi possível salvar agora. Seus dados continuam na tela: toque em FINALIZAR para tentar de novo.';

interface Draft {
  name: string;
  phone: string;
  answers: MassaDraftAnswers;
  consent: boolean;
  marketing: boolean;
}
// Consentimentos sempre começam desmarcados.
const emptyDraft = (): Draft => ({ name: '', phone: '', answers: {}, consent: false, marketing: false });

/** Caixa de seleção grande, acionada por toque (o texto todo é clicável). */
function CheckRow({ checked, onChange, children, testId }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; testId?: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      data-testid={testId}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-[1rem] rounded-[1.1rem] border-[0.15rem] border-[#d5d9ee] bg-[#f4f6ff] p-[1rem] text-left aria-checked:border-[color:var(--m-blue)]"
    >
      <span className="massa-check mt-[0.1rem] rounded-[0.5rem]">{checked && <Check aria-hidden="true" className="h-[1.8rem] w-[1.8rem]" strokeWidth={3.5} />}</span>
      <span className="text-[1.15rem] font-medium leading-snug">{children}</span>
    </button>
  );
}

function QuestionStep({ question, answers, onChange }: { question: MassaQuestion; answers: MassaDraftAnswers; onChange: (value: string[] | string) => void }) {
  const current = answers[question.id];
  if (question.type === 'text') {
    return (
      <textarea
        className="massa-input min-h-[9rem] py-[0.9rem] leading-snug"
        aria-labelledby="massa-question"
        maxLength={300}
        placeholder="Escreva aqui"
        value={typeof current === 'string' ? current : ''}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  const selected = Array.isArray(current) ? current : [];
  const multiple = question.type === 'multiple';
  const options = question.options.filter((o) => o.text.trim());
  return (
    <div role={multiple ? 'group' : 'radiogroup'} aria-labelledby="massa-question" className={`grid ${options.length > 5 ? 'gap-[0.5rem]' : 'gap-[0.7rem]'} ${options.length > 2 ? 'landscape:grid-cols-2' : ''}`}>
      {options.map((o) => {
        const on = selected.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            role={multiple ? 'checkbox' : 'radio'}
            aria-checked={on}
            className={`massa-option ${options.length > 5 ? 'min-h-[3.7rem] py-[0.4rem]' : ''}`}
            onClick={() => {
              playSound('next');
              if (multiple) onChange(on ? selected.filter((id) => id !== o.id) : [...selected, o.id]);
              else onChange([o.id]);
            }}
          >
            <span className={`massa-check ${multiple ? 'rounded-[0.5rem]' : 'rounded-full'}`}>
              {on && <Check aria-hidden="true" className="h-[1.6rem] w-[1.6rem]" strokeWidth={3.5} />}
            </span>
            <span className="min-w-0 flex-1">{o.text}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Link exibido como QR Code (o participante lê no próprio celular) e botão para abrir. */
function LinkDialog({ label, url, onClose }: { label: string; url: string; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/65 p-[1.5rem]" role="dialog" aria-modal="true" aria-label={label}>
      <div className="massa-card flex max-h-full w-full max-w-[30rem] flex-col items-center gap-[1rem] overflow-y-auto p-[1.6rem] text-center">
        <h2 className="font-display text-[1.7rem] font-extrabold">{label}</h2>
        <p className="text-[1.1rem]">Aponte a câmera do seu celular para ler o documento completo.</p>
        <QrCode value={url} className="h-[13rem] w-[13rem]" />
        <p className="break-all text-[0.95rem] font-semibold text-[#3c4270]">{url}</p>
        <div className="flex w-full flex-wrap justify-center gap-[0.8rem]">
          <button type="button" className="massa-btn min-h-[3.6rem] flex-1 text-[1.2rem]" onClick={onClose}>
            <X aria-hidden="true" className="h-[1.5rem] w-[1.5rem]" /> FECHAR
          </button>
          <button
            type="button"
            className="inline-flex min-h-[3.6rem] flex-1 items-center justify-center gap-[0.5rem] rounded-full border-[0.15rem] border-[color:var(--m-blue)] px-[1.2rem] text-[1.1rem] font-bold text-[color:var(--m-blue)]"
            onClick={() => void openExternal(url)}
          >
            <ExternalLink aria-hidden="true" className="h-[1.3rem] w-[1.3rem]" /> Abrir aqui
          </button>
        </div>
      </div>
    </div>
  );
}

function Burst() {
  const colors = ['var(--m-navy)', '#fff', 'var(--m-blue)', '#fff3d6'];
  return (
    <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2">
      {Array.from({ length: 22 }, (_, i) => {
        const angle = (i / 22) * Math.PI * 2;
        const dist = 9 + (i % 4) * 3;
        return (
          <span
            key={i}
            className="massa-burst absolute h-[0.9rem] w-[0.9rem] rounded-full"
            style={{ background: colors[i % colors.length], '--dx': `${Math.cos(angle) * dist}rem`, '--dy': `${Math.sin(angle) * dist}rem`, animationDelay: `${(i % 5) * 0.05}s` } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
}

export function MassaApp() {
  const massa = useMassa();
  const { config } = massa;
  const active = useMemo(() => resolveActive(massa), [massa]);
  const questions = active?.questions ?? [];

  const [phase, setPhase] = useState<Phase>('start');
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [touched, setTouched] = useState({ name: false, phone: false });
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<{ label: string; url: string } | null>(null);
  const secretTap = useSecretCorner();
  const mainRef = useRef<HTMLDivElement>(null);

  // O título da aba e a escala da tela são os da pesquisa enquanto ela está aberta.
  const { settings } = useAppData();
  useEffect(() => {
    document.title = `${config.title} — ${config.stationName}`;
  }, [config.title, config.stationName, settings]);
  useEffect(() => {
    document.documentElement.classList.add('massa');
    return () => {
      document.documentElement.classList.remove('massa');
      document.title = `${settings.gameName} — ${settings.institutionName}`;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Limpa tudo: nenhum dado do participante anterior fica na tela ou na memória.
  const reset = useCallback(() => {
    setDraft(emptyDraft());
    setTouched({ name: false, phone: false });
    setIndex(0);
    setMessage(null);
    setBusy(false);
    setLink(null);
    setPhase('start');
  }, []);

  // Abandono: volta ao início após o tempo de inatividade configurado.
  useIdle(config.idleSeconds * 1000, reset, phase !== 'start' && phase !== 'thanks', `${phase}-${index}`);

  // Agradecimento: volta sozinho ao início, pronto para a próxima pessoa.
  useEffect(() => {
    if (phase !== 'thanks') return;
    const t = window.setTimeout(reset, Math.max(2, config.thanksSeconds) * 1000);
    return () => window.clearTimeout(t);
  }, [phase, config.thanksSeconds, reset]);

  useEffect(() => {
    mainRef.current?.scrollTo?.({ top: 0 });
  }, [phase, index]);

  const nameErr = nameError(draft.name);
  const phoneErr = phoneError(draft.phone);
  const identified = !nameErr && !phoneErr;
  const missing = missingRequired(questions, draft.answers);
  const canFinish = identified && missing.length === 0 && draft.consent && !busy && !!active;

  const go = (next: Phase) => {
    setMessage(null);
    setPhase(next);
  };

  const start = () => {
    if (!active) return;
    unlockAudio();
    enterFullscreenAnyOrientation();
    playSound('start');
    go('identify');
  };

  const afterIdentify = async () => {
    setTouched({ name: true, phone: true });
    if (!identified || !active || busy) return;
    setBusy(true);
    try {
      // Evita que a pessoa responda tudo para só no fim saber que já participou.
      if (await phoneAlreadyInEvent(active.event.id, draft.phone)) {
        setMessage(DUPLICATE_MESSAGE);
        return;
      }
    } catch {
      // Sem conseguir consultar agora: a checagem é refeita ao finalizar.
    } finally {
      setBusy(false);
    }
    setIndex(0);
    go(questions.length ? 'questions' : 'consent');
  };

  const question = questions[index];
  const nextQuestion = () => {
    playSound('next');
    if (index < questions.length - 1) setIndex(index + 1);
    else go('consent');
  };
  const back = () => {
    if (phase === 'identify') reset();
    else if (phase === 'questions') index > 0 ? setIndex(index - 1) : go('identify');
    else if (phase === 'consent') {
      if (questions.length) {
        setIndex(questions.length - 1);
        go('questions');
      } else go('identify');
    }
  };

  const finish = async () => {
    if (!canFinish || !active) return;
    setBusy(true);
    setMessage(null);
    try {
      await submitParticipation({ active, name: draft.name, phone: draft.phone, answers: draft.answers, consent: config.consent, marketingOptIn: draft.marketing });
      playSound('finish');
      // Os dados saem da tela assim que são gravados.
      setDraft(emptyDraft());
      setTouched({ name: false, phone: false });
      setPhase('thanks');
    } catch (err) {
      // Nunca registra dados pessoais no console: só a mensagem amigável na tela.
      setMessage(err instanceof DuplicatePhoneError ? DUPLICATE_MESSAGE : SAVE_ERROR_MESSAGE);
    } finally {
      setBusy(false);
    }
  };

  const header = (stepLabel: string) => (
    <div className="flex shrink-0 items-center justify-between gap-[1rem] px-[1.6rem] pt-[0.8rem]">
      <button type="button" onClick={back} className="massa-btn massa-btn-ghost min-h-[3.4rem] px-[1.3rem] text-[1.1rem]" aria-label="Voltar">
        <ArrowLeft aria-hidden="true" className="h-[1.5rem] w-[1.5rem]" /> Voltar
      </button>
      <p className="font-display text-[1.1rem] font-bold uppercase tracking-[0.14em]">{stepLabel}</p>
      <MassaLogo config={config} size="sm" />
    </div>
  );

  const alert = message && (
    <p role="alert" className="rounded-[1rem] border-[0.15rem] border-[color:var(--m-red)] bg-[#fff1f2] px-[1.1rem] py-[0.8rem] text-[1.15rem] font-semibold text-[#7a0d17]">
      {message}
    </p>
  );

  const privacyOk = isWebUrl(config.consent.privacyUrl);
  const regulationOk = isWebUrl(config.consent.regulationUrl);

  return (
    <div className="massa-root" style={massaThemeStyle(config)} onContextMenu={(e) => e.preventDefault()} onPointerDownCapture={secretTap} data-phase={phase}>
      {phase === 'start' && (
        <main ref={mainRef} className="massa-main items-center justify-center gap-[0.6rem] px-[2rem] py-[1.5rem] text-center landscape:flex-row landscape:gap-[3rem] landscape:text-left">
          <div className="massa-pop flex shrink-0 justify-center">
            <MassaLogo config={config} />
          </div>
          <div className="flex max-w-[34rem] flex-col items-center gap-[1.4rem] landscape:items-start">
            <h1 className="font-display text-[3.4rem] font-extrabold leading-[1.02] tracking-tight text-[color:var(--m-navy)]">{config.title}</h1>
            <p className="text-[1.6rem] font-semibold leading-snug">{config.intro}</p>
            <button type="button" className="massa-btn mt-[0.6rem] min-h-[6rem] px-[4rem] text-[2.4rem]" onClick={start} disabled={!massa.ready || !active}>
              COMEÇAR
            </button>
            {massa.ready && !active && (
              <p role="status" className="rounded-[1rem] bg-white/70 px-[1.2rem] py-[0.7rem] text-[1.1rem] font-semibold">
                Pesquisa indisponível no momento. No painel administrativo, escolha um evento ativo com uma pesquisa vinculada.
              </p>
            )}
          </div>
        </main>
      )}

      {phase === 'identify' && (
        <>
          {header('Seus dados')}
          <main ref={mainRef} className="massa-main items-center px-[1.6rem] py-[1.2rem] landscape:py-[0.8rem]">
            <form
              className="massa-card my-auto flex w-full max-w-[40rem] flex-col gap-[1.1rem] p-[1.8rem]"
              noValidate
              autoComplete="off"
              onSubmit={(e) => {
                e.preventDefault();
                void afterIdentify();
              }}
            >
              <h1 className="font-display text-[2.2rem] font-extrabold leading-tight text-[color:var(--m-navy)]">Quem está participando?</h1>
              <label className="flex flex-col gap-[0.4rem]">
                <span className="text-[1.25rem] font-bold">Nome completo</span>
                <input
                  className="massa-input"
                  name="massa-nome"
                  type="text"
                  autoComplete="off"
                  autoCapitalize="words"
                  spellCheck={false}
                  maxLength={80}
                  enterKeyHint="next"
                  value={draft.name}
                  aria-invalid={touched.name && !!nameErr}
                  aria-describedby="massa-name-error"
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                />
                <span id="massa-name-error" role="status" className="min-h-[1.4rem] text-[1.05rem] font-semibold text-[#a3111f]">
                  {touched.name ? nameErr : ''}
                </span>
              </label>
              <label className="flex flex-col gap-[0.4rem]">
                <span className="text-[1.25rem] font-bold">Telefone com DDD (de preferência WhatsApp)</span>
                <input
                  className="massa-input"
                  name="massa-telefone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="(45) 99999-9999"
                  enterKeyHint="done"
                  value={maskPhone(draft.phone)}
                  aria-invalid={touched.phone && !!phoneErr}
                  aria-describedby="massa-phone-error"
                  onChange={(e) => {
                    setMessage(null);
                    setDraft((d) => ({ ...d, phone: e.target.value }));
                  }}
                  onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                />
                <span id="massa-phone-error" role="status" className="min-h-[1.4rem] text-[1.05rem] font-semibold text-[#a3111f]">
                  {touched.phone ? phoneErr : ''}
                </span>
              </label>
              {alert}
              <button type="submit" className="massa-btn w-full" disabled={!identified || busy}>
                CONTINUAR
              </button>
            </form>
          </main>
        </>
      )}

      {phase === 'questions' && question && (
        <>
          {header(`Pergunta ${index + 1} de ${questions.length}`)}
          <main ref={mainRef} className="massa-main items-center px-[1.6rem] py-[1.2rem] landscape:py-[0.8rem]">
            <section className="massa-card my-auto flex w-full max-w-[46rem] flex-col gap-[1.1rem] p-[1.6rem] landscape:max-w-[62rem]" key={question.id}>
              <div className="h-[0.6rem] overflow-hidden rounded-full bg-[#e3e6f6]" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={index + 1}>
                <div className="h-full rounded-full bg-[color:var(--m-blue)] transition-[width] duration-300" style={{ width: `${((index + 1) / questions.length) * 100}%` }} />
              </div>
              <h1 id="massa-question" className="font-display text-[2rem] font-extrabold leading-tight text-[color:var(--m-navy)]">
                {question.prompt}
              </h1>
              <p className="-mt-[0.6rem] text-[1.05rem] font-semibold text-[#4a5080]">
                {question.type === 'multiple' ? 'Você pode marcar mais de uma opção.' : question.type === 'text' ? 'Resposta livre.' : 'Escolha uma opção.'}
                {question.required ? '' : ' (opcional)'}
              </p>
              <QuestionStep question={question} answers={draft.answers} onChange={(v) => setDraft((d) => ({ ...d, answers: { ...d.answers, [question.id]: v } }))} />
              <button type="button" className="massa-btn w-full" onClick={nextQuestion} disabled={question.required && !isAnswered(question, draft.answers)}>
                {!question.required && !isAnswered(question, draft.answers) ? 'PULAR' : 'CONTINUAR'}
              </button>
            </section>
          </main>
        </>
      )}

      {phase === 'consent' && (
        <>
          {header('Para finalizar')}
          <main ref={mainRef} className="massa-main items-center px-[1.6rem] py-[1.2rem] landscape:py-[0.8rem]">
            <section className="massa-card my-auto flex w-full max-w-[46rem] flex-col gap-[1rem] p-[1.6rem] landscape:max-w-[70rem] landscape:gap-[0.8rem]">
              <h1 className="font-display text-[2rem] font-extrabold leading-tight text-[color:var(--m-navy)]">Só falta confirmar</h1>
              <CheckRow checked={draft.consent} onChange={(v) => setDraft((d) => ({ ...d, consent: v }))} testId="massa-consent">
                {config.consent.requiredText} <strong className="whitespace-nowrap text-[#a3111f]">(obrigatório)</strong>
              </CheckRow>
              {(privacyOk || regulationOk) && (
                <div className="flex flex-wrap gap-[0.7rem]">
                  {privacyOk && (
                    <a
                      href={config.consent.privacyUrl.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        e.preventDefault();
                        setLink({ label: config.consent.privacyLabel, url: config.consent.privacyUrl.trim() });
                      }}
                      className="inline-flex min-h-[3.2rem] items-center gap-[0.5rem] rounded-full border-[0.15rem] border-[color:var(--m-blue)] px-[1.2rem] text-[1.1rem] font-bold text-[color:var(--m-blue)] underline underline-offset-4"
                    >
                      Ler a {config.consent.privacyLabel}
                    </a>
                  )}
                  {regulationOk && (
                    <a
                      href={config.consent.regulationUrl.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        e.preventDefault();
                        setLink({ label: config.consent.regulationLabel, url: config.consent.regulationUrl.trim() });
                      }}
                      className="inline-flex min-h-[3.2rem] items-center gap-[0.5rem] rounded-full border-[0.15rem] border-[color:var(--m-blue)] px-[1.2rem] text-[1.1rem] font-bold text-[color:var(--m-blue)] underline underline-offset-4"
                    >
                      Ler o {config.consent.regulationLabel}
                    </a>
                  )}
                </div>
              )}
              <CheckRow checked={draft.marketing} onChange={(v) => setDraft((d) => ({ ...d, marketing: v }))} testId="massa-marketing">
                {config.consent.optionalText} <span className="whitespace-nowrap font-semibold text-[#4a5080]">(opcional)</span>
              </CheckRow>
              {!identified && <p role="status" className="text-[1.05rem] font-semibold text-[#a3111f]">Volte e confira seu nome e telefone.</p>}
              {identified && missing.length > 0 && (
                <p role="status" className="text-[1.05rem] font-semibold text-[#a3111f]">
                  {missing.length === 1 ? 'Falta responder 1 pergunta obrigatória.' : `Falta responder ${missing.length} perguntas obrigatórias.`} Toque em Voltar.
                </p>
              )}
              {alert}
              <button type="button" className="massa-btn w-full" onClick={() => void finish()} disabled={!canFinish}>
                {busy ? 'SALVANDO…' : 'FINALIZAR'}
              </button>
            </section>
          </main>
        </>
      )}

      {phase === 'thanks' && (
        <main ref={mainRef} className="massa-main items-center justify-center gap-[1.4rem] px-[2rem] py-[2rem] text-center" aria-live="polite">
          <div className="relative">
            <Burst />
            <div className="massa-pop flex h-[10rem] w-[10rem] items-center justify-center rounded-full bg-[color:var(--m-navy)] text-white shadow-[0_1rem_2.5rem_rgb(0_0_0/0.3)]">
              <PartyPopper aria-hidden="true" className="h-[5.5rem] w-[5.5rem]" strokeWidth={2.2} />
            </div>
          </div>
          <h1 className="font-display text-[3.2rem] font-extrabold leading-tight text-[color:var(--m-navy)]">{config.thanksTitle}</h1>
          <p className="max-w-[32rem] text-[1.7rem] font-semibold leading-snug">{config.thanksText}</p>
          <MassaLogo config={config} size="sm" />
          <button type="button" className="massa-btn massa-btn-ghost mt-[0.4rem] min-h-[3.6rem] text-[1.2rem]" onClick={reset}>
            Concluir
          </button>
        </main>
      )}

      <MassaFooter config={config} />
      {link && <LinkDialog label={link.label} url={link.url} onClose={() => setLink(null)} />}
    </div>
  );
}
