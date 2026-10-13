/**
 * Confirmação da RESPOSTA OFICIAL (Próxima / Anterior / número / Revisar).
 *
 * Única ação que muda `answer_text` no Back. Antes dela o autosave de rascunho
 * é "quietado" (debounce cancelado, PUT de draft em andamento concluído), para
 * que o PUT de draft e o PUT oficial nunca concorram. Falha NÃO navega e
 * devolve o autosave ao normal (rascunho local e do Back continuam intactos).
 * Sucesso limpa o rascunho (o Back o limpa no mesmo UPDATE atômico).
 *
 * Texto igual à resposta oficial só dispensa o PUT quando NÃO há rascunho no
 * Back. Havendo, o PUT oficial é feito mesmo assim: ele mantém a resposta e
 * limpa o rascunho atomicamente (sem uma segunda chamada de limpeza que
 * poderia falhar e deixar o rascunho antigo reaparecer).
 *
 * Controle otimista: o PUT oficial leva a versão do rascunho que este dispositivo
 * conhece. Versão antiga => 409 com o estado vigente:
 *  - reenvio equivalente (resposta vigente == texto confirmado e sem rascunho:
 *    a primeira tentativa foi aplicada, só a resposta HTTP se perdeu) vale como
 *    SUCESSO;
 *  - qualquer outra coisa é CONFLITO REAL: nada é sobrescrito, o texto local
 *    fica e o usuário decide (nunca last-write-wins silencioso).
 */

import { normalizeInterviewAnswer } from "../services/interview-ux-state";
import type { AnswerDraftAutosave, OfficialConflictState } from "./interview-answer-autosave";

type AutosaveLike = Pick<
  AnswerDraftAutosave,
  "quiesce" | "resume" | "confirmed" | "hasRemoteDraft" | "getRemote" | "officialConflict" | "lock"
>;

export type OfficialSaveResult =
  | { ok: true; data: { answer: string | null; draftVersion: number } }
  | { ok: false; reason: "conflict"; message: string; conflict: OfficialConflictState }
  | { ok: false; reason: "not_in_progress"; message: string; interviewStatus?: string }
  | { ok: false; reason?: "error"; message: string };

export type ConfirmOutcome =
  | { ok: true; answer: string; changed: boolean; draftVersion: number | null }
  | { ok: false; reason: "error"; message: string }
  | { ok: false; reason: "conflict"; message: string; conflict: OfficialConflictState }
  | { ok: false; reason: "not_in_progress"; message: string; interviewStatus?: string };

export async function confirmOfficialAnswer(input: {
  value: string;
  /** Última resposta oficial conhecida ("" se nenhuma). */
  persisted: string;
  controller: AutosaveLike | null;
  /** Usado só sem controlador: a pergunta tem rascunho conhecido no Back? */
  hasRemoteDraft?: () => boolean;
  /** Versão do rascunho conhecida SEM controlador (com controlador, vale a dele). */
  knownVersion?: () => number;
  saveAnswer: (answer: string, draftVersion: number) => Promise<OfficialSaveResult>;
  clearLocalDraft: () => void;
}): Promise<ConfirmOutcome> {
  const { controller } = input;
  await controller?.quiesce();

  const normalized = normalizeInterviewAnswer(input.value).trim();

  // Avaliado DEPOIS do quiesce: um PUT de rascunho em andamento já terminou.
  const hasRemoteDraft = controller ? controller.hasRemoteDraft() : (input.hasRemoteDraft?.() ?? false);

  if (normalized === input.persisted && !hasRemoteDraft) {
    // Sem diferença na resposta oficial e sem rascunho no Back: nada a enviar.
    input.clearLocalDraft();
    return { ok: true, answer: input.persisted, changed: false, draftVersion: null };
  }

  // Avaliada DEPOIS do quiesce: a versão reflete o último PUT de rascunho concluído.
  const draftVersion = controller ? controller.getRemote().version : (input.knownVersion?.() ?? 0);
  const result = await input.saveAnswer(normalized, draftVersion);
  if (!result.ok) {
    if (result.reason === "conflict") {
      const { conflict } = result;
      const sameAnswer = normalizeInterviewAnswer(conflict.answer ?? "").trim() === normalized;
      const noRemoteDraft = (conflict.draftText ?? "").trim() === "";
      if (sameAnswer && noRemoteDraft) {
        // Reenvio após timeout: a confirmação anterior já foi aplicada.
        const answer = conflict.answer ?? "";
        controller?.confirmed({ official: answer, draftVersion: conflict.draftVersion });
        return {
          ok: true,
          answer,
          changed: normalized !== input.persisted,
          draftVersion: conflict.draftVersion,
        };
      }
      controller?.officialConflict(conflict, result.message);
      return { ok: false, reason: "conflict", message: result.message, conflict };
    }
    if (result.reason === "not_in_progress") {
      controller?.lock();
      return {
        ok: false,
        reason: "not_in_progress",
        message: result.message,
        ...(result.interviewStatus ? { interviewStatus: result.interviewStatus } : {}),
      };
    }
    controller?.resume();
    return { ok: false, reason: "error", message: result.message };
  }

  const answer = result.data.answer ?? "";
  controller?.confirmed({ official: answer, draftVersion: result.data.draftVersion });
  return {
    ok: true,
    answer,
    changed: normalized !== input.persisted,
    draftVersion: result.data.draftVersion,
  };
}

/** Resposta oficial → mapa usado pelo painel/contador (vazia sai do mapa). */
export function withOfficialAnswer(
  answers: Record<string, string>,
  questionId: string,
  answer: string,
): Record<string, string> {
  const next = { ...answers };
  if (answer.trim()) next[questionId] = answer;
  else delete next[questionId];
  return next;
}
