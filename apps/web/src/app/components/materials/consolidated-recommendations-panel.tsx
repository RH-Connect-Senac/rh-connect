import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import {
  CONSOLIDATED_RECOMMENDATIONS_EMPTY_MESSAGE,
  CONSOLIDATED_RECOMMENDATIONS_LIST_LABEL,
  CONSOLIDATED_RECOMMENDATIONS_LOADING_LABEL,
  type ConsolidatedPanelState,
} from "../../domain/candidate-material-recommendations-view";
import { EditorialMaterialCard } from "./editorial-material-card";
import { recommendedMaterialToCardData } from "./recommended-materials-section";

// Mesma grade do catálogo de Materiais (1 → 2 → 3 colunas), sem carrossel.
const GRID_CLASS = "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3";

/**
 * Conteúdo da aba "Recomendados" de Materiais (o título "Recomendados para você" vem do grupo do
 * catálogo). Independente de busca/filtros: só recebe o estado da carga.
 *  - loading: cards-esqueleto leves; UM aviso discreto para leitor de tela (sem anúncios repetidos);
 *  - erro: mensagem curta e não técnica, com "Tentar novamente";
 *  - sem recomendações: estado vazio discreto dentro da área da grade (a aba continua ativa).
 */
export function ConsolidatedRecommendationsPanel({
  state,
  onNavigate,
  onRetry,
}: {
  state: ConsolidatedPanelState;
  /** Navegação interna do app (rotas reais), ex.: abrir um material RH Connect. */
  onNavigate: (path: string) => void;
  onRetry?: () => void;
}) {
  if (state.status === "loading") {
    return (
      <div role="status" aria-busy="true">
        <span className="sr-only">{CONSOLIDATED_RECOMMENDATIONS_LOADING_LABEL}</span>
        <ul aria-hidden="true" className={GRID_CLASS}>
          {[0, 1, 2].map((index) => (
            <li key={index} className="min-w-0">
              <Card className="space-y-3 p-4">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
              </Card>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between" role="status">
        <p className="text-sm text-muted-foreground">{state.message}</p>
        {onRetry && (
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            Tentar novamente
          </Button>
        )}
      </Card>
    );
  }

  if (!state.view || state.view.cards.length === 0) {
    return (
      <Card className="p-4" role="status">
        <p className="text-sm text-muted-foreground">{CONSOLIDATED_RECOMMENDATIONS_EMPTY_MESSAGE}</p>
      </Card>
    );
  }

  return (
    <ul aria-label={CONSOLIDATED_RECOMMENDATIONS_LIST_LABEL} className={GRID_CLASS}>
      {state.view.cards.map((card) => (
        <li key={card.key} className="min-w-0">
          <EditorialMaterialCard variant="vertical" data={recommendedMaterialToCardData(card, onNavigate)} />
        </li>
      ))}
    </ul>
  );
}
