import type { ReactNode } from "react";

import { cn } from "../ui/utils";
import { MaterialsHeroSlider } from "./materials-hero-slider";
import { MaterialsSearchBar } from "./materials-search-bar";

type MaterialsPageHeaderProps = {
  search: string;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
  onFiltersClick?: () => void;
  // Permite trocar o slider (ex.: testes). Por padrão renderiza o MaterialsHeroSlider.
  hero?: ReactNode;
  className?: string;
};

// Topo editorial compacto: texto + busca na primeira coluna e hero na segunda,
// ambas alinhadas ao topo (sem centralização vertical e sem min-height).
// O <main> do shell já aplica p-8 no desktop; `sm:pt-2` / `lg:pt-2` somam o
// espaço superior (~32px em tablet, ~40px em desktop) e `mb-2 lg:mb-4` dão
// ~32–40px até a próxima seção. Abaixo de `xl` empilha em uma coluna; a ordem
// do DOM (texto, busca, hero) já é a ordem do mobile.
export function MaterialsPageHeader({
  search,
  onSearchChange,
  onSearchClear,
  onFiltersClick,
  hero,
  className,
}: MaterialsPageHeaderProps) {
  return (
    <header
      className={cn(
        "grid grid-cols-1 items-start gap-6 sm:pt-2 xl:grid-cols-2 xl:gap-10",
        "mb-2 lg:mb-4",
        className,
      )}
    >
      <div className="min-w-0 space-y-5">
        <div className="space-y-2.5">
          <p className="text-xs font-bold uppercase tracking-wide text-primary">
            Conteúdos para sua jornada
          </p>
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl">
            Materiais de Apoio
          </h2>
          <p className="max-w-xl text-base leading-7 text-muted-foreground">
            Conteúdos selecionados para ajudar você a se preparar para entrevistas e evoluir profissionalmente.
          </p>
        </div>
        <MaterialsSearchBar
          value={search}
          onChange={onSearchChange}
          onClear={onSearchClear}
          onFiltersClick={onFiltersClick}
        />
      </div>

      <div className="min-w-0">
        {hero ?? <MaterialsHeroSlider />}
      </div>
    </header>
  );
}
