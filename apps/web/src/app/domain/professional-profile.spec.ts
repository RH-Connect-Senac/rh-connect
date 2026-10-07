import { describe, expect, it } from "vitest";
import { apiMonthToMonthYear, formatCoursePeriod, getNoneDeclarationState, describeMissingObjectiveFields, getProfileCompletionPercent, getProfileNotice, monthYearToApi, OBJECTIVE_FIELD_LABELS } from "./professional-profile";

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

describe("getProfileCompletionPercent com senioridade x contrato", () => {
  const base = { isComplete: false, missingSections: [] as never[], missingObjectiveFields: [] as never[] };

  it("perfil completo (API) exibe 100% em qualquer contrato, inclusive ESTAGIO", () => {
    for (const contractType of ["ESTAGIO", "CLT", "PJ", "TEMPORARIO", null] as const) {
      expect(getProfileCompletionPercent({ ...base, isComplete: true, contractType })).toBe(100);
    }
  });

  it("ESTAGIO: senioridade não entra no total (11 unidades)", () => {
    // falta só a seção de formação: 10 de 11 preenchidas
    const percent = getProfileCompletionPercent({ ...base, contractType: "ESTAGIO", missingSections: ["education"] });
    expect(percent).toBe(Math.round((10 / 11) * 100));
  });

  it("CLT/PJ/TEMPORARIO: senioridade continua no total (12 unidades)", () => {
    for (const contractType of ["CLT", "PJ", "TEMPORARIO", null] as const) {
      const percent = getProfileCompletionPercent({ ...base, contractType, missingSections: ["education"] });
      expect(percent).toBe(Math.round((11 / 12) * 100));
    }
  });

  it("ESTAGIO: objetivo pendente nunca desconta mais que os 6 campos aplicáveis", () => {
    const percent = getProfileCompletionPercent({
      ...base,
      contractType: "ESTAGIO",
      missingSections: ["objective"],
      missingObjectiveFields: ["professionalTitle", "professionalArea", "professionalSubarea", "desiredPosition", "contractType", "professionalSummary"] as never[],
    });
    expect(percent).toBe(Math.round((5 / 11) * 100));
  });

  it("nunca chega a 100% com perfil incompleto", () => {
    expect(getProfileCompletionPercent({ ...base, contractType: "ESTAGIO", missingSections: ["behavioralSkills"] })).toBeLessThan(100);
  });
});

describe("separação isComplete x isInterviewReady", () => {
  it("objetivo pendente: aviso de bloqueio, independente de isComplete", () => {
    expect(getProfileNotice({ isComplete: false, isInterviewReady: false })).toBe("objective-pending");
  });

  it("objetivo pronto e perfil incompleto: entrevista liberada, aviso só informativo", () => {
    expect(getProfileNotice({ isComplete: false, isInterviewReady: true })).toBe("optional-sections");
  });

  it("perfil completo: sem aviso", () => {
    expect(getProfileNotice({ isComplete: true, isInterviewReady: true })).toBe("none");
  });

  it("percentual geral continua refletindo as demais seções com o objetivo pronto", () => {
    const percent = getProfileCompletionPercent({
      isComplete: false,
      missingSections: ["education", "behavioralSkills"],
      missingObjectiveFields: [],
      contractType: "CLT",
    });
    expect(percent).toBe(Math.round((10 / 12) * 100));
  });
});

describe("describeMissingObjectiveFields", () => {
  it("mostra só os campos pendentes, com os rótulos do formulário", () => {
    expect(describeMissingObjectiveFields(["desiredPosition", "professionalLevel"])).toEqual([
      "Cargo desejado",
      "Senioridade profissional",
    ]);
  });

  it("lista vazia não gera rótulos", () => {
    expect(describeMissingObjectiveFields([])).toEqual([]);
  });

  it("cobre todos os campos do objetivo (7)", () => {
    expect(Object.keys(OBJECTIVE_FIELD_LABELS)).toHaveLength(7);
    for (const label of Object.values(OBJECTIVE_FIELD_LABELS)) expect(label.trim()).not.toBe("");
  });
});
