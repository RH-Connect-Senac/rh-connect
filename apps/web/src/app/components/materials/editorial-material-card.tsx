import { ArrowRight, Bookmark, BookOpen, ExternalLink } from "lucide-react";

import type { MaterialStatus, MaterialUserState, SupportMaterial } from "../../domain/materials";
import type { ExternalLearningResource, ExternalResourceSource } from "../../services/external-resources-service";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { cn } from "../ui/utils";

// ─── Modelo visual comum ─────────────────────────────────────────────────────
// Só descreve COMO o card é apresentado. Não substitui nem altera
// MaterialCardView / ExternalLearningResource: os conversores abaixo são puros
// e todos os campos opcionais podem simplesmente não existir.

export type EditorialCardData = {
  id: string;
  title: string;
  sourceLabel?: string;
  typeLabel?: string;
  description?: string;
  coverUrl?: string;
  categoryLabel?: string;
  // Texto de progresso já pronto (ex.: "Em andamento"); ausente se não iniciado.
  progressLabel?: string;
  // Texto secundário opcional (ex.: "Último acesso em 28/09").
  detail?: string;
  // Conteúdo de plataforma parceira (abre fora do RH Connect).
  external?: boolean;
  // Capa em retrato (Cachola): mostra a capa inteira sobre fundo desfocado.
  coverBackdrop?: boolean;
  // Presente só quando a fonte realmente tem estado de favorito.
  favorite?: { active: boolean; onToggle: () => void };
  action: { label: string; onClick: () => void };
};

type RhConnectMaterial = SupportMaterial & MaterialUserState;

const MATERIAL_STATUS_LABEL: Record<MaterialStatus, string> = {
  NOT_STARTED: "Não iniciado",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
};

const EXTERNAL_SOURCE_LABEL: Record<ExternalResourceSource, string> = {
  CACHOLA: "Cachola · Parceiro",
  ORANGO: "Orango · Parceiro",
};

const EXTERNAL_CTA_LABEL: Record<ExternalResourceSource, string> = {
  CACHOLA: "Acessar na Cachola",
  ORANGO: "Acessar no Orango",
};

export function rhConnectMaterialToEditorialCard(
  material: RhConnectMaterial,
  handlers: { onOpen: () => void; onFavorite: () => void },
): EditorialCardData {
  return {
    id: material.id,
    title: material.title,
    sourceLabel: "RH Connect",
    typeLabel: material.type === "READING" ? "Leitura" : material.type,
    description: material.description || undefined,
    categoryLabel: material.category,
    progressLabel: material.status !== "NOT_STARTED" ? MATERIAL_STATUS_LABEL[material.status] : undefined,
    favorite: { active: material.isFavorite, onToggle: handlers.onFavorite },
    action: { label: "Abrir material", onClick: handlers.onOpen },
  };
}

export function externalResourceToEditorialCard(
  resource: ExternalLearningResource,
  handlers: { onOpen: () => void },
): EditorialCardData {
  // "Sem seção" é o placeholder do backend: não é descrição real.
  const section = resource.section && resource.section !== "Sem seção" ? resource.section : undefined;
  return {
    id: resource.id,
    title: resource.title,
    sourceLabel: EXTERNAL_SOURCE_LABEL[resource.source],
    typeLabel: resource.resourceType || undefined,
    // Sem descrição própria: só se reaproveita a seção quando ela existe de fato.
    description: section,
    external: true,
    coverUrl: resource.coverUrl ?? undefined,
    coverBackdrop: resource.source === "CACHOLA" || undefined,
    categoryLabel: resource.area ?? resource.categories[0]?.name ?? undefined,
    action: { label: EXTERNAL_CTA_LABEL[resource.source], onClick: handlers.onOpen },
  };
}

// ─── Card ────────────────────────────────────────────────────────────────────

