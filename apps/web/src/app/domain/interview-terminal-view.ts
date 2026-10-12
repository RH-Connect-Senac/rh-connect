/**
 * Apresentação (só visual) do wizard quando a entrevista foi CANCELADA em outro dispositivo.
 * Não decide navegação nem edição: isso continua no guard de sessão (`stale`).
 * A pergunta aberta permanece visível como "foto" do momento do cancelamento, sem aparência
 * de ativa/em andamento, e sem liberar respostas anteriores.
 */

export type ProgressNavState = "CURRENT" | "ANSWERED" | "VISITED_PENDING" | "LOCKED";
export type ProgressVisualState = ProgressNavState | "READONLY";

export const PROGRESS_LABELS: Record<ProgressVisualState, string> = {
  CURRENT: "Em andamento",
  ANSWERED: "Respondida",
  VISITED_PENDING: "Pendente",
  LOCKED: "Bloqueada",
  READONLY: "Somente leitura",
};

export function isCancelledSession(status: string | null | undefined): boolean {
  return status === "CANCELLED";
}

/** Cancelada: a pergunta "atual" deixa de parecer ativa. Qualquer outro caso: igual ao de antes. */
export function resolveProgressVisual(navState: ProgressNavState, cancelled: boolean): ProgressVisualState {
  return cancelled && navState === "CURRENT" ? "READONLY" : navState;
}

/** Campo de resposta somente leitura: aparência neutra (legível, sem cara de campo editável). */
export const CANCELLED_TEXTAREA_CLASS =
  "bg-muted/40 border-border text-foreground cursor-default resize-none focus-visible:ring-0 focus-visible:border-border";
