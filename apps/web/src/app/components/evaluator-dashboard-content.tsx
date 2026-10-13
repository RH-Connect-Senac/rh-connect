/** RH Connect — Blocos de apresentação do Dashboard do Avaliador.
 *
 * Apresentação pura: recebe estados já carregados (fila e histórico reais, cada
 * fonte com seu próprio loading/erro) e dados derivados por
 * `domain/evaluator-dashboard-view.ts`. Sem request, storage, timer ou mock.
 */

import { useEffect, useState, type ElementType, type ReactNode } from "react";
import { BarChart2, CheckCircle2, Clock, History, Layers, MessageSquare, Star } from "lucide-react";
import { Badge } from "./ui/badge";
import { EmptyState } from "./ui/empty-state";
import {
  BUTTON_CLASS,
  CARD_CLASS,
  ErrorBlock,
  LoadingBlock,
  formatDateTimePtBr,
  type EvaluatorQueueState,
} from "./evaluator-real-content";
import type { EvaluatorHistoryState } from "./evaluator-history-content";
import { NEW_ITEM_ENTER_CLASS } from "../domain/new-item-tracker";
import { formatScore } from "../domain/evaluator-evaluation-view";
import {
  DASHBOARD_NO_COMPLETED_MESSAGE,
  DASHBOARD_NO_PENDING_MESSAGE,
  DASHBOARD_WEEK_EMPTY_NOTE,
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
  type DashboardMetrics,
  type WeekActivity,
  type WeekActivityDay,
} from "../domain/evaluator-dashboard-view";

function SectionHeader({
  icon: Icon,
  title,
  iconClass,
  action,
}: {
  icon: ElementType;
  title: string;
  iconClass: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 font-bold text-foreground">
        <Icon className={`size-4 ${iconClass}`} aria-hidden="true" /> {title}
      </h3>
      {action}
    </div>
  );
}

function LinkButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="text-sm font-semibold text-primary hover:underline" onClick={onClick}>
      {children}
    </button>
  );
}

// ─── Linha 1: 4 cartões ──────────────────────────────────────────────────────

