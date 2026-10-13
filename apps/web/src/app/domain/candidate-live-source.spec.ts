import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const APP = join(__dirname, "..");
const read = (relative: string) => readFileSync(join(APP, relative), "utf8");

// Remove comentários para testar só o código executável.
function code(source: string) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const APP_TSX = code(read("App.tsx"));
const between = (from: string, to: string) => APP_TSX.slice(APP_TSX.indexOf(from), APP_TSX.indexOf(to));
const PENDING = between("function PendingScreen(", "function ReportScreen(");
const HISTORY = between("function InterviewHistoryScreen(", "function ContextInfoRow(");
const DASHBOARD = between("function DashboardScreen(", "function ProfileField(");
const REPORT = between("function ReportScreen(", "function InterviewHistoryScreen(");
const LIVE = code(read("domain/candidate-live-sync.ts"));
const LIVE_HOOK = code(read("hooks/use-candidate-live-resource.ts"));
const HISTORY_HOOK = code(read("hooks/use-candidate-interview-history.ts"));

describe("sync do candidato (6A.6): arquitetura", () => {
  it("reaproveita o motor compartilhado e não cria timers/listeners próprios", () => {
    expect(LIVE).toContain("attachInterviewSyncPolling(");
    expect(LIVE).not.toMatch(/setInterval|setTimeout|visibilitychange|WebSocket|EventSource/);
    expect(LIVE).not.toMatch(/\.addEventListener\(/);
    for (const source of [LIVE_HOOK, HISTORY_HOOK]) {
      expect(source).not.toMatch(/setInterval|setTimeout|addEventListener|visibilitychange|WebSocket|EventSource/);
    }
    expect(read("domain/interview-sync-poller.ts")).toContain("INTERVIEW_SYNC_INTERVAL_MS = 4000");
  });

  it("os mecanismos de sync do app são: wizard, dashboard (1), avaliador e as 2 telas do candidato", () => {
    const hooks = readdirSync(join(APP, "hooks"));
    const users = hooks.filter((file) => /attachInterviewSyncPolling|attachEvaluatorListSync|attachDashboardInterviewsSync|attachCandidateLiveSync/.test(read(`hooks/${file}`)));
    expect(users.sort()).toEqual([
      "use-candidate-live-resource.ts",
      "use-dashboard-interviews-sync.ts",
      "use-evaluator-list-sync.ts",
      "use-interview-sync-polling.ts",
    ]);
    expect(APP_TSX.match(/useDashboardInterviewsSync\(/g)).toHaveLength(1);
    expect(APP_TSX.match(/useInterviewSyncPolling\(/g)).toHaveLength(1);
    expect(APP_TSX.match(/useCandidateLiveResource</g)).toHaveLength(1); // só Acompanhamento direto
    expect(APP_TSX.match(/useCandidateInterviewHistory\(/g)).toHaveLength(2); // Dashboard (sem sync) + Histórico
  });
});

describe("sync do candidato (6A.6): Acompanhamento", () => {
  it("sincroniza GET /interviews/:id (getRealInterview) a cada 15 s, só enquanto não é terminal", () => {
    expect(PENDING).toContain("useCandidateLiveResource<RealInterview>(");
    expect(PENDING).toContain("getRealInterview(id)");
    expect(PENDING).toContain("CANDIDATE_TRACKING_SYNC_INTERVAL_MS");
    expect(PENDING).toContain("isTrackingTerminal(interview.status)");
    expect(PENDING).toContain("sync: validId");
  });

  it("não chama /result, não redireciona sozinho ao concluir e não usa mock/storage", () => {
    expect(PENDING).not.toMatch(/getRealInterviewResult|\/result\b|groq|python|localStorage|sessionStorage/i);
    // a única navegação para o relatório é o clique em "Ver resultado"
    expect(PENDING).not.toMatch(/useEffect\([^)]*routerNavigate\(`\/candidate\/reports/);
    expect(PENDING.match(/routerNavigate\(`\/candidate\/reports\/\$\{interview\.id\}`\)/g)).toHaveLength(1);
  });

  it("erro inicial mantém o retry manual e a tela não remonta a cada refresh", () => {
    expect(PENDING).toContain("live.reload()");
    expect(PENDING).toContain("const [resuming, setResuming] = useState(false)");
  });
});

describe("sync do candidato (6A.6): Histórico", () => {
  it("usa autoSync (30 s) e mantém o filtro em estado local, fora do loader", () => {
    expect(HISTORY).toContain("useCandidateInterviewHistory({ autoSync: true })");
    expect(HISTORY).toContain('useState<HistoryFilter>("all")');
    expect(HISTORY_HOOK).toContain("CANDIDATE_HISTORY_SYNC_INTERVAL_MS");
    expect(HISTORY_HOOK).toContain("options.autoSync");
  });

  it("o loading de tela cheia só vem do estado 'loading' da carga inicial (refresh silencioso não o dispara)", () => {
    expect(HISTORY).toContain('loadState.status === "loading"');
    expect(LIVE).toContain("this.publish({ status: \"loading\" })");
    expect(LIVE.match(/status: "loading" }\)/g)).toHaveLength(1); // só em load()
  });
});

describe("sync do candidato (6A.6): Dashboard", () => {
  it("um único ciclo (15 s) atualiza in-progress e GET /interviews; o histórico não cria poller próprio", () => {
    expect(DASHBOARD).toContain("useCandidateInterviewHistory({ autoSync: false })");
    expect(DASHBOARD).toContain("Promise.all([inProgress.refresh(), refreshInterviewsHistory()])");
    expect(HISTORY_HOOK).toMatch(/options\.autoSync\s*\?/);
  });

  it("'não está mais em andamento' atualiza a lista em silêncio (refresh, não reload com spinner)", () => {
    expect(DASHBOARD).toContain("void refreshInterviewsHistory()");
    expect(DASHBOARD).not.toContain("reloadInterviewsHistory");
  });
});

describe("sync do candidato (6A.6): Relatório e geral", () => {
  it("o relatório NÃO ganhou polling", () => {
    expect(REPORT).not.toMatch(/useCandidateLiveResource|attach\w*Sync|setInterval|setTimeout|visibilitychange|addEventListener/);
    expect(REPORT).toContain("getRealInterviewResult(id)");
  });

  it("nenhum caminho de sync chama /result, N+1, mocks, storage ou Python/Groq", () => {
    for (const source of [LIVE, LIVE_HOOK, HISTORY_HOOK]) {
      expect(source).not.toMatch(/getRealInterviewResult|\/result\b|mocks\/|services\/interviews-service|localStorage|sessionStorage|groq|python|interview-ai/i);
    }
  });
});
