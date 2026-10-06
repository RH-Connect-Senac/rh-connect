import { describe, expect, it } from "vitest";
import { apiMonthToMonthYear, formatCoursePeriod, getNoneDeclarationState, monthYearToApi } from "./professional-profile";

describe("getNoneDeclarationState", () => {
  it("sem registros e sem declaração: mostra formulário e a opção de declarar", () => {
    expect(getNoneDeclarationState({ recordCount: 0, declared: false })).toEqual({
      showForm: true,
      showOption: true,
      showUndo: false,
    });
  });

  it("com pelo menos 1 registro: esconde completamente a opção de declarar", () => {
    for (const recordCount of [1, 2, 30]) {
      const state = getNoneDeclarationState({ recordCount, declared: false });
      expect(state.showOption).toBe(false);
      expect(state.showUndo).toBe(false);
      expect(state.showForm).toBe(true);
    }
  });

  it("declaração ativa: esconde o formulário e permite desfazer", () => {
    expect(getNoneDeclarationState({ recordCount: 0, declared: true })).toEqual({
      showForm: false,
      showOption: false,
      showUndo: true,
    });
  });
});

describe("conversão AAAA-MM <-> MM/AAAA", () => {
  it("converte nos dois sentidos e tolera vazio", () => {
    expect(apiMonthToMonthYear("2025-02")).toBe("02/2025");
    expect(monthYearToApi("02/2025")).toBe("2025-02");
    expect(apiMonthToMonthYear(null)).toBe("");
    expect(apiMonthToMonthYear(undefined)).toBe("");
    expect(monthYearToApi("2025-02")).toBeNull();
    expect(monthYearToApi("13/2025")).toBeNull();
  });
});

describe("formatCoursePeriod", () => {
  const f = (status: "EM_ANDAMENTO" | "CONCLUIDO", startDate: string | null, completedAt: string | null) =>
    formatCoursePeriod({ status, startDate, completedAt });

  it("concluído com início e conclusão", () => {
    expect(f("CONCLUIDO", "2023-02", "2025-02")).toBe("02/2023 – 02/2025");
  });

  it("em andamento com início e previsão", () => {
    expect(f("EM_ANDAMENTO", "2025-02", "2026-12")).toBe("02/2025 – Previsão 12/2026");
  });

  it("em andamento com início e sem previsão", () => {
    expect(f("EM_ANDAMENTO", "2025-02", null)).toBe("02/2025 – Em andamento");
  });

  it("sem início usa só os dados existentes", () => {
    expect(f("CONCLUIDO", null, "2025-02")).toBe("Concluído em 02/2025");
    expect(f("EM_ANDAMENTO", null, "2026-12")).toBe("Em andamento · previsão 12/2026");
    expect(f("EM_ANDAMENTO", null, null)).toBe("Em andamento");
  });

  it("nunca produz undefined, null ou separador solto", () => {
    const combos: Array<[string | null, string | null]> = [[null, null], ["2025-02", null], [null, "2025-02"], ["2025-02", "2026-01"]];
    for (const status of ["EM_ANDAMENTO", "CONCLUIDO"] as const) {
      for (const [s, e] of combos) {
        const text = f(status, s, e);
        expect(text).not.toMatch(/undefined|null|—|–\s*$|^\s*–/);
        expect(text.trim()).toBe(text);
      }
    }
  });
});
