import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_ROUTES, getPathForScreen } from "../router/routes";

const APP = join(__dirname, "..");
const read = (relative: string) => readFileSync(join(APP, relative), "utf8");

// Remove comentários para testar só o código executável.
function code(source: string) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const HISTORY_CONTENT = code(read("components/evaluator-history-content.tsx"));
const SCREENS = code(read("components/evaluator-real-screens.tsx"));
const EVAL_SCREENS = code(read("components/eval-screens.tsx"));
const APP_TSX = code(read("App.tsx"));

// Trecho das duas telas de histórico dentro de evaluator-real-screens.tsx.
const HISTORY_SCREENS = SCREENS.slice(SCREENS.indexOf("export function EvalHistoryScreen"));

describe("histórico do avaliador (6A.1): somente leitura", () => {
  it("o conteúdo não importa autosave, fluxo de conclusão, diálogo nem storage", () => {
    expect(HISTORY_CONTENT).not.toMatch(/evaluator-autosave|EvaluationAutosave/);
    expect(HISTORY_CONTENT).not.toMatch(/evaluator-completion-flow|EvaluationCompletionFlow/);
    expect(HISTORY_CONTENT).not.toMatch(/evaluator-local-draft|localStorage|sessionStorage/);
    expect(HISTORY_CONTENT).not.toMatch(/alert-dialog|CompleteConfirmDialog|AlertDialog/);
    expect(HISTORY_CONTENT).not.toMatch(/useLocation|location\.state|parseCompletionNavState/);
  });

  it("as telas só leem: sem PUT/POST de avaliação e sem fluxos de edição", () => {
    expect(HISTORY_SCREENS).toContain("listCompletedEvaluations()");
    expect(HISTORY_SCREENS).toContain("getCompletedEvaluation(id)");
    expect(HISTORY_SCREENS).not.toMatch(
      /saveEvaluationDraft|completeEvaluation|getEvaluationDraft|getAssignedInterview|EvaluationAutosave|EvaluationCompletionFlow|useLocation|localStorage/,
    );
  });

  it("o detalhe lê o id da URL e recarrega do Back (F5), sem estado de navegação", () => {
    expect(HISTORY_SCREENS).toMatch(/useParams\(\)/);
    expect(HISTORY_SCREENS).not.toMatch(/location\.state/);
  });

  it("não usa a tela de sucesso como fonte de dados", () => {
    expect(HISTORY_SCREENS).not.toMatch(/\/success|EvalCompletionSuccessScreen/);
    expect(HISTORY_CONTENT).not.toMatch(/\/success/);
  });

  it("o detalhe usa Média final e o retorno ao histórico", () => {
    expect(HISTORY_CONTENT).toContain('FINAL_AVERAGE_LABEL = "Média final"');
    expect(HISTORY_CONTENT).toContain('BACK_TO_HISTORY_LABEL = "Voltar ao histórico"');
    expect(HISTORY_CONTENT).not.toContain("Média prevista");
  });
});

describe("histórico do avaliador (6A.1): mock substituído", () => {
  it("a EvalHistoryScreen mock saiu de eval-screens e não usa getCompletedEvaluations", () => {
    expect(EVAL_SCREENS).not.toMatch(/export function EvalHistoryScreen/);
    expect(EVAL_SCREENS).not.toMatch(/getCompletedEvaluations/);
  });

  it("a tela real não recebe evaluatorId nem usa o serviço mock", () => {
    expect(HISTORY_SCREENS).not.toMatch(/evaluatorId|interviews-service"|getCompletedEvaluations/);
    expect(HISTORY_CONTENT).not.toMatch(/Exportar|Download/);
  });

  it("o cabeçalho usa o subtítulo FIXO (sem depender do estado nem da contagem)", () => {
    expect(HISTORY_SCREENS).toContain("subtitle={HISTORY_SUBTITLE}");
    expect(HISTORY_SCREENS).not.toMatch(/historySubtitle|historyCountLabel/);
    expect(HISTORY_CONTENT).toContain("Consulte as avaliações que você já concluiu.");
  });

  it("cada item navega para /evaluator/history/:id", () => {
    expect(SCREENS).toContain('const HISTORY_ROUTE = "/evaluator/history"');
    expect(HISTORY_SCREENS).toMatch(/routerNavigate\(`\$\{HISTORY_ROUTE\}\/\$\{id\}`\)/);
  });
});

describe("histórico do avaliador (6A.1): rotas", () => {
  it("App.tsx registra a lista e o detalhe, protegidos para EVALUATOR", () => {
    expect(APP_TSX).toMatch(
      /path="\/evaluator\/history"[^\n]*protect\("EVALUATOR", <EvalHistoryScreen onNavigate=\{navigate\} \/>\)/,
    );
    expect(APP_TSX).toMatch(
      /path="\/evaluator\/history\/:id"[^\n]*protect\("EVALUATOR", <EvalHistoryDetailScreen onNavigate=\{navigate\} \/>\)/,
    );
    expect(APP_TSX).not.toMatch(/<EvalHistoryScreen[^>]*evaluatorId/);
  });

  it("registry: histórico e detalhe constam como reais", () => {
    const list = APP_ROUTES.find((route) => route.screen === "eval-history");
    const detail = APP_ROUTES.find((route) => route.screen === "eval-history-detail");
    expect(list?.path).toBe("/evaluator/history");
    expect(list?.status).toBe("real");
    expect(detail?.path).toBe("/evaluator/history/:id");
    expect(detail?.status).toBe("real");
  });

  it("atalho sem id volta para a lista do histórico, nunca para um id inventado", () => {
    expect(getPathForScreen("eval-history")).toBe("/evaluator/history");
    expect(getPathForScreen("eval-history-detail")).toBe("/evaluator/history");
  });
});
