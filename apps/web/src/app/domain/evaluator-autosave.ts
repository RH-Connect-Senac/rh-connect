/**
 * Autosave do rascunho da avaliação (Fase 5C.2) — controlador SEM React.
 *
 * Estratégia híbrida:
 *   alteração → cópia local imediata → debounce (~2s) → PUT real do DRAFT.
 * O backend continua sendo a fonte da verdade; a cópia local
 * (`evaluator-local-draft.ts`) é só proteção temporária.
 *
 * Garantias (cobertas por testes):
 *  - nunca há PUT por tecla: cada alteração só reinicia o timer;
 *  - no máximo UMA gravação em andamento; alteração/clique durante o PUT vira
 *    um novo save DEPOIS, da versão mais recente;
 *  - a resposta de um save antigo nunca sobrescreve o que foi digitado depois
 *    (versão por alteração) e só apaga a cópia local se o estado atual for
 *    igual ao confirmado pelo servidor;
 *  - valor inválido não vai ao backend (a cópia local fica);
 *  - falha NÃO apaga nada e NÃO faz retry em loop: nova alteração ou o botão
 *    "Salvar rascunho" tentam de novo;
 *  - `destroy()` cancela o timer e silencia qualquer callback posterior.
 */

import {
  isDirty,
  runSaveDraft,
  validateForm,
  type CriteriaScores,
  type DraftPayload,
  type EvaluationDraft,
  type EvaluationFormState,
} from "./evaluator-evaluation-form";
import {
  syncLocalDraft,
  writeLocalDraft,
  type StorageLike,
} from "./evaluator-local-draft";

export const AUTOSAVE_DELAY_MS = 2000;
export const MANUAL_INVALID_MESSAGE = "Corrija os campos destacados antes de salvar.";
const GENERIC_SAVE_ERROR = "Não foi possível salvar o rascunho. Tente novamente.";

export type AutosaveStatus = "clean" | "dirty" | "invalid" | "saving" | "saved" | "failed";
export type SaveKind = "auto" | "manual";

export type AutosaveSnapshot = {
  form: EvaluationFormState;
  serverForm: EvaluationFormState;
  draft: EvaluationDraft;
  persisted: CriteriaScores;
  status: AutosaveStatus;
  // Origem do último resultado de save (null após uma nova alteração).
  lastSave: SaveKind | null;
  message: string | null;
  saving: boolean;
};

export type Scheduler = {
  set: (callback: () => void, ms: number) => unknown;
  clear: (handle: unknown) => void;
};

type SaveFn = (
  interviewId: string,
  payload: DraftPayload,
) => Promise<{ ok: true; data: EvaluationDraft } | { ok: false; message: string }>;

