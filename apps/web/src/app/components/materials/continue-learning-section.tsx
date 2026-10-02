import { Clock } from "lucide-react";

import type { MaterialUserState, SupportMaterial } from "../../domain/materials";
import { EditorialMaterialCard, rhConnectMaterialToEditorialCard } from "./editorial-material-card";

type InProgressMaterial = SupportMaterial & MaterialUserState;

type ContinueLearningSectionProps = {
  // Materiais já filtrados (status IN_PROGRESS) e ordenados pelo chamador.
  materials: InProgressMaterial[];
  onOpen: (material: InProgressMaterial) => void;
  onFavorite: (material: InProgressMaterial) => void;
};

function formatLastAccess(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return `Último acesso em ${date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`;
}

// Faixa horizontal compacta. O modelo atual só tem o status (NOT_STARTED /
// IN_PROGRESS / COMPLETED) — não existe percentual —, então o progresso é
// mostrado como "Em andamento" + último acesso real, sem número nem barra.
export function ContinueLearningSection({ materials, onOpen, onFavorite }: ContinueLearningSectionProps) {
  if (materials.length === 0) return null;

  return (
    <section className="@container" aria-labelledby="continue-learning-title">
      <h2 id="continue-learning-title" className="mb-3 flex items-center gap-2 font-bold text-foreground">
        <Clock className="h-4 w-4 text-blue-500" /> Continue aprendendo
      </h2>
      <ul
        className="-mx-4 flex list-none snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:thin] sm:-mx-0 sm:px-0"
      >
        {materials.map((material) => (
          <li
            key={material.id}
            className="shrink-0 basis-[85%] snap-start @xl:basis-[calc((100%-1rem)/2)] @4xl:basis-[calc((100%-2rem)/3)]"
          >
            <EditorialMaterialCard
              variant="compact"
              data={{
                ...rhConnectMaterialToEditorialCard(material, {
                  onOpen: () => onOpen(material),
                  onFavorite: () => onFavorite(material),
                }),
                detail: formatLastAccess(material.lastAccessedAt),
              }}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
