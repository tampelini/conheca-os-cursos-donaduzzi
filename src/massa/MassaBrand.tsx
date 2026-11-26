import type { CSSProperties } from 'react';
import { useAppData } from '../store/AppDataContext';
import { openExternal } from '../services/externalLink';
import { isWebUrl } from './validation';
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
 * Logotipo da Faculdade Donaduzzi dos créditos. Com um link configurado, tocar nele
 * abre a página do curso em outra aba (no APK, no navegador do aparelho), sem fechar
 * a pesquisa.
 */
export function FacultyCreditLogo({ config, imgClass, linkClass = '' }: { config: MassaConfig; imgClass: string; linkClass?: string }) {
  const { settings } = useAppData();
  const logo = settings.logo ? (
    <img src={settings.logo} alt="Faculdade Donaduzzi" className={imgClass} />
  ) : (
    <span className="font-display font-bold leading-none">Faculdade Donaduzzi</span>
  );
  const url = config.creditUrl.trim();
  if (!isWebUrl(url)) return logo;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Faculdade Donaduzzi: conheça o curso de Ciência de Dados e Inteligência Artificial (abre o site em outra aba)"
      onClick={(e) => {
        // Abre por código: funciona no APK e quando a nova aba é bloqueada.
        e.preventDefault();
        void openExternal(url);
      }}
      className={`inline-flex items-center justify-center rounded-lg transition-transform active:scale-95 ${linkClass}`}
    >
      {logo}
    </a>
  );
}

/**
 * Rodapé institucional das telas públicas: a Faculdade Donaduzzi aparece como
 * responsável pelo desenvolvimento, pequena e sem competir com a Massa FM.
 */
export function MassaFooter({ config, className = '' }: { config: MassaConfig; className?: string }) {
  return (
    <footer
      data-testid="massa-footer"
      className={`flex shrink-0 flex-wrap items-center justify-center gap-x-[1.2rem] gap-y-[0.1rem] bg-white px-[1.2rem] py-[0.2rem] text-[#14183a] ${className}`}
    >
      {/* Área de toque de pelo menos 48 px, mesmo com o logotipo pequeno. */}
      <FacultyCreditLogo config={config} imgClass="h-[1.6rem] w-auto max-w-[7rem] object-contain" linkClass="min-h-[max(2.4rem,48px)] px-[0.6rem]" />
      <p className="text-center text-[0.72rem] font-medium leading-snug text-[#14183a]/85">{config.credit}</p>
    </footer>
  );
}
