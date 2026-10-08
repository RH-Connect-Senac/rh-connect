/**
 * RH Connect — Agenda de Entrevistas do Candidato (conteúdo da tela)
 *
 * Entrevistas REAIS/EXTERNAS do candidato. Não confundir com as entrevistas
 * simuladas do RH Connect. O `AuthLayout` (cabeçalho/sidebar) é aplicado por
 * `App.tsx`, no mesmo padrão de `DevelopmentContent`.
 */

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { CalendarDays, ChevronDown, ChevronRight, Clock, Plus, X } from "lucide-react";
import { startOfDay } from "date-fns";
import { toast } from "sonner";
import { Button, buttonVariants } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { Card } from "./ui/card";
import { EmptyState } from "./ui/empty-state";
import { FilterChip } from "./ui/filter-chip";
import { cn } from "./ui/utils";
import { useExternalInterviews } from "./use-interview-agenda";
import {
  CancelInterviewAlert,
  InterviewDetailDialog,
  InterviewFeedbackDialog,
  InterviewFormDialog,
  InterviewPhaseBadge,
  ModalityIcon,
} from "./interview-agenda-dialogs";
import {
  MODALITY_LABEL,
  filterInterviews,
  formatInterviewDate,
  formatInterviewTime,
  getAwaitingFeedbackInterviews,
  getInterviewPhase,
  getInterviewsOnDay,
  getProximityLabel,
  type ExternalInterview,
  type ExternalInterviewFeedbackInput,
  type ExternalInterviewInput,
  type InterviewAgendaFilter,
} from "../domain/interview-agenda";

type FormState = { mode: "closed" } | { mode: "create" } | { mode: "edit"; interviewId: string };

const FILTERS: { value: InterviewAgendaFilter; label: string }[] = [
  { value: "UPCOMING", label: "Próximas" },
  { value: "PAST", label: "Anteriores" },
  { value: "ALL", label: "Todas" },
];

const EMPTY_FILTER_COPY: Record<InterviewAgendaFilter, string> = {
  UPCOMING: "Você não tem entrevistas futuras agendadas.",
  PAST: "Nenhuma entrevista anterior ou cancelada por aqui.",
  ALL: "Nenhuma entrevista agendada.",
};

// Layout fluido do calendário: células ocupam a largura do card, com alvo de
// toque de 40px+ (o padrão de `ui/calendar` usa 32px). Só apresentação.
const CALENDAR_CLASS_NAMES = {
  months: "flex flex-col",
  month: "flex w-full flex-col gap-3",
  table: "w-full border-collapse",
  head_row: "flex w-full",
  head_cell: "flex-1 py-1 text-center text-xs font-medium text-muted-foreground",
  row: "mt-1 flex w-full",
  cell: "relative flex-1 p-0 text-center text-sm focus-within:relative focus-within:z-20",
  day: cn(buttonVariants({ variant: "ghost" }), "h-10 w-full rounded-xl p-0 font-normal aria-selected:opacity-100 sm:h-11"),
};

// Indicador de dia com entrevista (ponto). Classes no botão do dia.
const CALENDAR_MODIFIER_CLASS_NAMES = {
  hasInterview:
    "relative after:absolute after:bottom-1.5 after:left-1/2 after:size-1.5 after:-translate-x-1/2 after:rounded-full after:bg-primary aria-selected:after:bg-white",
  hasCancelledOnly:
    "relative after:absolute after:bottom-1.5 after:left-1/2 after:size-1.5 after:-translate-x-1/2 after:rounded-full after:bg-muted-foreground/40 aria-selected:after:bg-white",
};

