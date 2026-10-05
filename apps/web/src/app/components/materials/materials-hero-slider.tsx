import {
  useCallback,
  useEffect,
  useState,
  type FocusEvent,
} from "react";

import bannerRhConnect from "../../../assets/banners-materiais-de-apoio/banner-rh-connect-materiais.webp";
import bannerCachola from "../../../assets/banners-materiais-de-apoio/cachola-banner-sem-textos.webp";
import bannerOrango from "../../../assets/banners-materiais-de-apoio/banner-orango-rh-connect-mulher.webp";

import logoCachola from "../../../assets/logos/logo-cachola.png";
import logoOrango from "../../../assets/logos/logo-orango.svg";
import logoRhConnect from "../../../assets/logos/logo-rh-connect.svg";
import logoSenacSnvSesc from "../../../assets/logos/logo-senac-snv-sesc.png";

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

type MaterialsHeroSlideOverlay =
  | "orango"
  | "rh-connect"
  | "cachola";

export type MaterialsHeroSlide = {
  id: string;
  src: string;
  alt: string;
  objectPosition?: string;
  overlay?: MaterialsHeroSlideOverlay;
};

const DEFAULT_SLIDES: MaterialsHeroSlide[] = [
  {
    id: "rh-connect",
    src: bannerRhConnect,
    alt: "RH Connect: materiais de apoio para sua preparação",
    overlay: "rh-connect",
  },
  {
    id: "cachola",
    src: bannerCachola,
    alt: "Cachola: conteúdos de parceiros no RH Connect",
    objectPosition: "left center",
    overlay: "cachola",
  },
  {
    id: "orango",
    src: bannerOrango,
    alt: "Orango: conteúdos de parceiros no RH Connect",
    objectPosition: "42% center",
    overlay: "orango",
  },
];

const BANNER_WIDTH = 1920;
const BANNER_HEIGHT = 640;
const AUTOPLAY_INTERVAL_MS = 6000;

