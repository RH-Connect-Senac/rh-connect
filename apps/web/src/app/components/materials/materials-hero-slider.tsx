import { useCallback, useEffect, useState, type FocusEvent } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import bannerRhConnect from "../../../assets/banners-materiais-de-apoio/banner-materiais-rh-connect.webp";
import bannerCachola from "../../../assets/banners-materiais-de-apoio/banner-cachola-rh-connect.gif";
import bannerOrango from "../../../assets/banners-materiais-de-apoio/banner-orango-rh-connect-mulher.webp";
// Alternativa disponível, fora do slider por enquanto:
// ../../../assets/banners-materiais-de-apoio/banner-orango-rh-connect-homem.webp
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "../ui/carousel";
import { cn } from "../ui/utils";

export type MaterialsHeroSlide = {
  id: string;
  src: string;
  alt: string;
};

// Conteúdo editorial estático. Os textos fazem parte da arte dos banners;
// por isso não há texto sobreposto aqui, só imagem + alt.
const DEFAULT_SLIDES: MaterialsHeroSlide[] = [
  { id: "rh-connect", src: bannerRhConnect, alt: "RH Connect: materiais de apoio para sua preparação" },
  { id: "cachola", src: bannerCachola, alt: "Cachola: conteúdos de parceiros no RH Connect" },
  { id: "orango", src: bannerOrango, alt: "Orango: conteúdos de parceiros no RH Connect" },
];

// Todos os banners têm 2172×724 (3:1). O container herda essa proporção
// pela própria imagem, então nada é esticado nem cortado.
const BANNER_WIDTH = 2172;
const BANNER_HEIGHT = 724;
const AUTOPLAY_INTERVAL_MS = 6000;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

type MaterialsHeroSliderProps = {
  slides?: MaterialsHeroSlide[];
  className?: string;
};

export function MaterialsHeroSlider({ slides = DEFAULT_SLIDES, className }: MaterialsHeroSliderProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const autoplayEnabled = slides.length > 1 && !reducedMotion;
  const paused = hovered || focused || dragging;

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    const onDown = () => setDragging(true);
    const onUp = () => setDragging(false);
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    api.on("pointerDown", onDown);
    api.on("pointerUp", onUp);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
      api.off("pointerDown", onDown);
      api.off("pointerUp", onUp);
    };
  }, [api]);

  // Autoplay: `current` na lista de dependências reinicia o intervalo a cada
  // troca (inclusive manual), então o usuário sempre tem o tempo completo.
  useEffect(() => {
    if (!api || !autoplayEnabled || paused) return;
    const timer = window.setInterval(() => api.scrollNext(), AUTOPLAY_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [api, autoplayEnabled, paused, current]);

  const handleFocus = useCallback((event: FocusEvent<HTMLElement>) => {
    // Só pausa para foco por teclado; clique com mouse não deixa o autoplay preso.
    if (event.target.matches(":focus-visible")) setFocused(true);
  }, []);

  const handleBlur = useCallback((event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
  }, []);

  return (
    <Carousel
      opts={{ loop: slides.length > 1, align: "start" }}
      setApi={setApi}
      aria-label="Destaques dos materiais de apoio"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={cn("group/slider overflow-hidden rounded-2xl border border-border bg-muted", className)}
    >
      <CarouselContent className="ml-0" aria-live={autoplayEnabled && !paused ? "off" : "polite"}>
        {slides.map((slide, index) => (
          <CarouselItem
            key={slide.id}
            className="pl-0"
            aria-label={`${index + 1} de ${slides.length}`}
          >
            <img
              src={slide.src}
              alt={slide.alt}
              width={BANNER_WIDTH}
              height={BANNER_HEIGHT}
              loading={index === 0 ? "eager" : "lazy"}
              draggable={false}
              className="block h-auto w-full select-none object-cover"
              style={{ aspectRatio: `${BANNER_WIDTH} / ${BANNER_HEIGHT}` }}
            />
          </CarouselItem>
        ))}
      </CarouselContent>

      {slides.length > 1 && (
        <>
          <CarouselPrevious
            aria-label="Slide anterior"
            className="left-2 hidden size-9 border-transparent bg-white/85 text-foreground shadow-sm hover:bg-white sm:inline-flex opacity-0 transition-opacity duration-200 hover:opacity-100 focus-visible:opacity-100 group-hover/slider:opacity-100 group-has-[:focus-visible]/slider:opacity-100 motion-reduce:transition-none"
          />
          <CarouselNext
            aria-label="Próximo slide"
            className="right-2 hidden size-9 border-transparent bg-white/85 text-foreground shadow-sm hover:bg-white sm:inline-flex opacity-0 transition-opacity duration-200 hover:opacity-100 focus-visible:opacity-100 group-hover/slider:opacity-100 group-has-[:focus-visible]/slider:opacity-100 motion-reduce:transition-none"
          />

          <div className="absolute inset-x-0 bottom-2 flex justify-center">
            <div className="flex items-center gap-1 rounded-full bg-foreground/35 px-2 py-1">
              {slides.map((slide, index) => {
                const active = index === current;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => api?.scrollTo(index)}
                    aria-label={`Ir para o slide ${index + 1} de ${slides.length}`}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "h-2 rounded-full transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-foreground/40 motion-reduce:transition-none",
                      active ? "w-5 bg-white" : "w-2 bg-white/60 hover:bg-white/85",
                    )}
                  />
                );
              })}
            </div>
          </div>
        </>
      )}
    </Carousel>
  );
}