const defaultScheduler: Scheduler = {
  set: (callback, ms) => setTimeout(callback, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export class EvaluationAutosave {
  private form!: EvaluationFormState;
  private serverForm!: EvaluationFormState;
  private draft!: EvaluationDraft;
  private persisted: CriteriaScores = {};
  private status: AutosaveStatus = "clean";
  private lastSave: SaveKind | null = null;
  private message: string | null = null;

  private version = 0;
  private inFlight = false;
  private rerun: SaveKind | null = null;
  private timer: unknown = null;
  private destroyed = false;
  private pending: Promise<void> | null = null;
  private readonly delayMs: number;
  private readonly scheduler: Scheduler;

  constructor(
    private readonly deps: {
      userId: string;
      interviewId: string;
      storage: StorageLike | null;
      save: SaveFn;
      onChange: (snapshot: AutosaveSnapshot) => void;
      delayMs?: number;
      scheduler?: Scheduler;
    },
  ) {
    this.delayMs = deps.delayMs ?? AUTOSAVE_DELAY_MS;
    this.scheduler = deps.scheduler ?? defaultScheduler;
  }

  // Estado inicial: rascunho do SERVIDOR + (opcional) cópia local recuperada
  // por cima. Se houver diferença real e for válida, agenda o autosave.
  load(draft: EvaluationDraft, initialForm: EvaluationFormState, serverForm: EvaluationFormState) {
    if (this.destroyed) return;
    this.draft = draft;
    this.persisted = draft.criteriaScores;
    this.serverForm = serverForm;
    this.form = initialForm;
    this.version += 1;
    this.lastSave = null;
    this.message = null;
    this.refreshIdleStatus();
    this.scheduleIfNeeded();
    this.emit();
  }

  getSnapshot(): AutosaveSnapshot {
    return {
      form: this.form,
      serverForm: this.serverForm,
      draft: this.draft,
      persisted: this.persisted,
      status: this.status,
      lastSave: this.lastSave,
      message: this.message,
      saving: this.inFlight,
    };
  }

  // Alteração do usuário (nota, decimal ou comentário).
  edit(next: EvaluationFormState) {
    if (this.destroyed) return;
    this.form = next;
    this.version += 1;
    this.lastSave = null;
    this.message = null;
    // Cópia local IMEDIATA (nunca chama o backend).
    syncLocalDraft(this.deps.storage, this.deps.userId, this.deps.interviewId, next, this.serverForm);
    this.clearTimer();
    if (!this.inFlight) this.refreshIdleStatus();
    this.scheduleIfNeeded();
    this.emit();
  }

  // "Salvar rascunho": sincroniza AGORA (cancela o debounce pendente).
  flush(): Promise<void> {
    if (this.destroyed) return Promise.resolve();
    this.clearTimer();
    return this.run("manual");
  }

  // Garante que a versão ATUAL esteja confirmada pelo servidor (usado antes
  // de ir para a revisão). Reaproveita o mesmo fluxo do botão manual: sem
  // alteração não há PUT; durante um PUT em andamento espera e envia só se
  // ainda houver diferença; nunca cria request paralela.
  async syncNow(): Promise<{ ok: boolean; message: string | null }> {
    if (this.destroyed) return { ok: false, message: null };
    await this.flush();
    await this.whenIdle();
    if (this.destroyed) return { ok: false, message: null };
    if (!isDirty(this.form, this.serverForm)) return { ok: true, message: null };
    return {
      ok: false,
      message: this.message ?? GENERIC_SAVE_ERROR,
    };
  }

  // Há algo a sincronizar com o servidor? (PUT em andamento ou diferença entre
  // o formulário e a última versão confirmada). Síncrono: a saída da tela só
  // espera quando isto é verdadeiro.
  hasUnsyncedWork(): boolean {
    if (this.destroyed || !this.form || !this.serverForm) return false;
    return this.inFlight || isDirty(this.form, this.serverForm);
  }

  // Aguarda saves em andamento (útil em testes).
  async whenIdle(): Promise<void> {
    while (this.pending) await this.pending;
  }

  destroy() {
    this.destroyed = true;
    this.clearTimer();
    this.rerun = null;
  }

  // ── internos ─────────────────────────────────────────────────────────────

  private refreshIdleStatus() {
    if (!isDirty(this.form, this.serverForm)) {
      this.status = "clean";
      return;
    }
    this.status = validateForm(this.form, this.persisted).valid ? "dirty" : "invalid";
  }

  private canAutosave(): boolean {
    return isDirty(this.form, this.serverForm) && validateForm(this.form, this.persisted).valid;
  }

  private scheduleIfNeeded() {
    if (this.destroyed || this.timer !== null || !this.canAutosave()) return;
    this.timer = this.scheduler.set(() => {
      this.timer = null;
      void this.run("auto");
    }, this.delayMs);
  }

  private clearTimer() {
    if (this.timer !== null) {
      this.scheduler.clear(this.timer);
      this.timer = null;
    }
  }

  private emit() {
    if (this.destroyed) return;
    this.deps.onChange(this.getSnapshot());
  }

  private run(kind: SaveKind): Promise<void> {
    if (this.destroyed) return Promise.resolve();

    // Já há PUT em andamento: nunca em paralelo. Fica para logo depois.
    if (this.inFlight) {
      this.rerun = kind === "manual" || this.rerun === "manual" ? "manual" : "auto";
      return this.pending ?? Promise.resolve();
    }

    if (!isDirty(this.form, this.serverForm)) return Promise.resolve();

    const validation = validateForm(this.form, this.persisted);
    if (!validation.valid) {
      this.status = "invalid";
      if (kind === "manual") {
        this.lastSave = "manual";
        this.message = MANUAL_INVALID_MESSAGE;
      }
      this.emit();
      return Promise.resolve();
    }

    this.inFlight = true;
    this.status = "saving";
    this.message = null;
    const snapshotForm = this.form;
    const snapshotVersion = this.version;
    this.emit();

    const task = (async () => {
      let outcome: Awaited<ReturnType<typeof runSaveDraft>>;
      try {
        outcome = await runSaveDraft({
          interviewId: this.deps.interviewId,
          form: snapshotForm,
          persisted: this.persisted,
          save: this.deps.save,
        });
      } catch {
        outcome = { kind: "error", message: GENERIC_SAVE_ERROR };
      }
      this.inFlight = false;
      if (this.destroyed) return;
      this.finish(outcome, kind, snapshotVersion);

      // Alteração/clique durante o PUT: novo save da versão MAIS RECENTE.
      const next = this.rerun;
      this.rerun = null;
      if (next && !this.destroyed && (this.status !== "failed" || next === "manual")) {
        await this.run(next);
      }
    })();

    const tracked = task.finally(() => {
      if (this.pending === tracked) this.pending = null;
    });
    this.pending = tracked;
    return tracked;
  }

  private finish(
    outcome: Awaited<ReturnType<typeof runSaveDraft>>,
    kind: SaveKind,
    snapshotVersion: number,
  ) {
    const { storage, userId, interviewId } = this.deps;

    if (outcome.kind === "saved") {
      this.serverForm = outcome.form;
      this.draft = outcome.draft;
      this.persisted = outcome.draft.criteriaScores;
      this.lastSave = kind;
      this.message = null;
      if (this.version === snapshotVersion) {
        // Nada mudou durante o PUT. Se o que está na tela já é a mesma versão
        // confirmada (mesmas notas/comentário), o formulário NÃO é substituído:
        // o texto digitado e a referência ficam intactos (o campo não é tocado,
        // foco e cursor permanecem). Só adota a grafia do servidor se divergir.
        if (isDirty(this.form, outcome.form)) this.form = outcome.form;
        this.status = "saved";
      } else {
        // Houve alteração nova: ela PERMANECE; a resposta antiga não a sobrescreve.
        this.status = isDirty(this.form, this.serverForm)
          ? validateForm(this.form, this.persisted).valid
            ? "dirty"
            : "invalid"
          : "saved";
      }
      // Só apaga a cópia local se o estado atual === confirmado pelo servidor.
      syncLocalDraft(storage, userId, interviewId, this.form, this.serverForm);
      this.scheduleIfNeeded();
      this.emit();
      return;
    }

    if (outcome.kind === "invalid") {
      this.status = "invalid";
      this.lastSave = kind === "manual" ? "manual" : null;
      this.message = kind === "manual" ? MANUAL_INVALID_MESSAGE : null;
      writeLocalDraft(storage, userId, interviewId, this.form);
      this.emit();
      return;
    }

    // Falha de rede/API: nada é apagado; sem retry automático em loop.
    this.status = "failed";
    this.lastSave = kind;
    this.message = outcome.message;
    writeLocalDraft(storage, userId, interviewId, this.form);
    this.emit();
  }
}

// ─── Saída da tela de avaliação (Fase 6A.2.1) ────────────────────────────────
// Ao sair com alteração pendente, tenta confirmar o rascunho no servidor ANTES
// de navegar, para que "Em Andamento" (que sempre busca dado fresco) já
// enxergue o progresso. Reaproveita `syncNow` (mesmo fluxo do "Salvar
// rascunho": sem PUT paralelo, sem PUT se já sincronizado). Nunca prende o
// usuário: passado o prazo, ou se o save falhar/for inválido, navega mesmo
// assim — a cópia local do rascunho permanece e nada é marcado como "em
// andamento" no cliente (a regra continua exclusivamente do backend).
export const LEAVE_FLUSH_TIMEOUT_MS = 3000;

export type LeaveOutcome = "idle" | "confirmed" | "failed" | "timeout";

type LeaveController = Pick<EvaluationAutosave, "hasUnsyncedWork" | "syncNow">;

export async function flushBeforeLeave(
  controller: LeaveController,
  options: { timeoutMs?: number; scheduler?: Scheduler } = {},
): Promise<LeaveOutcome> {
  if (!controller.hasUnsyncedWork()) return "idle";
  const scheduler = options.scheduler ?? defaultScheduler;
  let handle: unknown = null;
  const timeout = new Promise<"timeout">((resolve) => {
    handle = scheduler.set(() => resolve("timeout"), options.timeoutMs ?? LEAVE_FLUSH_TIMEOUT_MS);
  });
  const sync = controller
    .syncNow()
    .then((result): LeaveOutcome => (result.ok ? "confirmed" : "failed"))
    .catch((): LeaveOutcome => "failed");
  try {
    return await Promise.race([sync, timeout]);
  } finally {
    scheduler.clear(handle);
  }
}

// Sem pendência: navega NA HORA (síncrono, sem await). Com pendência: espera a
// confirmação (até o prazo) e navega de qualquer forma.
export function leaveEvaluation(
  controller: LeaveController | null,
  navigate: () => void,
  options: { timeoutMs?: number; scheduler?: Scheduler } = {},
): Promise<LeaveOutcome> {
  if (!controller || !controller.hasUnsyncedWork()) {
    navigate();
    return Promise.resolve("idle");
  }
  return flushBeforeLeave(controller, options).then((outcome) => {
    navigate();
    return outcome;
  });
}

// Texto discreto do estado de sincronização (sem banner).
export function describeSync(snapshot: Pick<AutosaveSnapshot, "status" | "lastSave">): string | null {
  switch (snapshot.status) {
    case "dirty":
    case "invalid":
      return "Alterações não salvas";
    case "saving":
      return "Salvando...";
    case "failed":
      return "Alterações salvas neste dispositivo";
    case "saved":
      // Mesmo texto no autosave e no save manual; a tela o esconde após ~2,5s.
      return "Rascunho salvo";
    default:
      return null;
  }
}
