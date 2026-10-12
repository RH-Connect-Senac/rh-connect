import { describe, expect, it, vi } from "vitest";
import {
  ANSWER_AUTOSAVE_DELAY_MS,
  AnswerDraftAutosave,
  describeAnswerSync,
  type AnswerAutosaveSnapshot,
  type RemoteDraft,
  type SaveDraftOutcome,
  type Scheduler,
} from "./interview-answer-autosave";
import { getAnswerDraft, type AnswerDraftScope, type StorageLike } from "../services/interview-ux-state";

const SCOPE: AnswerDraftScope = { candidateId: "cand-1", interviewId: "int-1", questionId: "q-1" };
const NO_REMOTE: RemoteDraft = { text: null, version: 0, updatedAt: null };

function memoryStorage(): StorageLike {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => (data.has(key) ? (data.get(key) as string) : null),
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

// Relógio falso determinístico (não depende de fake timers do runner).
function fakeScheduler() {
  let now = 0;
  let nextId = 1;
  const tasks = new Map<number, { at: number; fn: () => void }>();
  const scheduler: Scheduler = {
    set: (fn, ms) => {
      const id = nextId++;
      tasks.set(id, { at: now + ms, fn });
      return id;
    },
    clear: (handle) => void tasks.delete(handle as number),
  };
  return {
    scheduler,
    pendingTimers: () => tasks.size,
    advance(ms: number) {
      now += ms;
      for (const [id, task] of [...tasks.entries()].sort((a, b) => a[1].at - b[1].at)) {
        if (task.at <= now && tasks.has(id)) {
          tasks.delete(id);
          task.fn();
        }
      }
    },
  };
}

// Back simulado: devolve o rascunho gravado e avança a versão (como o Back real).
function okOutcome(text: string, version: number): SaveDraftOutcome {
  return { ok: true, data: { text: text === "" ? null : text, version, updatedAt: "2026-10-10T10:00:00.000Z" } };
}

function setup(options: {
  official?: string;
  text?: string;
  remote?: RemoteDraft;
  save?: (text: string, version: number) => Promise<SaveDraftOutcome>;
} = {}) {
  const storage = memoryStorage();
  const clock = fakeScheduler();
  const snapshots: AnswerAutosaveSnapshot[] = [];
  let serverVersion = options.remote?.version ?? 0;
  const save = vi.fn(
    options.save ??
      (async (text: string) => {
        serverVersion += 1;
        return okOutcome(text, serverVersion);
      }),
  );
  const controller = new AnswerDraftAutosave({
    scope: SCOPE,
    storage,
    save,
    onChange: (snapshot) => void snapshots.push(snapshot),
    scheduler: clock.scheduler,
  });
  const official = options.official ?? "";
  controller.load({
    official,
    text: options.text ?? official,
    remote: options.remote ?? NO_REMOTE,
  });
  const callsOf = () => save.mock.calls as unknown as Array<[string, number]>;
  const last = () => snapshots[snapshots.length - 1];
  return { controller, storage, clock, save, snapshots, callsOf, last };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const flushMicrotasks = async () => {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
};

describe("autosave do rascunho da resposta", () => {
  it("digitar grava a cópia local IMEDIATAMENTE, sem chamar o Back", () => {
    const { controller, storage, callsOf, last } = setup();
    controller.edit("Minha res");

    expect(getAnswerDraft(SCOPE, storage)?.text).toBe("Minha res");
    expect(callsOf().length).toBe(0);
    expect(last().status).toBe("dirty");
    expect(describeAnswerSync(last())).toBe("Alterações não salvas");
  });

  it("não há PUT por tecla: várias alterações só reiniciam o timer", () => {
    const { controller, clock, callsOf } = setup();
    for (const text of ["a", "ab", "abc", "abcd", "abcde"]) {
      controller.edit(text);
      clock.advance(ANSWER_AUTOSAVE_DELAY_MS - 500);
    }
    expect(callsOf().length).toBe(0);
    expect(clock.pendingTimers()).toBe(1);
  });

  it("PUT do rascunho depois do debounce (~2s), com a versão conhecida", async () => {
    const { controller, clock, callsOf, last } = setup();
    controller.edit("Minha resposta");
    clock.advance(ANSWER_AUTOSAVE_DELAY_MS);
    await flushMicrotasks();

    expect(callsOf()).toEqual([["Minha resposta", 0]]);
    expect(last().status).toBe("saved");
    expect(describeAnswerSync(last())).toBe("Rascunho salvo");
    expect(last().remoteVersion).toBe(1);
  });

  it("várias alterações geram UM save consolidado com o texto mais recente", async () => {
    const { controller, clock, callsOf } = setup();
    controller.edit("a");
    clock.advance(500);
    controller.edit("ab");
    clock.advance(500);
    controller.edit("abc");
    clock.advance(ANSWER_AUTOSAVE_DELAY_MS);
    await flushMicrotasks();

    expect(callsOf()).toEqual([["abc", 0]]);
  });

  it("depois do sucesso a cópia local é apagada (estado atual confirmado no Back)", async () => {
    const { controller, clock, storage } = setup();
    controller.edit("Texto");
    expect(getAnswerDraft(SCOPE, storage)?.text).toBe("Texto");
    clock.advance(ANSWER_AUTOSAVE_DELAY_MS);
    await flushMicrotasks();

    expect(getAnswerDraft(SCOPE, storage)).toBe(null);
  });

  it("o save seguinte usa a versão devolvida pelo anterior", async () => {
    const { controller, clock, callsOf } = setup();
    controller.edit("um");
    clock.advance(ANSWER_AUTOSAVE_DELAY_MS);
    await flushMicrotasks();
    controller.edit("um dois");
    clock.advance(ANSWER_AUTOSAVE_DELAY_MS);
    await flushMicrotasks();

    expect(callsOf()).toEqual([
      ["um", 0],
      ["um dois", 1],
    ]);
  });

  it("alteração durante o PUT não é perdida: a resposta antiga não sobrescreve o texto novo", async () => {
    const first = deferred<SaveDraftOutcome>();
    const outcomes = [first.promise];
    const { controller, clock, callsOf, last, storage } = setup({
      save: (text) => outcomes.shift() ?? Promise.resolve(okOutcome(text, 2)),
    });

    controller.edit("antigo");
    clock.advance(ANSWER_AUTOSAVE_DELAY_MS);
    await flushMicrotasks();
    expect(callsOf().length).toBe(1);
    expect(last().saving).toBe(true);

    controller.edit("antigo e novo");
    clock.advance(500);
    first.resolve(okOutcome("antigo", 1));
    await flushMicrotasks();

    expect(controller.getText()).toBe("antigo e novo");
    expect(last().status).toBe("dirty");
    expect(getAnswerDraft(SCOPE, storage)?.text).toBe("antigo e novo");

    clock.advance(ANSWER_AUTOSAVE_DELAY_MS);
    await flushMicrotasks();
    expect(callsOf()).toEqual([
      ["antigo", 0],
      ["antigo e novo", 1],
    ]);
    expect(last().status).toBe("saved");
  });

  it("nunca há 2 requests em paralelo: o timer que dispara durante o PUT vira um save logo depois", async () => {
    const first = deferred<SaveDraftOutcome>();
    const outcomes = [first.promise];
    const { controller, clock, callsOf, last } = setup({
      save: (text) => outcomes.shift() ?? Promise.resolve(okOutcome(text, 2)),
    });

    controller.edit("antigo");
    clock.advance(ANSWER_AUTOSAVE_DELAY_MS);
    await flushMicrotasks();
    controller.edit("antigo e novo");
    clock.advance(ANSWER_AUTOSAVE_DELAY_MS * 3);
    await flushMicrotasks();
    expect(callsOf().length).toBe(1); // ainda em andamento: nada em paralelo

    first.resolve(okOutcome("antigo", 1));
    await flushMicrotasks();

    expect(callsOf()).toEqual([
      ["antigo", 0],
      ["antigo e novo", 1],
    ]);
    expect(last().status).toBe("saved");
    expect(controller.getText()).toBe("antigo e novo");
  });

  it("falha mantém a cópia local, mostra 'salvas neste dispositivo' e não repete em loop", async () => {
    const { controller, clock, callsOf, last, storage } = setup({
      save: async () => ({ ok: false, reason: "error", message: "Sem conexão." }),
    });
    controller.edit("Texto offline");
    clock.advance(ANSWER_AUTOSAVE_DELAY_MS);
    await flushMicrotasks();

    expect(last().status).toBe("failed");
    expect(describeAnswerSync(last())).toBe("Rascunho salvo neste dispositivo");
    expect(getAnswerDraft(SCOPE, storage)?.text).toBe("Texto offline");

    clock.advance(ANSWER_AUTOSAVE_DELAY_MS * 10);
    await flushMicrotasks();
    expect(callsOf().length).toBe(1);
  });

  it("depois de uma falha, nova alteração tenta de novo (conexão voltou)", async () => {
    let online = false;
    const { controller, clock, callsOf, last } = setup({
      save: async (text) => (online ? okOutcome(text, 1) : { ok: false, reason: "error", message: "offline" }),
    });
    controller.edit("a");
    clock.advance(ANSWER_AUTOSAVE_DELAY_MS);
    await flushMicrotasks();
    expect(last().status).toBe("failed");

    online = true;
    controller.edit("ab");
    clock.advance(ANSWER_AUTOSAVE_DELAY_MS);
    await flushMicrotasks();

    expect(callsOf().length).toBe(2);
    expect(last().status).toBe("saved");
  });

  it("offline: 'Rascunho salvo' só aparece depois da confirmação do Back; antes disso é 'salvas neste dispositivo'", async () => {
    let online = false;
    const { controller, clock, last, snapshots, storage } = setup({
      save: async (text) => (online ? okOutcome(text, 1) : { ok: false, reason: "error", message: "offline" }),
    });
    controller.edit("resposta digitada offline");
    clock.advance(ANSWER_AUTOSAVE_DELAY_MS);
    await flushMicrotasks();

    // sem confirmação do Back: persistência somente local, texto intacto
    expect(describeAnswerSync(last())).toBe("Rascunho salvo neste dispositivo");
    expect(controller.getText()).toBe("resposta digitada offline");
    expect(getAnswerDraft(SCOPE, storage)?.text).toBe("resposta digitada offline");
    expect(snapshots.map((snapshot) => describeAnswerSync(snapshot))).not.toContain("Rascunho salvo");

    // a conexão volta e o sync é confirmado pelo Back: só então "Rascunho salvo", sem perder o texto
    online = true;
    await controller.flush();
    expect(describeAnswerSync(last())).toBe("Rascunho salvo");
    expect(controller.getText()).toBe("resposta digitada offline");
  });

  it("409 NÃO sobrescreve o texto local nem o do outro dispositivo e para o autosave", async () => {
    const conflict: RemoteDraft = { text: "texto do dispositivo B", version: 5, updatedAt: null };
    const { controller, clock, callsOf, last, storage } = setup({
      remote: { text: "antigo", version: 4, updatedAt: null },
      text: "antigo",
      save: async () => ({ ok: false, reason: "conflict", message: "alterado em outro dispositivo", conflict }),
    });
    controller.edit("texto do dispositivo A");
    clock.advance(ANSWER_AUTOSAVE_DELAY_MS);
    await flushMicrotasks();

    expect(last().status).toBe("conflict");
    expect(last().conflict).toEqual(conflict);
    expect(controller.getText()).toBe("texto do dispositivo A");
    expect(getAnswerDraft(SCOPE, storage)?.text).toBe("texto do dispositivo A");

    controller.edit("texto do dispositivo A + mais");
    clock.advance(ANSWER_AUTOSAVE_DELAY_MS * 5);
    await flushMicrotasks();
    expect(callsOf().length).toBe(1); // sem novo PUT enquanto o conflito não for resolvido
    expect(last().status).toBe("conflict");
  });

  it("'Manter meu texto' adota a versão do Back e só então sobrescreve (decisão explícita)", async () => {
    const conflict: RemoteDraft = { text: "texto B", version: 5, updatedAt: null };
    let call = 0;
    const { controller, clock, callsOf, last } = setup({
      remote: { text: null, version: 4, updatedAt: null },
      save: async (text) => {
        call += 1;
        return call === 1
          ? { ok: false, reason: "conflict", message: "x", conflict }
          : okOutcome(text, 6);
      },
    });
    controller.edit("texto A");
    clock.advance(ANSWER_AUTOSAVE_DELAY_MS);
    await flushMicrotasks();
    expect(last().status).toBe("conflict");

    await controller.keepMine();
    await flushMicrotasks();

    expect(callsOf()).toEqual([
      ["texto A", 4],
      ["texto A", 5],
    ]);
    expect(last().status).toBe("saved");
  });

  it("409 em que o Back já tem exatamente o mesmo texto resolve sozinho", async () => {
    const { controller, clock, last } = setup({
      save: async () => ({
        ok: false,
        reason: "conflict",
        message: "x",
        conflict: { text: "igual", version: 3, updatedAt: null },
      }),
    });
    controller.edit("igual");
    clock.advance(ANSWER_AUTOSAVE_DELAY_MS);
    await flushMicrotasks();

    expect(last().status).toBe("saved");
    expect(last().remoteVersion).toBe(3);
  });

  it("quiesce cancela o debounce e espera o PUT em andamento (sem concorrer com o oficial)", async () => {
    const inflight = deferred<SaveDraftOutcome>();
    const { controller, clock, callsOf } = setup({ save: () => inflight.promise });
    controller.edit("texto");
    clock.advance(ANSWER_AUTOSAVE_DELAY_MS);
    await flushMicrotasks();
    expect(callsOf().length).toBe(1);

    let quiet = false;
    const waiting = controller.quiesce().then(() => {
      quiet = true;
    });
    await flushMicrotasks();
    expect(quiet).toBe(false); // ainda esperando o PUT de draft terminar

    inflight.resolve(okOutcome("texto", 1));
    await waiting;
    expect(quiet).toBe(true);
  });

  it("depois de quiesce nenhum autosave novo nasce; resume() o devolve ao normal", async () => {
    const { controller, clock, callsOf } = setup();
    await controller.quiesce();
    controller.edit("durante o PUT oficial");
    clock.advance(ANSWER_AUTOSAVE_DELAY_MS * 3);
    await flushMicrotasks();
    expect(callsOf().length).toBe(0);

    controller.resume(); // PUT oficial falhou: o usuário continua na pergunta
    clock.advance(ANSWER_AUTOSAVE_DELAY_MS);
    await flushMicrotasks();
    expect(callsOf().length).toBe(1);
  });

  it("quiesce cancela o save agendado (a confirmação oficial fica sozinha)", async () => {
    const { controller, clock, callsOf } = setup();
    controller.edit("texto");
    expect(clock.pendingTimers()).toBe(1);
    await controller.quiesce();
    expect(clock.pendingTimers()).toBe(0);
    clock.advance(ANSWER_AUTOSAVE_DELAY_MS * 2);
    await flushMicrotasks();
    expect(callsOf().length).toBe(0);
  });

  it("confirmação oficial limpa rascunho local e do Back e avança a versão", async () => {
    const { controller, clock, storage, last } = setup({ remote: { text: "rasc", version: 3, updatedAt: null }, text: "rasc" });
    controller.edit("rasc final");
    expect(getAnswerDraft(SCOPE, storage)?.text).toBe("rasc final");
    clock.advance(ANSWER_AUTOSAVE_DELAY_MS);
    await flushMicrotasks();

    await controller.quiesce();
    controller.confirmed({ official: "rasc final", draftVersion: 9 });

    expect(getAnswerDraft(SCOPE, storage)).toBe(null);
    expect(last().status).toBe("clean");
    expect(last().remoteVersion).toBe(9);
    expect(controller.hasRemoteDraft()).toBe(false);
  });

  it("texto digitado DURANTE o PUT oficial continua protegido localmente", async () => {
    const { controller, storage, last } = setup({ official: "" });
    await controller.quiesce();
    controller.edit("antigo + novo");
    controller.confirmed({ official: "antigo", draftVersion: 2 });

    expect(last().status).toBe("dirty");
    expect(getAnswerDraft(SCOPE, storage)?.text).toBe("antigo + novo");
    expect(getAnswerDraft(SCOPE, storage)?.base).toBe("antigo");
  });

  it("voltar ao texto oficial limpa o rascunho do Back (envia vazio)", async () => {
    const { controller, clock, callsOf, last } = setup({
      official: "oficial",
      text: "oficial editada",
      remote: { text: "oficial editada", version: 2, updatedAt: null },
    });
    expect(last().status).toBe("clean");
    controller.edit("oficial");
    clock.advance(ANSWER_AUTOSAVE_DELAY_MS);
    await flushMicrotasks();

    expect(callsOf()).toEqual([["", 2]]);
    expect(controller.hasRemoteDraft()).toBe(false);
  });

  it("campo em branco não vira rascunho no Back", () => {
    const { controller, clock, callsOf } = setup();
    controller.edit("   \n  ");
    clock.advance(ANSWER_AUTOSAVE_DELAY_MS * 2);
    expect(callsOf().length).toBe(0);
    expect(clock.pendingTimers()).toBe(0);
  });

  it("rascunho restaurado do Back não gera save (já está sincronizado)", () => {
    const { callsOf, clock, last } = setup({
      official: "",
      text: "do outro dispositivo",
      remote: { text: "do outro dispositivo", version: 4, updatedAt: null },
    });
    clock.advance(ANSWER_AUTOSAVE_DELAY_MS * 2);
    expect(callsOf().length).toBe(0);
    expect(last().status).toBe("clean");
  });

  it("cópia local mais nova que o Back, ao carregar, agenda o autosave", async () => {
    const { callsOf, clock, last } = setup({
      official: "",
      text: "offline mais novo",
      remote: { text: "velho", version: 4, updatedAt: null },
    });
    expect(last().status).toBe("dirty");
    clock.advance(ANSWER_AUTOSAVE_DELAY_MS);
    await flushMicrotasks();
    expect(callsOf()).toEqual([["offline mais novo", 4]]);
  });

  it("normaliza CRLF para LF (Enter vira nova linha, nunca avança)", () => {
    const { controller } = setup();
    controller.edit("linha 1\r\nlinha 2");
    expect(controller.getText()).toBe("linha 1\nlinha 2");
  });

  it("destroy cancela o timer e silencia callbacks", async () => {
    const { controller, clock, callsOf, snapshots } = setup();
    controller.edit("x");
    const before = snapshots.length;
    controller.destroy();
    clock.advance(ANSWER_AUTOSAVE_DELAY_MS * 2);
    await flushMicrotasks();
    expect(callsOf().length).toBe(0);
    expect(snapshots.length).toBe(before);
  });

  it("textos de status", () => {
    expect(describeAnswerSync({ status: "clean" })).toBe(null);
    expect(describeAnswerSync({ status: "conflict" })).toBe(null);
    expect(describeAnswerSync({ status: "saving" })).toBe("Salvando...");
  });
});

describe("saída ('Sair e continuar depois') e sessão stale", () => {
  function build(save: (text: string, version: number) => Promise<SaveDraftOutcome>) {
    const clock = fakeScheduler();
    const storage = memoryStorage();
    const controller = new AnswerDraftAutosave({
      scope: SCOPE,
      storage,
      save,
      onChange: () => {},
      scheduler: clock.scheduler,
    });
    controller.load({ official: "", text: "", remote: NO_REMOTE });
    return { controller, clock, storage };
  }

  it("flush envia AGORA o texto que ainda estava no debounce (sem esperar os 2s) e cancela o timer", async () => {
    const saves: Array<[string, number]> = [];
    const { controller, clock } = build(async (text, version) => {
      saves.push([text, version]);
      return { ok: true, data: { text, version: version + 1, updatedAt: null } };
    });
    controller.edit("ainda no debounce");
    expect(clock.pendingTimers()).toBe(1);

    await controller.flush();

    expect(saves).toEqual([["ainda no debounce", 0]]);
    expect(clock.pendingTimers()).toBe(0);
    expect(controller.getSnapshot().status).toBe("saved");
    expect(controller.getRemote().text).toBe("ainda no debounce");
  });

  it("flush espera o PUT já em andamento e o texto mais novo vai logo depois (um request por vez)", async () => {
    let release: (outcome: SaveDraftOutcome) => void = () => {};
    const saves: string[] = [];
    let first = true;
    const { controller } = build((text, version) => {
      saves.push(text);
      if (first) {
        first = false;
        return new Promise<SaveDraftOutcome>((resolve) => (release = resolve));
      }
      return Promise.resolve({ ok: true, data: { text, version: version + 1, updatedAt: null } });
    });
    controller.edit("primeiro");
    const firstFlush = controller.flush(); // PUT em andamento
    controller.edit("primeiro e segundo");
    const secondFlush = controller.flush(); // não cria request paralela
    expect(saves).toEqual(["primeiro"]);

    release({ ok: true, data: { text: "primeiro", version: 1, updatedAt: null } });
    await Promise.all([firstFlush, secondFlush]);

    expect(saves).toEqual(["primeiro", "primeiro e segundo"]);
    expect(controller.getRemote().text).toBe("primeiro e segundo");
  });

  it("falha/offline no flush: resolve (a saída segue) e o texto continua protegido localmente", async () => {
    const { controller, storage } = build(async () => ({ ok: false, reason: "error", message: "offline" }));
    controller.edit("preciso sair offline");

    await controller.flush(); // não rejeita

    expect(controller.getSnapshot().status).toBe("failed");
    expect(getAnswerDraft(SCOPE, storage)?.text).toBe("preciso sair offline");
  });

  it("flush em conflito não sobrescreve nada no Back", async () => {
    const save = vi.fn(async (): Promise<SaveDraftOutcome> => ({ ok: false, reason: "conflict", message: "x", conflict: { text: "do outro", version: 9, updatedAt: null } }));
    const { controller, storage } = build(save);
    controller.edit("meu texto");
    await controller.flush();
    expect(controller.getSnapshot().status).toBe("conflict");
    expect(controller.getSnapshot().conflictKind).toBe("draft");

    await controller.flush(); // nova tentativa de saída: continua sem PUT
    expect(save.mock.calls.length).toBe(1);
    expect(getAnswerDraft(SCOPE, storage)?.text).toBe("meu texto");
  });

  it("lock (sessão stale): flush e timers não criam PUT; texto local fica", async () => {
    const save = vi.fn(async (text: string, version: number): Promise<SaveDraftOutcome> => ({ ok: true, data: { text, version: version + 1, updatedAt: null } }));
    const { controller, clock, storage } = build(save);
    controller.edit("texto antes de descobrir");
    controller.lock();

    clock.advance(ANSWER_AUTOSAVE_DELAY_MS * 3);
    await controller.flush();

    expect(save.mock.calls.length).toBe(0);
    expect(clock.pendingTimers()).toBe(0);
    expect(getAnswerDraft(SCOPE, storage)?.text).toBe("texto antes de descobrir");
  });

  it("lock com PUT em andamento: ele termina sozinho e nenhum novo PUT nasce", async () => {
    let release: (outcome: SaveDraftOutcome) => void = () => {};
    const save = vi.fn((_text: string, _version: number) => new Promise<SaveDraftOutcome>((resolve) => (release = resolve)));
    const { controller } = build(save);
    controller.edit("a");
    const pending = controller.flush();
    controller.lock();
    release({ ok: false, reason: "not_in_progress", message: "enviada" });
    await pending;
    expect(save.mock.calls.length).toBe(1);
  });
});

describe("sincronização entre dispositivos (receiveRemote)", () => {
  const remoteDraft = (text: string | null, version: number): RemoteDraft => ({ text, version, updatedAt: "2026-10-11T10:00:00.000Z" });

  it("sem edição local: adota o rascunho remoto em silêncio e atualiza a versão local", () => {
    const { controller, last } = setup({ official: "", text: "", remote: NO_REMOTE });
    expect(controller.receiveRemote({ answer: null, draft: remoteDraft("texto do celular", 3) })).toBe("adopted");
    expect(controller.getText()).toBe("texto do celular");
    expect(last().status).toBe("clean");
    expect(last().remoteVersion).toBe(3);
    expect(last().conflict).toBeNull();
  });

  it("depois da adoção, o próximo autosave parte da versão nova (sem 409 à toa)", async () => {
    const { controller, clock, callsOf } = setup({ official: "", text: "" });
    controller.receiveRemote({ answer: null, draft: remoteDraft("remoto", 3) });
    controller.edit("remoto + meu complemento");
    clock.advance(ANSWER_AUTOSAVE_DELAY_MS);
    await flushMicrotasks();
    expect(callsOf()[0]).toEqual(["remoto + meu complemento", 3]);
  });

  it("resposta oficial remota sem edição local: vira a base e o texto passa a ser ela", () => {
    const { controller, last } = setup({ official: "", text: "" });
    expect(controller.receiveRemote({ answer: "resposta final", draft: remoteDraft(null, 2) })).toBe("adopted");
    expect(controller.getText()).toBe("resposta final");
    expect(last().status).toBe("clean");
    expect(last().remoteVersion).toBe(2);
  });

  it("COM edição local pendente: NÃO sobrescreve; abre o conflito já existente (rascunho)", () => {
    const { controller, last } = setup({ official: "", text: "" });
    controller.edit("meu texto ainda não salvo");
    expect(controller.receiveRemote({ answer: null, draft: remoteDraft("texto remoto", 4) })).toBe("conflict");
    expect(controller.getText()).toBe("meu texto ainda não salvo");
    expect(last().status).toBe("conflict");
    expect(last().conflictKind).toBe("draft");
    expect(last().conflict?.text).toBe("texto remoto");
  });

  it("COM edição local e resposta oficial remota: conflito do tipo 'answer' (mesmo fluxo do 409 oficial)", () => {
    const { controller, last } = setup({ official: "", text: "" });
    controller.edit("minha versão");
    expect(controller.receiveRemote({ answer: "oficial do outro", draft: remoteDraft(null, 5) })).toBe("conflict");
    expect(controller.getText()).toBe("minha versão");
    expect(last().conflictKind).toBe("answer");
  });

  it("conflito aberto pelo polling usa a resolução existente: manter meu texto grava com a versão remota", async () => {
    const { controller, callsOf, clock, last } = setup({ official: "", text: "" });
    controller.edit("meu texto");
    controller.receiveRemote({ answer: null, draft: remoteDraft("remoto", 4) });
    clock.advance(ANSWER_AUTOSAVE_DELAY_MS * 2);
    expect(callsOf().length).toBe(0); // conflito pausa o autosave
    await controller.keepMine();
    expect(callsOf()[0]).toEqual(["meu texto", 4]);
    expect(last().conflict).toBeNull();
  });

  it("PUT em andamento: adia (o resultado do próprio PUT/409 decide); nada é sobrescrito", async () => {
    const gate = deferred<SaveDraftOutcome>();
    const { controller, clock, last } = setup({ save: () => gate.promise });
    controller.edit("digitando");
    clock.advance(ANSWER_AUTOSAVE_DELAY_MS);
    expect(last().saving).toBe(true);
    expect(controller.receiveRemote({ answer: null, draft: remoteDraft("remoto", 2) })).toBe("deferred");
    expect(controller.getText()).toBe("digitando");
    gate.resolve(okOutcome("digitando", 3));
    await flushMicrotasks();
  });

  it("falha de salvamento (offline) com texto local: também protege, conflito em vez de substituir", async () => {
    const { controller, clock, last } = setup({ save: async () => ({ ok: false, reason: "error", message: "x" }) });
    controller.edit("offline");
    clock.advance(ANSWER_AUTOSAVE_DELAY_MS);
    await flushMicrotasks();
    expect(last().status).toBe("failed");
    expect(controller.receiveRemote({ answer: null, draft: remoteDraft("remoto", 2) })).toBe("conflict");
    expect(controller.getText()).toBe("offline");
  });

  it("texto local já igual ao remoto: só adota a versão, sem conflito", () => {
    const { controller, last } = setup({ official: "", text: "" });
    controller.edit("mesmo texto");
    expect(controller.receiveRemote({ answer: null, draft: remoteDraft("mesmo texto", 6) })).toBe("adopted");
    expect(last().status).toBe("clean");
    expect(last().remoteVersion).toBe(6);
  });

  it("sem mudança, travado (sessão terminal) ou já em conflito: não faz nada", () => {
    const a = setup({ official: "x", text: "x", remote: remoteDraft(null, 1) });
    expect(a.controller.receiveRemote({ answer: "x", draft: remoteDraft(null, 1) })).toBe("unchanged");
    const b = setup({ official: "", text: "" });
    b.controller.lock();
    expect(b.controller.receiveRemote({ answer: null, draft: remoteDraft("r", 9) })).toBe("unchanged");
    const c = setup({ official: "", text: "" });
    c.controller.edit("meu");
    c.controller.receiveRemote({ answer: null, draft: remoteDraft("r1", 2) });
    expect(c.controller.receiveRemote({ answer: null, draft: remoteDraft("r2", 3) })).toBe("unchanged");
  });
});
