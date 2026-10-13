/**
 * Proteção LOCAL contra perda acidental do que o avaliador já digitou (5C.2).
 *
 * NÃO é offline-first e NÃO é o rascunho oficial: o rascunho persistido
 * (backend, `PUT /evaluator/interviews/:id/evaluation`) continua sendo a única
 * fonte da verdade. Aqui fica só uma cópia temporária, por usuário + entrevista,
 * das notas e do comentário AINDA NÃO confirmados pelo servidor. É criada ao
 * digitar, restaurada ao reabrir a tela e apagada quando o PUT confirma (ou
 * quando a avaliação deixa de ser editável). Nunca guarda candidato, vaga,
 * perguntas, respostas, nota geral nem dados de sessão.
 *
 * O namespace é novo e independente de qualquer storage antigo de mocks.
 */

import {
  EVALUATION_CRITERIA,
  MAX_SUMMARY_LENGTH,
  isDirty,
  type EvaluationFormState,
} from "./evaluator-evaluation-form";

export const LOCAL_DRAFT_NAMESPACE = "rhconnect:evaluator-evaluation-draft:v1";

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

// Conteúdo gravado: SOMENTE os campos editáveis (texto como foi digitado).
export type LocalDraft = {
  version: 1;
  criteriaScores: Partial<Record<(typeof EVALUATION_CRITERIA)[number]["key"], string>>;
  summary: string;
};

export function localDraftKey(userId: string, interviewId: string): string {
  return `${LOCAL_DRAFT_NAMESPACE}:${userId}:${interviewId}`;
}

// Storage do navegador, ou null (SSR, modo privado, bloqueado). Nunca lança.
export function getBrowserStorage(): StorageLike | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function toLocalDraft(form: EvaluationFormState): LocalDraft {
  const criteriaScores: LocalDraft["criteriaScores"] = {};
  for (const criterion of EVALUATION_CRITERIA) {
    criteriaScores[criterion.key] = form.scores[criterion.key];
  }
  return { version: 1, criteriaScores, summary: form.summary };
}

export function writeLocalDraft(
  storage: StorageLike | null,
  userId: string,
  interviewId: string,
  form: EvaluationFormState,
): boolean {
  if (!storage || !userId || !interviewId) return false;
  try {
    storage.setItem(localDraftKey(userId, interviewId), JSON.stringify(toLocalDraft(form)));
    return true;
  } catch {
    return false;
  }
}

export function clearLocalDraft(
  storage: StorageLike | null,
  userId: string,
  interviewId: string,
): void {
  if (!storage || !userId || !interviewId) return;
  try {
    storage.removeItem(localDraftKey(userId, interviewId));
  } catch {
    /* proteção opcional: falha de storage nunca atrapalha a avaliação */
  }
}

// Lê e VALIDA o formato; conteúdo corrompido ou de outro formato é ignorado.
export function readLocalDraft(
  storage: StorageLike | null,
  userId: string,
  interviewId: string,
): LocalDraft | null {
  if (!storage || !userId || !interviewId) return null;
  try {
    const raw = storage.getItem(localDraftKey(userId, interviewId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== "object" || parsed.version !== 1) return null;
    if (typeof parsed.summary !== "string" || parsed.summary.length > MAX_SUMMARY_LENGTH * 4) return null;
    const scores = parsed.criteriaScores;
    if (!scores || typeof scores !== "object" || Array.isArray(scores)) return null;

    const criteriaScores: LocalDraft["criteriaScores"] = {};
    for (const criterion of EVALUATION_CRITERIA) {
      const value = (scores as Record<string, unknown>)[criterion.key];
      if (value === undefined) continue;
      if (typeof value !== "string" || value.length > 12) return null;
      criteriaScores[criterion.key] = value;
    }
    return { version: 1, criteriaScores, summary: parsed.summary };
  } catch {
    return null;
  }
}

// Aplica a cópia local POR CIMA do formulário vindo do servidor: só notas e
// comentário; nada da entrevista é tocado.
export function applyLocalDraft(
  serverForm: EvaluationFormState,
  local: LocalDraft,
): EvaluationFormState {
  const scores = { ...serverForm.scores };
  for (const criterion of EVALUATION_CRITERIA) {
    const value = local.criteriaScores[criterion.key];
    if (typeof value === "string") scores[criterion.key] = value;
  }
  return { scores, summary: local.summary };
}

// Restaura ao abrir: devolve o formulário a exibir e se algo local foi aplicado.
// Se a cópia local não difere do servidor, ela é descartada.
export function restoreForm(
  storage: StorageLike | null,
  userId: string,
  interviewId: string,
  serverForm: EvaluationFormState,
): { form: EvaluationFormState; restored: boolean } {
  const local = readLocalDraft(storage, userId, interviewId);
  if (!local) return { form: serverForm, restored: false };
  const merged = applyLocalDraft(serverForm, local);
  if (!isDirty(merged, serverForm)) {
    clearLocalDraft(storage, userId, interviewId);
    return { form: serverForm, restored: false };
  }
  return { form: merged, restored: true };
}

// Mantém a cópia local alinhada ao que foi digitado e ainda NÃO foi confirmado.
// Nunca chama o backend: o PUT acontece só no botão "Salvar rascunho".
export function syncLocalDraft(
  storage: StorageLike | null,
  userId: string,
  interviewId: string,
  form: EvaluationFormState,
  savedForm: EvaluationFormState,
): void {
  if (isDirty(form, savedForm)) writeLocalDraft(storage, userId, interviewId, form);
  else clearLocalDraft(storage, userId, interviewId);
}

// Gancho para a conclusão futura (ainda desligada): ao concluir, a cópia local
// daquela avaliação deve ser apagada em definitivo.
export function clearLocalDraftOnCompletion(
  storage: StorageLike | null,
  userId: string,
  interviewId: string,
): void {
  clearLocalDraft(storage, userId, interviewId);
}
