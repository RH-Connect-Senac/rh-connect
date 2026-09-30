/**
 * RH Connect — Serviço da Agenda de Entrevistas do Candidato
 *
 * PERSISTÊNCIA LOCAL TEMPORÁRIA (localStorage). Não existe backend da Agenda:
 * os dados vivem apenas no navegador do candidato e NÃO representam uma
 * integração real. Toda a persistência fica isolada neste módulo; as funções
 * são assíncronas de propósito, para que a implementação possa ser trocada por
 * chamadas de API sem alterar hooks e componentes.
 */

import {
  INTERVIEW_AGENDA_SCHEMA_VERSION,
  INTERVIEW_AGENDA_STORAGE_KEY,
  FUTURE_DATE_TIME_MESSAGE,
  canModifyInterview,
  isAwaitingFeedback,
  isFutureDateTime,
  type ExternalInterview,
  type ExternalInterviewFeedbackInput,
  type ExternalInterviewInput,
  type ExternalInterviewModality,
  type ExternalInterviewStatus,
  type InterviewAgendaStorageState,
} from "../domain/interview-agenda";

const VALID_STATUS: ExternalInterviewStatus[] = ["SCHEDULED", "COMPLETED", "CANCELLED"];
const VALID_MODALITY: ExternalInterviewModality[] = ["ONLINE", "IN_PERSON"];

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function createEmptyStorage(): InterviewAgendaStorageState {
  return { schemaVersion: INTERVIEW_AGENDA_SCHEMA_VERSION, byCandidate: {} };
}