function MaterialsHeroSlideOverlayContent({
  overlay,
}: {
  overlay: MaterialsHeroSlideOverlay;
}) {
  if (overlay === "rh-connect") {
    return (
      <div
        className="
          pointer-events-none
          absolute
          inset-0
          z-10
          flex
          items-center
          px-6

          sm:px-9
          md:px-12
          lg:px-20
          xl:px-24
          min-[1440px]:px-28
        "
      >
        <div
          className="
            flex
            w-[50%]
            max-w-[18rem]
            flex-col
            gap-3
            text-left

            sm:w-[44%]
            sm:max-w-[22rem]
            sm:gap-4

            md:w-[38%]
            md:max-w-[24rem]

            lg:w-[34%]
            lg:max-w-[26rem]
            lg:gap-4

            min-[1440px]:max-w-[30rem]
            min-[1440px]:gap-5

            min-[1800px]:max-w-[34rem]
            min-[1800px]:gap-6
          "
        >
          <img
            src={logoRhConnect}
            alt="RH Connect"
            className="
              h-7
              w-auto
              shrink-0
              self-start

              sm:h-8
              md:h-9
              lg:h-10
              min-[1440px]:h-12
              min-[1800px]:h-14
            "
            draggable={false}
          />

          <h2
            className="
              max-w-[12ch]
              text-2xl
              font-extrabold
              leading-[1.04]
              tracking-normal
              text-[#001640]

              sm:text-3xl
              md:text-4xl
              lg:text-[2.5rem]
              min-[1440px]:text-[3.25rem]
              min-[1800px]:text-[3.75rem]
            "
          >
            <span className="block">Prepare-se para</span>
            <span className="block text-[#0075fe]">
              entrevistas com
            </span>
            <span className="block text-[#0075fe]">
              mais confiança
            </span>
          </h2>

          <p
            className="
              max-w-[32ch]
              text-xs
              font-normal
              leading-snug
              text-[#16345f]

              sm:max-w-[35ch]
              sm:text-sm
              md:max-w-[38ch]
              md:text-base
              lg:text-base
              min-[1440px]:text-lg
              min-[1800px]:text-xl
            "
          >
            Materiais práticos com dicas, exemplos e orientações
            para você se destacar em processos seletivos.
          </p>
        </div>
      </div>
    );
  }

  if (overlay === "cachola") {
    return (
      <div
        className="
          pointer-events-none
          absolute
          inset-0
          z-10
          flex
          items-center
          px-6

          sm:px-9
          md:px-12
          lg:px-20
          xl:px-24
          min-[1440px]:px-28
        "
      >
        <div
          className="
            flex
            w-[64%]
            max-w-[20rem]
            flex-col
            gap-3
            text-left
            text-white
            drop-shadow-[0_2px_10px_rgba(0,0,0,0.20)]

            sm:w-[56%]
            sm:max-w-[26rem]
            sm:gap-4

            md:w-[50%]
            md:max-w-[30rem]

            lg:w-[44%]
            lg:max-w-[34rem]
            lg:gap-4

            min-[1440px]:max-w-[40rem]
            min-[1440px]:gap-5

            min-[1800px]:max-w-[46rem]
            min-[1800px]:gap-6
          "
        >
          <div
            className="
              flex
              max-w-full
              items-center
              gap-3

              sm:gap-4
              lg:gap-4
              min-[1440px]:gap-5
              min-[1800px]:gap-6
            "
          >
            <img
              src={logoSenacSnvSesc}
              alt="Senac, CNC e Sesc"
              className="
                h-8
                w-auto
                shrink-0

                sm:h-10
                md:h-11
                lg:h-12
                min-[1440px]:h-[4.5rem]
                min-[1800px]:h-24
              "
              draggable={false}
            />

            <span
              aria-hidden="true"
              className="
                h-8
                w-px
                shrink-0
                bg-white/55

                sm:h-10
                md:h-11
                lg:h-12
                min-[1440px]:h-16
                min-[1800px]:h-20
              "
            />

            <img
              src={logoCachola}
              alt="Cachola"
              className="
                h-8
                w-auto
                shrink-0

                sm:h-10
                md:h-11
                lg:h-12
                min-[1440px]:h-16
                min-[1800px]:h-20
              "
              draggable={false}
            />
          </div>

          <h2
            className="
              max-w-[16ch]
              text-2xl
              font-extrabold
              leading-[1.04]
              tracking-normal
              text-white

              sm:text-3xl
              md:text-4xl

              lg:max-w-[19ch]
              lg:text-[2.625rem]

              min-[1440px]:text-[3.5rem]
              min-[1800px]:text-[4rem]
            "
          >
            <span className="block">
              Conteúdos digitais para
            </span>
            <span className="block">
              aprender do seu jeito
            </span>
          </h2>

          <p
            className="
              max-w-[38ch]
              text-xs
              font-normal
              leading-snug
              text-white/88

              sm:max-w-[42ch]
              sm:text-sm

              md:max-w-[46ch]
              md:text-base
              md:leading-normal

              lg:text-base

              min-[1440px]:text-lg

              min-[1800px]:text-xl
          "
          >
            Explore livros, audiolivros, podcasts e outros materiais
            educacionais do Senac para estudar com mais autonomia,
            praticidade e flexibilidade.
          </p>
        </div>
      </div>
    );
  }

  if (overlay !== "orango") return null;

  return (
    <div
      className="
        pointer-events-none
        absolute
        inset-0
        z-10
        flex
        items-center
        px-6

        sm:px-9
        md:px-12
        lg:px-20
        xl:px-24
        min-[1440px]:px-28
      "
    >
      <div
        className="
          flex
          w-[68%]
          max-w-[22rem]
          flex-col
          gap-3
          text-white
          drop-shadow-[0_2px_10px_rgba(0,0,0,0.22)]

          sm:w-[58%]
          sm:max-w-[30rem]
          sm:gap-4

          md:w-[52%]
          md:max-w-[34rem]

          lg:w-[52%]
          lg:max-w-[40rem]
          lg:gap-4

          min-[1440px]:w-[48%]
          min-[1440px]:max-w-[44rem]
          min-[1440px]:gap-5

          min-[1800px]:max-w-[48rem]
          min-[1800px]:gap-6
        "
      >
        <div
          className="
            flex
            max-w-full
            items-center
            gap-3

            sm:gap-4
            lg:gap-4
            min-[1440px]:gap-5
            min-[1800px]:gap-6
          "
        >
          <img
            src={logoOrango}
            alt="Orango"
            className="
              h-6
              w-auto
              shrink-0

              sm:h-8
              md:h-9
              lg:h-11
              min-[1440px]:h-16
              min-[1800px]:h-20
            "
            draggable={false}
          />

          <span
            aria-hidden="true"
            className="
              h-8
              w-px
              shrink-0
              bg-white/60

              sm:h-10
              md:h-11
              lg:h-12
              min-[1440px]:h-16
              min-[1800px]:h-20
            "
          />

          <img
            src={logoSenacSnvSesc}
            alt="Senac, CNC e Sesc"
            className="
              h-8
              w-auto
              shrink-0

              sm:h-10
              md:h-11
              lg:h-12
              min-[1440px]:h-[4.5rem]
              min-[1800px]:h-24
            "
            draggable={false}
          />
        </div>

        <h2
          className="
            max-w-[15ch]
            text-3xl
            font-extrabold
            leading-[1.02]
            tracking-normal

            sm:max-w-[17ch]
            sm:text-4xl

            md:max-w-[18ch]
            md:text-5xl

            lg:max-w-[22ch]
            lg:text-[2.625rem]

            min-[1440px]:max-w-[18ch]
            min-[1440px]:text-[3.25rem]

            min-[1800px]:text-[4rem]
          "
        >
          <span className="block">
            Aprenda no seu ritmo
          </span>

          <span className="block">
            e{" "}
            <span className="text-[#ff7a4f]">
              evolua na carreira
            </span>
          </span>
        </h2>

        <p
          className="
            max-w-[34ch]
            text-xs
            font-normal
            leading-snug
            text-white/90

            sm:max-w-[38ch]
            sm:text-sm

            md:max-w-[42ch]
            md:text-base
            md:leading-normal

            lg:text-base

            min-[1440px]:text-lg

            min-[1800px]:text-xl
          "
        >
          Cursos e conteúdos para desenvolver competências profissionais,
          ampliar repertório e continuar aprendendo.
        </p>
      </div>
    </div>
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }

    const query = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    const update = () => {
      setReduced(query.matches);
    };

    update();

    query.addEventListener("change", update);

    return () => {
      query.removeEventListener("change", update);
    };
  }, []);

  return reduced;
}

