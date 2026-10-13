import { describe, expect, it } from "vitest";
import {
  HISTORY_FILTERS,
  buildHistoryItemView,
  countByFilter,
  describeHistoryFailure,
  visibleHistoryItems,
  filterHistory,
  historyActionPath,
  historyFilterOf,
} from "./candidate-history-view";
import type { RealHistoryItem, RealInterviewStatus } from "../services/candidate-interviews-service";

const ID = "11111111-1111-4111-8111-111111111111";
const Q2 = "22222222-2222-4222-8222-222222222222";

function item(overrides: Partial<RealHistoryItem> = {}): RealHistoryItem {
  return {
    id: ID,
    status: "COMPLETED",
    evaluationMode: "HUMAN",
    title: "Analista de Dados",
    company: "ACME",
    location: "São Paulo",
    contractType: "CLT",
    workMode: "REMOTE",
    submittedAt: "2026-10-12T13:00:00.000Z",
    createdAt: "2026-10-12T12:00:00.000Z",
    updatedAt: "2026-10-13T03:28:52.775Z",
    assignedAt: "2026-10-13T01:00:00.000Z",
    completedAt: "2026-10-13T03:28:52.775Z",
    questionCount: 5,
    overallScore: 5.6,
    resultAvailable: true,
    ...overrides,
  };
}

const labels = (view: ReturnType<typeof buildHistoryItemView>) => view.actions.map((action) => action.label);

describe("histórico do candidato (6A.4): ações por status", () => {
  it("IN_PROGRESS → só 'Continuar entrevista' (nunca relatório)", () => {
    const view = buildHistoryItemView(item({ status: "IN_PROGRESS", overallScore: null, resultAvailable: false, submittedAt: null, completedAt: null, evaluationMode: null }));
    expect(labels(view)).toEqual(["Continuar entrevista"]);
    expect(view.actions[0].kind).toBe("resume");
    expect(view.statusLabel).toBe("Em andamento");
  });

  it("PENDING_ASSIGNMENT e ASSIGNED → 'Acompanhar' para /status", () => {
    for (const status of ["PENDING_ASSIGNMENT", "ASSIGNED"] as const) {
      const view = buildHistoryItemView(item({ status, overallScore: null, resultAvailable: false, completedAt: null }));
      expect(labels(view)).toEqual(["Acompanhar"]);
      expect(historyActionPath(view.actions[0].kind, ID)).toBe(`/candidate/interviews/${ID}/status`);
    }
  });

  it("COMPLETED com resultAvailable → exatamente 'Ver resultado' (/reports) e 'Acompanhar'", () => {
    const view = buildHistoryItemView(item());
    expect(view.actions[0]).toMatchObject({ kind: "result", label: "Ver resultado" });
    expect(historyActionPath("result", ID)).toBe(`/candidate/reports/${ID}`);
    expect(labels(view)).toEqual(["Ver resultado", "Acompanhar"]);
  });

  it("nenhum card oferece 'Praticar novamente' nem 'Nova entrevista' como substituto", () => {
    const statuses: RealInterviewStatus[] = ["IN_PROGRESS", "PENDING_ASSIGNMENT", "ASSIGNED", "PENDING_AI_EVALUATION", "COMPLETED", "CANCELLED"];
    for (const status of statuses) {
      for (const resultAvailable of [true, false]) {
        const text = labels(buildHistoryItemView(item({ status, resultAvailable }))).join("|");
        expect(text).not.toMatch(/praticar|nova entrevista|repetir|novamente/i);
      }
    }
  });

  it("COMPLETED com resultAvailable=false → NÃO oferece resultado nem nota (mesmo com overallScore)", () => {
    const view = buildHistoryItemView(item({ resultAvailable: false, overallScore: 7.5, evaluationMode: "AI" }));
    expect(view.actions.some((action) => action.kind === "result")).toBe(false);
    expect(view.score).toBeNull();
    expect(labels(view)).toEqual(["Acompanhar"]);
  });

  it("CANCELLED → sem resultado e sem continuar; 'Ver detalhes' reaproveita /status", () => {
    const view = buildHistoryItemView(item({ status: "CANCELLED", overallScore: null, resultAvailable: false, completedAt: null }));
    expect(view.statusLabel).toBe("Cancelada");
    expect(view.actions.some((action) => action.kind === "result" || action.kind === "resume")).toBe(false);
    expect(labels(view)).toContain("Ver detalhes");
    expect(historyActionPath("details", ID)).toBe(`/candidate/interviews/${ID}/status`);
  });

  it("PENDING_AI_EVALUATION → estado amigável e 'Acompanhar' (sem resultado)", () => {
    const view = buildHistoryItemView(item({ status: "PENDING_AI_EVALUATION", evaluationMode: "AI", overallScore: null, resultAvailable: false, completedAt: null }));
    expect(view.statusLabel).toBe("Aguardando avaliação por IA");
    expect(labels(view)).toEqual(["Acompanhar"]);
  });

  it("'resume' não tem rota própria no módulo (a tela usa o resume real)", () => {
    expect(historyActionPath("resume", ID)).toBeNull();
  });
});

