import { describe, expect, it } from "vitest";
import {
  DASHBOARD_RECENT_LIMIT,
  buildDashboardRecent,
  buildDashboardSummary,
  dashboardActionPath,
  describeDashboardInterviewsFailure,
  formatDashboardScore,
  pickFeaturedInterview,
} from "./candidate-dashboard-view";
import type { RealHistoryItem, RealInterviewStatus } from "../services/candidate-interviews-service";

let seq = 0;
function item(status: RealInterviewStatus, overrides: Partial<RealHistoryItem> = {}): RealHistoryItem {
  seq += 1;
  const id = `00000000-0000-4000-8000-${String(seq).padStart(12, "0")}`;
  const completed = status === "COMPLETED";
  return {
    id,
    status,
    evaluationMode: status === "PENDING_AI_EVALUATION" ? "AI" : "HUMAN",
    title: `Vaga ${seq}`,
    company: "ACME",
    location: null,
    contractType: null,
    workMode: null,
    submittedAt: status === "IN_PROGRESS" ? null : "2026-10-12T13:00:00.000Z",
    createdAt: "2026-10-12T12:00:00.000Z",
    updatedAt: "2026-10-13T03:00:00.000Z",
    assignedAt: null,
    completedAt: completed ? "2026-10-13T03:28:00.000Z" : null,
    questionCount: 5,
    overallScore: completed ? 5.6 : null,
    resultAvailable: completed,
    ...overrides,
  };
}

describe("Dashboard do candidato (6A.5): métricas", () => {
  const list = [
    item("CANCELLED"),
    item("IN_PROGRESS"),
    item("PENDING_ASSIGNMENT"),
    item("ASSIGNED"),
    item("PENDING_AI_EVALUATION", { evaluationMode: "AI" }),
    item("COMPLETED", { overallScore: 5.6 }),
    item("COMPLETED", { overallScore: 8.2 }),
    item("CANCELLED"),
  ];

  it("total exclui CANCELLED; cada grupo segue o mapeamento", () => {
    expect(buildDashboardSummary(list)).toEqual({
      total: 6,
      inProgress: 1,
      waiting: 2,
      completed: 2,
      resultsAvailable: 2,
      bestScore: 8.2,
    });
  });

  it("CANCELLED não entra em nenhuma métrica, nem na pontuação", () => {
    const onlyCancelled = [item("CANCELLED", { overallScore: 10, resultAvailable: true }), item("CANCELLED")];
    expect(buildDashboardSummary(onlyCancelled)).toEqual({ total: 0, inProgress: 0, waiting: 0, completed: 0, resultsAvailable: 0, bestScore: null });
  });

  it("pontuação usa só o overallScore do Back de COMPLETED com resultAvailable (sem recalcular)", () => {
    const summary = buildDashboardSummary([
      item("COMPLETED", { overallScore: 5.6 }),
      item("COMPLETED", { overallScore: 9, resultAvailable: false }),
      item("COMPLETED", { overallScore: null }),
      item("ASSIGNED", { overallScore: 10 }),
    ]);
    expect(summary.bestScore).toBe(5.6);
    expect(summary.completed).toBe(3);
    expect(summary.resultsAvailable).toBe(2);
  });

  it("sem resultados válidos: neutro (null / '—'), nunca 0", () => {
    const summary = buildDashboardSummary([item("PENDING_ASSIGNMENT"), item("COMPLETED", { resultAvailable: false })]);
    expect(summary.bestScore).toBeNull();
    expect(formatDashboardScore(summary.bestScore)).toBe("—");
    expect(formatDashboardScore(5.6)).toBe("5,6");
    expect(formatDashboardScore(9)).toBe("9,0");
  });

  it("conta vazia: zeros reais (estado de primeiro uso)", () => {
    expect(buildDashboardSummary([])).toEqual({ total: 0, inProgress: 0, waiting: 0, completed: 0, resultsAvailable: 0, bestScore: null });
  });
});