function CardCover({
  coverUrl,
  backdrop,
  compact,
  vertical,
}: {
  coverUrl?: string;
  backdrop?: boolean;
  compact?: boolean;
  vertical?: boolean;
}) {
  // Com coverUrl: imagem. Sem: fallback só com tokens do Design System
  // (gradiente `secondary` → `card`, ícone `primary`), sem imagem mockada.
  // A imagem fica sobre o fallback: se falhar ao carregar, o fallback aparece.
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-secondary to-card",
        vertical ? "aspect-[16/9] w-full border-b border-border" : "self-stretch",
        !vertical && (compact ? "w-20 sm:w-24" : "w-28 sm:w-36"),
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-xl bg-card text-primary shadow-sm",
          compact ? "size-10" : "size-12",
        )}
      >
        <BookOpen className={compact ? "size-4" : "size-5"} />
      </span>
      {coverUrl && backdrop ? (
        <img
          src={coverUrl}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-md"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      {coverUrl ? (
        <img
          src={coverUrl}
          alt=""
          loading="lazy"
          className={cn(
            "absolute inset-0 h-full w-full",
            backdrop ? "object-contain p-2" : "object-cover",
          )}
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
    </div>
  );
}

export function EditorialMaterialCard({
  data,
  className,
  variant = "default",
}: {
  data: EditorialCardData;
  className?: string;
  // "compact": versão menor para faixas (ex.: "Continue aprendendo"): sem
  // descrição, capa e espaçamentos reduzidos, progresso como linha de status.
  // "vertical": capa no topo, usada nas grades do catálogo (Explore).
  variant?: "default" | "compact" | "vertical";
}) {
  const compact = variant === "compact";
  const vertical = variant === "vertical";
  const meta = [data.typeLabel, data.sourceLabel].filter(Boolean).join(" · ");

  return (
    <Card
      padding="none"
      className={cn(
        "flex h-full overflow-hidden transition-all hover:shadow-md",
        vertical ? "flex-col" : "flex-row",
        className,
      )}
    >
      <CardCover coverUrl={data.coverUrl} backdrop={data.coverBackdrop} compact={compact} vertical={vertical} />

      <div className={cn("flex min-w-0 flex-1 flex-col", compact ? "gap-2 p-3.5" : "gap-3 p-4 sm:p-5")}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {(meta || (!compact && data.progressLabel)) && (
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-primary">
                {vertical ? (
                  <>
                    {data.typeLabel}
                    {data.typeLabel && data.sourceLabel && " · "}
                    <span className={data.external ? "text-muted-foreground" : undefined}>{data.sourceLabel}</span>
                  </>
                ) : (
                  meta
                )}
                {!compact && data.progressLabel && (
                  <span className="font-medium normal-case tracking-normal text-muted-foreground">
                    {meta ? " • " : ""}
                    {data.progressLabel}
                  </span>
                )}
              </p>
            )}
            <h3
              className={cn(
                "font-bold leading-snug text-foreground",
                compact ? "line-clamp-2 text-sm sm:text-base" : vertical ? "line-clamp-2 text-base" : "text-base sm:text-lg",
              )}
            >
              {data.title}
            </h3>
            {compact && (data.progressLabel || data.detail) && (
              <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                {data.progressLabel && (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-primary">
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
                    {data.progressLabel}
                  </span>
                )}
                {data.progressLabel && data.detail && <span aria-hidden="true">·</span>}
                {data.detail && <span>{data.detail}</span>}
              </p>
            )}
          </div>
          {data.favorite && (
            <button
              type="button"
              onClick={data.favorite.onToggle}
              aria-label={data.favorite.active ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              aria-pressed={data.favorite.active}
              className={cn(
                "shrink-0 rounded-lg p-1.5 transition-colors",
                data.favorite.active
                  ? "text-amber-500 hover:text-amber-600"
                  : "text-muted-foreground hover:text-amber-400",
              )}
            >
              <Bookmark className={cn("size-4", data.favorite.active && "fill-current")} />
            </button>
          )}
        </div>

        {!compact && data.description && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{data.description}</p>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-1">
          {data.categoryLabel ? (
            <span className="min-w-0 truncate text-xs font-medium text-muted-foreground">{data.categoryLabel}</span>
          ) : (
            <span />
          )}
          <Button type="button" variant="secondary" size="sm" onClick={data.action.onClick}>
            {data.action.label}
            {data.external ? <ExternalLink aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
          </Button>
        </div>
      </div>
    </Card>
  );
}
