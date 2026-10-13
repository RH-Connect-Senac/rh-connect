import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { CompletedEvaluationItem, EvaluatorQueueItem } from "../services/evaluator-interviews-service";
import type { EvaluatorHistoryState } from "./evaluator-history-content";
import type { EvaluatorQueueState } from "./evaluator-real-content";
import {
  EvaluatorMetricCards,
  EvaluatorRecentCompleted,
  EvaluatorUpcomingQueue,
  EvaluatorWeekActivity,
  WeekChartView,
  type WeekActivityState,
} from "./evaluator-dashboard-content";
import { buildWeekActivity } from "../domain/evaluator-dashboard-view";

const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";

function queueItem(id: string, name: string): EvaluatorQueueItem {
  return {
    id,
    status: "ASSIGNED",
    candidate: { name, professionalTitle: null, city: null, state: null },
    jobTitle: "Secretária Comercial",
    company: "Clínica Exemplo",
    location: "Três Lagoas/MS",
    workMode: "HYBRID",
    assignedAt: "2026-10-09T15:00:00.000Z",
    submittedAt: "2026-10-09T14:00:00.000Z",
    questionCount: 5,
    evaluation: null,
  };
}

function done(id: string, name: string, score: number | null): CompletedEvaluationItem {
  return {
    id,
    candidate: { name, professionalTitle: null, city: null, state: null },
    jobTitle: "Auxiliar Administrativo",
    company: null,
    overallScore: score,
    assignedAt: "2026-10-09T15:00:00.000Z",
    completedAt: "2026-10-11T12:00:00.000Z",
    questionCount: 4,
  };
}

const noop = () => undefined;

// Percorre a árvore de elementos (componente sem hooks) e coleta <button> nativos.
function collectButtons(node: unknown, found: { label: string; onClick: () => void }[] = []) {
  if (Array.isArray(node)) {
    node.forEach((child) => collectButtons(child, found));
  } else if (node && typeof node === "object" && "props" in node) {
    const element = node as { type: unknown; props: { children?: unknown; onClick?: () => void } };
    if (element.type === "button" && typeof element.props.onClick === "function") {
      found.push({ label: String(element.props.children), onClick: element.props.onClick });
    }
    collectButtons(element.props.children, found);
  }
  return found;
}

function cards(metrics: Parameters<typeof EvaluatorMetricCards>[0]["metrics"]) {
  return renderToStaticMarkup(createElement(EvaluatorMetricCards, { metrics }));
}
function upcoming(state: EvaluatorQueueState, over: Partial<Parameters<typeof EvaluatorUpcomingQueue>[0]> = {}) {
  return renderToStaticMarkup(
    createElement(EvaluatorUpcomingQueue, { state, onEvaluate: noop, onSeeAll: noop, onRetry: noop, ...over }),
  );
}
function week(state: WeekActivityState) {
  return renderToStaticMarkup(createElement(EvaluatorWeekActivity, { state, onRetry: noop }));
}
function recent(state: EvaluatorHistoryState) {
  return renderToStaticMarkup(
    createElement(EvaluatorRecentCompleted, { state, onSeeHistory: noop, onView: noop, onRetry: noop }),
  );
}

