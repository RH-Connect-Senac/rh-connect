/**
 * Aviso transitório "Rascunho salvo" (UX do autosave, Fase 5C.2).
 *
 * Só controla QUANDO o texto de sucesso aparece/some. Não conhece API, debounce
 * nem concorrência: recebe o status já calculado pelo controlador de autosave.
 *  - "saved"  → mostra e (re)inicia o timer de ocultação;
 *  - qualquer outro status (dirty, saving, failed, invalid, clean) → esconde
 *    na hora. "Alterações não salvas" e "Alterações salvas neste dispositivo"
 *    nunca somem sozinhas: dependem do status, não deste timer.
 */

import type { AutosaveStatus, Scheduler } from "./evaluator-autosave";

export const SAVED_NOTICE_MS = 2500;

const defaultScheduler: Scheduler = {
  set: (callback, ms) => setTimeout(callback, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export class SavedNotice {
  private visible = false;
  private timer: unknown = null;
  private destroyed = false;
  private readonly ms: number;
  private readonly scheduler: Scheduler;

  constructor(
    private readonly onChange: (visible: boolean) => void,
    options: { ms?: number; scheduler?: Scheduler } = {},
  ) {
    this.ms = options.ms ?? SAVED_NOTICE_MS;
    this.scheduler = options.scheduler ?? defaultScheduler;
  }

  isVisible(): boolean {
    return this.visible;
  }

  update(status: AutosaveStatus) {
    if (this.destroyed) return;
    this.clearTimer();
    if (status === "saved") {
      this.set(true);
      this.timer = this.scheduler.set(() => {
        this.timer = null;
        this.set(false);
      }, this.ms);
    } else {
      this.set(false);
    }
  }

  destroy() {
    this.destroyed = true;
    this.clearTimer();
  }

  private set(next: boolean) {
    if (this.visible === next) return;
    this.visible = next;
    this.onChange(next);
  }

  private clearTimer() {
    if (this.timer !== null) {
      this.scheduler.clear(this.timer);
      this.timer = null;
    }
  }
}

// Status exibido: "saved" já escondido vira "clean" (sem texto); o resto passa.
export function visibleSyncStatus(status: AutosaveStatus | undefined, savedVisible: boolean): AutosaveStatus | undefined {
  return status === "saved" && !savedVisible ? "clean" : status;
}
