import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Fase 7B.4: copy visível do Admin usa "Pontuação" (nunca "Score"). Só o texto:
// identificadores técnicos (score, formatScore, averageScore...) continuam como estão.
const SOURCE = readFileSync(resolve(__dirname, "admin-screens.tsx"), "utf8");

describe("admin-screens: nomenclatura 'Pontuação'", () => {
  it("sem 'Score', 'Score Final' ou 'Scores por Critério' em texto visível", () => {
    expect(SOURCE).not.toContain("Score Final");
    expect(SOURCE).not.toContain("Scores por Critério");
    expect(SOURCE).not.toMatch(/>\s*Scores?\s*</);
  });

  it("mantém as copies padronizadas", () => {
    expect(SOURCE).toContain(">Pontuação</th>");
    expect(SOURCE).toContain("Pontuação Final");
  });
});
