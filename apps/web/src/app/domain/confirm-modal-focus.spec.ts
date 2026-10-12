import { describe, expect, it } from "vitest";
import {
  CONFIRM_MODAL_DANGER_FOCUS_RING,
  CONFIRM_MODAL_FOCUS_RING,
  CONFIRM_MODAL_HIDDEN_FOCUS_RING,
  resolveInitialFocus,
  shouldHideInitialFocusRing,
} from "./confirm-modal-focus";

describe("foco inicial do ConfirmModal", () => {
  it("padrão: a ação secundária (comportamento anterior dos demais modais)", () => {
    expect(resolveInitialFocus({ showCancel: true })).toBe("cancel");
  });
  it("'Deseja sair da entrevista?': foco inicial em 'Sair e continuar depois' (confirm), nunca no destrutivo", () => {
    expect(resolveInitialFocus({ showCancel: true, initialFocus: "confirm" })).toBe("confirm");
  });
  it("confirmação do cancelamento: foco em 'Voltar' (a segura), nunca em 'Cancelar entrevista'", () => {
    expect(resolveInitialFocus({ showCancel: true, initialFocus: "cancel" })).toBe("cancel");
  });
  it("modal informativo (sem ação secundária): foca a única ação", () => {
    expect(resolveInitialFocus({ showCancel: false })).toBe("confirm");
    expect(resolveInitialFocus({ showCancel: false, initialFocus: "cancel" })).toBe("confirm");
  });
});

describe("focus-visible do ConfirmModal", () => {
  it("toque sem teclado: o foco inicial não mostra ring; ao usar Tab o ring volta", () => {
    expect(shouldHideInitialFocusRing({ coarsePointer: true, keyboardUsed: false })).toBe(true);
    expect(shouldHideInitialFocusRing({ coarsePointer: true, keyboardUsed: true })).toBe(false);
  });
  it("desktop/mouse+teclado: focus-visible nunca é escondido", () => {
    expect(shouldHideInitialFocusRing({ coarsePointer: false, keyboardUsed: false })).toBe(false);
    expect(shouldHideInitialFocusRing({ coarsePointer: false, keyboardUsed: true })).toBe(false);
  });
  it("ring discreto (2px), ainda com focus-visible e perceptível", () => {
    for (const cls of [CONFIRM_MODAL_FOCUS_RING, CONFIRM_MODAL_DANGER_FOCUS_RING]) {
      expect(cls).toContain("focus-visible:ring-2");
      expect(cls).not.toMatch(/ring-\[4px\]|ring-4/);
      expect(cls).not.toMatch(/outline-none|outline-0/);
    }
    expect(CONFIRM_MODAL_HIDDEN_FOCUS_RING).toBe("focus-visible:ring-0");
  });
});