export function InterviewAgendaContent({
  candidateId,
  onNavigate,
}: {
  candidateId: string;
  onNavigate: (screen: string) => void;
}) {
  const { interviews, loading, loadError, now, create, update, cancel, submitFeedback } =
    useExternalInterviews(candidateId);
  const [searchParams, setSearchParams] = useSearchParams();

  const [filter, setFilter] = useState<InterviewAgendaFilter>("UPCOMING");
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined);
  const [month, setMonth] = useState<Date>(() => new Date());
  const [calendarOpen, setCalendarOpen] = useState(false); // só afeta < lg
  const [formState, setFormState] = useState<FormState>({ mode: "closed" });
  const [detailId, setDetailId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [feedbackId, setFeedbackId] = useState<string | null>(null);

  // Atalho vindo do Dashboard: /candidate/agenda?new=1 abre o cadastro direto.
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setFormState({ mode: "create" });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const byId = (id: string | null) => (id ? interviews.find((item) => item.id === id) ?? null : null);
  const detailInterview = byId(detailId);
  const cancelInterview = byId(cancelId);
  const feedbackInterview = byId(feedbackId);
  const editingInterview = formState.mode === "edit" ? byId(formState.interviewId) : null;

  const awaitingFeedback = useMemo(() => getAwaitingFeedbackInterviews(interviews, now), [interviews, now]);

  const visibleInterviews = useMemo(
    () => (selectedDay ? getInterviewsOnDay(interviews, selectedDay) : filterInterviews(interviews, filter, now)),
    [interviews, filter, now, selectedDay],
  );

  const calendarModifiers = useMemo(() => {
    const active = new Map<number, Date>();
    const cancelledOnly = new Map<number, Date>();
    for (const item of interviews) {
      const day = startOfDay(new Date(item.scheduledAt));
      if (item.status === "CANCELLED") {
        cancelledOnly.set(day.getTime(), day);
      } else {
        active.set(day.getTime(), day);
      }
    }
    for (const key of active.keys()) cancelledOnly.delete(key);
    return {
      hasInterview: [...active.values()],
      hasCancelledOnly: [...cancelledOnly.values()],
    };
  }, [interviews]);

  const openCreate = () => setFormState({ mode: "create" });
  const closeForm = () => setFormState({ mode: "closed" });

  const handleFormSubmit = async (input: ExternalInterviewInput) => {
    try {
      if (formState.mode === "edit") {
        await update(formState.interviewId, input);
        toast.success("Entrevista atualizada.");
      } else {
        await create(input);
        toast.success("Entrevista adicionada à agenda.");
      }
      closeForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a entrevista.");
    }
  };

  const handleCancelConfirm = async () => {
    if (!cancelId) return;
    try {
      await cancel(cancelId);
      toast.success("Entrevista cancelada. Ela continua no seu histórico.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível cancelar a entrevista.");
    } finally {
      setCancelId(null);
    }
  };

  const handleFeedbackSubmit = async (input: ExternalInterviewFeedbackInput) => {
    if (!feedbackId) return;
    await submitFeedback(feedbackId, input); // erro é tratado pelo próprio diálogo
  };

  const selectFilter = (value: InterviewAgendaFilter) => {
    setFilter(value);
    setSelectedDay(undefined);
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando agenda...</p>;
  }

  const hasNoInterviews = interviews.length === 0;
  const latestAwaiting = awaitingFeedback[0];

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Registre e acompanhe entrevistas de processos seletivos que acontecem fora do RH Connect.
        </p>
        <Button onClick={openCreate} className="min-h-11 w-full sm:min-h-0 sm:w-auto shrink-0">
          <Plus className="size-4" aria-hidden="true" /> Adicionar entrevista
        </Button>
      </div>

      {loadError && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {loadError}
        </p>
      )}

      {latestAwaiting && (
        <Card className="border-amber-200 bg-amber-50/60 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">E aí, como foi sua entrevista?</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {latestAwaiting.position} · {latestAwaiting.company}
                {awaitingFeedback.length > 1 && ` (+${awaitingFeedback.length - 1} aguardando feedback)`}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setFeedbackId(latestAwaiting.id)}
              className="min-h-11 w-full sm:min-h-0 sm:w-auto shrink-0"
            >
              Contar como foi
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(320px,380px)_1fr]">
        {/* Calendário */}
        <Card className="p-3 sm:p-4">
          <button
            type="button"
            onClick={() => setCalendarOpen((open) => !open)}
            aria-expanded={calendarOpen}
            aria-controls="agenda-calendar-panel"
            className="flex min-h-11 w-full items-center justify-between gap-2 px-1 text-left lg:hidden"
          >
            <span className="flex items-center gap-2 text-sm font-bold text-foreground">
              <CalendarDays className="size-4 text-muted-foreground" aria-hidden="true" /> Calendário
            </span>
            <ChevronDown
              className={cn("size-4 text-muted-foreground transition-transform", calendarOpen && "rotate-180")}
              aria-hidden="true"
            />
          </button>
          <p className="hidden items-center gap-2 px-1 pb-2 text-sm font-bold text-foreground lg:flex">
            <CalendarDays className="size-4 text-muted-foreground" aria-hidden="true" /> Calendário
          </p>

          <div id="agenda-calendar-panel" className={cn(calendarOpen ? "block" : "hidden", "lg:block")}>
            <Calendar
              mode="single"
              month={month}
              onMonthChange={setMonth}
              selected={selectedDay}
              onSelect={setSelectedDay}
              modifiers={calendarModifiers}
              modifiersClassNames={CALENDAR_MODIFIER_CLASS_NAMES}
              classNames={CALENDAR_CLASS_NAMES}
              className="p-1 sm:p-2"
            />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-2 pb-1 pt-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-primary" aria-hidden="true" /> Com entrevista
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-muted-foreground/40" aria-hidden="true" /> Somente cancelada
              </span>
            </div>
          </div>
        </Card>

        {/* Lista */}
        <section aria-label="Entrevistas" className="min-w-0 space-y-3">
          {selectedDay ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-foreground">Entrevistas de {formatInterviewDate(selectedDay)}</p>
              <Button variant="ghost" size="sm" onClick={() => setSelectedDay(undefined)} className="min-h-10 sm:min-h-0">
                <X className="size-3.5" aria-hidden="true" /> Limpar seleção
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar entrevistas">
              {FILTERS.map((item) => (
                <FilterChip
                  key={item.value}
                  selected={filter === item.value}
                  onClick={() => selectFilter(item.value)}
                  className="min-h-10 px-4 sm:min-h-0 sm:px-3"
                >
                  {item.label}
                </FilterChip>
              ))}
            </div>
          )}

          {hasNoInterviews ? (
            <EmptyState
              icon={CalendarDays}
              title="Nenhuma entrevista agendada"
              description="Adicione entrevistas de processos seletivos para organizar sua preparação."
              action={
                <Button onClick={openCreate} className="min-h-11 sm:min-h-0">
                  <Plus className="size-4" aria-hidden="true" /> Adicionar entrevista
                </Button>
              }
              className="p-8"
            />
          ) : visibleInterviews.length === 0 ? (
            <EmptyState
              className="p-8"
              title={
                <span className="text-sm font-normal text-muted-foreground">
                  {selectedDay ? "Nenhuma entrevista neste dia." : EMPTY_FILTER_COPY[filter]}
                </span>
              }
            />
          ) : (
            visibleInterviews.map((item) => (
              <InterviewListItem
                key={item.id}
                interview={item}
                now={now}
                onOpen={() => setDetailId(item.id)}
                onGiveFeedback={() => setFeedbackId(item.id)}
              />
            ))
          )}
        </section>
      </div>

      {formState.mode === "create" && (
        <InterviewFormDialog key="create" onClose={closeForm} onSubmit={handleFormSubmit} />
      )}
      {formState.mode === "edit" && editingInterview && (
        <InterviewFormDialog
          key={editingInterview.id}
          interview={editingInterview}
          onClose={closeForm}
          onSubmit={handleFormSubmit}
        />
      )}

      {detailInterview && !cancelInterview && formState.mode === "closed" && !feedbackInterview && (
        <InterviewDetailDialog
          interview={detailInterview}
          now={now}
          onClose={() => setDetailId(null)}
          onEdit={() => {
            setDetailId(null);
            setFormState({ mode: "edit", interviewId: detailInterview.id });
          }}
          onCancel={() => {
            setDetailId(null);
            setCancelId(detailInterview.id);
          }}
          onGiveFeedback={() => {
            setDetailId(null);
            setFeedbackId(detailInterview.id);
          }}
        />
      )}

      {cancelInterview && (
        <CancelInterviewAlert
          interview={cancelInterview}
          onClose={() => setCancelId(null)}
          onConfirm={handleCancelConfirm}
        />
      )}

      {feedbackInterview && (
        <InterviewFeedbackDialog
          key={feedbackInterview.id}
          interview={feedbackInterview}
          onClose={() => setFeedbackId(null)}
          onSubmit={handleFeedbackSubmit}
          onPracticeAgain={() => {
            setFeedbackId(null);
            onNavigate("interview-setup"); // reutiliza a navegação existente da entrevista simulada
          }}
        />
      )}
    </div>
  );
}

