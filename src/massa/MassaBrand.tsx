import type { CSSProperties } from 'react';
import { useAppData } from '../store/AppDataContext';
import { DEFAULT_MASSA_LOGO } from './defaults';
import type { MassaConfig } from './types';

/** Variáveis CSS com as cores da rádio (editáveis no painel). */
export function massaThemeStyle(config: MassaConfig): CSSProperties {
  return {
    '--m-blue': config.colors.blue,
    '--m-navy': config.colors.navy,
    '--m-yellow': config.colors.yellow,
    '--m-red': config.colors.red,
  } as CSSProperties;
}

/**
 * Espaço reservado para um logotipo oficial ainda não enviado no painel.
 * Mostra só o nome em texto: nenhum logotipo é desenhado ou inventado.
 */
function LogoPlaceholder({ name, className = '', dark = false }: { name: string; className?: string; dark?: boolean }) {
  return (
    <div
      role="img"
      aria-label={`${name} (logotipo oficial ainda não enviado)`}
      data-logo-placeholder={name}
      className={`flex items-center justify-center rounded-xl border-[0.12rem] border-dashed px-[0.8em] text-center font-display font-bold leading-tight ${
        dark ? 'border-[#14183a]/45 text-[#14183a]' : 'border-[color:var(--m-ink)] text-[color:var(--m-ink)]'
      } ${className}`}
    >
      {name}
    </div>
  );
}

/**
 * Logotipo da Massa FM Toledo 98.5. O arquivo oficial embutido é um quadrado com o
 * fundo laranja da marca, a mesma cor do fundo da tela: aparece inteiro, sem recorte
 * nem distorção, fundido ao fundo. Um arquivo enviado pelo painel substitui o
 * embutido e é exibido como veio.
 */
export function MassaLogo({ config, size = 'lg' }: { config: MassaConfig; size?: 'sm' | 'lg' }) {
  if (config.logoMassa) {
    const box = size === 'lg' ? 'h-[13rem] max-w-[24rem] landscape:h-[15rem]' : 'h-[3.6rem] max-w-[9rem]';
    return <img src={config.logoMassa} alt={config.stationName} className={`${box} w-auto object-contain`} />;
  }
  return (
    <img
      src={DEFAULT_MASSA_LOGO}
      alt={config.stationName}
      width={512}
      height={512}
      className={
        size === 'lg'
          ? 'h-[24rem] w-[24rem] object-contain landscape:h-[22rem] landscape:w-[22rem]'
          : 'h-[5rem] w-[5rem] object-contain'
      }
    />
  );
}

/**
 * Rodapé institucional das telas públicas: Biopark e Faculdade Donaduzzi como
 * parceiros e responsáveis pelo desenvolvimento, sem competir com a Massa FM.
 */
export function MassaFooter({ config, className = '' }: { config: MassaConfig; className?: string }) {
  const { settings } = useAppData();
  return (
    <footer
      data-testid="massa-footer"
      className={`flex shrink-0 flex-wrap items-center justify-center gap-x-[1.2rem] gap-y-[0.25rem] bg-white px-[1.2rem] py-[0.45rem] text-[#14183a] ${className}`}
    >
      <div className="flex items-center gap-[0.9rem]">
        {config.logoBiopark ? (
          <img src={config.logoBiopark} alt="Biopark" className="h-[1.6rem] w-auto max-w-[7rem] object-contain" />
        ) : (
          // Sem o arquivo oficial, o parceiro é citado só pelo nome, em texto: nenhum logotipo é inventado.
          <span data-logo-placeholder="Biopark" className="font-display text-[1rem] font-bold leading-none">
            Biopark
          </span>
        )}
        <span aria-hidden="true" className="h-[1.3rem] w-px bg-[#14183a]/25" />
        {settings.logo ? (
          <img src={settings.logo} alt="Faculdade Donaduzzi" className="h-[1.6rem] w-auto max-w-[7rem] object-contain" />
        ) : (
          <LogoPlaceholder name="Faculdade Donaduzzi" dark className="h-[1.6rem] w-[8rem] rounded-lg text-[0.62rem]" />
        )}
      </div>
      <p className="text-center text-[0.72rem] font-medium leading-snug text-[#14183a]/85">{config.credit}</p>
    </footer>
  );
}
