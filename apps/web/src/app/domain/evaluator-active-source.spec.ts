import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_ROUTES } from "../router/routes";

const APP = join(__dirname, "..");
const read = (relative: string) => readFileSync(join(APP, relative), "utf8");

function code(source: string) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const SCREENS = code(read("components/evaluator-real-screens.tsx"));
const EVAL_SCREENS = code(read("components/eval-screens.tsx"));
const ACTIVE_CONTENT = code(read("components/evaluator-active-content.tsx"));
const PARTITION = code(read("domain/evaluator-queue-partition.ts"));
const APP_TSX = code(read("App.tsx"));
const SERVICE = code(read("services/evaluator-interviews-service.ts"));

const ACTIVE_SCREEN = SCREENS.slice(
  SCREENS.indexOf("export function EvalActiveScreen"),
  SCREENS.indexOf("export function EvalInterviewDetailScreen"),
);

describe("Em Andamento real (6A.2): mock removido", () => {
  it("a EvalActiveScreen mock saiu de eval-screens", () => {
    expect(EVAL_SCREENS).not.toMatch(/export function EvalActiveScreen/);
    expect(EVAL_SCREENS).not.toMatch(/IN_EVALUATION|Recomeçar|getAssignedInterviews/);
  });

  it("a tela real não usa evaluatorId, serviço mock nem storage", () => {
    expect(ACTIVE_SCREEN.length).toBeGreaterThan(0);
    expect(ACTIVE_SCREEN).not.toMatch(/evaluatorId|services\/interviews-service"|localStorage|sessionStorage/);
    expect(ACTIVE_CONTENT).not.toMatch(/evaluatorId|mocks\/|services\/interviews-service"|localStorage|sessionStorage/);
    expect(PARTITION).not.toMatch(/localStorage|sessionStorage|fetch\(/);
  });

  it("App.tsx usa a tela real da rota /evaluator/evaluations/active, sem evaluatorId", () => {
    expect(APP_TSX).toMatch(
      /path="\/evaluator\/evaluations\/active"[^\n]*protect\("EVALUATOR", <EvalActiveScreen onNavigate=\{navigate\} \/>\)/,
    );
    expect(APP_TSX).toMatch(/EvalActiveScreen[^;]*from "\.\/components\/evaluator-real-screens"/);
    expect(APP_TSX).not.toMatch(/evaluatorSessionId/);
  });

  it("registry: Em Andamento e as telas reais da fila constam como reais", () => {
    for (const screen of ["eval-active", "eval-dashboard", "eval-queue", "eval-screen"]) {
      expect(APP_ROUTES.find((route) => route.screen === screen)?.status).toBe("real");
    }
  });
});

describe("Em Andamento real (6A.2): fonte única e retomada", () => {
  it("Dashboard, Fila e Em Andamento usam o MESMO hook, uma consulta por tela e a mesma partição", () => {
    expect(SCREENS.match(/fetch: listAssignedInterviews,/g)?.length).toBe(1);
    expect(SCREENS.match(/= useAssignedQueue\(\)/g)?.length).toBe(3);
    expect(SCREENS.match(/partitionQueue\(/g)?.length).toBe(1);
  });

  it("a lista não faz GET de rascunho por item (sem N+1) nem calcula progresso no cliente", () => {
    expect(ACTIVE_SCREEN).not.toMatch(/getEvaluationDraft|getAssignedInterview/);
    expect(ACTIVE_CONTENT).not.toMatch(/criteriaScores|criteria_scores|summary\b/);
    expect(PARTITION).not.toMatch(/criteriaScores|criteria_scores/);
  });

  it("não há polling, SSE nem WebSocket nesta etapa", () => {
    for (const source of [ACTIVE_SCREEN, ACTIVE_CONTENT, PARTITION, SCREENS]) {
      expect(source).not.toMatch(/setInterval|EventSource|WebSocket/);
    }
  });

  it("Continuar abre a rota real da avaliação com o UUID (retoma o rascunho, não cria outro)", () => {
    expect(ACTIVE_SCREEN).toMatch(/onContinue=\{\(id\) => routerNavigate\(`\$\{EVALUATION_ROUTE\}\/\$\{id\}`\)\}/);
    expect(ACTIVE_SCREEN).toMatch(/onGoToQueue=\{\(\) => onNavigate\("eval-queue"\)\}/);
    expect(ACTIVE_CONTENT).not.toMatch(/saveEvaluationDraft|createEmpty/);
  });

  it("a Fila e o Dashboard listam só os pendentes (sem os em andamento)", () => {
    const queue = SCREENS.slice(
      SCREENS.indexOf("export function EvalQueueScreen"),
      SCREENS.indexOf("export function EvalActiveScreen"),
    );
    expect(queue).toMatch(/const \{ pending: queue, newIds, reload \} = useAssignedQueue\(\)/);
    const dashboard = SCREENS.slice(
      SCREENS.indexOf("export function EvalDashboardScreen"),
      SCREENS.indexOf("export function EvalQueueScreen"),
    );
    expect(dashboard).toMatch(/pending: queue, inProgress/);
  });

  it("o parser consome o bloco do servidor (inProgress) e o serviço não lê storage", () => {
    expect(SERVICE).toContain("toQueueEvaluation");
    expect(SERVICE).not.toMatch(/localStorage|sessionStorage/);
  });
});

describe("saída da avaliação (6A.2.1): flush antes de navegar", () => {
  const DRAFT_SCREEN = SCREENS.slice(
    SCREENS.indexOf("export function EvalDraftEvaluationScreen"),
    SCREENS.indexOf("export function EvalRealReviewScreen"),
  );

  it("Voltar e o menu (onNavigate do layout) passam pelo flush; sem bloqueio global do navegador", () => {
    expect(DRAFT_SCREEN).toContain("leaveEvaluation(");
    expect(DRAFT_SCREEN).toContain("onNavigate={guardedNavigate}");
    expect(DRAFT_SCREEN).toContain('onBack={() => guardedNavigate("eval-queue")}');
    expect(DRAFT_SCREEN).not.toMatch(/beforeunload|useBlocker|unstable_usePrompt/);
  });

  it("reaproveita o autosave: sem fetch/serviço próprio e sem progresso otimista no cliente", () => {
    expect(DRAFT_SCREEN).not.toMatch(/inProgress|filledCriteria/);
    expect(read("domain/evaluator-autosave.ts")).not.toMatch(/inProgress|filledCriteria/);
  });
});

describe("sincronização leve do avaliador (6A.3): onde há e onde NÃO há polling", () => {
  const section = (from: string, to?: string) => {
    const start = SCREENS.indexOf(from);
    expect(start).toBeGreaterThan(-1);
    return SCREENS.slice(start, to ? SCREENS.indexOf(to, start) : undefined);
  };
  const SYNC = /useEvaluatorListSync|attachEvaluatorListSync|attachInterviewSyncPolling|setInterval|visibilitychange|addEventListener\(/;

  it("Dashboard, Fila e Em Andamento sincronizam a cada 15 s (teto 60 s) pela mesma fonte", () => {
    expect(SCREENS).toMatch(
      /useEvaluatorListSync\(\{\s*fetch: listAssignedInterviews,\s*intervalMs: EVALUATOR_QUEUE_SYNC_INTERVAL_MS,\s*maxBackoffMs: EVALUATOR_QUEUE_SYNC_MAX_BACKOFF_MS,/,
    );
    expect(SCREENS.match(/useEvaluatorListSync\(/g)?.length).toBe(3); // fila + histórico + histórico do Dashboard
    expect(read("domain/evaluator-list-sync.ts")).toContain("EVALUATOR_QUEUE_SYNC_INTERVAL_MS = 15000");
    expect(read("domain/evaluator-list-sync.ts")).toContain("EVALUATOR_QUEUE_SYNC_MAX_BACKOFF_MS = 60000");
  });

  it("Histórico tem sync próprio de 30 s (teto 120 s) e a busca continua estado local", () => {
    const history = section("export function EvalHistoryScreen", "export function EvalHistoryDetailScreen");
    expect(history).toMatch(
      /useEvaluatorListSync\(\{\s*fetch: listCompletedEvaluations,\s*intervalMs: EVALUATOR_HISTORY_SYNC_INTERVAL_MS,\s*maxBackoffMs: EVALUATOR_HISTORY_SYNC_MAX_BACKOFF_MS,/,
    );
    expect(history).toContain('useState("")');
    expect(read("domain/evaluator-list-sync.ts")).toContain("EVALUATOR_HISTORY_SYNC_INTERVAL_MS = 30000");
    expect(read("domain/evaluator-list-sync.ts")).toContain("EVALUATOR_HISTORY_SYNC_MAX_BACKOFF_MS = 120000");
  });

  it.each([
    ["avaliação em edição", "export function EvalDraftEvaluationScreen", "export function EvalRealReviewScreen"],
    ["revisão", "export function EvalRealReviewScreen", "export function EvalCompletionSuccessScreen"],
    ["sucesso", "export function EvalCompletionSuccessScreen", "export function EvalHistoryScreen"],
    ["detalhe atribuído", "export function EvalInterviewDetailScreen", "export function EvalDraftEvaluationScreen"],
    ["detalhe do histórico", "export function EvalHistoryDetailScreen", undefined],
  ] as const)("%s NÃO tem polling", (_label, from, to) => {
    expect(section(from, to)).not.toMatch(SYNC);
  });

  it("usa o motor compartilhado (sem novo timer/listener próprio) e sem biblioteca nova", () => {
    const domain = code(read("domain/evaluator-list-sync.ts"));
    expect(domain).toContain("attachInterviewSyncPolling");
    expect(domain).not.toMatch(/setTimeout|setInterval|addEventListener\(|localStorage|sessionStorage/);
    expect(code(read("hooks/use-evaluator-list-sync.ts"))).toContain("attachEvaluatorListSync");

    const pkgPath = join(APP, "..", "..", "package.json");
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).join(" ");
      expect(deps).not.toMatch(/react-query|tanstack|zustand|redux|swr|workbox/i);
    }
  });

  it("o poller compartilhado mantém o teto padrão do candidato (16 s) e o intervalo de 4 s do wizard", () => {
    const poller = read("domain/interview-sync-poller.ts");
    expect(poller).toContain("INTERVIEW_SYNC_MAX_BACKOFF_MS = 16000");
    expect(poller).toContain("INTERVIEW_SYNC_INTERVAL_MS = 4000");
    expect(poller).toContain("input.maxBackoffMs ?? INTERVIEW_SYNC_MAX_BACKOFF_MS");
  });
});
