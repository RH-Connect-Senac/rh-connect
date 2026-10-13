import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Refinamento do Dashboard do Avaliador: guardas de código-fonte (dados reais,
// sync reaproveitado, fontes independentes, sem mocks e sem sidebar alterada).
const read = (relative: string) => readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
const code = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const SCREENS = code(read("components/evaluator-real-screens.tsx"));
const slice = (from: string, to: string) => {
  const start = SCREENS.indexOf(from);
  const end = SCREENS.indexOf(to, start + from.length);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return SCREENS.slice(start, end);
};
const DASHBOARD = slice("export function EvalDashboardScreen", "export function EvalQueueScreen");
const HISTORY_HOOK = slice("function useCompletedHistory", "export function EvalDashboardScreen");
const QUEUE_HOOK = slice("function useAssignedQueue", "function firstName");
const CONTENT = code(read("components/evaluator-dashboard-content.tsx"));
const VIEW = code(read("domain/evaluator-dashboard-view.ts"));

describe("Dashboard do Avaliador: sync e fontes", () => {
  it("fila: mesmo hook de sync (15s) e a fila completa exposta para o gráfico", () => {
    expect(QUEUE_HOOK).toContain("fetch: listAssignedInterviews");
    expect(QUEUE_HOOK).toContain("EVALUATOR_QUEUE_SYNC_INTERVAL_MS");
    expect(QUEUE_HOOK).toContain("EVALUATOR_QUEUE_SYNC_MAX_BACKOFF_MS");
    expect(QUEUE_HOOK).toContain("all: state");
  });

  it("histórico: hook de sync existente (30s) com listCompletedEvaluations", () => {
    expect(HISTORY_HOOK).toContain("useEvaluatorListSync(");
    expect(HISTORY_HOOK).toContain("fetch: listCompletedEvaluations");
    expect(HISTORY_HOOK).toContain("EVALUATOR_HISTORY_SYNC_INTERVAL_MS");
    expect(HISTORY_HOOK).toContain("EVALUATOR_HISTORY_SYNC_MAX_BACKOFF_MS");
  });

  it("o Dashboard consome os dois hooks e não cria request, timer ou listener próprio", () => {
    expect(DASHBOARD).toContain("useAssignedQueue()");
    expect(DASHBOARD).toContain("useCompletedHistory()");
    expect(DASHBOARD).not.toMatch(/fetch|listAssignedInterviews|listCompletedEvaluations|setInterval|setTimeout|addEventListener|visibilitychange/);
    expect(DASHBOARD).not.toMatch(/localStorage|sessionStorage/);
  });

  it("fila e histórico são independentes: cada bloco recebe só o seu estado e o seu retry", () => {
    expect(DASHBOARD).toMatch(/<EvaluatorUpcomingQueue\s+state=\{queue\}/);
    expect(DASHBOARD).toContain("onRetry={reload}");
    expect(DASHBOARD).toMatch(/<EvaluatorRecentCompleted\s+state=\{history\}/);
    expect(DASHBOARD).toContain("onRetry={reloadHistory}");
    // O gráfico precisa das duas fontes; o erro fica restrito ao bloco do gráfico.
    expect(DASHBOARD).toContain('all.status === "error"');
    expect(DASHBOARD).toContain('history.status === "error"');
  });

  it("composição: cartões, Continuar, fila + gráfico, concluídas", () => {
    const order = [
      "<EvaluatorMetricCards",
      "<EvaluatorContinueSection",
      "<EvaluatorUpcomingQueue",
      "<EvaluatorWeekActivity",
      "<EvaluatorRecentCompleted",
    ].map((marker) => DASHBOARD.indexOf(marker));
    expect(order.every((index) => index > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // lado a lado só em telas realmente largas (2xl); abaixo disso o gráfico empilha em largura total
    expect(DASHBOARD).toContain("2xl:grid-cols-5");
    expect(DASHBOARD).toContain("2xl:col-span-3");
    expect(DASHBOARD).toContain("2xl:col-span-2");
    expect(DASHBOARD).not.toMatch(/\blg:(grid-cols-5|col-span-[23])/);
    // o wrapper do gráfico não acompanha a altura da fila
    expect(DASHBOARD).toMatch(/min-w-0 self-start 2xl:col-span-2/);
  });

  it("'Continuar avaliando' preservado: mesma fonte (inProgress) e Ver todas -> Em Andamento", () => {
    expect(DASHBOARD).toMatch(/<EvaluatorContinueSection\s+state=\{inProgress\}/);
    expect(DASHBOARD).toContain('onSeeAll={() => onNavigate("eval-active")}');
  });
});

describe("Dashboard do Avaliador: dados reais e copy", () => {
  const FILES: Record<string, string> = { DASHBOARD, CONTENT, VIEW };

  it("sem mocks, dados fixos, 'Score' nem 'Tempo médio de avaliação'", () => {
    for (const [name, source] of Object.entries(FILES)) {
      expect(source, name).not.toMatch(/mocks\/|rhconnect:|localStorage|sessionStorage|getAdminVisibleInterviews/);
      expect(source, name).not.toMatch(/\bScore\b|Scores\b|Tempo médio/);
    }
  });

  it("usa 'Pontuação' e os rótulos definidos", () => {
    for (const label of ["Avaliações pendentes", "Em andamento", "Concluídas hoje", "Pontuação média", "Próximas na fila", "Atividade da semana", "Recém concluídas", "Ver histórico", "Recebidas", "Concluídas"]) {
      expect(CONTENT).toContain(label);
    }
    expect(CONTENT).toContain(">Pontuação</th>");
  });

  it("os números vêm do domínio puro (sem cálculo solto na tela)", () => {
    expect(DASHBOARD).toContain("buildDashboardMetrics(");
    expect(DASHBOARD).toContain("buildWeekActivity(");
    expect(DASHBOARD).not.toMatch(/reduce\(|Math\.round|toFixed/);
  });

  it("o domínio é puro: sem React, rede ou storage", () => {
    expect(VIEW).not.toMatch(/from "react"|fetch\(|localStorage|sessionStorage|Date\.now\(\)/);
  });

  it("Recebidas usa assignedAt e Concluídas usa completedAt", () => {
    expect(VIEW).toContain("item.assignedAt");
    expect(VIEW).toContain("item.completedAt");
  });
});

describe("Gráfico 'Atividade da semana': padrão do Admin sem biblioteca nem mudança de dados", () => {
  it("só React e lucide-react (sem biblioteca de gráfico)", () => {
    const imports = [...CONTENT.matchAll(/from "([^"]+)"/g)].map((match) => match[1]);
    const external = imports.filter((name) => !name.startsWith(".") && !name.startsWith("../"));
    expect(external.sort()).toEqual(["lucide-react", "react"]);
    // O projeto pode ter bibliotecas de gráfico (ex.: recharts em outras telas): o que se garante é que
    // o gráfico do Avaliador (componente e domínio) não importa nem cita nenhuma delas.
    const chartLibrary = /recharts|chart\.js|victory|nivo|apexcharts|visx|d3/i;
    expect(CONTENT).not.toMatch(chartLibrary);
    expect(VIEW).not.toMatch(chartLibrary);
  });

  it("mesma linguagem do Admin: crescimento animado, hover, seleção, teclado, ARIA", () => {
    expect(CONTENT).toContain("cubic-bezier(0.4,0,0.2,1)");
    expect(CONTENT).toContain("setMounted");
    expect(CONTENT).toContain("onMouseEnter");
    expect(CONTENT).toContain("onKeyDown");
    expect(CONTENT).toContain("isActivationKey(event.key)");
    expect(CONTENT).toContain('role="button"');
    expect(CONTENT).toContain("tabIndex={0}");
    expect(CONTENT).toContain("aria-pressed={isSelected}");
    expect(CONTENT).toContain("aria-label={`${describeWeekDay(day)}");
    expect(CONTENT).toContain("motion-reduce:transition-none");
    expect(CONTENT).toContain("Limpar seleção");
  });

  it("os dados continuam vindo do domínio: o componente não recalcula nem filtra o Dashboard", () => {
    // Escopo: somente a seção do gráfico semanal (as demais seções exibem datas/itens legitimamente).
    const start = CONTENT.indexOf("export type WeekActivityState");
    const end = CONTENT.indexOf("function scoreVariant");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const WEEK_CHART = CONTENT.slice(start, end);
    expect(WEEK_CHART).not.toMatch(/assignedAt|completedAt|filter\(|reduce\(/);
    // A data atual só serve para destacar o dia de hoje (chave via domínio), nunca para calcular dados.
    expect(CONTENT.match(/new Date/g) ?? []).toHaveLength(1);
    expect(CONTENT).toContain("currentWeekDayKey(new Date())");
    expect(CONTENT).toContain("activity.days");
    expect(DASHBOARD).toContain("buildWeekActivity(");
  });
});

describe("Dashboard do Avaliador: escopo preservado", () => {
  it("a sidebar do avaliador não tem itens repetidos nem foi alterada", () => {
    const screens = read("components/eval-screens.tsx");
    const block = screens.slice(screens.indexOf("const EVAL_NAV"), screens.indexOf("];", screens.indexOf("const EVAL_NAV")));
    const labels = [...block.matchAll(/label: "([^"]+)"/g)].map((match) => match[1]);
    expect(labels).toEqual(["Dashboard", "Fila de Avaliações", "Em Andamento", "Histórico", "Guia de Critérios", "Configurações"]);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("código órfão do gráfico antigo continua em eval-screens.tsx (limpeza é outra fase)", () => {
    const screens = read("components/eval-screens.tsx");
    expect(screens).toContain("function EvalWeekChartCard");
    expect(screens).toContain("function buildWeekData");
  });

  it("o serviço do avaliador não lê storage", () => {
    expect(code(read("services/evaluator-interviews-service.ts"))).not.toMatch(/localStorage|sessionStorage/);
  });
});
