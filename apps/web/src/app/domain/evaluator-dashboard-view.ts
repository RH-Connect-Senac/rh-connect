/**
 * RH Connect — Dashboard do Avaliador (domínio PURO, sem React, storage ou rede).
 *
 * Só transforma o que já chega de `GET /evaluator/interviews` (fila) e de
 * `GET /evaluator/history` (concluídas): contadores do topo, "Próximas na fila",
 * "Atividade da semana" e "Recém concluídas". Nenhum número é inventado: sem
 * dado => `null` (a tela mostra "—").
 *
 * Dias sempre no FUSO LOCAL do navegador, semana de segunda a domingo.
 */

import type {
  CompletedEvaluationItem,
  EvaluatorQueueItem,
} from "../services/evaluator-interviews-service";
import { partitionQueue } from "./evaluator-queue-partition";

export const DASHBOARD_UPCOMING_LIMIT = 4;
export const DASHBOARD_RECENT_LIMIT = 5;

export const DASHBOARD_NO_PENDING_MESSAGE = "Nenhuma avaliação pendente.";
export const DASHBOARD_NO_COMPLETED_MESSAGE = "Você ainda não concluiu avaliações.";
export const DASHBOARD_WEEK_EMPTY_NOTE = "Sem atividade registrada nesta semana.";

export type DashboardMetrics = {
  pending: number | null;
  inProgress: number | null;
  completedToday: number | null;
  averageScore: number | null;
};

function validTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

// Número do dia no calendário LOCAL (sem aritmética de horas: imune a horário de verão).
function localDayNumber(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
}

/**
 * Cartões do topo. `queue`/`history` = `null` enquanto carregando ou com erro
 * (a métrica dependente fica `null` => "—"). As duas fontes são independentes.
 */
export function buildDashboardMetrics(input: {
  queue: readonly EvaluatorQueueItem[] | null;
  history: readonly CompletedEvaluationItem[] | null;
  now: Date;
}): DashboardMetrics {
  const { queue, history, now } = input;
  const partition = queue ? partitionQueue(queue) : null;

  let completedToday: number | null = null;
  let averageScore: number | null = null;
  if (history) {
    const today = localDayNumber(now);
    completedToday = history.filter((item) => {
      const time = validTime(item.completedAt);
      return time !== null && localDayNumber(new Date(time)) === today;
    }).length;

    const scores = history
      .map((item) => item.overallScore)
      .filter((score): score is number => typeof score === "number" && Number.isFinite(score));
    averageScore =
      scores.length === 0
        ? null
        : Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10;
  }

  return {
    pending: partition ? partition.pending.length : null,
    inProgress: partition ? partition.inProgress.length : null,
    completedToday,
    averageScore,
  };
}

/** Média no cartão: uma casa decimal com vírgula; sem dado => "—". */
export function formatDashboardAverage(score: number | null): string {
  return score === null ? "—" : score.toFixed(1).replace(".", ",");
}

/** Contador no cartão: `null` (carregando/erro) => "—". */
export function formatDashboardCount(value: number | null): string {
  return value === null ? "—" : String(value);
}

/** "Próximas na fila": só pendentes, na mesma ordem da fila (mais antigas primeiro). */
export function selectUpcomingQueue(
  pending: readonly EvaluatorQueueItem[],
  limit: number = DASHBOARD_UPCOMING_LIMIT,
): { items: EvaluatorQueueItem[]; total: number } {
  return { items: pending.slice(0, limit), total: pending.length };
}

/** "Recém concluídas": mais recentes primeiro; sem data válida vai para o fim. */
export function selectRecentCompleted(
  history: readonly CompletedEvaluationItem[],
  limit: number = DASHBOARD_RECENT_LIMIT,
): CompletedEvaluationItem[] {
  return history
    .map((item, index) => ({ item, index, time: validTime(item.completedAt) }))
    .sort((a, b) => {
      if (a.time === null && b.time === null) return a.index - b.index;
      if (a.time === null) return 1;
      if (b.time === null) return -1;
      return b.time - a.time || a.index - b.index;
    })
    .slice(0, limit)
    .map(({ item }) => item);
}

export type WeekActivityDay = {
  /** Chave estável do dia (YYYY-MM-DD local). */
  key: string;
  label: string;
  full: string;
  received: number;
  completed: number;
};

export type WeekActivity = {
  days: WeekActivityDay[];
  totalReceived: number;
  totalCompleted: number;
  hasActivity: boolean;
};

const WEEK_DAYS = [
  { label: "Seg", full: "Segunda-feira" },
  { label: "Ter", full: "Terça-feira" },
  { label: "Qua", full: "Quarta-feira" },
  { label: "Qui", full: "Quinta-feira" },
  { label: "Sex", full: "Sexta-feira" },
  { label: "Sáb", full: "Sábado" },
  { label: "Dom", full: "Domingo" },
] as const;

