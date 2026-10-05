import { useEffect, useRef, useState } from "react";
import { ChevronUp } from "lucide-react";

import { cn } from "./utils";

type BackToTopProps = {
  // Distância rolada (px) a partir da qual o botão aparece.
  threshold?: number;
  className?: string;
};

// Indicador circular de progresso (viewBox 48x48, anel de raio 22).
const RING_RADIUS = 22;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Botão flutuante "Voltar ao topo" com anel que indica o progresso da rolagem da janela.
// Aparece depois de `threshold` px e leva suavemente ao topo ao clicar (sem animação se o
// usuário preferir movimento reduzido). Mantém o fundo branco sólido sobre qualquer conteúdo.
export function BackToTop({ threshold = 720, className }: BackToTopProps) {
  const [visible, setVisible] = useState(false);
  const progressRingRef = useRef<SVGCircleElement | null>(null);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      // Atualiza o anel direto no DOM para não re-renderizar o componente a cada evento de scroll.
      progressRingRef.current?.style.setProperty(
        "stroke-dashoffset",
        String(RING_CIRCUMFERENCE * (1 - progress)),
      );
      setVisible(window.scrollY > threshold);
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [threshold]);

  return (
    <button
      type="button"
      aria-label="Voltar ao topo"
      title="Voltar ao topo"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={() => window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" })}
      style={{ right: "max(1.25rem, env(safe-area-inset-right))", bottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      className={cn(
        "group fixed z-40 h-12 w-12 cursor-pointer rounded-full bg-white shadow-lg transition-[opacity,transform,visibility,background-color] duration-200 ease-out hover:bg-[color-mix(in_srgb,var(--primary)_5%,white)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none",
        visible ? "visible translate-y-0 opacity-100" : "pointer-events-none invisible translate-y-3 opacity-0",
        className,
      )}
    >
      <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" className="absolute inset-0 h-full w-full -rotate-90">
        <circle cx="24" cy="24" r={RING_RADIUS} fill="none" strokeWidth="3" className="stroke-primary/15" />
        <circle
          ref={progressRingRef}
          cx="24"
          cy="24"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          className="stroke-primary transition-[stroke-dashoffset] duration-100 ease-linear motion-reduce:transition-none"
        />
      </svg>
      <ChevronUp
        aria-hidden="true"
        className="absolute inset-0 m-auto h-5 w-5 text-primary transition-transform duration-200 group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0"
      />
    </button>
  );
}
