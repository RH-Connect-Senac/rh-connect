/**
 * Autosave do RASCUNHO da resposta do candidato — controlador SEM React.
 *
 * Estratégia híbrida (uma instância por pergunta aberta):
 *   alteração → cópia local imediata → debounce (~2s) → PUT do DRAFT no Back.
 *
 * O rascunho NÃO é a resposta: o endpoint de draft nunca toca em
 * `answer_text`/`answered_at`. A resposta oficial só muda na confirmação
 * (Próxima/Anterior/número/Revisar), feita por `interview-answer-confirmation.ts`.
 *
 * Garantias (cobertas por testes):
 *  - nunca há PUT por tecla: cada alteração só reinicia o timer;
 *  - no máximo UMA gravação em andamento; alteração durante o PUT vira um novo
 *    save DEPOIS, do texto mais recente;
 *  - a resposta de um save antigo nunca sobrescreve o texto digitado depois
 *    (versão por alteração) e a cópia local só é apagada quando o estado ATUAL
 *    está confirmado no Back;
 *  - 409 (outro dispositivo alterou o rascunho) NÃO sobrescreve o texto local
 *    nem o do servidor: entra em "conflict" e espera a decisão do usuário;
 *  - falha NÃO apaga nada e NÃO faz retry em loop: nova alteração ou
 *    navegação tentam de novo;
 *  - `quiesce()` cancela o debounce e espera o PUT em andamento, para que o
 *    PUT oficial nunca concorra com o PUT de draft.
 */

import {
  clearAnswerDraft,
  saveAnswerDraft,
  type AnswerDraftScope,
  type StorageLike,
} from "../services/interview-ux-state";

export const ANSWER_AUTOSAVE_DELAY_MS = 2000;
const GENERIC_SAVE_ERROR = "Não foi possível salvar o rascunho. Tente novamente.";

export type AnswerAutosaveStatus = "clean" | "dirty" | "saving" | "saved" | "failed" | "conflict";
export type AnswerSaveKind = "auto" | "manual";

/** Rascunho como o Back o conhece (versão 0 = nunca salvo). */
export type RemoteDraft = {
  text: string | null;
  version: number;
  updatedAt: string | null;
};

export type SaveDraftOutcome =
  | { ok: true; data: RemoteDraft }
  | { ok: false; reason: "conflict"; message: string; conflict: RemoteDraft }
  | { ok: false; reason: string; message: string };

export type Scheduler = {
  set: (callback: () => void, ms: number) => unknown;
  clear: (handle: unknown) => void;
};

