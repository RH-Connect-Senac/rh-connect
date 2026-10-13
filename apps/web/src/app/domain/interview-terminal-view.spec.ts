import { describe, expect, it } from "vitest";
import {
  CANCELLED_TEXTAREA_CLASS,
  PROGRESS_LABELS,
  isCancelledSession,
  resolveProgressVisual,
} from "./interview-terminal-view";

describe("visual do estado terminal CANCELLED", () => {
  it("só CANCELLED é tratado como sessão cancelada", () => {
    expect(isCancelledSession("CANCELLED")).toBe(true);
    expect(isCancelledSession("IN_PROGRESS")).toBe(false);
    expect(isCancelledSession("SUBMITTED")).toBe(false);
    expect(isCancelledSession(null)).toBe(false);
    expect(isCancelledSession(undefined)).toBe(false);
  });

  it("cancelada: a pergunta atual deixa de aparecer como 'Em andamento'", () => {
    const visual = resolveProgressVisual("CURRENT", true);
    expect(visual).toBe("READONLY");
    expect(PROGRESS_LABELS[visual]).toBe("Somente leitura");
    expect(PROGRESS_LABELS[visual]).not.toBe("Em andamento");
  });

  it("cancelada: as demais perguntas não mudam de estado nem ganham o rótulo 'Cancelada'", () => {
    for (const state of ["ANSWERED", "VISITED_PENDING", "LOCKED"] as const) {
      expect(resolveProgressVisual(state, true)).toBe(state);
    }
    expect(Object.values(PROGRESS_LABELS).join("|")).not.toMatch(/cancelad/i);
  });

  it("IN_PROGRESS (não cancelada) permanece idêntico ao atual", () => {
    expect(resolveProgressVisual("CURRENT", false)).toBe("CURRENT");
    expect(PROGRESS_LABELS.CURRENT).toBe("Em andamento");
    expect(PROGRESS_LABELS.ANSWERED).toBe("Respondida");
    expect(PROGRESS_LABELS.VISITED_PENDING).toBe("Pendente");
    expect(PROGRESS_LABELS.LOCKED).toBe("Bloqueada");
    for (const state of ["ANSWERED", "VISITED_PENDING", "LOCKED"] as const) {
      expect(resolveProgressVisual(state, false)).toBe(state);
    }
  });

  it("o campo cancelado usa visual neutro, legível e sem cursor de digitação", () => {
    expect(CANCELLED_TEXTAREA_CLASS).toContain("cursor-default");
    expect(CANCELLED_TEXTAREA_CLASS).not.toMatch(/opacity|text-muted-foreground/);
  });
});
