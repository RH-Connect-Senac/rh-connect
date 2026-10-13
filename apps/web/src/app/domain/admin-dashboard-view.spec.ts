import { describe, expect, it } from "vitest";
import {
  buildChartData,
  describeActivity,
  formatDashboardScore,
  scoreSupportText,
  toDashboardSnapshot,
} from "./admin-dashboard-view";
import type { AdminDashboard, AdminDashboardActivity } from "../services/admin-dashboard-service";

const months = Array.from({ length: 12 }, (_, i) => ({
  month: `2025-${String(i + 1).padStart(2, "0")}`,
  total: i === 9 ? 29 : 0,
}));

const base: AdminDashboardActivity = {
  id: "x",
  type: "candidate_registered",
  occurredAt: "2026-10-13T15:30:00.000Z",
  candidateName: "Maria",
  jobTitle: null,
  evaluatorName: null,
  actorName: null,
  score: null,
};

describe("admin-dashboard-view", () => {
  it("score: null → '—', senão 1 casa decimal (0 real continua 0.0)", () => {
    expect(formatDashboardScore(null)).toBe("—");
    expect(formatDashboardScore(7.3)).toBe("7.3");
    expect(formatDashboardScore(8)).toBe("8.0");
    expect(formatDashboardScore(0)).toBe("0.0");
  });

  it("apoio do score: amostra zero → nada; singular/plural", () => {
    expect(scoreSupportText(0)).toBeNull();
    expect(scoreSupportText(1)).toBe("Baseado em 1 avaliação");
    expect(scoreSupportText(13)).toBe("Baseado em 13 avaliações");
  });

  it("gráfico: 12 meses completos, 6 meses = últimos 6, zeros preservados, rótulos pt-BR", () => {
    expect(buildChartData(months, "12m")).toHaveLength(12);
    const six = buildChartData(months, "6m");
    expect(six.map((p) => p.key)).toEqual(months.slice(-6).map((p) => p.month));
    expect(six.some((p) => p.v === 0)).toBe(true);
    const oct = buildChartData([{ month: "2026-10", total: 29 }], "12m")[0];
    expect(oct).toEqual({ key: "2026-10", m: "Out", full: "Outubro/2026", v: 29 });
  });

  it("snapshot descarta generatedAt", () => {
    const dashboard: AdminDashboard = {
      generatedAt: "2026-10-13T12:00:00.000Z",
      summary: { candidateCount: 1, activeEvaluatorCount: 1, pendingAssignmentCount: 0, averageScore: null, averageScoreSample: 0 },
      interviewsByMonth: [],
      recentActivity: [],
    };
    const a = toDashboardSnapshot(dashboard);
    const b = toDashboardSnapshot({ ...dashboard, generatedAt: "2026-10-13T12:00:30.000Z" });
    expect("generatedAt" in a).toBe(false);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("atividade: textos naturais para os 4 tipos", () => {
    expect(describeActivity(base).title).toBe("Maria se cadastrou");
    expect(describeActivity({ ...base, type: "interview_submitted", jobTitle: "Dev" })).toMatchObject({
      title: "Maria enviou uma entrevista",
      detail: "Dev",
    });
    expect(
      describeActivity({ ...base, type: "interview_assigned", evaluatorName: "Carlos", actorName: "Ana", jobTitle: "Dev" }),
    ).toMatchObject({ title: "Entrevista de Maria atribuída a Carlos", detail: "Dev · por Ana" });
    const done = describeActivity({ ...base, type: "evaluation_completed", evaluatorName: "Carlos", score: 8.5, jobTitle: "Dev" });
    expect(done.title).toBe("Carlos concluiu a avaliação de Maria");
    expect(done.detail).toBe("Dev · Pontuação 8.5");
    expect(done.detail).not.toMatch(/Score/);
  });

  it("atividade: sem avaliador/ator/score não inventa 'Sistema' nem score", () => {
    const done = describeActivity({ ...base, type: "evaluation_completed" });
    expect(done.title).toBe("Avaliação de Maria concluída");
    expect(done.detail).toBeNull();
    const assigned = describeActivity({ ...base, type: "interview_assigned" });
    expect(assigned.title).toBe("Entrevista de Maria atribuída");
    expect(`${done.title} ${assigned.title}`).not.toMatch(/Sistema|null|undefined/);
  });

  it("atividade: horário em America/Sao_Paulo", () => {
    expect(describeActivity(base).time).toBe("13/10 12:30");
  });
});