describe("EvaluatorMetricCards", () => {
  it("mostra os 4 cartões com valores reais", () => {
    const html = cards({ pending: 3, inProgress: 1, completedToday: 2, averageScore: 8.5 });
    for (const label of ["Avaliações pendentes", "Em andamento", "Concluídas hoje", "Pontuação média"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain(">3<");
    expect(html).toContain(">8,5<");
    expect(html).toContain("grid-cols-2");
    expect(html).toContain("lg:grid-cols-4");
  });

  it("valores nulos viram '—' (sem inventar zero)", () => {
    const html = cards({ pending: null, inProgress: null, completedToday: null, averageScore: null });
    expect(html.match(/>—</g)?.length).toBe(4);
  });

  it("não exibe 'Score' nem 'Tempo médio'", () => {
    const html = cards({ pending: 0, inProgress: 0, completedToday: 0, averageScore: null });
    expect(html).not.toMatch(/Score|Tempo médio/);
  });
});

describe("EvaluatorUpcomingQueue", () => {
  it("loading, erro com retry e vazio", () => {
    expect(upcoming({ status: "loading" })).toContain("Carregando");
    const error = upcoming({ status: "error", message: "Falhou ao carregar." });
    expect(error).toContain("Falhou ao carregar.");
    expect(error).toContain("Tentar novamente");
    const empty = upcoming({ status: "ready", items: [] });
    expect(empty).toContain("Nenhuma avaliação pendente.");
  });

  it("lista até 4 com candidato, vaga, perguntas, atribuição, envio e Avaliar", () => {
    const items = ["Ana", "Bia", "Caio", "Davi", "Eva", "Fábio"].map((n, i) => queueItem(`${i}`, n));
    const html = upcoming({ status: "ready", items });
    expect(html).toContain("Ana");
    expect(html).toContain("Davi");
    expect(html).not.toContain("Eva");
    expect(html).toContain("Secretária Comercial · Clínica Exemplo");
    expect(html).toContain("5 perguntas");
    expect(html).toContain("Atribuída em");
    expect(html).toContain("Enviada em");
    expect(html.match(/Avaliar</g)?.length).toBe(4);
    expect(html).toContain("Mostrando 4 de 6 pendentes.");
    expect(html).toContain("Ver todas");
  });

  it("não polui com local/modalidade", () => {
    const html = upcoming({ status: "ready", items: [queueItem(ID_A, "Ana")] });
    expect(html).not.toMatch(/Três Lagoas|Híbrido/);
  });
});

describe("EvaluatorWeekActivity", () => {
  it("loading e erro (com retry) ficam restritos ao bloco", () => {
    expect(week({ status: "loading" })).toContain("Carregando atividade");
    const error = week({ status: "error", message: "Sem conexão." });
    expect(error).toContain("Sem conexão.");
    expect(error).toContain("Tentar novamente");
  });

  it("gráfico com legenda Recebidas × Concluídas, 7 dias e totais", () => {
    const now = new Date(2026, 9, 14, 15, 0, 0);
    const activity = buildWeekActivity({
      queue: [{ ...queueItem(ID_A, "Ana"), assignedAt: new Date(2026, 9, 13, 9).toISOString() }],
      history: [{ ...done(ID_B, "Bia", 8), assignedAt: new Date(2026, 9, 12, 9).toISOString(), completedAt: new Date(2026, 9, 14, 9).toISOString() }],
      now,
    });
    const html = week({ status: "ready", activity });
    expect(html).toContain("Recebidas (2)");
    expect(html).toContain("Concluídas (1)");
    for (const label of ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]) expect(html).toContain(`>${label}<`);
    expect(html).toContain("2026-10-18");
    expect(html).toContain("2 recebidas e 1 concluídas");
    expect(html).not.toContain("Sem atividade registrada");
  });

  it("sem atividade: barras zeradas e aviso, sem inventar dados", () => {
    const activity = buildWeekActivity({ queue: [], history: [], now: new Date(2026, 9, 14, 15) });
    const html = week({ status: "ready", activity });
    expect(html).toContain("Recebidas (0)");
    expect(html).toContain("Concluídas (0)");
    expect(html).toContain("Sem atividade registrada nesta semana.");
  });
});

describe("EvaluatorRecentCompleted", () => {
  it("loading, erro e vazio", () => {
    expect(recent({ status: "loading" })).toContain("Carregando histórico");
    const error = recent({ status: "error", message: "Histórico indisponível." });
    expect(error).toContain("Histórico indisponível.");
    expect(error).toContain("Tentar novamente");
    expect(recent({ status: "ready", items: [] })).toContain("Você ainda não concluiu avaliações.");
  });

  it("tabela no desktop (Candidato/Vaga/Data/Pontuação) e cards no mobile, no máximo 5", () => {
    const items = ["A", "B", "C", "D", "E", "F", "G"].map((n, i) => done(`id-${i}`, `Cand ${n}`, 7 + (i % 3)));
    const html = recent({ status: "ready", items });
    for (const header of ["Candidato", "Vaga", "Data", "Pontuação"]) expect(html).toContain(`>${header}<`);
    expect(html).toContain("hidden overflow-x-auto md:block");
    expect(html).toContain("md:hidden");
    expect(html.match(/data-recent-row=/g)?.length).toBe(5);
    expect(html.match(/data-recent-card=/g)?.length).toBe(5);
    expect(html).toContain("Ver histórico");
    expect(html).not.toMatch(/Score|Média final/);
  });

  it("nota nula aparece como '—' e a válida como N/10", () => {
    const html = recent({ status: "ready", items: [done("x", "Maria", null), done("y", "João", 8.5)] });
    expect(html).toContain("8,5/10");
    expect(html).toContain("—");
  });

  it("clique no candidato chama onView com o UUID real", () => {
    const onView = vi.fn();
    const tree = EvaluatorRecentCompleted({
      state: { status: "ready", items: [done(ID_A, "Maria", 8)] },
      onSeeHistory: noop,
      onView,
    });
    const buttons = collectButtons(tree);
    const candidateButton = buttons.find((button) => button.label === "Maria");
    expect(candidateButton).toBeDefined();
    candidateButton?.onClick();
    expect(onView).toHaveBeenCalledWith(ID_A);
  });
});

// ─── Gráfico "Atividade da semana": interação no padrão do gráfico do Admin ──

type TreeElement = { type: unknown; props: Record<string, unknown> };

function collectElements(node: unknown, predicate: (element: TreeElement) => boolean, found: TreeElement[] = []) {
  if (Array.isArray(node)) {
    node.forEach((child) => collectElements(child, predicate, found));
  } else if (node && typeof node === "object" && "props" in node) {
    const element = node as TreeElement;
    if (predicate(element)) found.push(element);
    collectElements(element.props.children, predicate, found);
  }
  return found;
}

const NOW = new Date(2026, 9, 14, 15, 0, 0); // quarta 14/10/2026
const ACTIVITY = buildWeekActivity({
  queue: [
    { ...queueItem(ID_A, "Ana"), assignedAt: new Date(2026, 9, 13, 9).toISOString() },
    { ...queueItem("q2", "Caio"), assignedAt: new Date(2026, 9, 13, 10).toISOString() },
  ],
  history: [
    { ...done(ID_B, "Bia", 8), assignedAt: new Date(2026, 9, 12, 9).toISOString(), completedAt: new Date(2026, 9, 13, 9).toISOString() },
  ],
  now: NOW,
});

function chart(props: Partial<Parameters<typeof WeekChartView>[0]> = {}) {
  return {
    activity: ACTIVITY,
    mounted: true,
    hoveredKey: null,
    selectedKey: null,
    onHover: vi.fn(),
    onToggle: vi.fn(),
    ...props,
  };
}
const dayButtons = (tree: unknown) =>
  collectElements(tree, (el) => el.props.role === "button" && typeof el.props["data-week-day"] === "string");

describe("WeekChartView (interação)", () => {
  it("duas séries por dia, de segunda a domingo, com os valores do domínio", () => {
    const html = renderToStaticMarkup(createElement(WeekChartView, chart()));
    expect(html.match(/data-series="received"/g)?.length).toBe(7);
    expect(html.match(/data-series="completed"/g)?.length).toBe(7);
    for (const label of ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]) expect(html).toContain(`>${label}<`);
    // Terça (13/10): 2 recebidas (Ana, Caio) e 1 concluída (Bia). Segunda: 1 recebida (Bia).
    expect(html).toContain("Terça-feira · 2 recebidas · 1 concluída");
    expect(html).toContain("Segunda-feira · 1 recebida · 0 concluídas");
  });

  it("cada dia é um botão focável com aria-label e aria-pressed", () => {
    const buttons = dayButtons(WeekChartView(chart({ selectedKey: ACTIVITY.days[1].key })));
    expect(buttons).toHaveLength(7);
    for (const button of buttons) {
      expect(button.props.tabIndex).toBe(0);
      expect(String(button.props["aria-label"])).toMatch(/recebida/);
    }
    expect(buttons[1].props["aria-pressed"]).toBe(true);
    expect(String(buttons[1].props["aria-label"])).toContain(", selecionado");
    expect(buttons[0].props["aria-pressed"]).toBe(false);
  });

  it("clique e Enter/Espaço selecionam o dia; outras teclas não", () => {
    const props = chart();
    const [monday, tuesday] = dayButtons(WeekChartView(props));
    (monday.props.onClick as () => void)();
    expect(props.onToggle).toHaveBeenLastCalledWith(ACTIVITY.days[0].key);

    const preventDefault = vi.fn();
    const keyDown = tuesday.props.onKeyDown as (event: { key: string; preventDefault: () => void }) => void;
    keyDown({ key: "Enter", preventDefault });
    expect(props.onToggle).toHaveBeenLastCalledWith(ACTIVITY.days[1].key);
    keyDown({ key: " ", preventDefault });
    expect(props.onToggle).toHaveBeenCalledTimes(3);
    keyDown({ key: "a", preventDefault });
    keyDown({ key: "Tab", preventDefault });
    expect(props.onToggle).toHaveBeenCalledTimes(3);
  });

  it("hover mostra o tooltip do dia (nome, recebidas e concluídas) e some ao sair", () => {
    const hoverKey = ACTIVITY.days[1].key;
    const withTip = renderToStaticMarkup(createElement(WeekChartView, chart({ hoveredKey: hoverKey })));
    expect(withTip.match(/data-week-tooltip/g)?.length).toBe(1);
    expect(withTip).toContain("Terça-feira");
    expect(withTip).toContain("2 recebidas");
    expect(withTip).toContain("1 concluída");
    const without = renderToStaticMarkup(createElement(WeekChartView, chart()));
    expect(without).not.toContain("data-week-tooltip");

    const props = chart();
    const [monday] = dayButtons(WeekChartView(props));
    (monday.props.onMouseEnter as () => void)();
    expect(props.onHover).toHaveBeenLastCalledWith(ACTIVITY.days[0].key);
    (monday.props.onMouseLeave as () => void)();
    expect(props.onHover).toHaveBeenLastCalledWith(null);
  });

  it("selecionado: destaca o grupo e mostra o detalhe discreto com 'Limpar seleção'", () => {
    const html = renderToStaticMarkup(createElement(WeekChartView, chart({ selectedKey: ACTIVITY.days[1].key })));
    expect(html).toContain("data-week-detail");
    expect(html).toContain("Terça-feira");
    expect(html).toContain("Limpar seleção");
    expect(html).toContain('aria-pressed="true"');
    const none = renderToStaticMarkup(createElement(WeekChartView, chart()));
    expect(none).not.toContain("data-week-detail");
  });

  it("'Limpar seleção' desfaz pelo mesmo toggle", () => {
    const props = chart({ selectedKey: ACTIVITY.days[1].key });
    const clear = collectElements(WeekChartView(props), (el) => el.type === "button" && el.props.children === "Limpar seleção");
    expect(clear).toHaveLength(1);
    (clear[0].props.onClick as () => void)();
    expect(props.onToggle).toHaveBeenCalledWith(ACTIVITY.days[1].key);
  });

  it("seleção de uma semana que já passou não aparece (virada de semana)", () => {
    const html = renderToStaticMarkup(createElement(WeekChartView, chart({ selectedKey: "2020-01-01" })));
    expect(html).not.toContain("data-week-detail");
  });

  it("antes de montar as barras têm altura 0 (animação de crescimento); depois, proporcionais", () => {
    const before = renderToStaticMarkup(createElement(WeekChartView, chart({ mounted: false })));
    const after = renderToStaticMarkup(createElement(WeekChartView, chart({ mounted: true })));
    expect(before).toContain("height:0px");
    expect(after).toContain("height:144px"); // maior valor da semana = 2 (BAR_AREA_PX = 144)
    expect(after).toContain("height:72px"); // 1 de 2
    expect(after).toContain("cubic-bezier(0.4,0,0.2,1)");
    expect(after).toContain("motion-reduce:transition-none");
  });

  it("legenda Recebidas (azul) e Concluídas (verde)", () => {
    const html = renderToStaticMarkup(createElement(WeekChartView, chart()));
    expect(html).toContain("Recebidas (3)");
    expect(html).toContain("Concluídas (1)");
    expect(html).toContain("bg-blue-500");
    expect(html).toContain("bg-green-500");
  });
});