describe("histórico do candidato (6A.4): nota", () => {
  it("mostra o overallScore do Back sem recalcular (5,6)", () => {
    expect(buildHistoryItemView(item({ overallScore: 5.6 })).score).toBe("5,6");
    expect(buildHistoryItemView(item({ overallScore: 9 })).score).toBe("9,0");
  });

  it("sem nota informada não mostra nota; nota só em COMPLETED", () => {
    expect(buildHistoryItemView(item({ overallScore: null })).score).toBeNull();
    expect(buildHistoryItemView(item({ status: "ASSIGNED", overallScore: 8, resultAvailable: false })).score).toBeNull();
  });
});

describe("histórico do candidato (6A.4): dados do card", () => {
  it("monta meta só com campos reais, sem placeholder", () => {
    expect(buildHistoryItemView(item()).meta).toEqual(["ACME", "São Paulo", "CLT", "Remoto", "5 perguntas"]);
    const sparse = buildHistoryItemView(item({ company: null, location: "  ", contractType: null, workMode: null, questionCount: 1 }));
    expect(sparse.meta).toEqual(["1 pergunta"]);
    expect(sparse.meta.join(" ")).not.toMatch(/null|undefined|não informado|—/i);
  });

  it("modalidade de trabalho híbrida/presencial", () => {
    expect(buildHistoryItemView(item({ workMode: "HYBRID" })).meta).toContain("Híbrido");
    expect(buildHistoryItemView(item({ workMode: "ONSITE" })).meta).toContain("Presencial");
  });

  it("data relevante por status, sem inventar", () => {
    expect(buildHistoryItemView(item({ status: "IN_PROGRESS", submittedAt: null, completedAt: null })).dateText).toMatch(/^Iniciada em /);
    expect(buildHistoryItemView(item({ status: "ASSIGNED", completedAt: null })).dateText).toMatch(/^Enviada em /);
    expect(buildHistoryItemView(item()).dateText).toMatch(/^Concluída em /);
    expect(buildHistoryItemView(item({ status: "CANCELLED", completedAt: null })).dateText).toMatch(/^Cancelada em /);
    expect(buildHistoryItemView(item({ completedAt: null, submittedAt: null })).dateText).toBeNull();
  });

  it("repassa a modalidade de avaliação (AI/HUMAN) e o título", () => {
    expect(buildHistoryItemView(item()).evaluationMode).toBe("HUMAN");
    expect(buildHistoryItemView(item({ evaluationMode: "AI" })).evaluationMode).toBe("AI");
    expect(buildHistoryItemView(item()).title).toBe("Analista de Dados");
  });
});

