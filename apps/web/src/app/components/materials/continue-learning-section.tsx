import { Clock } from "lucide-react";

import type { MaterialUserState, SupportMaterial } from "../../domain/materials";
import type { ExternalLearningResource } from "../../services/external-resources-service";
import type { ExternalResourceUserState } from "../../services/external-resource-user-state";
import {
  EditorialMaterialCard,
  externalResourceToEditorialCard,
  rhConnectMaterialToEditorialCard,
} from "./editorial-material-card";

type InProgressMaterial = SupportMaterial & MaterialUserState;

type ContinueLearningSectionProps = {
  // Materiais RH Connect já filtrados (status IN_PROGRESS) e ordenados pelo chamador.
  materials: InProgressMaterial[];
  onOpen: (material: InProgressMaterial) => void;
  onFavorite: (material: InProgressMaterial) => void;
  // Histórico de acessos de parceiros (Cachola/Orango) já existente.
  externalItems?: ExternalResourceUserState[];
  onOpenExternal?: (resource: ExternalLearningResource) => void;
};

// Limite total da seção (mistura das três origens).
const MAX_ITEMS = 3;

type ContinueItem =
  | { kind: "rh"; key: string; material: InProgressMaterial }
  | { kind: "external"; key: string; resource: ExternalLearningResource };

function formatLastAccess(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return `Último acesso em ${date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`;
}

function accessTime(value?: string) {
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(time) ? 0 : time;
}

// Faixa horizontal compacta com conteúdos que o candidato começou ou acessou.
// - RH Connect: somente status IN_PROGRESS (sem percentual inventado).
// - Cachola/Orango: vêm do histórico local de acessos (lastAccessedAt); não têm
//   progresso, favorito nem duração — apenas "Acessado recentemente".
// Ordem: RH em andamento primeiro (ordem recebida), depois parceiros por
// lastAccessedAt decrescente; no máximo 3 itens no total.
export function ContinueLearningSection({
  materials,
  onOpen,
  onFavorite,
  externalItems = [],
  onOpenExternal,
}: ContinueLearningSectionProps) {
  const externals = onOpenExternal
    ? externalItems
        .filter((item) => Boolean(item.lastAccessedAt))
        .sort((a, b) => accessTime(b.lastAccessedAt) - accessTime(a.lastAccessedAt))
    : [];

  const items: ContinueItem[] = [
    ...materials.map((material): ContinueItem => ({ kind: "rh", key: `rh-${material.id}`, material })),
    ...externals.map(
      (item): ContinueItem => ({
        kind: "external",
        key: `ext-${item.source}-${item.resourceId}`,
        resource: item.resource,
      }),
    ),
  ].slice(0, MAX_ITEMS);

  if (items.length === 0) return null;

  return (
    <section className="@container" aria-labelledby="continue-learning-title">
      <h2 id="continue-learning-title" className="mb-3 flex items-center gap-2 font-bold text-foreground">
        <Clock className="h-4 w-4 text-blue-500" /> Continue aprendendo
      </h2>
      <ul
        className="-mx-4 flex list-none snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:thin] sm:-mx-0 sm:px-0"
      >
        {items.map((item) => (
          <li
            key={item.key}
            className="shrink-0 basis-[85%] snap-start @xl:basis-[calc((100%-1rem)/2)] @4xl:basis-[calc((100%-2rem)/3)]"
          >
            {item.kind === "rh" ? (
              <EditorialMaterialCard
                variant="compact"
                data={{
                  ...rhConnectMaterialToEditorialCard(item.material, {
                    onOpen: () => onOpen(item.material),
                    onFavorite: () => onFavorite(item.material),
                  }),
                  detail: formatLastAccess(item.material.lastAccessedAt),
                }}
              />
            ) : (
              <EditorialMaterialCard
                variant="compact"
                data={{
                  ...externalResourceToEditorialCard(item.resource, {
                    onOpen: () => onOpenExternal?.(item.resource),
                  }),
                  detail: "Acessado recentemente",
                }}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
