import { describe, expect, it } from "vitest";
import {
  ASSIGNED_COUNT_LABEL,
  evaluatorAreaLine,
  evaluatorInitials,
  evaluatorsSubtitle,
  isPresentableEvaluator,
  presentableEvaluators,
} from "./admin-evaluators-view";
import type { AdminEvaluator } from "../services/admin-interviews-service";

const ev = (over: Partial<AdminEvaluator>): AdminEvaluator => ({
  id: 1,
  name: "Beatriz Lima",
  email: "b@gmail.com",
  accountStatus: "ACTIVE",
  eligible: true,
  area: "Gestão de RH",
  specialization: null,
  assignedCount: 0,
  ...over,
});

describe("Avaliadores do Admin (4.1): quem aparece", () => {
  const list = [
    ev({ id: 1, name: "Beatriz" }),
    ev({ id: 2, name: "Patricia", accountStatus: "INVITED", eligible: false }),
    ev({ id: 3, name: "Carlos", assignedCount: 2 }),
    ev({ id: 4, name: "Bloqueado", accountStatus: "BLOCKED", eligible: false }),
    ev({ id: 5, name: "Inativo", accountStatus: "INACTIVE", eligible: false }),
    ev({ id: 6, name: "Pendente", accountStatus: "PENDING_VERIFICATION", eligible: false }),
    ev({ id: 7, name: "Inconsistente", accountStatus: "ACTIVE", eligible: false }),
    ev({ id: 8, name: "Inconsistente 2", accountStatus: "INVITED", eligible: true }),
  ];

  it("só ACTIVE + eligible aparece, na ordem do Back", () => {
    expect(presentableEvaluators(list).map((e) => e.name)).toEqual(["Beatriz", "Carlos"]);
  });

  it("INVITED e qualquer outro estado não ativo nunca aparecem (mesmo com eligible inconsistente)", () => {
    for (const status of ["INVITED", "BLOCKED", "INACTIVE", "PENDING_VERIFICATION", "ALGO_NOVO"]) {
      expect(isPresentableEvaluator({ accountStatus: status, eligible: true })).toBe(false);
      expect(isPresentableEvaluator({ accountStatus: status, eligible: false })).toBe(false);
    }
    expect(isPresentableEvaluator({ accountStatus: "ACTIVE", eligible: false })).toBe(false);
    expect(isPresentableEvaluator({ accountStatus: "ACTIVE", eligible: true })).toBe(true);
  });

  it("a lista da API não é alterada (o filtro é só de apresentação)", () => {
    const copy = [...list];
    presentableEvaluators(list);
    expect(list).toEqual(copy);
    expect(list).toHaveLength(8);
  });

  it("subtítulo conta só os ativos exibidos (singular/plural)", () => {
    expect(evaluatorsSubtitle(null)).toBe("Avaliadores ativos");
    expect(evaluatorsSubtitle(list)).toBe("2 avaliadores ativos");
    expect(evaluatorsSubtitle([ev({})])).toBe("1 avaliador ativo");
    expect(evaluatorsSubtitle([ev({ accountStatus: "INVITED", eligible: false })])).toBe("0 avaliadores ativos");
    expect(evaluatorsSubtitle([])).toBe("0 avaliadores ativos");
  });
});

describe("Avaliadores do Admin (4.1): dados do card", () => {
  it("área real (com especialização quando houver) ou 'Área não informada'; nada inventado", () => {
    expect(evaluatorAreaLine({ area: "Gestão de RH", specialization: "Recrutamento" })).toBe("Gestão de RH · Recrutamento");
    expect(evaluatorAreaLine({ area: "Gestão de RH", specialization: null })).toBe("Gestão de RH");
    expect(evaluatorAreaLine({ area: null, specialization: null })).toBe("Área não informada");
    expect(evaluatorAreaLine({ area: "  ", specialization: "" })).toBe("Área não informada");
  });

  it("iniciais seguras e rótulo do contador é 'Atribuídas' (não 'Concluídas')", () => {
    expect(evaluatorInitials("Beatriz Lima Souza")).toBe("BL");
    expect(evaluatorInitials("  ")).toBe("?");
    expect(ASSIGNED_COUNT_LABEL).toBe("Atribuídas");
    expect(ASSIGNED_COUNT_LABEL).not.toMatch(/conclu/i);
  });
});