type MaterialsHeroSliderProps = {
  slides?: MaterialsHeroSlide[];
  className?: string;
};

export function MaterialsHeroSlider({
  slides = DEFAULT_SLIDES,
  className,
}: MaterialsHeroSliderProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);

  const reducedMotion = usePrefersReducedMotion();

  const autoplayEnabled =
    slides.length > 1 && !reducedMotion;

  const paused =
    hovered || focused || dragging;

  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };

    const onDown = () => {
      setDragging(true);
    };

    const onUp = () => {
      setDragging(false);
    };

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

  useEffect(() => {
    if (!api || !autoplayEnabled || paused) return;

    const timer = window.setInterval(() => {
      api.scrollNext();
    }, AUTOPLAY_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [
    api,
    autoplayEnabled,
    paused,
    current,
  ]);

  const handleFocus = useCallback(
    (event: FocusEvent<HTMLElement>) => {
      if (
        event.target.matches(":focus-visible")
      ) {
        setFocused(true);
      }
    },
    [],
  );

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLElement>) => {
      if (
        !event.currentTarget.contains(
          event.relatedTarget as Node | null,
        )
      ) {
        setFocused(false);
      }
    },
    [],
  );

  return (
    <Carousel
      opts={{
        loop: slides.length > 1,
        align: "start",
      }}
      setApi={setApi}
      aria-label="Destaques dos materiais de apoio"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={cn(
        "group/slider overflow-hidden rounded-2xl border border-border bg-muted",
        className,
      )}
    >
      <CarouselContent
        className="ml-0"
        aria-live={
          autoplayEnabled && !paused
            ? "off"
            : "polite"
        }
      >
        {slides.map((slide, index) => (
          <CarouselItem
            key={slide.id}
            className="pl-0"
            aria-label={`${index + 1} de ${slides.length}`}
          >
            <div
              className="
    relative
    h-[280px]
    overflow-hidden

    lg:h-[310px]
    2xl:h-[480px]
              "
            >
              <img
                src={slide.src}
                alt={slide.alt}
                width={BANNER_WIDTH}
                height={BANNER_HEIGHT}
                loading={
                  index === 0
                    ? "eager"
                    : "lazy"
                }
                draggable={false}
                className="
                  block
                  h-full
                  w-full
                  select-none
                  object-cover
                  object-center
                "
                style={{
                  ...(slide.objectPosition
                    ? {
                      objectPosition:
                        slide.objectPosition,
                    }
                    : null),
                }}
              />

              {slide.overlay ? (
                <MaterialsHeroSlideOverlayContent
                  overlay={slide.overlay}
                />
              ) : null}
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>

      {slides.length > 1 && (
        <>
          <CarouselPrevious
            aria-label="Slide anterior"
            className="
              left-2
              hidden
              size-9
              border-transparent
              bg-white/85
              text-foreground
              shadow-sm
              opacity-0
              transition-opacity
              duration-200

              hover:bg-white
              hover:opacity-100

              focus-visible:opacity-100

              sm:inline-flex

              group-hover/slider:opacity-100
              group-has-[:focus-visible]/slider:opacity-100

              motion-reduce:transition-none
            "
          />

          <CarouselNext
            aria-label="Próximo slide"
            className="
              right-2
              hidden
              size-9
              border-transparent
              bg-white/85
              text-foreground
              shadow-sm
              opacity-0
              transition-opacity
              duration-200

              hover:bg-white
              hover:opacity-100

              focus-visible:opacity-100

              sm:inline-flex

              group-hover/slider:opacity-100
              group-has-[:focus-visible]/slider:opacity-100

              motion-reduce:transition-none
            "
          />

          <div
            className="
              absolute
              inset-x-0
              bottom-2
              flex
              justify-center
            "
          >
            <div
              className="
                flex
                items-center
                gap-1
                rounded-full
                bg-foreground/35
                px-2
                py-1
              "
            >
              {slides.map((slide, index) => {
                const active =
                  index === current;

                return (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() =>
                      api?.scrollTo(index)
                    }
                    aria-label={`Ir para o slide ${index + 1} de ${slides.length}`}
                    aria-current={
                      active
                        ? "true"
                        : undefined
                    }
                    className={cn(
                      "h-2 rounded-full transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-foreground/40 motion-reduce:transition-none",
                      active
                        ? "w-5 bg-white"
                        : "w-2 bg-white/60 hover:bg-white/85",
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
