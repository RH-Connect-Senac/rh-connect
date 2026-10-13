/**
 * Aviso de sucesso TRANSITÓRIO (UX do Admin ao atribuir uma entrevista).
 *
 * Só controla QUANDO a mensagem aparece/some: `show` exibe e (re)inicia o timer
 * de ocultação (uma nova mensagem substitui a anterior e zera a contagem);
 * `clear` esconde na hora; `destroy` cancela o timer pendente (desmontagem) e
 * impede qualquer atualização posterior. Sem API, sem storage, sem biblioteca.
 * Mensagens de ERRO não passam por aqui (continuam persistentes).
 */

import type { Scheduler } from "./evaluator-autosave";

export const TRANSIENT_NOTICE_MS = 4000;

const defaultScheduler: Scheduler = {
  set: (callback, ms) => setTimeout(callback, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export class TransientNotice {
  private message = "";
  private timer: unknown = null;
  private destroyed = false;
  private readonly ms: number;
  private readonly scheduler: Scheduler;

  constructor(
    private readonly onChange: (message: string) => void,
    options: { ms?: number; scheduler?: Scheduler } = {},
  ) {
    this.ms = options.ms ?? TRANSIENT_NOTICE_MS;
    this.scheduler = options.scheduler ?? defaultScheduler;
  }

  current(): string {
    return this.message;
  }

  show(message: string) {
    if (this.destroyed) return;
    this.clearTimer();
    this.set(message);
    if (!message) return;
    this.timer = this.scheduler.set(() => {
      this.timer = null;
      this.set("");
    }, this.ms);
  }

  clear() {
    if (this.destroyed) return;
    this.clearTimer();
    this.set("");
  }

  destroy() {
    this.destroyed = true;
    this.clearTimer();
  }

  private set(next: string) {
    if (this.message === next) return;
    this.message = next;
    this.onChange(next);
  }

  private clearTimer() {
    if (this.timer !== null) {
      this.scheduler.clear(this.timer);
      this.timer = null;
    }
  }
}
