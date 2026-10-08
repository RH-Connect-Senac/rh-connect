import type { ReactNode } from "react";

import { Card } from "../ui/card";
import { FilterChip } from "../ui/filter-chip";
import { HorizontalScrollHint } from "../ui/horizontal-scroll-hint";
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
      <Card className="mb-6 p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <span className="shrink-0 text-sm font-semibold text-foreground">Filtrar por:</span>
          {/* Mobile: uma linha com scroll horizontal e setas; sm+: quebra de linha como no Histórico. */}
          <HorizontalScrollHint
            className="-m-1 min-w-0 sm:m-0 sm:flex-1"
            scrollerClassName="flex items-center gap-3 p-1 sm:flex-wrap sm:overflow-visible sm:p-0"
            previousLabel="Ver filtros anteriores"
            nextLabel="Ver mais filtros"
            role="group"
            aria-label="Visões do catálogo"
          >
            {tabs.map((tab) => (
              <FilterChip
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                selected={activeTab === tab.id}
                className="shrink-0 whitespace-nowrap"
              >
                {tab.label}
              </FilterChip>
            ))}
          </HorizontalScrollHint>
        </div>
      </Card>
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
