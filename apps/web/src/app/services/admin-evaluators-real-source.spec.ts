import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// A tela de Avaliadores do Admin é REAL (4.1): GET /admin/evaluators, só avaliadores ativos.
// O fluxo de convite/ativação foi ADIADO e não pode aparecer no frontend.
const read = (relative: string) => readFileSync(resolve(__dirname, "..", relative), "utf8");
const code = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const adminScreens = code(read("components/admin-screens.tsx"));
const start = adminScreens.indexOf("type AdminEvaluatorsState");
const end = adminScreens.indexOf("export function AdminInterviewsScreen");
const formStart = adminScreens.indexOf("export function AdminEvaluatorFormScreen");
const formEnd = adminScreens.indexOf("function AdminLogoHeader");
const AREA = adminScreens.slice(start, end);
const FORM_SCREEN = adminScreens.slice(formStart, formEnd);
const SERVICE = code(read("services/admin-interviews-service.ts"));
const VIEW = code(read("domain/admin-evaluators-view.ts"));

describe("Avaliadores do Admin (4.1): fonte da lista", () => {
  it("localiza as telas", () => {
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(formEnd).toBeGreaterThan(formStart);
  });

  it("lê a lista de GET /admin/evaluators pelo service", () => {
    expect(AREA).toContain("listAdminEvaluators()");
    expect(SERVICE).toContain('"/admin/evaluators"');
  });

  it("exibe somente avaliadores ACTIVE + eligible (INVITED e demais ficam ocultos)", () => {
    expect(AREA).toContain("presentableEvaluators(evaluators)");
    expect(AREA).toContain("visible.map(");
    expect(AREA).not.toMatch(/evaluators\.map\(|list\.state\.evaluators\.map\(/);
    expect(VIEW).toContain('evaluator.accountStatus === "ACTIVE" && evaluator.eligible === true');
  });

  it("não usa EVALUATORS, Patricia, demo-patricia, localStorage nem o mock de entrevistas", () => {
    for (const source of [AREA, FORM_SCREEN]) {
      expect(source).not.toMatch(/\bEVALUATORS\b/);
      expect(source).not.toMatch(/Patricia|Eduardo Rocha|Camila Dias|Carlos Andrade/);
      expect(source).not.toMatch(/demo-patricia|token=|Ver simulação/);
      expect(source).not.toMatch(/localStorage|sessionStorage/);
      expect(source).not.toMatch(/getAdminVisibleInterviews|getInterviewsState|interviews-service/);
    }
  });

  it("assignedCount é real ('Atribuídas') e nenhuma métrica inexistente é inventada", () => {
    expect(AREA).toContain("evaluator.assignedCount");
    expect(AREA).toContain("ASSIGNED_COUNT_LABEL");
    expect(AREA).not.toMatch(/Concluídas|"Média"|>Média<|ev\.done|ev\.avg|ev\.pending/);
  });

  it("não oferece editar/excluir sem suporte no backend", () => {
    expect(AREA).not.toMatch(/Edit2|Trash2/);
  });

  it("tem loading, erro com 'Tentar novamente' (menos 401/403) e estado vazio real", () => {
    expect(AREA).toContain('list.state.status === "loading"');
    expect(AREA).toContain('list.state.status === "error"');
    expect(AREA).toContain("Tentar novamente");
    expect(AREA).toContain('result.reason !== "unauthorized" && result.reason !== "forbidden"');
    expect(AREA).toContain("EVALUATORS_EMPTY");
    expect(AREA).toContain("visible.length === 0");
  });

  it("sem polling/timers/listeners nesta fase (sync é a 4.2)", () => {
    expect(AREA).not.toMatch(/setInterval|setTimeout|addEventListener|attachInterviewSyncPolling|visibilitychange/);
  });
});

describe("Avaliadores do Admin (4.1): convite adiado", () => {
  it("a tela não expõe convite: sem botão, painel, 'Convites pendentes' nem mensagens de convite", () => {
    expect(AREA).not.toMatch(/Convidar|Convite|Convites pendentes|Aguardando ativação|Enviar Convite|Enviando/i);
    expect(AREA).not.toMatch(/inviteAdminEvaluator|InviteForm|showAdd|submittingRef|useRef\(false\)/);
    expect(AREA).not.toMatch(/INVITED/);
  });

  it("o service e o domínio não têm código de convite (POST /auth/evaluator/invite não é chamado)", () => {
    expect(SERVICE).not.toMatch(/evaluator\/invite|inviteAdminEvaluator|InviteEvaluatorInput/);
    expect(VIEW).not.toMatch(/invite|INVITED|Convit/i);
    expect(adminScreens).not.toContain("inviteAdminEvaluator");
    expect(adminScreens).not.toContain("/auth/evaluator/invite");
  });

  it("a rota antiga /admin/evaluators/new não expõe formulário: só volta para a lista", () => {
    expect(FORM_SCREEN).toContain('routerNavigate("/admin/evaluators", { replace: true })');
    expect(FORM_SCREEN).toContain("return null");
    expect(FORM_SCREEN).not.toMatch(/Input|NativeSelect|handleSave|Cadastrar|Convidar/);
  });
});

describe("Avaliadores do Admin (4.1): escopo", () => {
  it("a fila de atribuição continua igual (service e tela)", () => {
    const assign = adminScreens.slice(adminScreens.indexOf("export function AdminAssignScreen"), adminScreens.indexOf("export function AdminQuestionsScreen"));
    expect(assign).toContain("listPendingAssignmentInterviews()");
    expect(assign).toContain("listAdminEvaluators()");
    expect(assign).toContain("assignInterviewToEvaluator(");
    expect(assign).toContain("evaluator.eligible");
  });
});
