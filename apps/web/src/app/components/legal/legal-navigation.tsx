import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

import type { LegalIndexItem } from "./legal-document-view";

export type LegalDocumentKey = "terms" | "privacy";

// Distância (px) do topo da janela a partir da qual uma seção passa a ser a "atual".
const ACTIVE_SECTION_OFFSET = 140;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function scrollToSection(id: string) {
  const element = document.getElementById(id);
  if (!element) return;
  element.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  try {
    // Mantém o state do history intacto: o roteador usa `location.state.from` para o botão Voltar.
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}#${id}`);
  } catch {
    // Atualizar o hash é apenas uma conveniência.
  }
}

/** Rola até a seção indicada no hash da URL (ex.: /terms#cadastro) ao abrir a página. */
export function useLegalHashScroll(ids: string[]) {
  const key = ids.join("|");
  useEffect(() => {
    const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if (!hash || !ids.includes(hash)) return;
    const timeout = window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "auto", block: "start" });
    }, 0);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

/** Acompanha a rolagem e informa qual seção está sendo lida. */
export function useLegalActiveSection(ids: string[]) {
  const key = ids.join("|");
  const [activeId, setActiveId] = useState(ids[0] ?? "");

  useEffect(() => {
    if (ids.length === 0) return;
    let frame = 0;

    const update = () => {
      frame = 0;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      let current = ids[0];
      if (atBottom && window.scrollY > 0) {
        current = ids[ids.length - 1];
      } else {
        for (const id of ids) {
          const element = document.getElementById(id);
          if (element && element.getBoundingClientRect().top <= ACTIVE_SECTION_OFFSET) current = id;
        }
      }
      setActiveId(current);
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return activeId;
}

function IndexLink({
  item,
  number,
  active,
  onSelect,
}: {
  item: LegalIndexItem;
  number: number;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <a
      href={`#${item.id}`}
      aria-current={active ? "location" : undefined}
      onClick={(event) => {
        event.preventDefault();
        onSelect(item.id);
      }}
      // Em desktops/notebooks de pouca altura (media queries de `max-height`, só a partir de `lg`),
      // o índice se compacta em etapas: primeiro o espaçamento vertical, depois o line-height e,
      // só em alturas bem pequenas, a fonte. Assim todos os itens cabem sem rolagem interna.
      className={`-ml-px flex gap-3 rounded-r-lg border-l-2 py-1.5 pl-4 pr-2 text-sm leading-snug transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:[@media(max-height:760px)]:py-1 lg:[@media(max-height:640px)]:gap-2 lg:[@media(max-height:640px)]:py-0.5 lg:[@media(max-height:640px)]:text-[13px] lg:[@media(max-height:640px)]:leading-tight lg:[@media(max-height:520px)]:text-xs ${
        active
          ? "border-primary bg-primary/5 font-semibold text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      <span className="w-5 shrink-0 text-xs font-semibold tabular-nums leading-[1.375rem] opacity-70 lg:[@media(max-height:640px)]:leading-4 lg:[@media(max-height:520px)]:leading-[0.9375rem]">
        {String(number).padStart(2, "0")}
      </span>
      <span className="min-w-0">{item.title}</span>
    </a>
  );
}

/** Índice lateral (desktop). O posicionamento sticky é feito pelo layout. */
export function LegalSidebarIndex({ items, activeId }: { items: LegalIndexItem[]; activeId: string }) {
  return (
    <nav aria-label="Índice do documento" className="pr-2">
      <p className="mb-3 text-xs lg:[@media(max-height:760px)]:mb-2 font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Neste documento
      </p>
      <div className="border-l border-border">
        {items.map((item, index) => (
          <IndexLink
            key={item.id}
            item={item}
            number={index + 1}
            active={item.id === activeId}
            onSelect={scrollToSection}
          />
        ))}
      </div>
    </nav>
  );
}

/** Índice recolhível (mobile e tablet). */
export function LegalMobileIndex({ items, activeId }: { items: LegalIndexItem[]; activeId: string }) {
  const [open, setOpen] = useState(false);
  const activeItem = items.find((item) => item.id === activeId) ?? items[0];

  return (
    <nav aria-label="Índice do documento" className="rounded-xl border border-border bg-muted/40">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="legal-mobile-index"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span className="min-w-0">
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Neste documento
          </span>
          {activeItem && (
            <span className="block truncate text-sm font-semibold text-foreground">{activeItem.title}</span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div id="legal-mobile-index" className="border-t border-border py-2 pr-2">
          <div className="ml-4 border-l border-border">
            {items.map((item, index) => (
              <IndexLink
                key={item.id}
                item={item}
                number={index + 1}
                active={item.id === activeId}
                onSelect={(id) => {
                  setOpen(false);
                  scrollToSection(id);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

/** Navegação editorial entre Termos de Uso e Política de Privacidade (abas com sublinhado). */
export function LegalDocumentSwitch({
  current,
  onOpenTerms,
  onOpenPrivacy,
}: {
  current: LegalDocumentKey;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
}) {
  const options: { key: LegalDocumentKey; label: string; onClick: () => void }[] = [
    { key: "terms", label: "Termos de Uso", onClick: onOpenTerms },
    { key: "privacy", label: "Política de Privacidade", onClick: onOpenPrivacy },
  ];

  return (
    <nav aria-label="Documentos legais" className="border-b border-border bg-white">
      <div className="mx-auto flex w-full max-w-6xl gap-5 px-4 sm:gap-8 sm:px-8">
        {options.map((option) => {
          const active = option.key === current;
          return (
            <button
              key={option.key}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={active ? undefined : option.onClick}
              className={`-mb-px min-w-0 whitespace-nowrap border-b-2 py-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                active
                  ? "cursor-default border-primary text-primary"
                  : "cursor-pointer border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
