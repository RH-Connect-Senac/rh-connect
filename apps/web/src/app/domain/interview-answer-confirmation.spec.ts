import { describe, expect, it, vi } from "vitest";
import { confirmOfficialAnswer, withOfficialAnswer } from "./interview-answer-confirmation";
import {
  ANSWER_AUTOSAVE_DELAY_MS,
  AnswerDraftAutosave,
  type SaveDraftOutcome,
  type Scheduler,
} from "./interview-answer-autosave";
import {
  getAnswerDraft,
  resolveRestoredAnswer,
  saveAnswerDraft,
  type AnswerDraftScope,
  type StorageLike,
} from "../services/interview-ux-state";

const SCOPE: AnswerDraftScope = { candidateId: "c", interviewId: "i", questionId: "q" };

function memoryStorage(): StorageLike {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => (data.has(key) ? (data.get(key) as string) : null),
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

function fakeController(overrides: Record<string, unknown> = {}) {
  const calls: string[] = [];
  const controller = {
    quiesce: vi.fn(async () => void calls.push("quiesce")),
    resume: vi.fn(() => void calls.push("resume")),
    confirmed: vi.fn((_input: { official: string; draftVersion: number }) => void calls.push("confirmed")),
    hasRemoteDraft: vi.fn(() => false),
    getRemote: vi.fn(() => ({ text: null as string | null, version: 0, updatedAt: null as string | null })),
    officialConflict: vi.fn((_remote: unknown, _message: string) => void calls.push("officialConflict")),
    lock: vi.fn(() => void calls.push("lock")),
    ...overrides,
  };
  return { controller, calls };
}

describe("confirmação da resposta OFICIAL", () => {
  it("Próxima confirma: quieta o autosave, normaliza, grava no endpoint oficial e promove", async () => {
    const { controller, calls } = fakeController();
    const saveAnswer = vi.fn(async (answer: string) => {
      calls.push("PUT oficial");
      return { ok: true as const, data: { answer, draftVersion: 7 } };
    });

    const outcome = await confirmOfficialAnswer({
      value: "  linha 1\r\n\r\nlinha 2  ",
      persisted: "",
      controller,
      saveAnswer,
      clearLocalDraft: () => {},
    });

    expect(saveAnswer.mock.calls.length).toBe(1);
    expect(saveAnswer.mock.calls[0][0]).toBe("linha 1\n\nlinha 2");
    expect(outcome).toEqual({ ok: true, answer: "linha 1\n\nlinha 2", changed: true, draftVersion: 7 });
    // a ordem importa: nada de PUT de draft concorrendo com o oficial
    expect(calls).toEqual(["quiesce", "PUT oficial", "confirmed"]);
    expect(controller.confirmed.mock.calls[0][0]).toEqual({ official: "linha 1\n\nlinha 2", draftVersion: 7 });
  });

  it("falha no PUT oficial: não confirma, devolve o autosave ao normal e informa o erro", async () => {
    const { controller, calls } = fakeController();
    const outcome = await confirmOfficialAnswer({
      value: "resposta",
      persisted: "",
      controller,
      saveAnswer: async () => ({ ok: false, message: "Sem conexão." }),
      clearLocalDraft: () => {},
    });

    expect(outcome).toEqual({ ok: false, reason: "error", message: "Sem conexão." });
    expect(calls).toEqual(["quiesce", "resume"]);
    expect(controller.confirmed.mock.calls.length).toBe(0);
  });

  it("falha mantém o rascunho local (nada é apagado) para tentar de novo", async () => {
    const storage = memoryStorage();
    saveAnswerDraft(SCOPE, "resposta", "", storage, 1_000, 2);
    const { controller } = fakeController();

    await confirmOfficialAnswer({
      value: "resposta",
      persisted: "",
      controller,
      saveAnswer: async () => ({ ok: false, message: "erro" }),
      clearLocalDraft: () => {},
    });

    expect(getAnswerDraft(SCOPE, storage, 1_000)?.text).toBe("resposta");
  });

  it("texto igual à resposta oficial: nenhum PUT oficial, só limpa o rascunho local", async () => {
    const { controller } = fakeController();
    const saveAnswer = vi.fn();
    const cleared = vi.fn();

    const outcome = await confirmOfficialAnswer({
      value: " oficial ",
      persisted: "oficial",
      controller,
      saveAnswer,
      clearLocalDraft: cleared,
    });

    expect(saveAnswer.mock.calls.length).toBe(0);
    expect(cleared.mock.calls.length).toBe(1);
    expect(outcome).toEqual({ ok: true, answer: "oficial", changed: false, draftVersion: null });
  });

  it("igual à oficial MAS com rascunho no Back: ainda faz o PUT oficial (resolve e limpa o rascunho)", async () => {
    const { controller, calls } = fakeController({ hasRemoteDraft: vi.fn(() => true) });
    const saveAnswer = vi.fn(async (answer: string) => {
      calls.push("PUT oficial");
      return { ok: true as const, data: { answer, draftVersion: 5 } };
    });

    const outcome = await confirmOfficialAnswer({
      value: "oficial",
      persisted: "oficial",
      controller,
      saveAnswer,
      clearLocalDraft: () => {},
    });

    expect(saveAnswer.mock.calls.length).toBe(1);
    expect(saveAnswer.mock.calls[0][0]).toBe("oficial");
    expect(calls).toEqual(["quiesce", "PUT oficial", "confirmed"]);
    expect(controller.confirmed.mock.calls[0][0]).toEqual({ official: "oficial", draftVersion: 5 });
    expect(outcome).toEqual({ ok: true, answer: "oficial", changed: false, draftVersion: 5 });
  });

  it("sem controlador, o rascunho conhecido do Back também força o PUT oficial", async () => {
    const saveAnswer = vi.fn(async (answer: string) => ({ ok: true as const, data: { answer, draftVersion: 2 } }));
    const withDraft = await confirmOfficialAnswer({
      value: "abc",
      persisted: "abc",
      controller: null,
      hasRemoteDraft: () => true,
      saveAnswer,
      clearLocalDraft: () => {},
    });
    const withoutDraft = await confirmOfficialAnswer({
      value: "abc",
      persisted: "abc",
      controller: null,
      hasRemoteDraft: () => false,
      saveAnswer,
      clearLocalDraft: () => {},
    });
    expect(saveAnswer.mock.calls.length).toBe(1);
    expect(withDraft.ok && withDraft.draftVersion).toBe(2);
    expect(withoutDraft.ok && withoutDraft.draftVersion).toBe(null);
  });

  it("apagar uma resposta já confirmada continua sendo uma confirmação (semântica preservada)", async () => {
    const { controller } = fakeController();
    const saveAnswer = vi.fn(async (answer: string) => ({ ok: true as const, data: { answer: answer || null, draftVersion: 3 } }));

    const outcome = await confirmOfficialAnswer({
      value: "   ",
      persisted: "antiga",
      controller,
      saveAnswer,
      clearLocalDraft: () => {},
    });

    expect(saveAnswer.mock.calls[0][0]).toBe("");
    expect(outcome).toEqual({ ok: true, answer: "", changed: true, draftVersion: 3 });
  });

  it("funciona sem controlador (pergunta ainda não restaurada)", async () => {
    const outcome = await confirmOfficialAnswer({
      value: "x",
      persisted: "",
      controller: null,
      saveAnswer: async (answer) => ({ ok: true, data: { answer, draftVersion: 1 } }),
      clearLocalDraft: () => {},
    });
    expect(outcome.ok).toBe(true);
  });
});

describe("contador/indicadores: só a resposta OFICIAL conta", () => {
  it("withOfficialAnswer grava a confirmada e remove a apagada", () => {
    const base = { a: "um" };
    expect(withOfficialAnswer(base, "b", "dois")).toEqual({ a: "um", b: "dois" });
    expect(withOfficialAnswer({ a: "um", b: "dois" }, "b", "")).toEqual({ a: "um" });
    expect(base).toEqual({ a: "um" }); // não muta
  });

  it("rascunho (local ou do Back) não entra no mapa de respostas oficiais", async () => {
    // O mapa só muda por withOfficialAnswer, chamado após o PUT oficial.
    let official: Record<string, string> = {};
    const storage = memoryStorage();
    let tick = 0;
    const timers: Array<() => void> = [];
    const scheduler: Scheduler = { set: (fn) => (timers.push(fn), ++tick), clear: () => {} };
    const controller = new AnswerDraftAutosave({
      scope: SCOPE,
      storage,
      save: async (text): Promise<SaveDraftOutcome> => ({ ok: true, data: { text, version: 1, updatedAt: null } }),
      onChange: () => {},
      scheduler,
      delayMs: ANSWER_AUTOSAVE_DELAY_MS,
    });
    controller.load({ official: "", text: "", remote: { text: null, version: 0, updatedAt: null } });
    controller.edit("só rascunho");
    timers.forEach((fn) => fn());
    await Promise.resolve();
    expect(official).toEqual({}); // rascunho salvo ≠ respondida

    const outcome = await confirmOfficialAnswer({
      value: "só rascunho",
      persisted: "",
      controller,
      saveAnswer: async (answer) => ({ ok: true, data: { answer, draftVersion: 2 } }),
      clearLocalDraft: () => {},
    });
    if (outcome.ok) official = withOfficialAnswer(official, "q", outcome.answer);
    expect(official).toEqual({ q: "só rascunho" });
  });
});

describe("rascunho antigo NÃO reaparece (resposta oficial 'abc', rascunho 'xyz', usuário volta a 'abc')", () => {
  function build(options: { officialOk: boolean }) {
    const storage = memoryStorage();
    const timers: Array<() => void> = [];
    const scheduler: Scheduler = { set: (fn) => (timers.push(fn), timers.length), clear: () => {} };
    const draftCalls: Array<[string, number]> = [];
    const controller = new AnswerDraftAutosave({
      scope: SCOPE,
      storage,
      // o PUT de rascunho FALHA (a limpeza avulsa não é confiável)
      save: async (text, version): Promise<SaveDraftOutcome> => {
        draftCalls.push([text, version]);
        return { ok: false, reason: "error", message: "offline" };
      },
      onChange: () => {},
      scheduler,
    });
    // estado: oficial 'abc'; Back guarda rascunho 'xyz' (versão 3); o campo já voltou a 'abc'
    controller.load({ official: "abc", text: "xyz", remote: { text: "xyz", version: 3, updatedAt: null } });
    controller.edit("abc");
    const officialCalls: string[] = [];
    const confirm = () =>
      confirmOfficialAnswer({
        value: "abc",
        persisted: "abc",
        controller,
        saveAnswer: async (answer) => {
          officialCalls.push(answer);
          return options.officialOk
            ? { ok: true, data: { answer, draftVersion: 4 } }
            : { ok: false, message: "Sem conexão." };
        },
        clearLocalDraft: () => {},
      });
    return { controller, storage, draftCalls, officialCalls, confirm };
  }

  it("a confirmação ainda chama o PUT oficial, mesmo com o texto igual e a limpeza avulsa indisponível", async () => {
    const { controller, officialCalls, draftCalls, confirm } = build({ officialOk: true });
    expect(controller.hasRemoteDraft()).toBe(true);

    const outcome = await confirm();

    expect(officialCalls).toEqual(["abc"]); // resposta oficial continua 'abc'
    expect(draftCalls.length).toBe(0); // sem segunda chamada só para limpar
    expect(outcome).toEqual({ ok: true, answer: "abc", changed: false, draftVersion: 4 });
  });

  it("depois do sucesso: rascunho do Back resolvido, versão nova é a base e nada reaparece ao reabrir", async () => {
    const { controller, storage, confirm } = build({ officialOk: true });
    await confirm();

    expect(controller.hasRemoteDraft()).toBe(false);
    expect(controller.getRemote()).toEqual({ text: null, version: 4, updatedAt: null });
    expect(getAnswerDraft(SCOPE, storage)).toBe(null);

    const reopened = resolveRestoredAnswer({
      official: "abc",
      remote: controller.getRemote(),
      local: getAnswerDraft(SCOPE, storage),
    });
    expect(reopened.source).toBe("official");
    expect(reopened.text).toBe("abc");
  });

  it("falha do PUT oficial: não confirma (não navega), rascunho do Back continua pendente e o erro é devolvido", async () => {
    const { controller, confirm } = build({ officialOk: false });

    const outcome = await confirm();

    expect(outcome).toEqual({ ok: false, reason: "error", message: "Sem conexão." });
    expect(controller.hasRemoteDraft()).toBe(true); // nada foi apagado
    expect(controller.getRemote().version).toBe(3);
  });

  it("uma nova tentativa depois da falha resolve o rascunho", async () => {
    const { controller, confirm } = build({ officialOk: false });
    await confirm();
    const retry = confirmOfficialAnswer({
      value: "abc",
      persisted: "abc",
      controller,
      saveAnswer: async (answer) => ({ ok: true, data: { answer, draftVersion: 4 } }),
      clearLocalDraft: () => {},
    });
    expect((await retry).ok).toBe(true);
    expect(controller.hasRemoteDraft()).toBe(false);
  });

  it("rascunho de OUTRO dispositivo (conflito) também conta como pendente", async () => {
    const timers: Array<() => void> = [];
    const controller = new AnswerDraftAutosave({
      scope: SCOPE,
      storage: memoryStorage(),
      save: async (): Promise<SaveDraftOutcome> => ({
        ok: false,
        reason: "conflict",
        message: "x",
        conflict: { text: "texto do B", version: 8, updatedAt: null },
      }),
      onChange: () => {},
      scheduler: { set: (fn) => (timers.push(fn), timers.length), clear: () => {} },
    });
    controller.load({ official: "abc", text: "abc", remote: { text: null, version: 7, updatedAt: null } });
    controller.edit("abc rascunho do A");
    timers.forEach((fn) => fn());
    for (let i = 0; i < 10; i += 1) await Promise.resolve();

    expect(controller.getSnapshot().status).toBe("conflict");
    expect(controller.hasRemoteDraft()).toBe(true);
  });
});

describe("PUT oficial versionado (multi-dispositivo)", () => {
  const conflictOf = (over: Partial<{ answer: string | null; draftText: string | null; draftVersion: number }> = {}) => ({
    answer: "Resposta A" as string | null,
    draftText: null as string | null,
    draftUpdatedAt: null as string | null,
    draftVersion: 5,
    ...over,
  });

  it("envia a versão do rascunho conhecida pelo controlador (depois do quiesce)", async () => {
    const { controller } = fakeController({
      getRemote: vi.fn(() => ({ text: null, version: 4, updatedAt: null })),
    });
    const saveAnswer = vi.fn(async (answer: string, _version: number) => ({
      ok: true as const,
      data: { answer, draftVersion: 5 },
    }));

    await confirmOfficialAnswer({ value: "Resposta A", persisted: "", controller, saveAnswer, clearLocalDraft: () => {} });

    expect(saveAnswer.mock.calls[0]).toEqual(["Resposta A", 4]);
  });

  it("sem controlador usa a versão conhecida do Back (ou 0)", async () => {
    const saveAnswer = vi.fn(async (answer: string, _version: number) => ({
      ok: true as const,
      data: { answer, draftVersion: 3 },
    }));
    await confirmOfficialAnswer({ value: "x", persisted: "", controller: null, knownVersion: () => 2, saveAnswer, clearLocalDraft: () => {} });
    await confirmOfficialAnswer({ value: "y", persisted: "", controller: null, saveAnswer, clearLocalDraft: () => {} });
    expect(saveAnswer.mock.calls.map((call) => call[1])).toEqual([2, 0]);
  });

  it("CONFLITO REAL (PC confirmou 'A' na v5; celular tenta 'B' com v4): não confirma, não navega e entrega o estado vigente", async () => {
    const { controller, calls } = fakeController({
      getRemote: vi.fn(() => ({ text: null, version: 4, updatedAt: null })),
    });
    const conflict = conflictOf();

    const outcome = await confirmOfficialAnswer({
      value: "Resposta B",
      persisted: "",
      controller,
      saveAnswer: async () => ({ ok: false, reason: "conflict", message: "alterada", conflict }),
      clearLocalDraft: () => {},
    });

    expect(outcome).toEqual({ ok: false, reason: "conflict", message: "alterada", conflict });
    expect(controller.confirmed.mock.calls.length).toBe(0);
    expect(controller.officialConflict.mock.calls[0]).toEqual([conflict, "alterada"]);
    expect(calls).toEqual(["quiesce", "officialConflict"]);
  });

  it("conflito com a mesma resposta MAS rascunho do outro dispositivo ainda existe: continua sendo conflito", async () => {
    const { controller } = fakeController();
    const outcome = await confirmOfficialAnswer({
      value: "Resposta A",
      persisted: "",
      controller,
      saveAnswer: async () => ({
        ok: false,
        reason: "conflict",
        message: "alterada",
        conflict: conflictOf({ draftText: "rascunho do B" }),
      }),
      clearLocalDraft: () => {},
    });
    expect(outcome.ok).toBe(false);
    expect(controller.confirmed.mock.calls.length).toBe(0);
  });

  it("RETRY APÓS TIMEOUT: o Back já aplicou (resposta == texto e sem rascunho) => sucesso, não conflito", async () => {
    const { controller } = fakeController({
      getRemote: vi.fn(() => ({ text: null, version: 4, updatedAt: null })),
    });

    const outcome = await confirmOfficialAnswer({
      value: "  Resposta A  ",
      persisted: "",
      controller,
      saveAnswer: async () => ({ ok: false, reason: "conflict", message: "alterada", conflict: conflictOf() }),
      clearLocalDraft: () => {},
    });

    expect(outcome).toEqual({ ok: true, answer: "Resposta A", changed: true, draftVersion: 5 });
    expect(controller.confirmed.mock.calls[0][0]).toEqual({ official: "Resposta A", draftVersion: 5 });
    expect(controller.officialConflict.mock.calls.length).toBe(0);
  });

  it("retry equivalente também vale para APAGAR a resposta (vigente null, sem rascunho)", async () => {
    const { controller } = fakeController();
    const outcome = await confirmOfficialAnswer({
      value: "   ",
      persisted: "antiga",
      controller,
      saveAnswer: async () => ({ ok: false, reason: "conflict", message: "x", conflict: conflictOf({ answer: null }) }),
      clearLocalDraft: () => {},
    });
    expect(outcome).toEqual({ ok: true, answer: "", changed: true, draftVersion: 5 });
  });

  it("entrevista enviada em outro dispositivo: trava o autosave, devolve not_in_progress e não confirma", async () => {
    const { controller, calls } = fakeController();
    const outcome = await confirmOfficialAnswer({
      value: "x",
      persisted: "",
      controller,
      saveAnswer: async () => ({ ok: false, reason: "not_in_progress", message: "enviada", interviewStatus: "PENDING_ASSIGNMENT" }),
      clearLocalDraft: () => {},
    });
    expect(outcome).toEqual({ ok: false, reason: "not_in_progress", message: "enviada", interviewStatus: "PENDING_ASSIGNMENT" });
    expect(calls).toEqual(["quiesce", "lock"]);
    expect(controller.resume.mock.calls.length).toBe(0);
  });

  describe("integração com o controlador real (PC x celular)", () => {
    function phoneController(storage: StorageLike) {
      const timers: Array<() => void> = [];
      const controller = new AnswerDraftAutosave({
        scope: SCOPE,
        storage,
        save: async (text, version): Promise<SaveDraftOutcome> => ({ ok: true, data: { text, version: version + 1, updatedAt: null } }),
        onChange: () => {},
        scheduler: { set: (fn) => (timers.push(fn), timers.length), clear: () => {} },
      });
      // celular abriu a Q3 na versão 4, sem resposta oficial
      controller.load({ official: "", text: "", remote: { text: null, version: 4, updatedAt: null } });
      return controller;
    }

    it("o celular preserva o texto 'B' localmente, entra em conflito de RESPOSTA e não grava nada", async () => {
      const storage = memoryStorage();
      const controller = phoneController(storage);
      controller.edit("Resposta B");

      const sent: Array<[string, number]> = [];
      const outcome = await confirmOfficialAnswer({
        value: "Resposta B",
        persisted: "",
        controller,
        saveAnswer: async (answer, version) => {
          sent.push([answer, version]);
          return { ok: false, reason: "conflict", message: "alterada em outro dispositivo", conflict: conflictOf() };
        },
        clearLocalDraft: () => {},
      });

      expect(sent).toEqual([["Resposta B", 4]]); // uma única tentativa, com a v4
      expect(outcome.ok).toBe(false);
      const snapshot = controller.getSnapshot();
      expect(snapshot.status).toBe("conflict");
      expect(snapshot.conflictKind).toBe("answer");
      expect(snapshot.text).toBe("Resposta B"); // texto do usuário intacto
      expect(getAnswerDraft(SCOPE, storage)?.text).toBe("Resposta B"); // e protegido localmente
      // a resposta vigente ('A') virou a base; o autosave não cria PUT enquanto há conflito
      expect(controller.hasRemoteDraft()).toBe(false);
    });

    it("decisão consciente: 'manter meu texto' grava B como RASCUNHO (nova versão); a oficial só muda numa nova confirmação", async () => {
      const storage = memoryStorage();
      const controller = phoneController(storage);
      controller.edit("Resposta B");
      await confirmOfficialAnswer({
        value: "Resposta B",
        persisted: "",
        controller,
        saveAnswer: async () => ({ ok: false, reason: "conflict", message: "x", conflict: conflictOf() }),
        clearLocalDraft: () => {},
      });

      await controller.keepMine();
      expect(controller.getRemote()).toEqual({ text: "Resposta B", version: 6, updatedAt: null });

      // nova confirmação, agora com a versão atual (6): sucesso
      const sent: Array<[string, number]> = [];
      const second = await confirmOfficialAnswer({
        value: "Resposta B",
        persisted: "Resposta A",
        controller,
        saveAnswer: async (answer, version) => {
          sent.push([answer, version]);
          return { ok: true, data: { answer, draftVersion: 7 } };
        },
        clearLocalDraft: () => {},
      });
      expect(sent).toEqual([["Resposta B", 6]]);
      expect(second.ok).toBe(true);
    });

    it("sessão stale: lock cancela o debounce, nenhuma gravação nasce e o texto local permanece", async () => {
      const storage = memoryStorage();
      const timers: Array<() => void> = [];
      const saves: string[] = [];
      const controller = new AnswerDraftAutosave({
        scope: SCOPE,
        storage,
        save: async (text, version): Promise<SaveDraftOutcome> => {
          saves.push(text);
          return { ok: true, data: { text, version: version + 1, updatedAt: null } };
        },
        onChange: () => {},
        scheduler: { set: (fn) => (timers.push(fn), timers.length), clear: () => {} },
      });
      controller.load({ official: "", text: "", remote: { text: null, version: 0, updatedAt: null } });
      controller.edit("digitando");
      controller.lock();

      timers.forEach((fn) => fn()); // mesmo que um timer antigo dispare
      await controller.flush();
      controller.edit("mais texto"); // edição ignorada
      await Promise.resolve();

      expect(saves).toEqual([]);
      expect(controller.isLocked()).toBe(true);
      expect(getAnswerDraft(SCOPE, storage)?.text).toBe("digitando"); // não apagou
    });
  });
});
