import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

import { IconButton } from "./icon-button";
import { cn } from "./utils";

type BackToTopProps = {
  // Distância rolada (px) a partir da qual o botão aparece.
  threshold?: number;
  className?: string;
};

// Botão flutuante "Voltar ao topo". Escuta o scroll da janela, aparece depois
// de `threshold` px e leva suavemente ao topo ao clicar.
export function BackToTop({ threshold = 500, className }: BackToTopProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // setVisible com o mesmo valor não re-renderiza: só há atualização real
    // quando o scroll cruza o limite.
    const update = () => setVisible(window.scrollY > threshold);

    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <IconButton
      type="button"
      variant="outline"
      size="md"
      label="Voltar ao topo"
      icon={<ArrowUp aria-hidden="true" />}
      onClick={scrollToTop}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={cn(
        "fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-30 rounded-full shadow-md transition-all duration-200 sm:bottom-6 sm:right-6",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0",
        className,
      )}
    />
  );
}
