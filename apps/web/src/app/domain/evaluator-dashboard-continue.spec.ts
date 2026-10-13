import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { EvaluatorContinueSection } from "../components/evaluator-continue-section";
import type { EvaluatorQueueState } from "../components/evaluator-real-content";
import type { EvaluatorQueueItem } from "../services/evaluator-interviews-service";
import { DASHBOARD_CONTINUE_LIMIT, selectContinueItems } from "./evaluator-dashboard-continue";
import { partitionQueue } from "./evaluator-queue-partition";

function item(id: string, updatedAt: string | null, over: Partial<EvaluatorQueueItem> = {}, inProgress = true): EvaluatorQueueItem {
  return {
    id,
    status: "ASSIGNED",
    candidate: { name: `Cand ${id}`, professionalTitle: null, city: null, state: null },
    jobTitle: "Secretária Comercial",
    company: "Clínica Exemplo",
    location: null,
    workMode: null,
    assignedAt: "2026-10-09T15:00:00.000Z",
    submittedAt: "2026-10-09T14:00:00.000Z",
    questionCount: 5,
    evaluation: {
      status: "DRAFT",
      startedAt: "2026-10-09T16:00:00.000Z",
      updatedAt,
      filledCriteria: 3,
      totalCriteria: 7,
      hasSummary: false,
      inProgress,
    },
    ...over,
  };
}

const a = item("a", "2026-10-10T10:00:00.000Z");
const b = item("b", "2026-10-10T12:00:00.000Z");
const c = item("c", "2026-10-10T11:00:00.000Z");

function render(state: EvaluatorQueueState, h: { onContinue?: (id: string) => void; onSeeAll?: () => void } = {}) {
  return renderToStaticMarkup(
    createElement(EvaluatorContinueSection, {
      state,
      onContinue: h.onContinue ?? vi.fn(),
      onSeeAll: h.onSeeAll ?? vi.fn(),
    }),
  );
}

describe("selectContinueItems", () => {
  it("limite padrão é 2", () => {
    expect(DASHBOARD_CONTINUE_LIMIT).toBe(2);
  });
  it("sem itens: vazio e sem 'ver todas'", () => {
    expect(selectContinueItems([])).toEqual({ items: [], hasMore: false });
  });
  it("1 item -> 1; 2 itens -> 2, sem hasMore", () => {
    expect(selectContinueItems([a]).items.map((i) => i.id)).toEqual(["a"]);
    const two = selectContinueItems([a, b]);
    expect(two.items).toHaveLength(2);
    expect(two.hasMore).toBe(false);
  });
  it("mais de 2: só o limite, as mais recentemente atualizadas, e hasMore", () => {
    const r = selectContinueItems([a, b, c]);
    expect(r.items.map((i) => i.id)).toEqual(["b", "c"]);
    expect(r.hasMore).toBe(true);
  });
  it("não altera a lista original e o empate mantém a ordem recebida", () => {
    const input = [a, b, c];
    selectContinueItems(input);
    expect(input.map((i) => i.id)).toEqual(["a", "b", "c"]);
    const x = item("x", "2026-10-10T10:00:00.000Z");
    const y = item("y", "2026-10-10T10:00:00.000Z");
    expect(selectContinueItems([x, y]).items.map((i) => i.id)).toEqual(["x", "y"]);
  });
  it("sem updatedAt usa startedAt; data inválida/ausente vai para o fim", () => {
    const none = item("none", null, {});
    none.evaluation!.startedAt = "";
    const r = selectContinueItems([none, a], 5);
    expect(r.items.map((i) => i.id)).toEqual(["a", "none"]);
  });
  it("um refresh que muda quem é o mais recente reflete na ordem", () => {
    expect(selectContinueItems([a, b]).items.map((i) => i.id)).toEqual(["b", "a"]);
    const aNewer = item("a", "2026-10-10T20:00:00.000Z");
    expect(selectContinueItems([aNewer, b]).items.map((i) => i.id)).toEqual(["a", "b"]);
  });
  it("combinado com a partição: item nunca aparece em Fila e Continuar ao mesmo tempo", () => {
    const queued = item("q", null, {}, false);
    const { pending, inProgress } = partitionQueue([a, queued, b]);
    const shown = selectContinueItems(inProgress).items.map((i) => i.id);
    expect(shown).toEqual(["b", "a"]);
    for (const id of shown) expect(pending.map((i) => i.id)).not.toContain(id);
  });
});

