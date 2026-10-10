import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EVAL_ACCOUNT,
  resolveAccountConfig,
} from "../components/header-popovers";

const APP = join(__dirname, "..");
const read = (relative: string) => readFileSync(join(APP, relative), "utf8");

// Remove comentários para testar só o código executável.
function code(source: string) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

const REAL_FILES = [
  "services/evaluator-interviews-service.ts",
  "components/evaluator-real-content.tsx",
  "components/evaluator-real-screens.tsx",
];

const FORBIDDEN =
  /DEFAULT_EVALUATOR|EVALUATOR_DIRECTORY|findEvaluatorIdByEmail|evaluator-carlos-andrade|evaluator-camila-dias|Carlos Andrade|carlos\.andrade|camila\.dias/;

describe("área real do avaliador: fonte de dados", () => {
  it.each(REAL_FILES)("%s não usa mocks, localStorage nem identidade fictícia", (file) => {
    const source = code(read(file));
    expect(source).not.toMatch(FORBIDDEN);
    expect(source).not.toMatch(/mocks\//);
    expect(source).not.toMatch(/services\/interviews-service"/);
    expect(source).not.toMatch(/localStorage|sessionStorage/);
  });

  it("as telas reais leem fila e detalhe do serviço real e navegam por interviewId (UUID) da API", () => {
    const screens = code(read("components/evaluator-real-screens.tsx"));
    expect(screens).toContain("listAssignedInterviews");
    expect(screens).toContain("getAssignedInterview");
    expect(screens).toMatch(/\$\{EVAL_ROUTE\}\/\$\{id\}/);
    expect(screens).not.toMatch(/evaluatorId/);
  });

  it("o conteúdo usa os dados do serviço (candidato, vaga, perguntas e respostas)", () => {
    const content = code(read("components/evaluator-real-content.tsx"));
    for (const field of ["item.candidate.name", "item.jobTitle", "context.title", "question.text", "question.answer"]) {
      expect(content).toContain(field);
    }
  });

  it("App.tsx: sem ponte e-mail→id mock nem fallback para avaliador padrão", () => {
    const app = code(read("App.tsx"));
    expect(app).not.toMatch(/getEvaluatorIdentity|DEFAULT_EVALUATOR|findEvaluatorIdByEmail|EVALUATOR_DIRECTORY/);
    expect(app).not.toMatch(/evaluator-carlos|evaluator-camila/);
  });

  it("App.tsx: Dashboard, Fila e Detalhe do avaliador usam as telas reais", () => {
    const app = code(read("App.tsx"));
    expect(app).toContain('from "./components/evaluator-real-screens"');
    expect(app).toMatch(/path="\/evaluator\/dashboard"[^\n]*<EvalDashboardScreen onNavigate=\{navigate\} \/>/);
    expect(app).toMatch(/path="\/evaluator\/evaluations"[^\n]*<EvalQueueScreen onNavigate=\{navigate\} \/>/);
    expect(app).toMatch(/path="\/evaluator\/evaluations\/:id"[^\n]*<EvalInterviewDetailScreen onNavigate=\{navigate\} \/>/);
    expect(app).not.toMatch(/<EvalScreenView/);
  });

  it("telas ainda mock recebem só o id da SESSÃO real (nunca um id fictício)", () => {
    const app = code(read("App.tsx"));
    expect(app).toMatch(/const evaluatorSessionId = session\.authenticated && session\.user\?\.role === "EVALUATOR" \? session\.user\.id : ""/);
    expect(app).not.toMatch(/evaluatorId=\{(?!evaluatorSessionId)/);
  });

  it("eval-screens.tsx: Dashboard/Fila mock removidos e Configurações sem dados fixos", () => {
    const screens = code(read("components/eval-screens.tsx"));
    expect(screens).not.toMatch(/export function EvalDashboardScreen|export function EvalQueueScreen/);
    expect(screens).not.toMatch(/Carlos|carlos\.andrade|Recursos Humanos|defaultValue="Carlos/);
    expect(screens).toMatch(/useContext\(SessionContext\)/);
  });
});

const sessionUser = (name: string, email: string) => ({ name, email });

describe("identidade do avaliador vem da sessão real", () => {
  it("a base do cabeçalho é neutra (nunca Carlos)", () => {
    expect(EVAL_ACCOUNT.name).toBe("Avaliador");
    expect(EVAL_ACCOUNT.email).toBe("");
    expect(JSON.stringify(EVAL_ACCOUNT)).not.toMatch(/Carlos|carlos|CA"/);
  });

  it.each([
    ["Camila Dias", "camila.dias@gmail.com", "CD"],
    ["Carlos Andrade", "carlos.andrade@gmail.com", "CA"],
    ["Beatriz Lima", "beatriz.lima@gmail.com", "BL"],
  ])("%s: nome, e-mail e iniciais são os dela/dele", (name, email, initials) => {
    const account = resolveAccountConfig(EVAL_ACCOUNT, sessionUser(name, email));
    expect(account.name).toBe(name);
    expect(account.email).toBe(email);
    expect(account.initials).toBe(initials);
  });

  it("Camila não recebe Carlos; Carlos não recebe Camila; Beatriz não cai em Carlos", () => {
    const camila = resolveAccountConfig(EVAL_ACCOUNT, sessionUser("Camila Dias", "camila.dias@gmail.com"));
    const carlos = resolveAccountConfig(EVAL_ACCOUNT, sessionUser("Carlos Andrade", "carlos.andrade@gmail.com"));
    const beatriz = resolveAccountConfig(EVAL_ACCOUNT, sessionUser("Beatriz Lima", "beatriz.lima@gmail.com"));

    expect(JSON.stringify(camila)).not.toMatch(/Carlos|carlos/);
    expect(JSON.stringify(carlos)).not.toMatch(/Camila|camila/);
    expect(JSON.stringify(beatriz)).not.toMatch(/Carlos|carlos|Camila|camila/);
  });

  it("sem sessão de avaliador, o cabeçalho cai no rótulo neutro e não em outra pessoa", () => {
    const account = resolveAccountConfig(EVAL_ACCOUNT, null);
    expect(account.name).toBe("Avaliador");
    expect(account.email).toBe("");
  });

  it("Configurações: sem especialização/área inventada (não há fonte real)", () => {
    const settings = code(read("components/eval-screens.tsx"));
    const start = settings.indexOf("export function EvalSettingsScreen");
    const body = settings.slice(start, settings.indexOf("// ─── Screen: Ativar Conta", start));
    expect(body).not.toMatch(/Especialização|defaultValue=/);
    expect(body).toContain("user?.name");
    expect(body).toContain("user?.email");
  });
});
