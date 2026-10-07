import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// A entrevista depende só do Objetivo Profissional (`isInterviewReady`).
// Garante que o guard e os avisos de bloqueio não voltam a usar a completude
// do perfil inteiro (`isComplete` / `missingSections`).
const app = readFileSync(resolve(__dirname, "..", "App.tsx"), "utf8");

function sliceBetween(start: string, end: string) {
  const from = app.indexOf(start);
  const to = app.indexOf(end, from);
  expect(from).toBeGreaterThan(-1);
  expect(to).toBeGreaterThan(from);
  return app.slice(from, to);
}

describe("InterviewProfileGuard", () => {
  const guard = sliceBetween("function InterviewProfileGuard", "function DraftWizardGuard");

  it("libera pela prontidão do objetivo", () => {
    expect(guard).toContain("profile?.isInterviewReady");
  });

  it("não depende de isComplete nem de missingSections", () => {
    expect(guard).not.toContain("isComplete");
    expect(guard).not.toContain("missingSections");
  });

  it("lista apenas os campos pendentes do objetivo", () => {
    expect(guard).toContain("describeMissingObjectiveFields(profile.missingObjectiveFields)");
    expect(guard).toContain("Objetivo Profissional");
  });
});

describe("avisos de entrevista no dashboard e na tela de Perfil", () => {
  it("nenhum aviso de bloqueio usa isComplete", () => {
    expect(app).not.toMatch(/Para realizar entrevistas, falta completar/);
    expect(app).not.toMatch(/!\s*(candidateProfile|profile)\.isComplete/);
  });
});
