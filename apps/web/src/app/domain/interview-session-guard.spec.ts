import { describe, expect, it, vi } from "vitest";
import {
  INTERVIEW_SENT_ELSEWHERE_MESSAGE,
  attachRevalidation,
  flushBeforeLeaving,
  isInterviewEditable,
} from "./interview-session-guard";

function fakeTargets(visibility: "visible" | "hidden" = "visible") {
  const winHandlers = new Map<string, Set<() => void>>();
  const docHandlers = new Map<string, Set<() => void>>();
  const mk = (store: Map<string, Set<() => void>>) => ({
    addEventListener: (type: string, listener: () => void) => {
      if (!store.has(type)) store.set(type, new Set());
      store.get(type)!.add(listener);
    },
    removeEventListener: (type: string, listener: () => void) => void store.get(type)?.delete(listener),
  });
  const win = mk(winHandlers);
  const doc = { ...mk(docHandlers), visibilityState: visibility as string };
  const fire = (store: Map<string, Set<() => void>>, type: string) => store.get(type)?.forEach((fn) => fn());
  return {
    win,
    doc,
    focus: () => fire(winHandlers, "focus"),
    visibility: (state: "visible" | "hidden") => {
      doc.visibilityState = state;
      fire(docHandlers, "visibilitychange");
    },
    listenerCount: () =>
      [...winHandlers.values(), ...docHandlers.values()].reduce((sum, set) => sum + set.size, 0),
  };
}

describe("status editável", () => {
  it("só IN_PROGRESS (ou desconhecido) é editável", () => {
    expect(isInterviewEditable("IN_PROGRESS")).toBe(true);
    expect(isInterviewEditable(null)).toBe(true);
    expect(isInterviewEditable(undefined)).toBe(true);
    for (const status of ["PENDING_AI_EVALUATION", "PENDING_ASSIGNMENT", "ASSIGNED", "COMPLETED"]) {
      expect(isInterviewEditable(status)).toBe(false);
    }
  });

  it("a mensagem é exatamente a combinada", () => {
    expect(INTERVIEW_SENT_ELSEWHERE_MESSAGE).toBe(
      "Esta entrevista foi enviada em outro dispositivo e não pode mais ser editada.",
    );
  });
});

describe("revalidação por foco / visibilidade", () => {
  it("focus da janela revalida", async () => {
    const t = fakeTargets();
    const revalidate = vi.fn(async () => {});
    attachRevalidation({ win: t.win, doc: t.doc, revalidate, throttleMs: 0 });
    t.focus();
    await Promise.resolve();
    expect(revalidate.mock.calls.length).toBe(1);
  });

  it("visibilitychange hidden -> visible revalida; ficar hidden NÃO", async () => {
    const t = fakeTargets("hidden");
    const revalidate = vi.fn(async () => {});
    attachRevalidation({ win: t.win, doc: t.doc, revalidate, throttleMs: 0 });
    t.visibility("hidden");
    await Promise.resolve();
    expect(revalidate.mock.calls.length).toBe(0);
    t.visibility("visible");
    await Promise.resolve();
    expect(revalidate.mock.calls.length).toBe(1);
  });

  it("focus + visibilitychange juntos (voltar à aba) geram UMA requisição (throttle)", async () => {
    const t = fakeTargets("hidden");
    let clock = 1_000;
    const revalidate = vi.fn(async () => {});
    attachRevalidation({ win: t.win, doc: t.doc, revalidate, throttleMs: 5_000, now: () => clock });
    t.visibility("visible");
    t.focus();
    await Promise.resolve();
    await Promise.resolve();
    expect(revalidate.mock.calls.length).toBe(1);

    clock += 1_000; // ainda dentro do throttle
    t.focus();
    await Promise.resolve();
    expect(revalidate.mock.calls.length).toBe(1);

    clock += 5_000; // passou o throttle
    t.focus();
    await Promise.resolve();
    expect(revalidate.mock.calls.length).toBe(2);
  });

  it("não sobrepõe revalidações: com uma em andamento, novos eventos são ignorados", async () => {
    const t = fakeTargets();
    let release: () => void = () => {};
    const revalidate = vi.fn(() => new Promise<void>((resolve) => { release = resolve; }));
    attachRevalidation({ win: t.win, doc: t.doc, revalidate, throttleMs: 0 });
    t.focus();
    t.focus();
    expect(revalidate.mock.calls.length).toBe(1);
    release();
    await Promise.resolve();
    await Promise.resolve();
    t.focus();
    expect(revalidate.mock.calls.length).toBe(2);
  });

  it("falha na revalidação não derruba nem trava os próximos eventos", async () => {
    const t = fakeTargets();
    const revalidate = vi.fn(async () => {
      throw new Error("offline");
    });
    attachRevalidation({ win: t.win, doc: t.doc, revalidate, throttleMs: 0 });
    t.focus();
    await Promise.resolve();
    await Promise.resolve();
    t.focus();
    expect(revalidate.mock.calls.length).toBe(2);
  });

  it("o cleanup remove os listeners (sem polling, nada fica agendado)", () => {
    const t = fakeTargets();
    const detach = attachRevalidation({ win: t.win, doc: t.doc, revalidate: async () => {} });
    expect(t.listenerCount()).toBe(2);
    detach();
    expect(t.listenerCount()).toBe(0);
  });
});