describe("histórico do candidato (6A.4): filtros reais (CANCELLED oculta)", () => {
  const all: RealInterviewStatus[] = ["IN_PROGRESS", "PENDING_ASSIGNMENT", "ASSIGNED", "PENDING_AI_EVALUATION", "COMPLETED", "CANCELLED"];
  const list = all.map((status, index) => item({ id: `00000000-0000-4000-8000-00000000020${index}`, status }));
  const visibleStatuses: RealInterviewStatus[] = ["IN_PROGRESS", "PENDING_ASSIGNMENT", "ASSIGNED", "PENDING_AI_EVALUATION", "COMPLETED"];

  it("cada status visível cai em exatamente um filtro; CANCELLED em nenhum", () => {
    expect(visibleStatuses.map(historyFilterOf)).toEqual(["in-progress", "waiting", "waiting", "waiting", "completed"]);
    expect(historyFilterOf("CANCELLED")).toBeNull();
  });

  it("CANCELLED vindo da API não aparece em 'Todos' nem em nenhum filtro; os outros 5 estados continuam, na ordem do Back", () => {
    expect(visibleHistoryItems(list).map((entry) => entry.status)).toEqual(visibleStatuses);
    expect(filterHistory(list, "all").map((entry) => entry.status)).toEqual(visibleStatuses);
    for (const key of ["all", "in-progress", "waiting", "completed"] as const) {
      expect(filterHistory(list, key).some((entry) => entry.status === "CANCELLED")).toBe(false);
    }
  });

  it("filtros específicos", () => {
    expect(filterHistory(list, "in-progress").map((entry) => entry.status)).toEqual(["IN_PROGRESS"]);
    expect(filterHistory(list, "waiting").map((entry) => entry.status)).toEqual(["PENDING_ASSIGNMENT", "ASSIGNED", "PENDING_AI_EVALUATION"]);
    expect(filterHistory(list, "completed").map((entry) => entry.status)).toEqual(["COMPLETED"]);
  });

  it("CANCELLED não entra na contagem de 'Todos' (5, não 6)", () => {
    expect(countByFilter(list)).toEqual({ all: 5, "in-progress": 1, waiting: 3, completed: 1 });
  });

  it("lista só com canceladas fica vazia e zerada", () => {
    const onlyCancelled = [item({ status: "CANCELLED" }), item({ id: Q2, status: "CANCELLED" })];
    expect(visibleHistoryItems(onlyCancelled)).toEqual([]);
    expect(countByFilter(onlyCancelled)).toEqual({ all: 0, "in-progress": 0, waiting: 0, completed: 0 });
  });

  it("não há chip 'Canceladas': são 4 chips", () => {
    expect(HISTORY_FILTERS.map((filter) => filter.label)).toEqual(["Todos", "Em andamento", "Aguardando", "Concluídas"]);
    expect(HISTORY_FILTERS.some((filter) => /cancel/i.test(`${filter.key} ${filter.label}`))).toBe(false);
  });

  it("o domínio ainda reconhece CANCELLED (rótulo e rota de detalhes continuam)", () => {
    expect(buildHistoryItemView(item({ status: "CANCELLED" })).statusLabel).toBe("Cancelada");
    expect(historyActionPath("details", ID)).toBe(`/candidate/interviews/${ID}/status`);
  });
});

describe("histórico do candidato (6A.4): falhas", () => {
  it("401/403 sem retry; demais com retry; nada técnico", () => {
    expect(describeHistoryFailure("forbidden", "Sem acesso.").canRetry).toBe(false);
    expect(describeHistoryFailure("unauthorized", "Sessão expirada.").canRetry).toBe(false);
    const failure = describeHistoryFailure("error", "Não foi possível carregar o histórico de entrevistas. Tente novamente.");
    expect(failure.canRetry).toBe(true);
    expect(`${failure.title} ${failure.description}`).not.toMatch(/failed to fetch|prisma|groq|stack/i);
  });
});