describe("Dashboard do candidato (6A.5): destaque determinístico", () => {
  it("prioridade: IN_PROGRESS > PENDING_ASSIGNMENT > ASSIGNED > PENDING_AI_EVALUATION > COMPLETED", () => {
    const completed = item("COMPLETED");
    const ai = item("PENDING_AI_EVALUATION");
    const assigned = item("ASSIGNED");
    const pending = item("PENDING_ASSIGNMENT");
    const inProgress = item("IN_PROGRESS");
    expect(pickFeaturedInterview([completed, ai, assigned, pending, inProgress])?.id).toBe(inProgress.id);
    expect(pickFeaturedInterview([completed, ai, assigned, pending])?.id).toBe(pending.id);
    expect(pickFeaturedInterview([completed, ai, assigned])?.id).toBe(assigned.id);
    expect(pickFeaturedInterview([completed, ai])?.id).toBe(ai.id);
    expect(pickFeaturedInterview([completed])?.id).toBe(completed.id);
  });

  it("empate na mesma categoria mantém a ordem do Back", () => {
    const first = item("COMPLETED");
    const second = item("COMPLETED");
    expect(pickFeaturedInterview([first, second])?.id).toBe(first.id);
  });

  it("nunca escolhe CANCELLED; sem elegíveis → null", () => {
    expect(pickFeaturedInterview([item("CANCELLED")])).toBeNull();
    expect(pickFeaturedInterview([])).toBeNull();
    const completed = item("COMPLETED");
    expect(pickFeaturedInterview([item("CANCELLED"), completed])?.id).toBe(completed.id);
  });
});

describe("Dashboard do candidato (6A.5): entrevistas recentes e ações", () => {
  it("destaque primeiro, resto na ordem do Back, sem CANCELLED e limitado a 3", () => {
    const cancelled = item("CANCELLED");
    const completed = item("COMPLETED");
    const assigned = item("ASSIGNED");
    const completed2 = item("COMPLETED");
    const inProgress = item("IN_PROGRESS");
    const recent = buildDashboardRecent([cancelled, completed, assigned, completed2, inProgress]);
    expect(DASHBOARD_RECENT_LIMIT).toBe(3);
    expect(recent.map((entry) => entry.id)).toEqual([inProgress.id, completed.id, assigned.id]);
    expect(recent.some((entry) => entry.id === cancelled.id)).toBe(false);
  });

  it("ação principal por status (mesma regra do Histórico)", () => {
    const byStatus = (status: RealInterviewStatus, overrides: Partial<RealHistoryItem> = {}) => buildDashboardRecent([item(status, overrides)])[0];
    expect(byStatus("IN_PROGRESS").action).toMatchObject({ kind: "resume", label: "Continuar entrevista" });
    for (const status of ["PENDING_ASSIGNMENT", "ASSIGNED", "PENDING_AI_EVALUATION"] as const) {
      expect(byStatus(status).action).toMatchObject({ kind: "track", label: "Acompanhar" });
    }
    expect(byStatus("COMPLETED").action).toMatchObject({ kind: "result", label: "Ver resultado" });
    expect(byStatus("COMPLETED", { resultAvailable: false }).action).toMatchObject({ kind: "track", label: "Acompanhar" });
  });

  it("rotas reais: /status e /reports; 'resume' fica com a tela; nenhuma rota nova", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    const track = buildDashboardRecent([item("ASSIGNED", { id })])[0].action!;
    const result = buildDashboardRecent([item("COMPLETED", { id })])[0].action!;
    const resume = buildDashboardRecent([item("IN_PROGRESS", { id })])[0].action!;
    expect(dashboardActionPath(track, id)).toBe(`/candidate/interviews/${id}/status`);
    expect(dashboardActionPath(result, id)).toBe(`/candidate/reports/${id}`);
    expect(dashboardActionPath(resume, id)).toBeNull();
  });

  it("nunca oferece 'Praticar novamente' nem 'Nova entrevista' nos itens", () => {
    const statuses: RealInterviewStatus[] = ["IN_PROGRESS", "PENDING_ASSIGNMENT", "ASSIGNED", "PENDING_AI_EVALUATION", "COMPLETED"];
    for (const status of statuses) {
      const label = buildDashboardRecent([item(status)])[0].action?.label ?? "";
      expect(label).not.toMatch(/praticar|nova entrevista|novamente/i);
    }
  });

  it("PENDING_AI_EVALUATION só representa o status (sem resultado)", () => {
    const entry = buildDashboardRecent([item("PENDING_AI_EVALUATION")])[0];
    expect(entry.statusLabel).toBe("Aguardando avaliação por IA");
    expect(entry.action?.kind).toBe("track");
  });

  it("dados reais do item; empresa ausente não vira placeholder", () => {
    const entry = buildDashboardRecent([item("COMPLETED", { company: null, title: "Analista" })])[0];
    expect(entry).toMatchObject({ title: "Analista", company: null, evaluationMode: "HUMAN" });
    expect(entry.dateText).toMatch(/^Concluída em /);
  });

  it("lista vazia ou só canceladas → sem itens", () => {
    expect(buildDashboardRecent([])).toEqual([]);
    expect(buildDashboardRecent([item("CANCELLED")])).toEqual([]);
  });
});

