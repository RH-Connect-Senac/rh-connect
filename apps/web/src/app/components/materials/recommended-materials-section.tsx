import { BookOpen } from "lucide-react";

import type { RecommendedMaterialCard, RecommendedMaterialsView } from "../../domain/candidate-report-materials-view";
import { EditorialMaterialCard, type EditorialCardData } from "./editorial-material-card";

const noop = () => {};

/** Tradução PURA do view model para o card editorial já existente (sem card paralelo). */
export function recommendedMaterialToCardData(
  card: RecommendedMaterialCard,
  onNavigate: (path: string) => void,
): EditorialCardData {
  const data: EditorialCardData = {
    id: card.key,
    title: card.title,
    sourceLabel: card.sourceLabel,
    typeLabel: card.typeLabel ?? undefined,
    categoryLabel: card.areaLabel ?? undefined,
    reason: card.reason ?? undefined,
    coverUrl: card.coverUrl ?? undefined,
    // Capa em retrato da Cachola: mesmo tratamento do catálogo de Materiais.
    coverBackdrop: card.source === "CACHOLA" ? true : undefined,
    external: card.external || undefined,
  };
  const { action } = card;
  if (action.kind === "internal") {
    const path = action.path;
    data.action = { label: action.label, onClick: () => onNavigate(path) };
  } else if (action.kind === "external") {
    data.action = { label: action.label, onClick: noop, href: action.href };
  } else {
    data.notice = action.notice;
  }
  return data;
}

/**
 * Seção "Materiais recomendados" do relatório. Sem recomendação (`view === null`) não renderiza
 * nada. Grade responsiva (1 → 2 → 3 colunas), sem carrossel nem scroll horizontal.
 */
export function RecommendedMaterialsSection({
  view,
  onNavigate,
}: {
  view: RecommendedMaterialsView | null;
  /** Navegação interna do app (rotas reais), ex.: abrir um material RH Connect. */
  onNavigate: (path: string) => void;
}) {
  if (!view || view.cards.length === 0) return null;

  return (
    <section aria-labelledby="recommended-materials-title" className="mb-5">
      <div className="mb-3">
        <h3 id="recommended-materials-title" className="flex items-center gap-2 font-bold text-foreground">
          <BookOpen aria-hidden="true" className="h-5 w-5 text-blue-600" /> {view.title}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{view.subtitle}</p>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {view.cards.map((card) => (
          <li key={card.key} className="min-w-0">
            <EditorialMaterialCard variant="vertical" data={recommendedMaterialToCardData(card, onNavigate)} />
          </li>
        ))}
      </ul>
    </section>
  );
}
