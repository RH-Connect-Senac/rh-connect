/**
 * RH Connect — Agenda de Entrevistas do Candidato (domínio)
 *
 * Representa entrevistas REAIS/EXTERNAS do candidato em processos seletivos.
 * NÃO tem relação com as entrevistas simuladas do RH Connect
 * (`domain/interviews.ts`) — por isso os tipos usam o prefixo `External`.
 *
 * Este módulo contém apenas tipos e regras puras (sem React, sem storage).
 * A persistência (temporária, localStorage) fica em
 * `services/interview-agenda-service.ts`.
 */

import { differenceInCalendarDays, format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Persistência temporária (localStorage) ──────────────────────────────────

// Chave própria e versionada. NÃO reutilizar `rhconnect:interviews:v1`, que
// pertence às entrevistas simuladas.
export const INTERVIEW_AGENDA_STORAGE_KEY = "rhconnect:interview-agenda:v1";
export const INTERVIEW_AGENDA_SCHEMA_VERSION = 1;

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** Status PERSISTIDOS. "Aguardando feedback" é DERIVADO (ver `getInterviewPhase`). */
export type ExternalInterviewStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";

export type ExternalInterviewModality = "ONLINE" | "IN_PERSON";

export type ExternalInterviewFeeling = "DIFFICULT" | "FAIR" | "GOOD" | "VERY_GOOD";

export type ExternalInterviewFeedback = {
  feeling: ExternalInterviewFeeling;
  comment?: string;
  submittedAt: string;
};

export type ExternalInterview = {
  id: string;
  candidateId: string;
  company: string;
  position: string;
  /** Instante ISO (UTC) construído a partir de data + horário LOCAIS do navegador. */
  scheduledAt: string;
  modality: ExternalInterviewModality;
  locationOrLink?: string;
  notes?: string;
  status: ExternalInterviewStatus;
  feedback?: ExternalInterviewFeedback;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
};

/** Dados editáveis pelo candidato (cadastro e edição/reagendamento). */
export type ExternalInterviewInput = {
  company: string;
  position: string;
  scheduledAt: string;
  modality: ExternalInterviewModality;
  locationOrLink?: string;
  notes?: string;
};

export type ExternalInterviewFeedbackInput = {
  feeling: ExternalInterviewFeeling;
  comment?: string;
};

export type InterviewAgendaStorageState = {
  schemaVersion: number;
  byCandidate: Record<string, ExternalInterview[]>;
};

/** Fase exibida na interface: mistura status persistido + tempo. */
export type ExternalInterviewPhase = "UPCOMING" | "AWAITING_FEEDBACK" | "COMPLETED" | "CANCELLED";

export type InterviewAgendaFilter = "UPCOMING" | "PAST" | "ALL";

// ─── Rótulos ──────────────────────────────────────────────────────────────────

export const MODALITY_LABEL: Record<ExternalInterviewModality, string> = {
  ONLINE: "Online",
  IN_PERSON: "Presencial",
};

export const FEELING_OPTIONS: { value: ExternalInterviewFeeling; label: string; emoji: string }[] = [
  { value: "DIFFICULT", label: "Difícil", emoji: "😟" },
  { value: "FAIR", label: "Razoável", emoji: "😐" },
  { value: "GOOD", label: "Boa", emoji: "🙂" },
  { value: "VERY_GOOD", label: "Muito boa", emoji: "😄" },
];

export const FIELD_LIMITS = {
  company: 150,
  position: 150,
  locationOrLink: 300,
  notes: 1000,
  feedbackComment: 500,
} as const;

// ─── Data e hora (sempre no horário LOCAL do navegador) ──────────────────────

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/**
 * Combina "YYYY-MM-DD" + "HH:mm" (valores dos inputs nativos) em um Date LOCAL.
 * Não usa `new Date("YYYY-MM-DD")`, que é interpretado em UTC e desloca o dia.
 */
export function parseLocalDateTime(date: string, time: string): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dateMatch || !timeMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);

  const result = new Date(year, month - 1, day, hours, minutes, 0, 0);
  const isSameLocalMoment =
    result.getFullYear() === year &&
    result.getMonth() === month - 1 &&
    result.getDate() === day &&
    result.getHours() === hours &&
    result.getMinutes() === minutes;

  return isSameLocalMoment ? result : null;
}