describe("flush ao 'Sair e continuar depois'", () => {
  it("sem nada para sincronizar: segue em frente", async () => {
    expect(await flushBeforeLeaving(null)).toBe("none");
  });

  it("aguarda o flush concluir antes de liberar a saída", async () => {
    const order: string[] = [];
    const outcome = await flushBeforeLeaving(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      order.push("flush");
    }, 500);
    order.push("saiu");
    expect(outcome).toBe("done");
    expect(order).toEqual(["flush", "saiu"]);
  });

  it("flush lento (offline/pendurado) NÃO prende a saída: devolve timeout", async () => {
    const started = Date.now();
    const outcome = await flushBeforeLeaving(() => new Promise<void>(() => {}), 20);
    expect(outcome).toBe("timeout");
    expect(Date.now() - started < 1000).toBe(true);
  });

  it("erro no flush NÃO impede a saída e nunca rejeita", async () => {
    const outcome = await flushBeforeLeaving(async () => {
      throw new Error("sem rede");
    }, 500);
    expect(outcome).toBe("error");
  });
});

describe("entrevista CANCELADA em outro dispositivo", () => {
  it("não é editável e tem mensagem própria (diferente da de enviada)", async () => {
    const mod = await import("./interview-session-guard");
    expect(mod.isInterviewEditable("CANCELLED")).toBe(false);
    expect(mod.describeStaleInterview("CANCELLED")).toBe(
      "Esta entrevista foi cancelada em outro dispositivo e não pode mais ser editada.",
    );
    for (const status of ["PENDING_AI_EVALUATION", "PENDING_ASSIGNMENT", "ASSIGNED", "COMPLETED", undefined, null]) {
      expect(mod.describeStaleInterview(status)).toBe(
        "Esta entrevista foi enviada em outro dispositivo e não pode mais ser editada.",
      );
    }
  });
});

describe("proteção de saída (beforeunload)", () => {
  function fakeWin() {
    const handlers = new Set<(e: { preventDefault: () => void; returnValue: unknown }) => void>();
    return {
      handlers,
      win: {
        addEventListener: (_t: string, l: never) => void handlers.add(l),
        removeEventListener: (_t: string, l: never) => void handlers.delete(l),
      },
    };
  }

  it("IN_PROGRESS editável com rascunho pode proteger; CANCELLED e demais terminais não", async () => {
    const mod = await import("./interview-session-guard");
    expect(mod.isExitProtectionActive({ draftProtected: true, terminalStatus: null })).toBe(true);
    expect(mod.isExitProtectionActive({ draftProtected: true, terminalStatus: "IN_PROGRESS" })).toBe(true);
    for (const status of ["CANCELLED", "PENDING_AI_EVALUATION", "PENDING_ASSIGNMENT", "ASSIGNED", "COMPLETED"]) {
      expect(mod.isExitProtectionActive({ draftProtected: true, terminalStatus: status })).toBe(false);
    }
    expect(mod.isExitProtectionActive({ draftProtected: false, terminalStatus: null })).toBe(false);
  });

  it("attachExitProtection registra o beforeunload, salva antes e o cleanup o remove (CANCELLED detectado depois)", async () => {
    const mod = await import("./interview-session-guard");
    const { win, handlers } = fakeWin();
    const save = vi.fn();
    const detach = mod.attachExitProtection(win as never, save);
    expect(handlers.size).toBe(1);
    const event = { preventDefault: vi.fn(), returnValue: undefined as unknown };
    [...handlers][0](event);
    expect(save).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    detach();
    expect(handlers.size).toBe(0);
  });
});

describe("tom do aviso de sessão encerrada", () => {
  it("CANCELLED é erro (vermelho); demais avisos permanecem âmbar", async () => {
    const mod = await import("./interview-session-guard");
    expect(mod.staleNoticeTone("CANCELLED")).toBe("error");
    for (const status of ["PENDING_AI_EVALUATION", "PENDING_ASSIGNMENT", "ASSIGNED", "COMPLETED", undefined, null]) {
      expect(mod.staleNoticeTone(status)).toBe("warning");
    }
  });
});

describe("sair de uma sessão terminal descarta o estado local da entrevista antiga", () => {
  it("só descarta fora das telas que mostram o aviso; nunca em sessão editável", async () => {
    const mod = await import("./interview-session-guard");
    expect(mod.shouldDiscardTerminalDraft({ terminalStatus: "CANCELLED", screen: "interview" })).toBe(false);
    expect(mod.shouldDiscardTerminalDraft({ terminalStatus: "CANCELLED", screen: "review" })).toBe(false);
    expect(mod.shouldDiscardTerminalDraft({ terminalStatus: "CANCELLED", screen: "interview-confirm" })).toBe(false);
    for (const screen of ["interview-setup", "consent", "evaluation-mode", "prep", null]) {
      expect(mod.shouldDiscardTerminalDraft({ terminalStatus: "CANCELLED", screen })).toBe(true);
      expect(mod.shouldDiscardTerminalDraft({ terminalStatus: "TERMINAL", screen })).toBe(true);
    }
    expect(mod.shouldDiscardTerminalDraft({ terminalStatus: null, screen: null })).toBe(false);
    expect(mod.shouldDiscardTerminalDraft({ terminalStatus: "IN_PROGRESS", screen: null })).toBe(false);
  });
});
