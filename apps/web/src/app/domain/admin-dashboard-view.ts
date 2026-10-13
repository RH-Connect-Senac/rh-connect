/**
 * View model do Dashboard Admin REAL (Fase 4.3B). Funções puras, sem React, sem storage.
 * Só formata o que o endpoint `GET /admin/dashboard` devolveu: não recalcula média, mês nem atividade.
 */

import type { AdminDashboard, AdminDashboardActivity } from "../services/admin-dashboard-service";

/** `generatedAt` muda a cada resposta; fica fora do snapshot para o sync não re-renderizar à toa. */
export type AdminDashboardSnapshot = Omit<AdminDashboard, "generatedAt">;

export function toDashboardSnapshot(dashboard: AdminDashboard): AdminDashboardSnapshot {
  const { generatedAt: _generatedAt, ...snapshot } = dashboard;
  return snapshot;
}

const MONTH_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MONTH_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export type DashboardChartPoint = { key: string; m: string; full: string; v: number };

/** Meses `YYYY-MM` (já em ordem cronológica) → pontos do gráfico. Meses com zero são preservados. */
export function buildChartData(
  interviewsByMonth: ReadonlyArray<{ month: string; total: number }>,
  period: "6m" | "12m",
): DashboardChartPoint[] {
  const slice = period === "6m" ? interviewsByMonth.slice(-6) : interviewsByMonth;
  return slice.map(({ month, total }) => {
    const index = Number(month.slice(5, 7)) - 1;
    const year = month.slice(0, 4);
    return {
      key: month,
      m: MONTH_SHORT[index] ?? month,
      full: `${MONTH_FULL[index] ?? month}/${year}`,
      v: total,
    };
  });
}

/** Score médio: `null` → "—" (nunca 0 inventado); senão 1 casa decimal. */
export function formatDashboardScore(score: number | null): string {
  return score === null ? "—" : score.toFixed(1);
}

/** Texto de apoio do card de score; `null` quando não há amostra. */
export function scoreSupportText(sample: number): string | null {
  if (sample <= 0) return null;
  return `Baseado em ${sample} ${sample === 1 ? "avaliação" : "avaliações"}`;
}

export type DashboardActivityIcon = "candidate" | "interview" | "assigned" | "evaluation";

export type DashboardActivityView = {
  id: string;
  icon: DashboardActivityIcon;
  time: string;
  title: string;
  detail: string | null;
};

function formatOccurredAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  const day = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
  return `${day} ${time}`;
}

export function describeActivity(activity: AdminDashboardActivity): DashboardActivityView {
  const job = activity.jobTitle;
  const base = { id: activity.id, time: formatOccurredAt(activity.occurredAt) };
  switch (activity.type) {
    case "candidate_registered":
      return { ...base, icon: "candidate", title: `${activity.candidateName} se cadastrou`, detail: null };
    case "interview_submitted":
      return {
        ...base,
        icon: "interview",
        title: `${activity.candidateName} enviou uma entrevista`,
        detail: job,
      };
    case "interview_assigned": {
      const who = activity.evaluatorName;
      return {
        ...base,
        icon: "assigned",
        title: who
          ? `Entrevista de ${activity.candidateName} atribuída a ${who}`
          : `Entrevista de ${activity.candidateName} atribuída`,
        detail: [job, activity.actorName ? `por ${activity.actorName}` : null].filter(Boolean).join(" · ") || null,
      };
    }
    case "evaluation_completed": {
      const who = activity.evaluatorName;
      const score = activity.score !== null ? `Pontuação ${formatDashboardScore(activity.score)}` : null;
      return {
        ...base,
        icon: "evaluation",
        title: who
          ? `${who} concluiu a avaliação de ${activity.candidateName}`
          : `Avaliação de ${activity.candidateName} concluída`,
        detail: [job, score].filter(Boolean).join(" · ") || null,
      };
    }
  }
}