export function EvaluatorMetricCards({ metrics }: { metrics: DashboardMetrics }) {
  const cards = [
    { label: "Avaliações pendentes", value: formatDashboardCount(metrics.pending), icon: Layers, tone: "bg-amber-50 text-amber-600" },
    { label: "Em andamento", value: formatDashboardCount(metrics.inProgress), icon: Clock, tone: "bg-blue-50 text-blue-600" },
    { label: "Concluídas hoje", value: formatDashboardCount(metrics.completedToday), icon: CheckCircle2, tone: "bg-green-50 text-green-600" },
    { label: "Pontuação média", value: formatDashboardAverage(metrics.averageScore), icon: Star, tone: "bg-purple-50 text-purple-600" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" aria-label="Resumo do avaliador">
      {cards.map((card) => (
        <div key={card.label} className={`${CARD_CLASS} flex items-center gap-3 p-3 sm:p-4`} data-metric={card.label}>
          <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl sm:size-11 ${card.tone}`}>
            <card.icon className="size-4 sm:size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold leading-tight text-foreground sm:text-2xl">{card.value}</p>
            <p className="text-[11px] font-medium leading-snug text-muted-foreground sm:text-xs">{card.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Linha 3 (esquerda): Próximas na fila ────────────────────────────────────

export function EvaluatorUpcomingQueue({
  state,
  onEvaluate,
  onSeeAll,
  onRetry,
  newIds,
}: {
  // Somente as PENDENTES (já particionadas). Erro/loading são só deste bloco.
  state: EvaluatorQueueState;
  onEvaluate: (interviewId: string) => void;
  onSeeAll: () => void;
  onRetry?: () => void;
  newIds?: ReadonlySet<string>;
}) {
  const upcoming = state.status === "ready" ? selectUpcomingQueue(state.items) : null;
  return (
    <section className="space-y-3" aria-label="Próximas na fila">
      <SectionHeader
        icon={Layers}
        title="Próximas na fila"
        iconClass="text-amber-500"
        action={<LinkButton onClick={onSeeAll}>Ver todas</LinkButton>}
      />
      {state.status === "loading" && <LoadingBlock label="Carregando entrevistas..." />}
      {state.status === "error" && <ErrorBlock message={state.message} onRetry={onRetry} />}
      {upcoming && upcoming.items.length === 0 && (
        <EmptyState icon={Layers} title={DASHBOARD_NO_PENDING_MESSAGE} className="p-8" />
      )}
      {upcoming && upcoming.items.length > 0 && (
        <ul className="space-y-3" aria-label="Próximas entrevistas a avaliar">
          {upcoming.items.map((item) => (
            <li
              key={item.id}
              className={`${CARD_CLASS} p-4${newIds?.has(item.id) ? ` ${NEW_ITEM_ENTER_CLASS}` : ""}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="break-words font-bold text-foreground">{item.candidate.name}</p>
                  <p className="break-words text-sm text-foreground">
                    {[item.jobTitle, item.company].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="size-3" aria-hidden="true" />
                      {item.questionCount} {item.questionCount === 1 ? "pergunta" : "perguntas"}
                    </span>
                    <span>Atribuída em {formatDateTimePtBr(item.assignedAt)}</span>
                    <span>Enviada em {formatDateTimePtBr(item.submittedAt)}</span>
                  </p>
                </div>
                <div className="shrink-0">
                  <button type="button" className={`${BUTTON_CLASS} w-full sm:w-auto`} onClick={() => onEvaluate(item.id)}>
                    Avaliar
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {upcoming && upcoming.total > upcoming.items.length && (
        <p className="text-xs text-muted-foreground">
          Mostrando {upcoming.items.length} de {upcoming.total} pendentes.
        </p>
      )}
    </section>
  );
}

// ─── Linha 3 (direita): Atividade da semana ──────────────────────────────────
// Mesma linguagem do gráfico "Entrevistas por Mês" do Admin (crescimento das
// barras, hover com tooltip, seleção por clique/Enter, detalhe sob o gráfico),
// mas com componente próprio e SOMENTE os dados do avaliador. Sem biblioteca.

export type WeekActivityState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; activity: WeekActivity };

const BAR_AREA_PX = 144;
const SERIES = {
  received: {
    label: "Recebidas",
    dot: "bg-blue-500",
    bar: "bg-blue-500",
    barHover: "bg-blue-600",
    barSelected: "bg-blue-700",
    text: "text-blue-600",
  },
  completed: {
    label: "Concluídas",
    dot: "bg-green-500",
    bar: "bg-green-500",
    barHover: "bg-green-600",
    barSelected: "bg-green-700",
    text: "text-green-600",
  },
} as const;

export function EvaluatorWeekActivity({
  state,
  onRetry,
}: {
  // Precisa das DUAS fontes (fila e histórico): sem uma delas o gráfico seria falso.
  state: WeekActivityState;
  onRetry?: () => void;
}) {
  return (
    <section className="space-y-3" aria-label="Atividade da semana">
      <SectionHeader icon={BarChart2} title="Atividade da semana" iconClass="text-blue-500" />
      {state.status === "loading" && <LoadingBlock label="Carregando atividade..." />}
      {state.status === "error" && <ErrorBlock message={state.message} onRetry={onRetry} />}
      {state.status === "ready" && <WeekChart activity={state.activity} />}
    </section>
  );
}

// Estado de UI (hover/seleção/animação) fica aqui; o desenho é `WeekChartView`.
function WeekChart({ activity }: { activity: WeekActivity }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const weekKey = activity.days[0]?.key ?? "";
  const [todayKey] = useState(() => currentWeekDayKey(new Date()));

  // Cresce ao aparecer e ao trocar de semana; refresh de dados NÃO reinicia (as
  // barras só transitam para a nova altura, sem piscar).
  useEffect(() => {
    setMounted(false);
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, [weekKey]);

  return (
    <WeekChartView
      activity={activity}
      mounted={mounted}
      hoveredKey={hovered}
      selectedKey={resolveSelectedWeekDay(activity, selected)?.key ?? null}
      todayKey={todayKey}
      onHover={setHovered}
      onToggle={(key) => setSelected((current) => toggleWeekDay(current, key))}
    />
  );
}

export function WeekChartView({
  activity,
  mounted,
  hoveredKey,
  selectedKey,
  todayKey = null,
  onHover,
  onToggle,
}: {
  activity: WeekActivity;
  mounted: boolean;
  hoveredKey: string | null;
  selectedKey: string | null;
  /** Dia atual (opcional): recebe um destaque discreto. */
  todayKey?: string | null;
  onHover: (key: string | null) => void;
  onToggle: (key: string) => void;
}) {
  const max = Math.max(1, ...activity.days.flatMap((day) => [day.received, day.completed]));
  const selectedDay = resolveSelectedWeekDay(activity, selectedKey);
  const summary = `Esta semana: ${activity.totalReceived} recebidas e ${activity.totalCompleted} concluídas.`;
  const last = activity.days.length - 1;

  return (
    <div className={`${CARD_CLASS} flex flex-col gap-3 p-4 sm:p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Esta semana</span>
        <span className="flex items-center gap-3">
          {(["received", "completed"] as const).map((series) => (
            <span key={series} className="inline-flex items-center gap-1.5">
              <span className={`inline-block size-2.5 rounded-sm ${SERIES[series].dot}`} aria-hidden="true" />
              {SERIES[series].label} ({series === "received" ? activity.totalReceived : activity.totalCompleted})
            </span>
          ))}
        </span>
      </div>

      <div
        role="group"
        aria-label={summary}
        data-week-plot
        className="relative flex h-48 items-end gap-1 border-b-2 border-border sm:gap-2"
        style={{ overflow: "visible" }}
      >
        {/* Linhas-guia suaves (decorativas): meio e topo da área das barras. */}
        <div className="pointer-events-none absolute inset-x-0 top-[25%] border-t border-dashed border-border/60" aria-hidden="true" data-week-guide />
        <div className="pointer-events-none absolute inset-x-0 top-[62%] border-t border-dashed border-border/60" aria-hidden="true" data-week-guide />
        {activity.days.map((day, index) => {
          const isHovered = hoveredKey === day.key;
          const isSelected = selectedKey === day.key;
          const dimmed = selectedKey !== null && !isSelected;
          const isToday = todayKey === day.key;
          const edge = index <= 1 ? "left" : index >= last - 1 ? "right" : "center";
          return (
            <div
              key={day.key}
              data-week-day={day.key}
              className={`relative z-10 flex h-full min-w-0 flex-1 cursor-pointer select-none flex-col items-center justify-end gap-1.5 rounded-xl px-0.5 pb-0 outline-none transition-[background-color,opacity,box-shadow] duration-150 motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-blue-300 ${
                isSelected ? "bg-blue-50 ring-2 ring-blue-200" : isHovered ? "bg-muted/60" : isToday ? "bg-blue-50/50" : ""
              } ${dimmed ? "opacity-60" : ""}`}
              onMouseEnter={() => onHover(day.key)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(day.key)}
              onBlur={() => onHover(null)}
              onClick={() => onToggle(day.key)}
              onKeyDown={(event) => {
                if (isActivationKey(event.key)) {
                  event.preventDefault();
                  onToggle(day.key);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`${describeWeekDay(day)}${isSelected ? ", selecionado" : ""}`}
              aria-pressed={isSelected}
              data-today={isToday ? "true" : undefined}
              aria-current={isToday ? "date" : undefined}
            >
              {isHovered && <WeekTooltip day={day} edge={edge} />}

              <div className="flex w-full flex-1 items-end justify-center gap-1">
                {(["received", "completed"] as const).map((series, seriesIndex) => {
                  const value = day[series];
                  const height = mounted ? weekBarHeight(value, max, BAR_AREA_PX) : 0;
                  const tone = SERIES[series];
                  return (
                    <div key={series} className="flex min-w-0 flex-1 max-w-9 flex-col items-center justify-end gap-1">
                      <span
                        className={`text-[11px] font-bold leading-none transition-colors ${
                          isSelected ? tone.text : isHovered ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {value > 0 ? value : ""}
                      </span>
                      <div
                        data-series={series}
                        className={`w-full rounded-t-lg ${
                          value === 0 ? "bg-muted" : isSelected ? tone.barSelected : isHovered ? tone.barHover : tone.bar
                        }`}
                        style={{
                          height: value === 0 ? 3 : `${height}px`,
                          transition: `height 0.45s cubic-bezier(0.4,0,0.2,1) ${index * 35 + seriesIndex * 15}ms, background-color 0.15s`,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-1 sm:gap-2" aria-hidden="true" data-week-labels>
        {activity.days.map((day) => {
          const isToday = todayKey === day.key;
          const isSelected = selectedKey === day.key;
          const isHovered = hoveredKey === day.key;
          return (
            <span
              key={day.key}
              className={`min-w-0 flex-1 text-center text-xs leading-none transition-colors ${
                isSelected
                  ? "font-semibold text-blue-600"
                  : isToday
                    ? "font-semibold text-blue-600"
                    : isHovered
                      ? "text-foreground"
                      : "text-muted-foreground"
              }`}
            >
              {day.label}
              {isToday && <span className="mx-auto mt-1 block h-1 w-1 rounded-full bg-blue-500" data-today-dot />}
            </span>
          );
        })}
      </div>

      {!activity.hasActivity && (
        <p className="text-center text-xs text-muted-foreground">{DASHBOARD_WEEK_EMPTY_NOTE}</p>
      )}

      {selectedDay && (
        <div className="flex items-center justify-between gap-3 border-t border-border pt-3" data-week-detail>
          <p className="min-w-0 text-[12px] text-muted-foreground">
            <span className="font-semibold text-blue-600">{selectedDay.full}</span>
            {" · "}
            {formatReceivedCount(selectedDay.received)}
            {" · "}
            {formatCompletedCount(selectedDay.completed)}
          </p>
          <button
            type="button"
            onClick={() => onToggle(selectedDay.key)}
            className="shrink-0 text-[11px] text-muted-foreground underline transition-colors hover:text-foreground"
          >
            Limpar seleção
          </button>
        </div>
      )}
    </div>
  );
}

function WeekTooltip({ day, edge }: { day: WeekActivityDay; edge: "left" | "center" | "right" }) {
  const position =
    edge === "left" ? "left-0" : edge === "right" ? "right-0" : "left-1/2 -translate-x-1/2";
  const arrow = edge === "left" ? "ml-4" : edge === "right" ? "ml-auto mr-4" : "mx-auto";
  return (
    <div className={`pointer-events-none absolute bottom-full z-20 mb-2 ${position}`} role="tooltip" data-week-tooltip>
      <div className="whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-[11px] font-semibold leading-snug text-white shadow-xl">
        <p>{day.full}</p>
        <p className="flex items-center gap-1.5 font-medium">
          <span className={`inline-block size-2 rounded-sm ${SERIES.received.dot}`} aria-hidden="true" />
          {formatReceivedCount(day.received)}
        </p>
        <p className="flex items-center gap-1.5 font-medium">
          <span className={`inline-block size-2 rounded-sm ${SERIES.completed.dot}`} aria-hidden="true" />
          {formatCompletedCount(day.completed)}
        </p>
      </div>
      <div
        className={`h-0 w-0 ${arrow}`}
        style={{ borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #111827" }}
      />
    </div>
  );
}

// ─── Linha 4: Recém concluídas ───────────────────────────────────────────────

function scoreVariant(score: number | null) {
  if (score === null) return "info" as const;
  if (score >= 8) return "success" as const;
  if (score >= 7) return "info" as const;
  return "warning" as const;
}

export function EvaluatorRecentCompleted({
  state,
  onSeeHistory,
  onView,
  onRetry,
}: {
  state: EvaluatorHistoryState;
  onSeeHistory: () => void;
  onView: (interviewId: string) => void;
  onRetry?: () => void;
}) {
  const recent = state.status === "ready" ? selectRecentCompleted(state.items) : null;
  return (
    <section className="space-y-3" aria-label="Recém concluídas">
      <SectionHeader
        icon={History}
        title="Recém concluídas"
        iconClass="text-green-600"
        action={<LinkButton onClick={onSeeHistory}>Ver histórico</LinkButton>}
      />
      {state.status === "loading" && <LoadingBlock label="Carregando histórico..." />}
      {state.status === "error" && <ErrorBlock message={state.message} onRetry={onRetry} />}
      {recent && recent.length === 0 && (
        <EmptyState icon={History} title={DASHBOARD_NO_COMPLETED_MESSAGE} description="As avaliações que você concluir aparecerão aqui." className="p-8" />
      )}
      {recent && recent.length > 0 && (
        <>
          <div className={`${CARD_CLASS} hidden overflow-x-auto md:block`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Candidato</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Vaga</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Data</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Pontuação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recent.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-muted/30" data-recent-row={item.id}>
                    <td className="px-5 py-3 font-semibold text-foreground">
                      <button type="button" className="text-left hover:text-primary hover:underline" onClick={() => onView(item.id)}>
                        {item.candidate.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{[item.jobTitle, item.company].filter(Boolean).join(" · ")}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateTimePtBr(item.completedAt)}</td>
                    <td className="px-4 py-3"><Badge variant={scoreVariant(item.overallScore)}>{formatScore(item.overallScore)}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-2 md:hidden" aria-label="Avaliações concluídas recentemente">
            {recent.map((item) => (
              <li key={item.id} className={`${CARD_CLASS} p-3`} data-recent-card={item.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button type="button" className="break-words text-left font-bold text-foreground" onClick={() => onView(item.id)}>
                      {item.candidate.name}
                    </button>
                    <p className="break-words text-sm text-muted-foreground">{[item.jobTitle, item.company].filter(Boolean).join(" · ")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDateTimePtBr(item.completedAt)}</p>
                  </div>
                  <Badge variant={scoreVariant(item.overallScore)}>{formatScore(item.overallScore)}</Badge>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