describe("EvaluatorContinueSection", () => {
  it("loading, erro e lista vazia: seção oculta, sem espaço vazio", () => {
    expect(render({ status: "loading" })).toBe("");
    expect(render({ status: "error", message: "x" })).toBe("");
    expect(render({ status: "ready", items: [] })).toBe("");
  });
  it("1 item mostra 1 card; 2 mostram 2; sem 'Ver todas'", () => {
    const one = render({ status: "ready", items: [a] });
    expect(one).toContain("Continuar avaliando");
    expect(one.match(/>Continuar</g)).toHaveLength(1);
    expect(one).not.toContain("Ver todas");
    const two = render({ status: "ready", items: [a, b] });
    expect(two.match(/>Continuar</g)).toHaveLength(2);
    expect(two).not.toContain("Ver todas");
  });
  it("mais de 2: só 2 cards (os mais recentes) e 'Ver todas'", () => {
    const html = render({ status: "ready", items: [a, b, c] });
    expect(html.match(/>Continuar</g)).toHaveLength(2);
    expect(html).toContain("Ver todas");
    expect(html).toContain("Cand b");
    expect(html).toContain("Cand c");
    expect(html).not.toContain("Cand a");
    expect(html.indexOf("Cand b") < html.indexOf("Cand c")).toBe(true);
  });
  it("conteúdo: candidato, vaga · empresa, progresso X / 7 critérios, atualização", () => {
    const html = render({ status: "ready", items: [a] });
    expect(html).toContain("Cand a");
    expect(html).toContain("Secretária Comercial · Clínica Exemplo");
    expect(html).toContain("3 / 7 critérios");
    expect(html).toContain('role="progressbar"');
    expect(html).toContain("Última atualização em");
  });
  it("Continuar abre a avaliação certa; Ver todas navega para Em Andamento", () => {
    const calls: string[] = [];
    let seeAll = 0;
    const tree = EvaluatorContinueSection({
      state: { status: "ready", items: [a, b, c] },
      onContinue: (id: string) => calls.push(id),
      onSeeAll: () => void seeAll++,
    }) as any;
    const buttons: any[] = [];
    const walk = (node: any) => {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) return node.forEach(walk);
      if (node.type === "button") buttons.push(node);
      walk(node.props?.children);
    };
    walk(tree);
    const labels = buttons.map((x) => x.props.children);
    expect(labels).toContain("Ver todas");
    buttons.filter((x) => x.props.children === "Continuar").forEach((x) => x.props.onClick());
    expect(calls).toEqual(["b", "c"]);
    buttons.find((x) => x.props.children === "Ver todas").props.onClick();
    expect(seeAll).toBe(1);
  });
  it("sem overflow: texto longo quebra e o botão fica acessível no mobile", () => {
    const html = render({ status: "ready", items: [a] });
    expect(html).toContain("min-w-0");
    expect(html).toContain("break-words");
    expect(html).toContain("w-full sm:w-auto");
    expect(html).toContain("flex-col");
  });
});

describe("guards: Dashboard usa a fonte única e a seção fica antes da Fila", () => {
  const screens = readFileSync(new URL("../components/evaluator-real-screens.tsx", import.meta.url), "utf8");
  const dash = screens.slice(
    screens.indexOf("export function EvalDashboardScreen"),
    screens.indexOf("export function EvalQueueScreen"),
  );
  it("usa o inProgress de useAssignedQueue, sem request nem polling novos", () => {
    expect(dash).toContain("const { pending: queue, inProgress, newIds, reload } = useAssignedQueue();");
    expect(dash).toMatch(/<EvaluatorContinueSection\s+state=\{inProgress\}/);
    expect(dash).toContain('onSeeAll={() => onNavigate("eval-active")}');
    expect(dash).not.toMatch(/fetch|listAssignedInterviews|useEvaluatorListSync|setInterval|setTimeout/);
  });
  it("ordem: cards numéricos, Continuar avaliando, Próximas na fila", () => {
    const cards = dash.indexOf("Avaliações pendentes");
    const cont = dash.indexOf("<EvaluatorContinueSection");
    const fila = dash.indexOf("Próximas na fila");
    expect(cards).toBeGreaterThan(-1);
    expect(cards < cont).toBe(true);
    expect(cont < fila).toBe(true);
  });
  it("o texto antigo de 'próxima etapa' continua removido do Dashboard", () => {
    expect(dash).not.toContain("próxima etapa");
    expect(dash).not.toContain("Estatísticas e histórico");
  });
  it("sem card em destaque nem 'Outras em andamento': cards compactos uniformes", () => {
    const src = readFileSync(new URL("../components/evaluator-continue-section.tsx", import.meta.url), "utf8");
    expect(src).not.toMatch(/Outras em andamento|continue-featured|Continuar avaliação|FEATURED/);
    expect(render({ status: "ready", items: [a, b] })).not.toContain("Outras em andamento");
  });
  it("a Fila do Dashboard segue independente (pendentes, 3 primeiras, newIds)", () => {
    expect(dash).toContain("queue.items.slice(0, 3)");
    expect(dash).toContain("newIds={newIds}");
  });
  it("a seção não faz request, não usa storage e a rota de 'Ver todas' existe", () => {
    const src = readFileSync(new URL("../components/evaluator-continue-section.tsx", import.meta.url), "utf8");
    expect(src).not.toMatch(/fetch\(|localStorage|sessionStorage|services\/|useEffect|setInterval/);
    const routes = readFileSync(new URL("../router/routes.ts", import.meta.url), "utf8");
    expect(routes).toContain('path: "/evaluator/evaluations/active"');
  });
});