describe("Dashboard do candidato (6A.5): falhas", () => {
  it("401/403 sem retry; demais com retry; nada técnico", () => {
    expect(describeDashboardInterviewsFailure("forbidden", "Sem acesso.").canRetry).toBe(false);
    const failure = describeDashboardInterviewsFailure("error", "Não foi possível carregar o histórico de entrevistas. Tente novamente.");
    expect(failure.canRetry).toBe(true);
    expect(`${failure.title} ${failure.description}`).not.toMatch(/failed to fetch|prisma|groq|stack/i);
  });
});

describe("Dashboard real (6A.6): 'Aguardando avaliação' = ASSIGNED + PENDING_AI_EVALUATION", () => {
  const waiting = (items: RealHistoryItem[]) => buildDashboardSummary(items).waiting;

  it("PENDING_ASSIGNMENT não conta; ASSIGNED conta; COMPLETED volta a 0 e libera o resultado", () => {
    const base = item("PENDING_ASSIGNMENT");
    expect(waiting([base])).toBe(0);
    const assigned = { ...base, status: "ASSIGNED" as const, assignedAt: "2026-10-13T04:00:00.000Z" };
    expect(waiting([assigned])).toBe(1);
    expect(buildDashboardSummary([assigned]).resultsAvailable).toBe(0);
    const done = { ...assigned, status: "COMPLETED" as const, completedAt: "2026-10-13T05:00:00.000Z", overallScore: 7.5, resultAvailable: true };
    const summary = buildDashboardSummary([done]);
    expect(summary.waiting).toBe(0);
    expect(summary.resultsAvailable).toBe(1);
    expect(summary.bestScore).toBe(7.5);
  });

  it("PENDING_AI_EVALUATION conta; IN_PROGRESS, COMPLETED e CANCELLED não contam", () => {
    expect(waiting([item("PENDING_AI_EVALUATION", { evaluationMode: "AI" })])).toBe(1);
    expect(waiting([item("IN_PROGRESS")])).toBe(0);
    expect(waiting([item("COMPLETED")])).toBe(0);
    expect(waiting([item("CANCELLED")])).toBe(0);
  });

  it("combinação: 2 PENDING_ASSIGNMENT + 3 ASSIGNED + 1 PENDING_AI_EVALUATION + 4 COMPLETED = 4", () => {
    const mix = [
      ...[1, 2].map(() => item("PENDING_ASSIGNMENT")),
      ...[1, 2, 3].map(() => item("ASSIGNED")),
      item("PENDING_AI_EVALUATION", { evaluationMode: "AI" }),
      ...[1, 2, 3, 4].map(() => item("COMPLETED")),
    ];
    const summary = buildDashboardSummary(mix);
    expect(summary.waiting).toBe(4);
    expect(summary.total).toBe(10);
    expect(summary.completed).toBe(4);
    expect(summary.resultsAvailable).toBe(4);
  });

  it("PENDING_ASSIGNMENT segue na lista de recentes como 'Aguardando atribuição'", () => {
    const recent = buildDashboardRecent([item("PENDING_ASSIGNMENT")]);
    expect(recent).toHaveLength(1);
    expect(recent[0].statusLabel).toBe("Aguardando atribuição");
  });
});
