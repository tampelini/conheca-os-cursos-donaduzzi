import { useAppData } from '../../store/AppDataContext';
import { Card } from '../../admin/ui';
import { useMassa } from '../store';

/** Créditos institucionais: tela de login do painel e seção "Sobre o sistema". */
export function Credits({ compact = false }: { compact?: boolean }) {
  const { settings } = useAppData();
  const { config } = useMassa();
  return (
    <div data-testid="credits" className={`flex flex-col items-center gap-3 text-center ${compact ? 'max-w-sm' : ''}`}>
      <div className="flex flex-wrap items-center justify-center gap-5">
        {config.logoBiopark ? (
          <img src={config.logoBiopark} alt="Biopark" className="h-10 w-auto max-w-[9rem] object-contain" />
        ) : (
          <span className="rounded-lg border border-dashed border-ink/40 px-3 py-2 text-sm font-bold" aria-label="Biopark (logotipo oficial ainda não enviado)">
            Biopark
          </span>
        )}
        {settings.logo ? (
          <img src={settings.logo} alt="Faculdade Donaduzzi" className="h-10 w-auto max-w-[10rem] object-contain" />
        ) : (
          <span className="rounded-lg border border-dashed border-ink/40 px-3 py-2 text-sm font-bold">Faculdade Donaduzzi</span>
        )}
      </div>
      <p className={`font-semibold text-ink/80 ${compact ? 'text-xs' : 'text-sm'}`}>{config.credit}</p>
    </div>
  );
}

export function AboutPanel() {
  const { config } = useMassa();
  return (
    <div className="flex flex-col gap-4">
      <Card title="Sobre o sistema">
        <div className="grid gap-4 text-sm leading-relaxed">
          <p>
            Este aplicativo de totem reúne duas experiências: o quiz <strong>Conheça os Cursos</strong>, da Faculdade Donaduzzi, e a{' '}
            <strong>Pesquisa Massa FM</strong>, usada pela {config.stationName} em eventos. Funciona sem internet: perguntas, configurações,
            estatísticas e participantes ficam guardados apenas neste aparelho.
          </p>
          <Credits />
          <ul className="list-disc space-y-1 pl-5 text-ink/80">
            <li>
              Endereços: <code>#/quiz</code> abre o quiz, <code>#/massa</code> abre a Pesquisa Massa FM e <code>#/admin</code> abre este painel.
            </li>
            <li>A experiência que abre sozinha no totem é escolhida em Pesquisa Massa FM → Totem e textos.</li>
            <li>
              Os dados pessoais da pesquisa (nome e telefone) são coletados com consentimento, ficam separados por evento e podem ser exportados,
              anonimizados ou excluídos em Pesquisa Massa FM → Participantes.
            </li>
            <li>O PIN protege o painel contra o público do totem. Troque o PIN padrão em Segurança e mantenha o aparelho sob guarda da equipe.</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
