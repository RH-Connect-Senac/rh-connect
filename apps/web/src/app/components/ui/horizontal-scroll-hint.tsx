import { useCallback, useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "./utils";

type HorizontalScrollHintProps = {
  children: ReactNode;
  // Wrapper `relative` que posiciona as setas (fundo, raio e margens ficam por conta de quem usa).
  className?: string;
  // Área rolável (layout das opções, padding, quebra de linha em telas maiores etc.).
  scrollerClassName?: string;
  // Degradês das extremidades; devem usar a cor de fundo do contêiner (ex.: "from-muted via-muted/90").
  leftFadeClassName?: string;
  rightFadeClassName?: string;
  previousLabel?: string;
  nextLabel?: string;
} & Pick<HTMLAttributes<HTMLDivElement>, "role" | "aria-label">;

/**
 * Lista com rolagem horizontal que, no mobile (`sm:hidden`), mostra setas + degradê somente
 * nas direções em que ainda há conteúdo escondido. Em `sm+` as setas nunca aparecem.
 */
export function HorizontalScrollHint({
  children,
  className,
  scrollerClassName,
  leftFadeClassName = "from-card via-card/90",
  rightFadeClassName = "from-card via-card/90",
  previousLabel = "Ver itens anteriores",
  nextLabel = "Ver mais itens",
  ...scrollerProps
}: HorizontalScrollHintProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Conteúdo escondido à esquerda: scrollLeft > 1. À direita: o que falta rolar
  // (scrollWidth - clientWidth - scrollLeft) > 1.
  const update = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const maxScroll = scroller.scrollWidth - scroller.clientWidth;
    setCanScrollLeft(scroller.scrollLeft > 1);
    setCanScrollRight(maxScroll - scroller.scrollLeft > 1);
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    update();
    scroller.addEventListener("scroll", update, { passive: true });
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    observer?.observe(scroller);
    window.addEventListener("resize", update);
    return () => {
      scroller.removeEventListener("scroll", update);
      observer?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [update]);

  // O conteúdo pode mudar sem alterar a caixa da área rolável (ex.: rótulo com contador).
  useEffect(() => {
    update();
  }, [children, update]);

  const scrollByPage = (direction: -1 | 1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    scroller.scrollBy({ left: direction * scroller.clientWidth * 0.6, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const arrowButtonClassName =
    "pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-card text-primary shadow-[0_1px_3px_rgba(15,27,45,0.2)] outline-none focus-visible:ring-[3px] focus-visible:ring-[rgba(29,78,216,0.24)]";

  return (
    <div className={cn("relative", className)}>
      <div
        ref={scrollerRef}
        className={cn("overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", scrollerClassName)}
        {...scrollerProps}
      >
        {children}
      </div>
      {canScrollLeft && (
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center rounded-l-xl bg-gradient-to-r to-transparent pl-1 sm:hidden",
            leftFadeClassName,
          )}
        >
          <button type="button" aria-label={previousLabel} onClick={() => scrollByPage(-1)} className={arrowButtonClassName}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
      {canScrollRight && (
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 flex w-10 items-center justify-end rounded-r-xl bg-gradient-to-l to-transparent pr-1 sm:hidden",
            rightFadeClassName,
          )}
        >
          <button type="button" aria-label={nextLabel} onClick={() => scrollByPage(1)} className={arrowButtonClassName}>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
