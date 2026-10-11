/**
 * Fluxo de conclusão da avaliação (Fase 5C.3) — controlador SEM React.
 *
 *   idle → confirming → submitting → done | error
 *
 *  - o primeiro clique só ABRE a confirmação (nenhum POST);
 *  - Cancelar volta a `idle` sem chamar a API;
 *  - confirmar chama o POST UMA vez; clique/confirmação durante o envio é ignorado;
 *  - sucesso: apaga a cópia local (userId + interviewId) e entrega o response;
 *  - falha (400/404/409/500/rede): NADA é apagado e o usuário segue na revisão;
 *  - `destroy()` silencia callbacks (sem setState após sair da tela).
 * Não envia corpo: o Back lê o rascunho do banco e decide a nota final.
 */

import { clearLocalDraftOnCompletion, type StorageLike } from "./evaluator-local-draft";

export type CompletionResult = {
  interviewId: string;
  overallScore: number | null;
  completedAt: string | null;
};

export type CompletionFailure = {
  reason: "not_found" | "forbidden" | "unauthorized" | "invalid" | "conflict" | "error";
  message: string;
};

export type CompletionPhase = "idle" | "confirming" | "submitting" | "done" | "error";

export type CompletionSnapshot = {
  phase: CompletionPhase;
  result: CompletionResult | null;
  error: CompletionFailure | null;
};

type CompleteFn = (
  interviewId: string,
) => Promise<
  | { ok: true; data: CompletionResult }
  | { ok: false; reason: CompletionFailure["reason"]; message: string }
>;

export class EvaluationCompletionFlow {
  private phase: CompletionPhase = "idle";
  private result: CompletionResult | null = null;
  private error: CompletionFailure | null = null;
  private destroyed = false;
  private submitting: Promise<void> | null = null;

  constructor(
    private readonly deps: {
      userId: string;
      interviewId: string;
      storage: StorageLike | null;
      complete: CompleteFn;
      // A revisão só oferece concluir com a avaliação completa.
      canComplete: () => boolean;
      onChange: (snapshot: CompletionSnapshot) => void;
    },
  ) {}

  getSnapshot(): CompletionSnapshot {
    return { phase: this.phase, result: this.result, error: this.error };
  }

  // Primeiro clique em "Concluir avaliação": abre a confirmação.
  requestConfirm() {
    if (this.destroyed || this.phase === "submitting" || this.phase === "done") return;
    if (!this.deps.canComplete()) return;
    this.phase = "confirming";
    this.error = null;
    this.emit();
  }

  cancel() {
    if (this.destroyed || this.phase !== "confirming") return;
    this.phase = "idle";
    this.emit();
  }

  confirm(): Promise<void> {
    // Sem confirmação aberta, ou já enviando/concluído: nenhum POST novo.
    if (this.destroyed || this.phase !== "confirming") return this.submitting ?? Promise.resolve();
    this.phase = "submitting";
    this.error = null;
    this.emit();

    this.submitting = (async () => {
      let outcome: Awaited<ReturnType<CompleteFn>>;
      try {
        outcome = await this.deps.complete(this.deps.interviewId);
      } catch {
        outcome = {
          ok: false,
          reason: "error",
          message: "Não foi possível concluir a avaliação. Tente novamente.",
        };
      }
      if (this.destroyed) return;

      if (outcome.ok) {
        // Só agora (backend confirmou) a cópia local deixa de existir.
        clearLocalDraftOnCompletion(this.deps.storage, this.deps.userId, this.deps.interviewId);
        this.phase = "done";
        this.result = outcome.data;
        this.error = null;
      } else {
        this.phase = "error";
        this.error = { reason: outcome.reason, message: outcome.message };
      }
      this.emit();
    })().finally(() => {
      this.submitting = null;
    });
    return this.submitting;
  }

  destroy() {
    this.destroyed = true;
  }

  private emit() {
    if (!this.destroyed) this.deps.onChange(this.getSnapshot());
  }
}