function dayKey(dayNumber: number): string {
  return new Date(dayNumber * 86400000).toISOString().slice(0, 10);
}

/**
 * Atividade da semana (segunda a domingo, fuso local) de `now`.
 *
 *  - RECEBIDAS: `assignedAt` (chegada ao avaliador). Entrevistas ainda abertas
 *    vêm da fila; as já concluídas, do histórico (que passou a expor `assignedAt`).
 *  - CONCLUÍDAS: `completedAt` do histórico.
 *  - Sem dupla contagem: cada entrevista conta UMA vez em "Recebidas" mesmo que
 *    apareça na fila e no histórico (janela entre dois refreshes) e uma vez em
 *    "Concluídas"; o id (UUID) é a chave.
 *  - Datas ausentes/inválidas são ignoradas (nunca viram "hoje").
 */
export function buildWeekActivity(input: {
  queue: readonly EvaluatorQueueItem[];
  history: readonly CompletedEvaluationItem[];
  now: Date;
}): WeekActivity {
  const { queue, history, now } = input;
  const todayNumber = localDayNumber(now);
  const mondayNumber = todayNumber - ((now.getDay() + 6) % 7);

  const days: WeekActivityDay[] = WEEK_DAYS.map((day, index) => ({
    key: dayKey(mondayNumber + index),
    label: day.label,
    full: day.full,
    received: 0,
    completed: 0,
  }));

  const indexOf = (value: string | null | undefined): number | null => {
    const time = validTime(value);
    if (time === null) return null;
    const index = localDayNumber(new Date(time)) - mondayNumber;
    return index >= 0 && index < 7 ? index : null;
  };

  const receivedSeen = new Set<string>();
  const countReceived = (id: string, assignedAt: string | null) => {
    if (receivedSeen.has(id)) return;
    const index = indexOf(assignedAt);
    if (index === null) return; // sem data válida: não marca como visto (o outro lado pode ter)
    receivedSeen.add(id);
    days[index].received += 1;
  };
  for (const item of queue) countReceived(item.id, item.assignedAt);
  for (const item of history) countReceived(item.id, item.assignedAt);

  const completedSeen = new Set<string>();
  for (const item of history) {
    if (completedSeen.has(item.id)) continue;
    const index = indexOf(item.completedAt);
    if (index === null) continue;
    completedSeen.add(item.id);
    days[index].completed += 1;
  }

  const totalReceived = days.reduce((sum, day) => sum + day.received, 0);
  const totalCompleted = days.reduce((sum, day) => sum + day.completed, 0);
  return { days, totalReceived, totalCompleted, hasActivity: totalReceived + totalCompleted > 0 };
}

// ─── Apresentação do gráfico "Atividade da semana" (só texto/estado de UI) ───

export function formatReceivedCount(value: number): string {
  return `${value} ${value === 1 ? "recebida" : "recebidas"}`;
}

export function formatCompletedCount(value: number): string {
  return `${value} ${value === 1 ? "concluída" : "concluídas"}`;
}

/** "Terça-feira · 20 recebidas · 10 concluídas" (detalhe sob o gráfico e rótulo de acessibilidade). */
export function describeWeekDay(day: Pick<WeekActivityDay, "full" | "received" | "completed">): string {
  return `${day.full} · ${formatReceivedCount(day.received)} · ${formatCompletedCount(day.completed)}`;
}

/** Clicar no dia selecionado de novo remove a seleção; outro dia troca a seleção. */
export function toggleWeekDay(current: string | null, key: string): string | null {
  return current === key ? null : key;
}

/** Seleção só vale se o dia ainda existe na semana exibida (a virada de semana limpa sozinha). */
export function resolveSelectedWeekDay(activity: WeekActivity, key: string | null): WeekActivityDay | null {
  return key === null ? null : (activity.days.find((day) => day.key === key) ?? null);
}

/** Enter e Espaço ativam o dia (padrão de botão). */
/** Chave (YYYY-MM-DD local) do dia de `now`; só para destacar o dia atual no gráfico. */
export function currentWeekDayKey(now: Date): string {
  return dayKey(localDayNumber(now));
}

export function isActivationKey(key: string): boolean {
  return key === "Enter" || key === " " || key === "Spacebar";
}

/** Altura (px) de uma barra: proporcional ao maior valor da semana, mínimo 4px quando > 0. */
export function weekBarHeight(value: number, max: number, areaPx: number): number {
  if (value <= 0 || max <= 0) return 0;
  return Math.max(Math.round((value / max) * areaPx), 4);
}