const defaultScheduler: Scheduler = {
  set: (callback, ms) => setTimeout(callback, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export type AnswerAutosaveSnapshot = {
  questionId: string;
  text: string;
  status: AnswerAutosaveStatus;
  lastSave: AnswerSaveKind | null;
  message: string | null;
  conflict: RemoteDraft | null;
  /** Versão do rascunho que o Back confirmou por último. */
  remoteVersion: number;
  saving: boolean;
  /** Origem do conflito: rascunho de outro dispositivo ou resposta oficial confirmada por outro. */
  conflictKind: "draft" | "answer" | null;
};

/** Estado vigente da pergunta no Back devolvido pelo 409 do PUT OFICIAL. */
export type OfficialConflictState = {
  answer: string | null;
  draftText: string | null;
  draftUpdatedAt: string | null;
  draftVersion: number;
};

const normalizeEol = (value: string) => value.replace(/\r\n?/g, "\n");

export class AnswerDraftAutosave {
  private official = "";
  private text = "";
  /** Rascunho confirmado pelo Back ("" = nenhum). */
  private remoteText = "";
  private remoteVersion = 0;
  private status: AnswerAutosaveStatus = "clean";
  private lastSave: AnswerSaveKind | null = null;
  private message: string | null = null;
  private conflict: RemoteDraft | null = null;
  private conflictKind: "draft" | "answer" | null = null;
  /** Sessão stale (entrevista não está mais IN_PROGRESS): nenhuma gravação nasce mais. */
  private locked = false;

  private editVersion = 0;
  private inFlight = false;
  private rerun: AnswerSaveKind | null = null;
  private timer: unknown = null;
  private destroyed = false;
  private suspended = false;
  private pending: Promise<void> | null = null;
  private readonly delayMs: number;
  private readonly scheduler: Scheduler;

  constructor(
    private readonly deps: {
      scope: AnswerDraftScope;
      storage: StorageLike | null;
      save: (text: string, version: number) => Promise<SaveDraftOutcome>;
      onChange: (snapshot: AnswerAutosaveSnapshot) => void;
      delayMs?: number;
      scheduler?: Scheduler;
      now?: () => number;
    },
  ) {
    this.delayMs = deps.delayMs ?? ANSWER_AUTOSAVE_DELAY_MS;
    this.scheduler = deps.scheduler ?? defaultScheduler;
  }

  get questionId(): string {
    return this.deps.scope.questionId;
  }

  /**
   * Estado inicial já resolvido (ver `resolveRestoredAnswer`): resposta oficial,
   * texto que aparece no campo e rascunho do Back. Se o texto difere do que o
   * Back guarda, agenda o autosave.
   */
  load(input: { official: string; text: string; remote: RemoteDraft }) {
    if (this.destroyed) return;
    this.official = input.official;
    this.text = normalizeEol(input.text);
    this.remoteText = normalizeEol(input.remote.text ?? "");
    this.remoteVersion = input.remote.version;
    this.editVersion += 1;
    this.lastSave = null;
    this.message = null;
    this.conflict = null;
    this.conflictKind = null;
    this.suspended = false;
    this.status = this.isDirty() ? "dirty" : "clean";
    this.scheduleIfNeeded();
    this.emit();
  }

  getText(): string {
    return this.text;
  }

  getSnapshot(): AnswerAutosaveSnapshot {
    return {
      questionId: this.questionId,
      text: this.text,
      status: this.status,
      lastSave: this.lastSave,
      message: this.message,
      conflict: this.conflict,
      remoteVersion: this.remoteVersion,
      saving: this.inFlight,
      conflictKind: this.conflict ? this.conflictKind ?? "draft" : null,
    };
  }

  /** O que o Back deveria guardar como rascunho para o texto atual. */
  private desiredRemote(): string {
    const trimmed = this.text.trim();
    if (trimmed === "" || trimmed === this.official.trim()) return "";
    return this.text;
  }

  private isDirty(): boolean {
    return this.desiredRemote() !== this.remoteText;
  }

  /** Rascunho como o Back o conhece agora (para a restauração ao reabrir a pergunta). */
  getRemote(): RemoteDraft {
    return {
      text: this.remoteText === "" ? null : this.remoteText,
      version: this.remoteVersion,
      updatedAt: null,
    };
  }

  /** Há rascunho no Back que ainda precisa ser sincronizado/limpo. */
  hasRemoteDraft(): boolean {
    // Em conflito, o rascunho de OUTRO dispositivo também precisa ser resolvido.
    return this.remoteText !== "" || (this.conflict?.text ?? "").trim() !== "";
  }

  /** Alteração do usuário (digitação ou ditado). Texto já com fim de linha normalizado. */
  edit(next: string) {
    if (this.destroyed || this.locked) return;
    this.text = normalizeEol(next);
    this.editVersion += 1;
    this.lastSave = null;
    this.message = null;
    // Cópia local IMEDIATA (nunca chama o Back).
    this.writeLocal();
    this.clearTimer();
    if (this.status !== "conflict" && !this.inFlight) {
      this.status = this.isDirty() ? "dirty" : "clean";
    }
    this.scheduleIfNeeded();
    this.emit();
  }

  /** Sincroniza AGORA (cancela o debounce pendente). */
  flush(): Promise<void> {
    if (this.destroyed) return Promise.resolve();
    this.clearTimer();
    return this.run("manual");
  }

  /**
   * Antes do PUT oficial: cancela o debounce, não deixa novo autosave nascer e
   * espera o PUT de draft em andamento terminar. Nunca cria request paralela.
   */
  async quiesce(): Promise<void> {
    this.suspended = true;
    this.clearTimer();
    this.rerun = null;
    while (this.pending) await this.pending;
  }

  /** O PUT oficial falhou e o usuário continua na pergunta: o autosave volta. */
  resume() {
    if (this.destroyed || this.locked) return;
    this.suspended = false;
    if (this.status !== "conflict" && !this.inFlight) {
      this.status = this.isDirty() ? "dirty" : "clean";
    }
    this.scheduleIfNeeded();
    this.emit();
  }

  /**
   * O Back confirmou a resposta oficial (e limpou o rascunho dele). `draftVersion`
   * é a versão devolvida pelo PUT oficial.
   */
  confirmed(input: { official: string; draftVersion: number }) {
    if (this.destroyed) return;
    this.official = input.official;
    this.remoteText = "";
    this.remoteVersion = input.draftVersion;
    this.conflict = null;
    this.conflictKind = null;
    this.clearTimer();
    this.rerun = null;
    // Se o usuário digitou DURANTE o PUT oficial, o texto novo continua protegido
    // localmente, agora com a resposta recém-confirmada como base.
    clearAnswerDraft(this.deps.scope, this.deps.storage);
    if (this.isDirty()) {
      this.writeLocal();
      this.status = "dirty";
    } else {
      this.status = "clean";
    }
    this.emit();
  }

  /** Conflito: o usuário escolheu manter o próprio texto (sobrescreve o rascunho remoto de propósito). */
  keepMine(): Promise<void> {
    if (this.destroyed || !this.conflict) return Promise.resolve();
    this.remoteVersion = this.conflict.version;
    this.remoteText = normalizeEol(this.conflict.text ?? "");
    this.conflict = null;
    this.conflictKind = null;
    this.message = null;
    this.status = this.isDirty() ? "dirty" : "saved";
    return this.flush();
  }

  /**
   * O PUT OFICIAL recebeu 409 DRAFT_VERSION_CONFLICT: outro dispositivo mudou a
   * resposta/rascunho desta pergunta. O texto local continua intacto (e protegido
   * no localStorage); a resposta vigente no Back vira a base. Nada é gravado: o
   * usuário decide (`keepMine` ou usar a versão remota).
   */
  officialConflict(remote: OfficialConflictState, message: string) {
    if (this.destroyed || this.locked) return;
    this.official = remote.answer ?? "";
    this.conflict = { text: remote.draftText, version: remote.draftVersion, updatedAt: remote.draftUpdatedAt };
    this.conflictKind = "answer";
    this.status = "conflict";
    this.message = message;
    this.suspended = false;
    this.clearTimer();
    this.rerun = null;
    this.writeLocal();
    this.emit();
  }

  /**
   * Sincronização periódica: o Back (outro dispositivo) tem uma resposta/rascunho diferente
   * do que este controlador conhece. UMA regra, as mesmas peças do optimistic locking:
   *  - sem edição local pendente: adota o estado remoto em silêncio ("adopted");
   *  - com edição local (dirty/falha/offline): NÃO substitui nada; abre o MESMO conflito do 409
   *    (manter meu texto / usar a versão remota) ("conflict");
   *  - PUT em andamento: espera o resultado dele ("deferred"; o próximo ciclo reavalia);
   *  - já em conflito, travado ou sem mudança real: "unchanged".
   */
  receiveRemote(remote: { answer: string | null; draft: RemoteDraft }): "unchanged" | "adopted" | "conflict" | "deferred" {
    if (this.destroyed || this.locked) return "unchanged";
    const answer = remote.answer ?? "";
    const draftText = normalizeEol(remote.draft.text ?? "");
    const answerChanged = answer !== this.official;
    const draftChanged = remote.draft.version !== this.remoteVersion || draftText !== this.remoteText;
    if (!answerChanged && !draftChanged) return "unchanged";
    if (this.status === "conflict") return "unchanged";
    if (this.inFlight) return "deferred";

    const editing = this.isDirty();
    if (!editing) {
      this.official = answer;
      this.remoteText = draftText;
      this.remoteVersion = remote.draft.version;
      this.text = draftText !== "" ? draftText : normalizeEol(answer);
      this.editVersion += 1;
      this.lastSave = null;
      this.message = null;
      this.status = "clean";
      clearAnswerDraft(this.deps.scope, this.deps.storage);
      this.emit();
      return "adopted";
    }

    // Edição local pendente. Se o texto local já é exatamente o remoto, só adota a versão.
    if (!answerChanged && this.desiredRemote() === draftText) {
      this.remoteText = draftText;
      this.remoteVersion = remote.draft.version;
      this.status = "clean";
      clearAnswerDraft(this.deps.scope, this.deps.storage);
      this.emit();
      return "adopted";
    }
    if (answerChanged) {
      this.officialConflict(
        { answer: remote.answer, draftText: remote.draft.text, draftUpdatedAt: remote.draft.updatedAt, draftVersion: remote.draft.version },
        "Esta resposta foi alterada em outro dispositivo. Escolha qual versão manter.",
      );
      return "conflict";
    }
    this.conflict = { text: remote.draft.text, version: remote.draft.version, updatedAt: remote.draft.updatedAt };
    this.conflictKind = "draft";
    this.status = "conflict";
    this.message = "Este rascunho foi alterado em outro dispositivo.";
    this.suspended = false;
    this.clearTimer();
    this.rerun = null;
    this.writeLocal();
    this.emit();
    return "conflict";
  }

  /**
   * Sessão stale (a entrevista deixou de ser IN_PROGRESS em outro dispositivo):
   * cancela o debounce, impede qualquer nova gravação e ignora novas edições. O
   * PUT já em andamento termina sozinho. NÃO apaga o texto local.
   */
  lock() {
    if (this.destroyed) return;
    this.locked = true;
    this.suspended = true;
    this.clearTimer();
    this.rerun = null;
    this.emit();
  }

  isLocked(): boolean {
    return this.locked;
  }

  destroy() {
    this.destroyed = true;
    this.clearTimer();
    this.rerun = null;
  }

  // ── internos ─────────────────────────────────────────────────────────────

  private writeLocal() {
    saveAnswerDraft(
      this.deps.scope,
      this.text,
      this.official,
      this.deps.storage,
      this.deps.now?.() ?? Date.now(),
      this.remoteVersion,
    );
  }

  private canAutosave(): boolean {
    return !this.locked && !this.suspended && this.status !== "conflict" && this.isDirty();
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

  private run(kind: AnswerSaveKind): Promise<void> {
    if (this.destroyed || this.locked) return Promise.resolve();

    // Já há PUT em andamento: nunca em paralelo. Fica para logo depois.
    if (this.inFlight) {
      this.rerun = kind === "manual" || this.rerun === "manual" ? "manual" : "auto";
      return this.pending ?? Promise.resolve();
    }
    if (this.status === "conflict" || !this.isDirty()) return Promise.resolve();

    this.inFlight = true;
    this.status = "saving";
    this.message = null;
    const sentText = this.desiredRemote();
    this.emit();

    const task = (async () => {
      let outcome: SaveDraftOutcome;
      try {
        outcome = await this.deps.save(sentText, this.remoteVersion);
      } catch {
        outcome = { ok: false, reason: "error", message: GENERIC_SAVE_ERROR };
      }
      this.inFlight = false;
      if (this.destroyed) return;
      this.finish(outcome, kind);

      // Alteração durante o PUT: novo save do texto MAIS RECENTE.
      const next = this.rerun;
      this.rerun = null;
      if (next && !this.destroyed && !this.suspended && this.status !== "conflict" && (this.status !== "failed" || next === "manual")) {
        await this.run(next);
      }
    })();

    const tracked = task.finally(() => {
      if (this.pending === tracked) this.pending = null;
    });
    this.pending = tracked;
    return tracked;
  }

  private finish(outcome: SaveDraftOutcome, kind: AnswerSaveKind) {
    if (outcome.ok) {
      this.remoteText = normalizeEol(outcome.data.text ?? "");
      this.remoteVersion = outcome.data.version;
      this.lastSave = kind;
      this.message = null;
      if (this.isDirty()) {
        // Houve alteração nova: ela PERMANECE; a resposta antiga não a sobrescreve.
        this.status = "dirty";
        this.writeLocal();
        this.scheduleIfNeeded();
      } else {
        // Só apaga a cópia local quando o estado ATUAL está confirmado no Back.
        this.status = "saved";
        clearAnswerDraft(this.deps.scope, this.deps.storage);
      }
      this.emit();
      return;
    }

    if (outcome.reason === "conflict" && "conflict" in outcome) {
      const remote = outcome.conflict;
      const remoteText = normalizeEol(remote.text ?? "");
      if (remoteText === this.desiredRemote()) {
        // O outro dispositivo já gravou exatamente este texto: nada a decidir.
        this.remoteText = remoteText;
        this.remoteVersion = remote.version;
        this.status = "saved";
        this.lastSave = kind;
        clearAnswerDraft(this.deps.scope, this.deps.storage);
        this.emit();
        return;
      }
      // NÃO sobrescreve nada: texto local fica (e protegido), o do Back fica.
      this.conflict = remote;
      this.conflictKind = "draft";
      this.status = "conflict";
      this.lastSave = kind;
      this.message = outcome.message;
      this.writeLocal();
      this.emit();
      return;
    }

    // Falha de rede/API: nada é apagado; sem retry automático em loop.
    this.status = "failed";
    this.lastSave = kind;
    this.message = outcome.message || GENERIC_SAVE_ERROR;
    this.writeLocal();
    this.emit();
  }
}

// Texto discreto do estado de sincronização (sem banner).
export function describeAnswerSync(snapshot: Pick<AnswerAutosaveSnapshot, "status">): string | null {
  switch (snapshot.status) {
    case "dirty":
      return "Alterações não salvas";
    case "saving":
      return "Salvando...";
    case "failed":
      return "Rascunho salvo neste dispositivo";
    case "saved":
      return "Rascunho salvo";
    default:
      return null;
  }
}

// Tom visual do status (mesma semântica do avaliador): salvo = sucesso; qualquer
// pendência/falha local = atenção. Ver `evaluator-evaluation-content.tsx`.
export function describeAnswerSyncTone(status: AnswerAutosaveSnapshot["status"]): "success" | "warning" {
  return status === "saved" ? "success" : "warning";
}

export const ANSWER_SYNC_TONE_CLASS = {
  success: "text-green-700",
  warning: "text-amber-700",
} as const;
