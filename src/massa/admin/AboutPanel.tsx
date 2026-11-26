import { Card } from '../../admin/ui';
import { useMassa } from '../store';
import { FacultyCreditLogo } from '../MassaBrand';

/** Créditos institucionais: tela de login do painel e seção "Sobre o sistema". */
export function Credits({ compact = false }: { compact?: boolean }) {
  const { config } = useMassa();
  return (
    <div data-testid="credits" className={`flex flex-col items-center gap-3 text-center ${compact ? 'max-w-sm' : ''}`}>
      <FacultyCreditLogo config={config} imgClass="h-10 w-auto max-w-[10rem] object-contain" linkClass="min-h-[48px] px-2" />
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