function createId() {
  return `agenda-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isValidInterview(value: unknown): value is ExternalInterview {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ExternalInterview>;
  return (
    typeof item.id === "string" &&
    typeof item.candidateId === "string" &&
    typeof item.company === "string" &&
    typeof item.position === "string" &&
    typeof item.scheduledAt === "string" &&
    !Number.isNaN(new Date(item.scheduledAt).getTime()) &&
    VALID_MODALITY.includes(item.modality as ExternalInterviewModality) &&
    VALID_STATUS.includes(item.status as ExternalInterviewStatus) &&
    typeof item.createdAt === "string" &&
    typeof item.updatedAt === "string"
  );
}

function readStorage(): InterviewAgendaStorageState {
  if (!canUseStorage()) return createEmptyStorage();

  try {
    const raw = window.localStorage.getItem(INTERVIEW_AGENDA_STORAGE_KEY);
    if (!raw) return createEmptyStorage();

    const parsed = JSON.parse(raw) as Partial<InterviewAgendaStorageState> | null;
    if (
      !parsed ||
      parsed.schemaVersion !== INTERVIEW_AGENDA_SCHEMA_VERSION ||
      !parsed.byCandidate ||
      typeof parsed.byCandidate !== "object" ||
      Array.isArray(parsed.byCandidate)
    ) {
      return createEmptyStorage();
    }

    const byCandidate: Record<string, ExternalInterview[]> = {};
    for (const [candidateId, list] of Object.entries(parsed.byCandidate)) {
      byCandidate[candidateId] = Array.isArray(list) ? list.filter(isValidInterview) : [];
    }
    return { schemaVersion: INTERVIEW_AGENDA_SCHEMA_VERSION, byCandidate };
  } catch {
    // Dado local inválido não deve quebrar a tela; a próxima escrita o substitui.
    return createEmptyStorage();
  }
}

function writeStorage(storage: InterviewAgendaStorageState) {
  if (!canUseStorage()) throw new Error("Armazenamento local indisponível neste navegador.");
  try {
    window.localStorage.setItem(INTERVIEW_AGENDA_STORAGE_KEY, JSON.stringify(storage));
  } catch {
    throw new Error("Não foi possível salvar a entrevista neste navegador.");
  }
}

// Leitura fresca a cada escrita: nunca sobrescreve dados de outro candidateId.
function mutateCandidate(candidateId: string, updater: (list: ExternalInterview[]) => ExternalInterview[]) {
  const storage = readStorage();
  const nextList = updater(storage.byCandidate[candidateId] ?? []);
  writeStorage({
    schemaVersion: INTERVIEW_AGENDA_SCHEMA_VERSION,
    byCandidate: { ...storage.byCandidate, [candidateId]: nextList },
  });
  return nextList;
}

// Regras temporais reutilizam os helpers do domínio (fase derivada, não só o status).
function requireModifiable(interview: ExternalInterview, now: Date, action: "editada" | "cancelada") {
  if (canModifyInterview(interview, now)) return;
  throw new Error(
    interview.status === "SCHEDULED"
      ? `Esta entrevista já aconteceu e não pode mais ser ${action}. Registre como foi.`
      : `Apenas entrevistas futuras agendadas podem ser ${action === "editada" ? "editadas" : "canceladas"}.`,
  );
}

function requireFutureSchedule(scheduledAt: string, now: Date) {
  if (!isFutureDateTime(scheduledAt, now)) throw new Error(FUTURE_DATE_TIME_MESSAGE);
}

function requireInterview(list: ExternalInterview[], interviewId: string) {
  const found = list.find((item) => item.id === interviewId);
  if (!found) throw new Error("Entrevista não encontrada.");
  return found;
}

export async function listExternalInterviews(candidateId: string): Promise<ExternalInterview[]> {
  return readStorage().byCandidate[candidateId] ?? [];
}

/** O candidato já cadastrou alguma entrevista? (canceladas contam: nada é apagado.) */
export async function hasUsedInterviewAgenda(candidateId: string): Promise<boolean> {
  return (readStorage().byCandidate[candidateId] ?? []).length > 0;
}

export async function createExternalInterview(
  candidateId: string,
  input: ExternalInterviewInput,
): Promise<ExternalInterview> {
  requireFutureSchedule(input.scheduledAt, new Date());
  const now = new Date().toISOString();
  const created: ExternalInterview = {
    id: createId(),
    candidateId,
    ...input,
    status: "SCHEDULED",
    createdAt: now,
    updatedAt: now,
  };
  mutateCandidate(candidateId, (list) => [...list, created]);
  return created;
}

/** Edição/reagendamento: só entrevistas futuras (fase UPCOMING), para um novo horário futuro. Sem histórico na V1. */
export async function updateExternalInterview(
  candidateId: string,
  interviewId: string,
  input: ExternalInterviewInput,
): Promise<ExternalInterview> {
  let updated: ExternalInterview | null = null;
  mutateCandidate(candidateId, (list) => {
    const current = requireInterview(list, interviewId);
    const now = new Date();
    requireModifiable(current, now, "editada");
    requireFutureSchedule(input.scheduledAt, now);
    updated = { ...current, ...input, updatedAt: new Date().toISOString() };
    return list.map((item) => (item.id === interviewId ? (updated as ExternalInterview) : item));
  });
  return updated as unknown as ExternalInterview;
}

/** Cancelar NÃO apaga o registro: muda o status para CANCELLED. Só entrevistas futuras (fase UPCOMING). */
export async function cancelExternalInterview(candidateId: string, interviewId: string): Promise<ExternalInterview> {
  let updated: ExternalInterview | null = null;
  mutateCandidate(candidateId, (list) => {
    const current = requireInterview(list, interviewId);
    requireModifiable(current, new Date(), "cancelada");
    const now = new Date().toISOString();
    updated = { ...current, status: "CANCELLED", cancelledAt: now, updatedAt: now };
    return list.map((item) => (item.id === interviewId ? (updated as ExternalInterview) : item));
  });
  return updated as unknown as ExternalInterview;
}

/** Só aceita feedback de entrevista SCHEDULED cujo horário já passou; então vira COMPLETED. */
export async function submitExternalInterviewFeedback(
  candidateId: string,
  interviewId: string,
  input: ExternalInterviewFeedbackInput,
): Promise<ExternalInterview> {
  let updated: ExternalInterview | null = null;
  mutateCandidate(candidateId, (list) => {
    const current = requireInterview(list, interviewId);
    if (!isAwaitingFeedback(current, new Date())) {
      throw new Error("Esta entrevista ainda não está aguardando feedback.");
    }
    const now = new Date().toISOString();
    const comment = input.comment?.trim();
    updated = {
      ...current,
      status: "COMPLETED",
      feedback: { feeling: input.feeling, comment: comment || undefined, submittedAt: now },
      updatedAt: now,
    };
    return list.map((item) => (item.id === interviewId ? (updated as ExternalInterview) : item));
  });
  return updated as unknown as ExternalInterview;
}
