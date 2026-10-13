/**
 * Foco inicial e estilo de focus do ConfirmModal.
 *  - O foco inicial nunca vai para uma ação destrutiva: cada modal escolhe a ação segura
 *    ("Sair e continuar depois" em "Deseja sair da entrevista?"; "Voltar" ao confirmar o cancelamento).
 *  - Ring de teclado discreto (2px) no lugar do halo de 4px.
 *  - Em ponteiro "coarse" (toque), o foco programático inicial não mostra ring até a primeira
 *    navegação por teclado (Tab); no desktop/teclado o focus-visible segue igual.
 */
export type ConfirmInitialFocus = "cancel" | "confirm";

export function resolveInitialFocus(input: { showCancel: boolean; initialFocus?: ConfirmInitialFocus }): ConfirmInitialFocus {
  if (!input.showCancel) return "confirm";
  return input.initialFocus ?? "cancel";
}

export function shouldHideInitialFocusRing(input: { coarsePointer: boolean; keyboardUsed: boolean }): boolean {
  return input.coarsePointer && !input.keyboardUsed;
}

export const CONFIRM_MODAL_FOCUS_RING = "focus-visible:ring-2 focus-visible:ring-[rgba(29,78,216,0.45)]";
export const CONFIRM_MODAL_DANGER_FOCUS_RING = "focus-visible:ring-2 focus-visible:ring-destructive/40";
export const CONFIRM_MODAL_HIDDEN_FOCUS_RING = "focus-visible:ring-0";
