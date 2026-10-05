import type { ReactNode } from "react";

import { cn } from "../ui/utils";
import { MaterialsHeroSlider } from "./materials-hero-slider";
import { MaterialsSearchBar } from "./materials-search-bar";

type MaterialsPageHeaderProps = {
  search: string;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
  // Permite trocar o slider (ex.: testes). Por padrão renderiza o MaterialsHeroSlider.
  hero?: ReactNode;
  className?: string;
};

// Topo simplificado, em coluna única: banner em largura total e, logo abaixo,
// a busca em largura total. O título "Materiais de Apoio" fica no cabeçalho do
// AuthLayout. O <main> do shell já aplica p-8 no desktop; `sm:pt-2` soma o
// espaço superior e `mb-2 lg:mb-4` dão ~32–40px até a próxima seção.
export function MaterialsPageHeader({
  search,
  onSearchChange,
  onSearchClear,
  hero,
  className,
}: MaterialsPageHeaderProps) {
  return (
    <header className={cn("space-y-4 sm:pt-2", "mb-2 lg:mb-4", className)}>
      <div className="min-w-0">{hero ?? <MaterialsHeroSlider />}</div>
      <MaterialsSearchBar value={search} onChange={onSearchChange} onClear={onSearchClear} />
    </header>
  );
}
