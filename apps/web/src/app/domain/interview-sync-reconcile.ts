import type { RemoteDraft } from "./interview-answer-autosave";

/**
 * Reconciliação do polling (parte pura): compara o que o Back diz agora com o que este
 * dispositivo conhece (resposta oficial + rascunho do Back + versão). Só decide O QUE mudou;
 * quem aplica (e protege a edição local) é o wizard / `AnswerDraftAutosave.receiveRemote`.
 * Uma única semântica: as mesmas peças de F5/retomada/optimistic locking.
 */

export type ServerQuestionState = {
  id: string;
  answer: string | null;
  draftText: string | null;
  draftUpdatedAt: string | null;
  draftVersion: number;
};

export type KnownQuestionState = {
  answer: string;
  draft: RemoteDraft;
};

export type QuestionSyncChange = {
  id: string;
  answer: string;
  answerChanged: boolean;
  draft: RemoteDraft;
  draftChanged: boolean;
};

const norm = (value: string | null | undefined) => (value ?? "").replace(/\r\n?/g, "\n");

export function diffQuestionState(known: KnownQuestionState, server: ServerQuestionState): QuestionSyncChange | null {
  const answer = server.answer ?? "";
  const draft: RemoteDraft = { text: server.draftText, version: server.draftVersion, updatedAt: server.draftUpdatedAt };
  const answerChanged = answer !== known.answer;
  // Versão MENOR que a conhecida = leitura velha (nosso próprio save chegou depois da requisição):
  // nunca retrocede. Mesma versão com texto diferente também é mudança.
  const draftChanged =
    draft.version > known.draft.version ||
    (draft.version === known.draft.version && norm(draft.text) !== norm(known.draft.text));
  if (!answerChanged && !draftChanged) return null;
  return { id: server.id, answer, answerChanged, draft, draftChanged };
}

export function diffServerState(
  server: ServerQuestionState[],
  known: (questionId: string) => KnownQuestionState,
): QuestionSyncChange[] {
  return server.flatMap((item) => {
    const change = diffQuestionState(known(item.id), item);
    return change ? [change] : [];
  });
}
