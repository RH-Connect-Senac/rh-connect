import { describe, expect, it } from "vitest";
import type { CompletedEvaluationItem, EvaluatorQueueItem } from "../services/evaluator-interviews-service";
import {
  DASHBOARD_RECENT_LIMIT,
  DASHBOARD_UPCOMING_LIMIT,
  buildDashboardMetrics,
  buildWeekActivity,
  currentWeekDayKey,
  describeWeekDay,
  formatCompletedCount,
  formatDashboardAverage,
  formatDashboardCount,
  formatReceivedCount,
  isActivationKey,
  resolveSelectedWeekDay,
  selectRecentCompleted,
  selectUpcomingQueue,
  toggleWeekDay,
  weekBarHeight,
} from "./evaluator-dashboard-view";

// Datas montadas no fuso LOCAL (o domínio trabalha em dia local), então os testes
// não dependem do TZ da máquina. 14/10/2026 é uma quarta-feira.
const local = (day: number, hour = 12, minute = 0, month = 9) => new Date(2026, month, day, hour, minute, 0, 0);
const iso = (date: Date) => date.toISOString();
const NOW = local(14, 15); // quarta 14/10, 15:00 — semana de seg 12/10 a dom 18/10

function queueItem(id: string, assignedAt: string | null, inProgress = false): EvaluatorQueueItem {
  return {
    id,
    status: "ASSIGNED",
    candidate: { name: `Cand ${id}`, professionalTitle: null, city: null, state: null },
    jobTitle: "Vaga",
    company: null,
    location: null,
    workMode: null,
    assignedAt,
    submittedAt: assignedAt,
    questionCount: 5,
    evaluation: inProgress
      ? { status: "DRAFT", startedAt: null, updatedAt: null, filledCriteria: 2, totalCriteria: 7, hasSummary: false, inProgress: true }
      : null,
  };
}

function done(
  id: string,
  completedAt: string | null,
  overallScore: number | null = 8,
  assignedAt: string | null = null,
): CompletedEvaluationItem {
  return {
    id,
    candidate: { name: `Cand ${id}`, professionalTitle: null, city: null, state: null },
    jobTitle: "Vaga",
    company: null,
    overallScore,
    assignedAt,
    completedAt,
    questionCount: 5,
  };
}

describe("buildDashboardMetrics", () => {
  it("pendentes = fila sem inProgress; em andamento = fila com inProgress", () => {
    const queue = [queueItem("a", iso(local(13))), queueItem("b", iso(local(13)), true), queueItem("c", iso(local(13)))];
    const m = buildDashboardMetrics({ queue, history: [], now: NOW });
    expect(m.pending).toBe(2);
    expect(m.inProgress).toBe(1);
  });

  it("fila ausente (carregando/erro) => null, sem derrubar as métricas do histórico", () => {
    const m = buildDashboardMetrics({ queue: null, history: [done("h", iso(local(14, 9)), 9)], now: NOW });
    expect(m.pending).toBeNull();
    expect(m.inProgress).toBeNull();
    expect(m.completedToday).toBe(1);
    expect(m.averageScore).toBe(9);
  });

  it("histórico ausente => concluídas hoje e média nulas; a fila segue valendo", () => {
    const m = buildDashboardMetrics({ queue: [queueItem("a", null)], history: null, now: NOW });
    expect(m.pending).toBe(1);
    expect(m.completedToday).toBeNull();
    expect(m.averageScore).toBeNull();
  });

  it("concluídas hoje: só o dia local atual (00:00 e 23:59 dentro; ontem e amanhã fora)", () => {
    const history = [
      done("inicio", iso(local(14, 0, 0))),
      done("fim", iso(local(14, 23, 59))),
      done("ontem", iso(local(13, 23, 59))),
      done("amanha", iso(local(15, 0, 0))),
      done("sem-data", null),
      done("invalida", "ontem"),
    ];
    expect(buildDashboardMetrics({ queue: [], history, now: NOW }).completedToday).toBe(2);
  });

  it("histórico vazio => 0 concluídas hoje e média nula (sem inventar)", () => {
    const m = buildDashboardMetrics({ queue: [], history: [], now: NOW });
    expect(m.completedToday).toBe(0);
    expect(m.averageScore).toBeNull();
  });

  it("média: só notas válidas, uma casa decimal", () => {
    const history = [done("a", null, 8), done("b", null, 9), done("c", null, 9), done("d", null, null)];
    expect(buildDashboardMetrics({ queue: [], history, now: NOW }).averageScore).toBe(8.7);
    expect(buildDashboardMetrics({ queue: [], history: [done("a", null, null)], now: NOW }).averageScore).toBeNull();
  });

  it("formatação: '—' para nulo, vírgula decimal", () => {
    expect(formatDashboardCount(null)).toBe("—");
    expect(formatDashboardCount(0)).toBe("0");
    expect(formatDashboardAverage(null)).toBe("—");
    expect(formatDashboardAverage(8.7)).toBe("8,7");
    expect(formatDashboardAverage(8)).toBe("8,0");
  });

  it("nova atribuição sobe os pendentes; conclusão move da fila para o histórico", () => {
    const base = [queueItem("a", iso(local(13)))];
    const before = buildDashboardMetrics({ queue: base, history: [], now: NOW });
    const afterAssign = buildDashboardMetrics({ queue: [...base, queueItem("b", iso(local(14, 10)))], history: [], now: NOW });
    expect(afterAssign.pending).toBe((before.pending ?? 0) + 1);

    const afterComplete = buildDashboardMetrics({
      queue: [],
      history: [done("a", iso(local(14, 14)), 8, iso(local(13)))],
      now: NOW,
    });
    expect(afterComplete.pending).toBe(0);
    expect(afterComplete.completedToday).toBe(1);
    expect(afterComplete.averageScore).toBe(8);
  });
});

