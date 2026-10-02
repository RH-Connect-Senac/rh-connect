import type { ReactNode } from "react";

import { FilterChip } from "../ui/filter-chip";
import { cn } from "../ui/utils";

export type ExploreCatalogTab = {
  id: string;
  label: string;
};

type ExploreCatalogSectionProps = {
  id?: string;
  title?: string;
  tabs: ExploreCatalogTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  // Grupos do catálogo (ExploreCatalogGroup), cada um com seus próprios filtros.
  children: ReactNode;
  className?: string;
};

export function ExploreCatalogSection({
  id,
  title = "Explore os materiais",
  tabs,
  activeTab,
  onTabChange,
  children,
  className,
}: ExploreCatalogSectionProps) {
  return (
    <section id={id} className={cn("scroll-mt-20", className)}>
      <h2 className="mb-3 font-bold text-foreground">{title}</h2>
      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Visões do catálogo">
        {tabs.map((tab) => (
          <FilterChip
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            selected={activeTab === tab.id}
            className="px-3.5"
          >
            {tab.label}
          </FilterChip>
        ))}
      </div>
      <div className="space-y-10">{children}</div>
    </section>
  );
}

type ExploreCatalogGroupProps = {
  title: string;
  description?: string;
  // Filtros que controlam apenas o conteúdo deste grupo.
  filters?: ReactNode;
  // Rodapé do grupo (ex.: botão "Carregar mais").
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function ExploreCatalogGroup({
  title,
  description,
  filters,
  footer,
  children,
  className,
}: ExploreCatalogGroupProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {filters && <div className="space-y-3">{filters}</div>}
      {children}
      {footer && <div className="flex justify-center pt-1">{footer}</div>}
    </div>
  );
}