/** Valor "YYYY-MM-DD" para `<input type="date">`, no horário local. */
export function toDateInputValue(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Valor "HH:mm" para `<input type="time">`, no horário local. */
export function toTimeInputValue(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatInterviewDate(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

export function formatInterviewTime(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return format(date, "HH:mm");
}

export function formatInterviewDateTime(value: Date | string) {
  return `${formatInterviewDate(value)} • ${formatInterviewTime(value)}`;
}

/** "Hoje", "Amanhã" ou "Faltam N dias" (contagem por dia do calendário). */
export function getProximityLabel(scheduledAt: string, now: Date) {
  const days = differenceInCalendarDays(new Date(scheduledAt), now);
  if (days <= 0) return "Hoje";
  if (days === 1) return "Amanhã";
  return `Faltam ${days} dias`;
}

// ─── Regras de estado (DATA + HORÁRIO) ────────────────────────────────────────

/** SCHEDULED + data/horário já passaram = realizada, aguardando feedback. */
export function isAwaitingFeedback(interview: ExternalInterview, now: Date) {
  return interview.status === "SCHEDULED" && new Date(interview.scheduledAt).getTime() < now.getTime();
}

export function getInterviewPhase(interview: ExternalInterview, now: Date): ExternalInterviewPhase {
  if (interview.status === "CANCELLED") return "CANCELLED";
  if (interview.status === "COMPLETED") return "COMPLETED";
  return isAwaitingFeedback(interview, now) ? "AWAITING_FEEDBACK" : "UPCOMING";
}

export const FUTURE_DATE_TIME_MESSAGE = "Escolha uma data e um horário futuros.";

/** Data + horário estritamente posteriores a `now` (comparação por instante, não só pelo dia). */
export function isFutureDateTime(value: Date | string, now: Date) {
  return new Date(value).getTime() > now.getTime();
}

/**
 * Editar, reagendar e cancelar só são permitidos na fase UPCOMING. Uma entrevista
 * SCHEDULED cujo horário já passou (AWAITING_FEEDBACK) só aceita feedback.
 */
export function canModifyInterview(interview: ExternalInterview, now: Date) {
  return getInterviewPhase(interview, now) === "UPCOMING";
}

function byScheduledAtAsc(a: ExternalInterview, b: ExternalInterview) {
  return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
}

function byScheduledAtDesc(a: ExternalInterview, b: ExternalInterview) {
  return byScheduledAtAsc(b, a);
}

export function getUpcomingInterviews(interviews: ExternalInterview[], now: Date) {
  return interviews.filter((item) => getInterviewPhase(item, now) === "UPCOMING").sort(byScheduledAtAsc);
}

/** Entrevista futura mais próxima (a única exibida no Dashboard). */
export function getNextUpcomingInterview(interviews: ExternalInterview[], now: Date) {
  return getUpcomingInterviews(interviews, now)[0] ?? null;
}

export function getAwaitingFeedbackInterviews(interviews: ExternalInterview[], now: Date) {
  return interviews.filter((item) => getInterviewPhase(item, now) === "AWAITING_FEEDBACK").sort(byScheduledAtDesc);
}

/**
 * Próximas = agendadas futuras (mais próxima primeiro).
 * Anteriores = tudo que não é futuro: aguardando feedback, concluídas e
 * canceladas (mais recente primeiro) — cancelamento nunca apaga o registro.
 */
export function filterInterviews(interviews: ExternalInterview[], filter: InterviewAgendaFilter, now: Date) {
  const upcoming = getUpcomingInterviews(interviews, now);
  const past = interviews.filter((item) => getInterviewPhase(item, now) !== "UPCOMING").sort(byScheduledAtDesc);

  if (filter === "UPCOMING") return upcoming;
  if (filter === "PAST") return past;
  return [...upcoming, ...past];
}

export function getInterviewsOnDay(interviews: ExternalInterview[], day: Date) {
  return interviews.filter((item) => isSameDay(new Date(item.scheduledAt), day)).sort(byScheduledAtAsc);
}

// ─── Validação do formulário ──────────────────────────────────────────────────

export type ExternalInterviewFormValues = {
  company: string;
  position: string;
  date: string;
  time: string;
  modality: ExternalInterviewModality | "";
  locationOrLink: string;
  notes: string;
};

export type ExternalInterviewFormErrors = Partial<Record<keyof ExternalInterviewFormValues, string>>;

export function createEmptyFormValues(): ExternalInterviewFormValues {
  return { company: "", position: "", date: "", time: "", modality: "", locationOrLink: "", notes: "" };
}

export function toFormValues(interview: ExternalInterview): ExternalInterviewFormValues {
  return {
    company: interview.company,
    position: interview.position,
    date: toDateInputValue(interview.scheduledAt),
    time: toTimeInputValue(interview.scheduledAt),
    modality: interview.modality,
    locationOrLink: interview.locationOrLink ?? "",
    notes: interview.notes ?? "",
  };
}

export function buildInterviewInput(
  values: ExternalInterviewFormValues,
  now: Date,
): { ok: true; input: ExternalInterviewInput } | { ok: false; errors: ExternalInterviewFormErrors } {
  const errors: ExternalInterviewFormErrors = {};
  const company = values.company.trim();
  const position = values.position.trim();
  const locationOrLink = values.locationOrLink.trim();
  const notes = values.notes.trim();

  if (!company) errors.company = "Informe a empresa.";
  else if (company.length > FIELD_LIMITS.company) errors.company = `Use até ${FIELD_LIMITS.company} caracteres.`;

  if (!position) errors.position = "Informe a vaga ou o cargo.";
  else if (position.length > FIELD_LIMITS.position) errors.position = `Use até ${FIELD_LIMITS.position} caracteres.`;

  if (!values.date) errors.date = "Informe a data.";
  if (!values.time) errors.time = "Informe o horário.";

  const scheduled = values.date && values.time ? parseLocalDateTime(values.date, values.time) : null;
  if (values.date && values.time && !scheduled) {
    errors.date = "Data ou horário inválido.";
  }

  // Cadastro e reagendamento: data + horário estritamente futuros (horário local).
  if (scheduled && !isFutureDateTime(scheduled, now)) {
    const isToday = values.date === toDateInputValue(now);
    errors[isToday ? "time" : "date"] = FUTURE_DATE_TIME_MESSAGE;
  }

  if (!values.modality) errors.modality = "Selecione a modalidade.";

  if (locationOrLink.length > FIELD_LIMITS.locationOrLink) {
    errors.locationOrLink = `Use até ${FIELD_LIMITS.locationOrLink} caracteres.`;
  }
  if (notes.length > FIELD_LIMITS.notes) {
    errors.notes = `Use até ${FIELD_LIMITS.notes} caracteres.`;
  }

  if (Object.keys(errors).length > 0 || !scheduled || !values.modality) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    input: {
      company,
      position,
      scheduledAt: scheduled.toISOString(),
      modality: values.modality,
      locationOrLink: locationOrLink || undefined,
      notes: notes || undefined,
    },
  };
}
