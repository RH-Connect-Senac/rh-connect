import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Fase 7B.3: a pontuação geral é a média simples dos 7 critérios (0–10). A UI do
// Avaliador não pode sugerir ponderação nem usar "Score" em texto visível.
const SOURCE = readFileSync(resolve(__dirname, "eval-screens.tsx"), "utf8");

function sliceBetween(from: string, to: string): string {
  const start = SOURCE.indexOf(from);
  const end = SOURCE.indexOf(to, start + from.length);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return SOURCE.slice(start, end);
}

describe("eval-screens: sem pesos fictícios", () => {
  const guide = sliceBetween("const CRITERIA_GUIDE = [", "];");

  it("CRITERIA_GUIDE mantém os 7 critérios, sem propriedade weight nem percentuais", () => {
    expect(guide.match(/\bname: "/g)?.length).toBe(7);
    expect(guide).not.toMatch(/weight/);
    expect(guide).not.toMatch(/\d\s*%/);
  });

  it("nenhuma referência a weight ou 'Peso N' no arquivo", () => {
    expect(SOURCE).not.toMatch(/\bweight\b/);
    expect(SOURCE).not.toMatch(/Peso\s*(\{|\d)/);
  });

  it("copy visível usa 'Pontuação' (sem 'Score ≥', 'Score <', 'Scores por', 'Resumo dos Scores')", () => {
    expect(SOURCE).not.toMatch(/Score\s*[≥<]/);
    expect(SOURCE).not.toContain("Scores por Critério");
    expect(SOURCE).not.toContain("Resumo dos Scores");
    expect(SOURCE).not.toContain("Score final");
  });
});