describe("WeekChartView (composição compacta)", () => {
  const html = () => renderToStaticMarkup(createElement(WeekChartView, chart()));
  const card = () => html().slice(0, html().indexOf(">") + 1);

  it("o card não estica nem distribui o conteúdo (sem h-full, flex-1 e justify-between)", () => {
    const root = card();
    expect(root).not.toContain("h-full");
    expect(root).not.toContain("flex-1");
    expect(root).not.toContain("justify-between");
  });

  it("baseline contínua e no máximo 2 linhas-guia decorativas", () => {
    expect(html()).toContain("border-b-2");
    const guides = html().match(/data-week-guide/g) ?? [];
    expect(guides.length).toBeLessThanOrEqual(2);
    expect(guides.length).toBeGreaterThan(0);
    expect(html()).toContain('aria-hidden="true" data-week-guide');
  });

  it("7 rótulos de dia (Seg a Dom) abaixo da baseline e barras sólidas", () => {
    const labels = html().slice(html().indexOf("data-week-labels"));
    for (const day of ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]) expect(labels).toContain(day);
    expect(html()).toContain("bg-blue-500");
    expect(html()).toContain("bg-green-500");
    expect(html()).not.toContain("bg-blue-400");
    expect(html()).not.toContain("bg-green-400");
  });

  it("o dia atual recebe destaque discreto e aria-current; sem todayKey nada é destacado", () => {
    const todayKey = ACTIVITY.days[2].key;
    const marked = renderToStaticMarkup(createElement(WeekChartView, chart({ todayKey })));
    expect(marked.match(/data-today="true"/g) ?? []).toHaveLength(1);
    expect(marked).toContain('aria-current="date"');
    expect(marked).toContain("data-today-dot");
    expect(html()).not.toContain("data-today=");
  });

  it("duas séries, valores e acessibilidade preservados", () => {
    expect(dayButtons(WeekChartView(chart()))).toHaveLength(7);
    expect(html()).toContain('data-series="received"');
    expect(html()).toContain('data-series="completed"');
    expect(html()).toContain('aria-pressed="false"');
  });
});

