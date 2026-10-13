import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// A fila de atribuição do Admin é REAL (API/PostgreSQL). Estes testes impedem
// que a tela volte a ler mock/localStorage ou a lista fixa de avaliadores.
const adminScreens = readFileSync(
  resolve(__dirname, "..", "components", "admin-screens.tsx"),
  "utf8",
);

function sliceAssignScreen(): string {
  const start = adminScreens.indexOf("export function AdminAssignScreen");
  const end = adminScreens.indexOf("// ─── Screen: Banco de Perguntas");
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return adminScreens.slice(start, end);
}

describe("AdminAssignScreen usa a API real", () => {
  const screen = sliceAssignScreen();

  it("lê a fila e os avaliadores do service da API e atribui pela API", () => {
    expect(screen).toContain("listPendingAssignmentInterviews()");
    expect(screen).toContain("listAdminEvaluators()");
    expect(screen).toContain("assignInterviewToEvaluator(");
  });

  it("não usa o mock/localStorage de entrevistas nem a lista fixa EVALUATORS", () => {
    expect(screen).not.toContain("getPendingAdminInterviews");
    expect(screen).not.toContain("getAdminVisibleInterviews");
    expect(screen).not.toMatch(/\bassignInterview\(/);
    expect(screen).not.toMatch(/\bEVALUATORS\b/);
    expect(screen).not.toMatch(/localStorage|sessionStorage/);
  });

  it("só oferece avaliadores elegíveis (conta ACTIVE) para atribuição", () => {
    expect(screen).toMatch(/evaluator\.eligible/);
  });

  it("relê a fila da API em silêncio depois de atribuir (não adivinha estado local, sem spinner)", () => {
    expect(screen).toMatch(/setSelected\(null\);\s*void live\.refresh\(\{ supersede: true \}\);/);
    expect(screen).not.toMatch(/setSelected\(null\);\s*reload\(\);/);
  });
});