function InterviewListItem({
  interview,
  now,
  onOpen,
  onGiveFeedback,
}: {
  interview: ExternalInterview;
  now: Date;
  onOpen: () => void;
  onGiveFeedback: () => void;
}) {
  const phase = getInterviewPhase(interview, now);
  const cancelled = phase === "CANCELLED";

  return (
    <Card className={cn("p-4 transition-all hover:shadow-md sm:p-5", cancelled && "bg-muted/40")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={onOpen}
          className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-3 rounded-xl text-left outline-none focus-visible:ring-[4px] focus-visible:ring-[rgba(29,78,216,0.24)]"
        >
          <span className="min-w-0">
            <span className="mb-1 flex flex-wrap items-center gap-2">
              <span className={cn("text-sm font-bold text-foreground", cancelled && "text-muted-foreground line-through")}>
                {interview.position}
              </span>
              <InterviewPhaseBadge phase={phase} />
            </span>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              <span>{interview.company}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <ModalityIcon modality={interview.modality} className="size-3.5" />
                {MODALITY_LABEL[interview.modality]}
              </span>
            </span>
            <span className="mt-1 flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Clock className="size-3.5 text-muted-foreground" aria-hidden="true" />
              {formatInterviewDate(interview.scheduledAt)} • {formatInterviewTime(interview.scheduledAt)}
              {phase === "UPCOMING" && (
                <span className="text-muted-foreground">· {getProximityLabel(interview.scheduledAt, now)}</span>
              )}
            </span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>

        {phase === "AWAITING_FEEDBACK" && (
          <Button size="sm" onClick={onGiveFeedback} className="min-h-11 w-full shrink-0 sm:min-h-0 sm:w-auto">
            Contar como foi
          </Button>
        )}
      </div>
    </Card>
  );
}