describe("selectUpcomingQueue / selectRecentCompleted", () => {
  it("próximas: até 4, na ordem da fila, informando o total", () => {
    const pending = ["1", "2", "3", "4", "5", "6"].map((id) => queueItem(id, null));
    const result = selectUpcomingQueue(pending);
    expect(DASHBOARD_UPCOMING_LIMIT).toBe(4);
    expect(result.items.map((i) => i.id)).toEqual(["1", "2", "3", "4"]);
    expect(result.total).toBe(6);
    expect(selectUpcomingQueue([]).items).toEqual([]);
  });

  it("recentes: 5 mais recentes por completedAt; sem data vai para o fim; não altera a entrada", () => {
    const history = [
      done("velha", iso(local(1))),
      done("sem-data", null),
      done("nova", iso(local(14, 10))),
      done("meio", iso(local(10))),
      done("invalida", "x"),
      done("outra", iso(local(12))),
      done("mais-velha", iso(local(2))),
    ];
    const snapshot = history.map((i) => i.id);
    const recent = selectRecentCompleted(history);
    expect(DASHBOARD_RECENT_LIMIT).toBe(5);
    expect(recent.map((i) => i.id)).toEqual(["nova", "outra", "meio", "mais-velha", "velha"]);
    expect(history.map((i) => i.id)).toEqual(snapshot);
  });

  it("sem datas válidas mantém a ordem recebida", () => {
    const recent = selectRecentCompleted([done("a", null), done("b", "x"), done("c", null)]);
    expect(recent.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });
});

describe("buildWeekActivity", () => {
  const empty = buildWeekActivity({ queue: [], history: [], now: NOW });

  it("7 dias de segunda a domingo, zerados quando não há atividade", () => {
    expect(empty.days.map((d) => d.label)).toEqual(["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]);
    expect(empty.days.every((d) => d.received === 0 && d.completed === 0)).toBe(true);
    expect(empty.hasActivity).toBe(false);
    expect(empty.days[0].key).toBe("2026-10-12");
    expect(empty.days[6].key).toBe("2026-10-18");
  });

  it("Recebidas = assignedAt (fila e histórico); Concluídas = completedAt", () => {
    const activity = buildWeekActivity({
      queue: [queueItem("q1", iso(local(12, 9))), queueItem("q2", iso(local(14, 9)), true)],
      history: [done("h1", iso(local(14, 11)), 8, iso(local(13, 8))), done("h2", iso(local(15, 11)), 9, iso(local(12, 10)))],
      now: NOW,
    });
    expect(activity.days.map((d) => d.received)).toEqual([2, 1, 1, 0, 0, 0, 0]);
    expect(activity.days.map((d) => d.completed)).toEqual([0, 0, 1, 1, 0, 0, 0]);
    expect(activity.totalReceived).toBe(4);
    expect(activity.totalCompleted).toBe(2);
    expect(activity.hasActivity).toBe(true);
  });

  it("domingo entra na semana (23:59) e as fronteiras ficam de fora", () => {
    const activity = buildWeekActivity({
      queue: [
        queueItem("seg-0000", iso(local(12, 0, 0))),
        queueItem("dom-2359", iso(local(18, 23, 59))),
        queueItem("dom-anterior", iso(local(11, 23, 59))),
        queueItem("seg-seguinte", iso(local(19, 0, 0))),
      ],
      history: [],
      now: NOW,
    });
    expect(activity.days.map((d) => d.received)).toEqual([1, 0, 0, 0, 0, 0, 1]);
  });

  it("'agora' no domingo ou na segunda usa a semana correta", () => {
    const sunday = buildWeekActivity({ queue: [queueItem("a", iso(local(12)))], history: [], now: local(18, 20) });
    expect(sunday.days[0].key).toBe("2026-10-12");
    expect(sunday.days[0].received).toBe(1);
    const monday = buildWeekActivity({ queue: [queueItem("a", iso(local(12)))], history: [], now: local(12, 0, 1) });
    expect(monday.days[0].key).toBe("2026-10-12");
    expect(monday.days[0].received).toBe(1);
    const nextMonday = buildWeekActivity({ queue: [queueItem("a", iso(local(12)))], history: [], now: local(19, 9) });
    expect(nextMonday.totalReceived).toBe(0);
  });

  it("sem dupla contagem: a mesma entrevista na fila e no histórico conta uma vez", () => {
    const activity = buildWeekActivity({
      queue: [queueItem("x", iso(local(13, 9)))],
      history: [done("x", iso(local(14, 9)), 8, iso(local(13, 9)))],
      now: NOW,
    });
    expect(activity.totalReceived).toBe(1);
    expect(activity.totalCompleted).toBe(1);
  });

  it("histórico duplicado no mesmo id também conta uma vez", () => {
    const item = done("x", iso(local(14, 9)), 8, iso(local(13, 9)));
    const activity = buildWeekActivity({ queue: [], history: [item, { ...item }], now: NOW });
    expect(activity.totalReceived).toBe(1);
    expect(activity.totalCompleted).toBe(1);
  });

  it("datas ausentes ou inválidas são ignoradas (nunca viram 'hoje')", () => {
    const activity = buildWeekActivity({
      queue: [queueItem("q", null)],
      history: [done("h", "lixo", 8, null), done("k", null, 8, "outra-lixo")],
      now: NOW,
    });
    expect(activity.hasActivity).toBe(false);
  });

  it("concluída sem assignedAt no histórico não entra em Recebidas, mas entra em Concluídas", () => {
    const activity = buildWeekActivity({ queue: [], history: [done("h", iso(local(14, 9)), 8, null)], now: NOW });
    expect(activity.totalReceived).toBe(0);
    expect(activity.totalCompleted).toBe(1);
  });

  it("atualiza após nova atribuição e após conclusão", () => {
    const a = queueItem("a", iso(local(13, 9)));
    const base = buildWeekActivity({ queue: [a], history: [], now: NOW });
    const assigned = buildWeekActivity({ queue: [a, queueItem("b", iso(local(14, 9)))], history: [], now: NOW });
    expect(assigned.totalReceived).toBe(base.totalReceived + 1);

    const completed = buildWeekActivity({
      queue: [],
      history: [done("a", iso(local(14, 12)), 8, iso(local(13, 9)))],
      now: NOW,
    });
    expect(completed.totalReceived).toBe(1);
    expect(completed.totalCompleted).toBe(1);
  });
});

describe("apresentação do gráfico semanal", () => {
  it("textos com singular/plural", () => {
    expect(formatReceivedCount(1)).toBe("1 recebida");
    expect(formatReceivedCount(0)).toBe("0 recebidas");
    expect(formatReceivedCount(20)).toBe("20 recebidas");
    expect(formatCompletedCount(1)).toBe("1 concluída");
    expect(formatCompletedCount(10)).toBe("10 concluídas");
    expect(describeWeekDay({ full: "Terça-feira", received: 20, completed: 10 })).toBe("Terça-feira · 20 recebidas · 10 concluídas");
  });

  it("clicar de novo remove a seleção; outro dia troca", () => {
    expect(toggleWeekDay(null, "a")).toBe("a");
    expect(toggleWeekDay("a", "a")).toBeNull();
    expect(toggleWeekDay("a", "b")).toBe("b");
  });

  it("Enter e Espaço ativam; outras teclas não", () => {
    expect(isActivationKey("Enter")).toBe(true);
    expect(isActivationKey(" ")).toBe(true);
    expect(isActivationKey("Tab")).toBe(false);
    expect(isActivationKey("Escape")).toBe(false);
  });

  it("seleção só vale para dia da semana exibida", () => {
    const activity = buildWeekActivity({ queue: [], history: [], now: NOW });
    expect(resolveSelectedWeekDay(activity, activity.days[2].key)?.label).toBe("Qua");
    expect(resolveSelectedWeekDay(activity, "1999-01-01")).toBeNull();
    expect(resolveSelectedWeekDay(activity, null)).toBeNull();
  });

  it("altura da barra: proporcional, mínimo de 4px e 0 sem valor", () => {
    expect(weekBarHeight(0, 5, 128)).toBe(0);
    expect(weekBarHeight(5, 5, 128)).toBe(128);
    expect(weekBarHeight(1, 5, 128)).toBe(26);
    expect(weekBarHeight(1, 1000, 128)).toBe(4);
  });

  it("os helpers de apresentação não alteram os dados da semana", () => {
    const activity = buildWeekActivity({ queue: [queueItem("a", iso(local(13)))], history: [], now: NOW });
    const snapshot = JSON.stringify(activity);
    describeWeekDay(activity.days[1]);
    resolveSelectedWeekDay(activity, activity.days[1].key);
    expect(JSON.stringify(activity)).toBe(snapshot);
  });
});

describe("dia atual do gráfico semanal", () => {
  it("currentWeekDayKey corresponde a um dia da semana de buildWeekActivity (fuso local)", () => {
    const now = new Date(2026, 8, 23, 23, 30); // quarta-feira, perto da meia-noite local
    const week = buildWeekActivity({ queue: [], history: [], now });
    expect(week.days.map((day) => day.key)).toContain(currentWeekDayKey(now));
    expect(week.days[2].key).toBe(currentWeekDayKey(now));
    expect(currentWeekDayKey(new Date(2026, 8, 23, 0, 5))).toBe(currentWeekDayKey(now));
  });
});
