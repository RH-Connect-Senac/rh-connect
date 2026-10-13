import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Fase 4.2: sincronização leve SÓ nas 3 telas Admin reais (fila, candidatos, avaliadores).
const read = (relative: string) => readFileSync(resolve(__dirname, "..", relative), "utf8");
const code = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const SCREENS = code(read("components/admin-screens.tsx"));
const slice = (from: string, to: string) => {
  const start = SCREENS.indexOf(from);
  const end = SCREENS.indexOf(to, start + from.length);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return SCREENS.slice(start, end);
};

const CANDIDATES_HOOK = slice("function useAdminCandidatesList(", "function useAdminCandidateDetail");
const CANDIDATES_SCREEN = slice("export function AdminCandidatesScreen", "type AdminEvaluatorsState");
const EVALUATORS_AREA = slice("type AdminEvaluatorsState", "export function AdminInterviewsScreen");
const ASSIGN_SCREEN = slice("const ASSIGN_SYNC", "export function AdminQuestionsScreen");
const DASHBOARD = slice("export function AdminDashboardScreen", "export function AdminCandidatesScreen");
const INTERVIEWS = slice("export function AdminInterviewsScreen", "const ASSIGN_SYNC");
const AFTER_ASSIGN = SCREENS.slice(SCREENS.indexOf("export function AdminQuestionsScreen"));
const DETAIL_HOOKS = slice("function useAdminCandidateDetail", "function useAdminCandidateProfile");

describe("sync do Admin (4.2): onde há polling", () => {
  it("há exatamente 3 usos de useCandidateLiveResource em admin-screens, um por tela real", () => {
    expect(SCREENS.match(/useCandidateLiveResource</g)?.length).toBe(3);
    expect(CANDIDATES_HOOK).toContain("useCandidateLiveResource<AdminCandidatesList>");
    expect(EVALUATORS_AREA).toContain("useCandidateLiveResource<AdminEvaluator[]>");
    expect(ASSIGN_SCREEN).toContain("useCandidateLiveResource<AdminQueueData>");
  });

  it("nenhum timer/listener próprio: setInterval/visibilitychange/focus/online/offline só no motor compartilhado", () => {
    expect(SCREENS).not.toMatch(/setInterval|visibilitychange|attachInterviewSyncPolling|attachCandidateLiveSync/);
    expect(SCREENS).not.toMatch(/addEventListener\(\s*["'](focus|online|offline|visibilitychange)/);
  });

  it("frequências: fila 15 s, candidatos 30 s, avaliadores 30 s (constantes compartilhadas)", () => {
    expect(ASSIGN_SCREEN).toContain("ADMIN_QUEUE_SYNC_INTERVAL_MS");
    expect(ASSIGN_SCREEN).toContain("ADMIN_QUEUE_SYNC_MAX_BACKOFF_MS");
    expect(SCREENS).toContain("ADMIN_CANDIDATES_SYNC_INTERVAL_MS");
    expect(SCREENS).toContain("ADMIN_EVALUATORS_SYNC_INTERVAL_MS");
  });

  it("candidatos: o sync só liga na tela de lista; o Dashboard Admin usa o hook SEM sync", () => {
    expect(CANDIDATES_SCREEN).toContain("useAdminCandidatesList({ sync: true })");
    expect(SCREENS.match(/useAdminCandidatesList\(\{ sync: true \}\)/g)?.length).toBe(1);
    expect(DASHBOARD).toContain("useAdminCandidatesList()");
    expect(DASHBOARD).not.toMatch(/useCandidateLiveResource|sync:/);
    expect(CANDIDATES_HOOK).toContain("sync: options.sync ? CANDIDATES_SYNC : undefined");
  });

  it("telas mock e demais telas reais NÃO ganharam polling (Dashboard, Entrevistas, detalhe, perguntas, etc.)", () => {
    for (const area of [INTERVIEWS, AFTER_ASSIGN, DETAIL_HOOKS]) {
      expect(area).not.toMatch(/useCandidateLiveResource|attachInterviewSyncPolling|setInterval|ADMIN_\w+_SYNC/);
    }
  });
});

describe("sync do Admin (4.2): refresh silencioso, sem N+1", () => {
  it("fila: após atribuir ou conflito usa refresh silencioso com supersede (sem reload/spinner)", () => {
    expect(ASSIGN_SCREEN).toContain("void live.refresh({ supersede: true })");
    expect(ASSIGN_SCREEN).not.toMatch(/setAttempt|setRemote\(/);
    expect(ASSIGN_SCREEN).toContain("const reload = live.reload;"); // só para o 'Tentar novamente' do erro inicial
  });

  it("fila: UM recurso (fila + avaliadores em paralelo) por ciclo, sem requisição por item", () => {
    expect(ASSIGN_SCREEN.match(/listPendingAssignmentInterviews\(\)/g)?.length).toBe(1);
    expect(ASSIGN_SCREEN.match(/listAdminEvaluators\(\)/g)?.length).toBe(1);
    expect(ASSIGN_SCREEN).toContain("Promise.all([listPendingAssignmentInterviews(), listAdminEvaluators()])");
    expect(ASSIGN_SCREEN).toContain("combineQueueResults(");
    expect(ASSIGN_SCREEN).not.toMatch(/\.map\(\s*(async|\(?\w+\)?\s*=>\s*(get|list|fetch))/);
  });

  it("fila: a seleção descartada quando a entrevista some (não atribui entrevista inexistente)", () => {
    expect(ASSIGN_SCREEN).toContain("resolveSelection(selectedRaw");
  });

  it("candidatos: busca e filtro são useState da tela (o refresh não os reseta)", () => {
    expect(CANDIDATES_SCREEN).toContain('useState("")');
    expect(CANDIDATES_SCREEN).toContain('useState("all")');
    expect(CANDIDATES_SCREEN).not.toMatch(/setSearch\(""\)|setStatus\("all"\)/);
  });

  it("avaliadores: continua só ACTIVE + eligible e nada de convite/INVITED", () => {
    expect(EVALUATORS_AREA).toContain("presentableEvaluators(evaluators)");
    expect(EVALUATORS_AREA).not.toMatch(/INVITED|Convit/i);
  });

  it("o motor compartilhado não foi duplicado: não existe novo poller no Admin", () => {
    const live = code(read("domain/admin-live-sync.ts"));
    expect(live).not.toMatch(/setTimeout|setInterval|addEventListener|class\s+\w+Loader/);
    expect(live).not.toContain("attachInterviewSyncPolling");
  });
});
