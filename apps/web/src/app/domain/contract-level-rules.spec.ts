import { describe, expect, it } from "vitest";
import {
  ALLOWED_LEVELS_BY_CONTRACT,
  LEVEL_NOT_APPLICABLE_LABEL,
  getLevelOptionsForContract,
  isLevelApplicable,
  levelAfterContractChange,
  levelForApi,
} from "./professional-profile";

const values = (contract: string | null) => getLevelOptionsForContract(contract).map((option) => option.value);

describe("regra contrato x senioridade (frontend)", () => {
  it("espelha a regra do backend", () => {
    expect(ALLOWED_LEVELS_BY_CONTRACT).toEqual({
      ESTAGIO: [],
      CLT: ["TRAINEE", "JUNIOR", "PLENO", "SENIOR"],
      PJ: ["JUNIOR", "PLENO", "SENIOR"],
      TEMPORARIO: ["JUNIOR", "PLENO", "SENIOR"],
    });
  });

  it("opções de senioridade por contrato", () => {
    expect(values("CLT")).toEqual(["TRAINEE", "JUNIOR", "PLENO", "SENIOR"]);
    expect(values("PJ")).toEqual(["JUNIOR", "PLENO", "SENIOR"]);
    expect(values("TEMPORARIO")).toEqual(["JUNIOR", "PLENO", "SENIOR"]);
    expect(values("ESTAGIO")).toEqual([]);
    expect(values("")).toHaveLength(4);
    expect(values(null)).toHaveLength(4);
  });

  it("senioridade só deixa de se aplicar para estágio", () => {
    expect(isLevelApplicable("ESTAGIO")).toBe(false);
    for (const contract of ["CLT", "PJ", "TEMPORARIO", "", null]) {
      expect(isLevelApplicable(contract)).toBe(true);
    }
    expect(LEVEL_NOT_APPLICABLE_LABEL).toBe("Não se aplica");
  });

  it("CLT + SENIOR -> ESTAGIO limpa a senioridade", () => {
    expect(levelAfterContractChange("ESTAGIO", "SENIOR")).toBe("");
  });

  it("troca para contrato incompatível limpa imediatamente", () => {
    expect(levelAfterContractChange("PJ", "TRAINEE")).toBe("");
    expect(levelAfterContractChange("TEMPORARIO", "TRAINEE")).toBe("");
  });

  it("troca para contrato compatível preserva a senioridade", () => {
    expect(levelAfterContractChange("PJ", "PLENO")).toBe("PLENO");
    expect(levelAfterContractChange("CLT", "TRAINEE")).toBe("TRAINEE");
    expect(levelAfterContractChange("TEMPORARIO", "SENIOR")).toBe("SENIOR");
  });

  it("sair de ESTAGIO volta vazio: nada é escolhido automaticamente", () => {
    // Depois de ESTAGIO o estado já está "" e continua "" em qualquer contrato.
    for (const contract of ["CLT", "PJ", "TEMPORARIO"]) {
      expect(levelAfterContractChange(contract, "")).toBe("");
    }
  });

  it("payload: estágio sempre envia null, mesmo com valor residual", () => {
    expect(levelForApi("ESTAGIO", "SENIOR")).toBeNull();
    expect(levelForApi("ESTAGIO", "")).toBeNull();
  });

  it("payload: demais contratos enviam a senioridade válida ou null", () => {
    expect(levelForApi("CLT", "TRAINEE")).toBe("TRAINEE");
    expect(levelForApi("PJ", "PLENO")).toBe("PLENO");
    expect(levelForApi("PJ", "TRAINEE")).toBeNull();
    expect(levelForApi("CLT", "")).toBeNull();
    expect(levelForApi("", "JUNIOR")).toBe("JUNIOR");
  });
});
