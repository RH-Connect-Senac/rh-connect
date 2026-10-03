import { useEffect, useLayoutEffect, type MouseEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import { RHConnectLogo } from "./brand/rh-connect-logo";
import { ROUTER_BASENAME, getPathForScreen } from "../router/routes";

/** IDs reais das seções da Landing (ver `landing-screen.tsx`). */
const FOOTER_SECTION_LINKS = [
  { label: "Como funciona", sectionId: "como-funciona" },
  { label: "Benefícios", sectionId: "beneficios" },
  { label: "Sobre o projeto", sectionId: "sobre" },
] as const;

/** Seção solicitada em outra rota; consumida pelo footer assim que a Landing monta. */
let pendingLandingSectionId: string | null = null;

/** Página legal aberta pelo footer; ao montar, ela deve começar no topo (não herdar o scroll anterior). */
let pendingLegalTopPath: string | null = null;

function scrollToLandingSection(sectionId: string, behavior: ScrollBehavior): boolean {
  const target = document.getElementById(sectionId);
  if (!target) return false;
  // O header da Landing é sticky: desconta a altura dele para a seção não ficar escondida.
  const headerOffset = document.querySelector("header")?.getBoundingClientRect().height ?? 0;
  const top = target.getBoundingClientRect().top + window.scrollY - headerOffset;
  window.scrollTo({ top: Math.max(0, top), behavior });
  return true;
}

/**
 * Footer institucional do RH Connect, compartilhado pela Landing e pelas páginas legais.
 *
 * Os links de seção ("Como funciona", "Benefícios", "Sobre o projeto") têm a mesma lógica em
 * qualquer página: na Landing rolam suavemente até a seção; em outra rota navegam (SPA, sem
 * reload) para a Landing já posicionados na seção correspondente.
 */
export function LandingFooter({
  onNavigate,
  contentMaxWidthClassName = "max-w-6xl",
}: {
  onNavigate: (screen: "terms" | "privacy") => void;
  /**
   * Largura máxima do conteúdo interno. O padrão (`max-w-6xl`) é o da Landing; páginas cujo
   * container já inclui o padding lateral dentro da largura máxima passam a largura útil.
   */
  contentMaxWidthClassName?: string;
}) {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const isLanding = location.pathname === "/";

  const goHome = () => {
    window.location.assign(`${ROUTER_BASENAME}/`);
  };

  // Chegou à Landing vindo de outra rota por um link de seção: posiciona direto na seção.
  useEffect(() => {
    if (!isLanding || !pendingLandingSectionId) return;
    const frame = window.requestAnimationFrame(() => {
      const sectionId = pendingLandingSectionId;
      pendingLandingSectionId = null;
      if (sectionId) scrollToLandingSection(sectionId, "auto");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isLanding]);

  // Chegou a /terms ou /privacy pelo footer: o documento sempre abre pelo início.
  useLayoutEffect(() => {
    if (!pendingLegalTopPath || location.pathname !== pendingLegalTopPath) return;
    pendingLegalTopPath = null;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  const openLegalPage = (screen: "terms" | "privacy") => {
    const targetPath = getPathForScreen(screen);

    if (location.pathname === targetPath) {
      // Já está na página: sem navegação nem reload; limpa a âncora de seção e volta ao início.
      if (window.location.hash) {
        window.history.replaceState(window.history.state, "", `${ROUTER_BASENAME}${targetPath}${location.search}`);
      }
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, left: 0, behavior: reduceMotion ? "auto" : "smooth" });
      return;
    }

    pendingLegalTopPath = targetPath;
    onNavigate(screen);
  };

  const handleSectionClick = (event: MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    // Preserva o comportamento nativo para abrir em nova aba/janela.
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();

    if (isLanding) {
      if (scrollToLandingSection(sectionId, "smooth")) {
        window.history.replaceState(window.history.state, "", `${ROUTER_BASENAME}/#${sectionId}`);
      }
      return;
    }

    pendingLandingSectionId = sectionId;
    routerNavigate({ pathname: "/", hash: `#${sectionId}` });
  };

  return (
  <footer id="contato" className="px-4 sm:px-8 py-10 sm:py-12 bg-[#021025]">
    <div className={`${contentMaxWidthClassName} mx-auto`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
        <div>
          <button
            type="button"
            onClick={goHome}
            className="mb-2 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#021025]"
            aria-label="Ir para a página inicial"
          >
            <RHConnectLogo variant="inverse" className="h-7 w-auto" />
          </button>
          <p className="max-w-xs text-[13px] font-normal leading-relaxed text-slate-500">
            Plataforma de preparação para entrevistas.
            <br />
            Desenvolvida por alunos do SENAC Sobradinho.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-x-6 gap-y-2 sm:gap-y-3">
          {FOOTER_SECTION_LINKS.map(link => (
            <a
              key={link.label}
              href={`${ROUTER_BASENAME}/#${link.sectionId}`}
              onClick={event => handleSectionClick(event, link.sectionId)}
              className="cursor-pointer text-sm font-normal leading-5 text-slate-400 transition-colors duration-150 hover:text-white"
            >
              {link.label}
            </a>
          ))}
          {([
            { label: "Termos de uso", screen: "terms" },
            { label: "Privacidade", screen: "privacy" },
          ] as const).map(link => (
            <button
              key={link.label}
              type="button"
              onClick={() => openLegalPage(link.screen)}
              className="cursor-pointer text-left text-sm font-normal leading-5 text-slate-400 transition-colors duration-150 hover:text-white"
            >
              {link.label}
            </button>
          ))}
          <a href="#contato" className="cursor-pointer text-sm font-normal leading-5 text-slate-400 transition-colors duration-150 hover:text-white">
            Contato
          </a>
        </div>
      </div>
      <div className="border-t border-slate-800 mt-8 pt-6">
        <p className="text-center text-xs font-normal leading-5 text-slate-600">
          © 2026 RH Connect · Iniciativa Educacional SENAC Sobradinho · Todos os direitos reservados
        </p>
      </div>
    </div>
  </footer>
  );
}
