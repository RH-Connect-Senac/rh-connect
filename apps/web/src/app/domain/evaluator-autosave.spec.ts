import { describe, expect, it, vi } from "vitest";
import {
  AUTOSAVE_DELAY_MS,
  EvaluationAutosave,
  MANUAL_INVALID_MESSAGE,
  describeSync,
  type AutosaveSnapshot,
  type Scheduler,
} from "./evaluator-autosave";
import {
  formFromDraft,
  type DraftPayload,
  type EvaluationDraft,
  type EvaluationFormState,
} from "./evaluator-evaluation-form";
import {
  localDraftKey,
  readLocalDraft,
  writeLocalDraft,
  type StorageLike,
} from "./evaluator-local-draft";

const USER = "user-beatriz";
const ID = "11111111-1111-4111-8111-111111111111";

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
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

function draftOf(scores: EvaluationDraft["criteriaScores"], summary: string | null): EvaluationDraft {
  return {
    interviewId: ID,
    status: "DRAFT",
    criteriaScores: scores,
    summary,
    overallScore: null,
    updatedAt: null,
  };
}

// Resposta do backend para um payload (mesma mescla do Back).
function responseFor(base: EvaluationDraft, payload: DraftPayload): EvaluationDraft {
  return {
    ...base,
    criteriaScores: { ...base.criteriaScores, ...(payload.criteriaScores ?? {}) },
    summary: payload.summary === undefined ? base.summary : payload.summary,
    updatedAt: "2026-10-10T12:00:00.000Z",
  };
}

// Deixa promessas pendentes (cadeia de awaits) terminarem.
const flushAsync = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void };
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

function setup(options: { initial?: EvaluationDraft; localForm?: EvaluationFormState; saveImpl?: (payload: DraftPayload) => Promise<any> } = {}) {
  const base = options.initial ?? draftOf({ clarity: 8 }, "Do servidor");
  const storage = memoryStorage();
  const clock = fakeScheduler();
  const snapshots: AutosaveSnapshot[] = [];
  const payloads: DraftPayload[] = [];
  let server = base;
  const save = vi.fn(async (_id: string, payload: DraftPayload) => {
    payloads.push(payload);
    if (options.saveImpl) return options.saveImpl(payload);
    server = responseFor(server, payload);
    return { ok: true as const, data: server };
  });
  const controller = new EvaluationAutosave({
    userId: USER,
    interviewId: ID,
    storage,
    save,
    onChange: (snapshot) => snapshots.push(snapshot),
    scheduler: clock.scheduler,
  });
  const serverForm = formFromDraft(base);
  controller.load(base, options.localForm ?? serverForm, serverForm);
  const form = () => controller.getSnapshot().form;
  const change = (patch: { clarity?: string; coherence?: string; summary?: string }) => {
    const current = controller.getSnapshot().form;
    controller.edit({
      scores: {
        ...current.scores,
        ...(patch.clarity !== undefined ? { clarity: patch.clarity } : {}),
        ...(patch.coherence !== undefined ? { coherence: patch.coherence } : {}),
      },
      summary: patch.summary ?? current.summary,
    });
  };
  return { controller, storage, clock, snapshots, payloads, save, change, form, serverRef: () => server, base };
}

describe("autosave: debounce", () => {
  it("o delay padrão é 2000 ms", () => {
    expect(AUTOSAVE_DELAY_MS).toBe(2000);
  });

  it("alteração grava a cópia local IMEDIATAMENTE e NÃO faz PUT", () => {
    const t = setup();
    t.change({ coherence: "7" });
    expect(readLocalDraft(t.storage, USER, ID)?.criteriaScores.coherence).toBe("7");
    expect(t.save).not.toHaveBeenCalled();
  });

  it("não existe PUT por tecla, nem depois de várias teclas dentro do debounce", () => {
    const t = setup();
    for (const value of ["1", "12", "1", "7", "7,", "7,5"]) {
      t.change({ coherence: value });
      t.clock.advance(300);
    }
    expect(t.save).not.toHaveBeenCalled();
  });

  it("o PUT acontece só depois de ~2s sem editar", async () => {
    const t = setup();
    t.change({ coherence: "7" });
    t.clock.advance(1999);
    expect(t.save).not.toHaveBeenCalled();
    t.clock.advance(1);
    await t.controller.whenIdle();
    expect(t.save).toHaveBeenCalledTimes(1);
  });

  it("várias alterações dentro do debounce geram UM save consolidado com o estado final", async () => {
    const t = setup();
    t.change({ coherence: "5" });
    t.clock.advance(1500);
    t.change({ clarity: "9" });
    t.clock.advance(1500);
    t.change({ summary: "Final\ncom quebra" });
    t.clock.advance(2000);
    await t.controller.whenIdle();
    expect(t.save).toHaveBeenCalledTimes(1);
    expect(t.payloads[0]).toEqual({
      criteriaScores: { clarity: 9, coherence: 5 },
      summary: "Final\ncom quebra",
    });
  });

  it("o payload do PUT só tem criteriaScores e summary", async () => {
    const t = setup();
    t.change({ coherence: "6" });
    t.clock.advance(2000);
    await t.controller.whenIdle();
    expect(Object.keys(t.payloads[0]).sort()).toEqual(["criteriaScores", "summary"]);
  });
});

describe("autosave: sem save desnecessário", () => {
  it("sem alteração em relação ao servidor não há timer nem PUT", async () => {
    const t = setup();
    t.clock.advance(10000);
    await t.controller.whenIdle();
    expect(t.save).not.toHaveBeenCalled();
    expect(t.clock.pendingTimers()).toBe(0);
  });

  it("voltar ao valor do servidor cancela o autosave pendente", async () => {
    const t = setup();
    t.change({ clarity: "5" });
    expect(t.clock.pendingTimers()).toBe(1);
    t.change({ clarity: "8" });
    expect(t.clock.pendingTimers()).toBe(0);
    t.clock.advance(5000);
    await t.controller.whenIdle();
    expect(t.save).not.toHaveBeenCalled();
    expect(t.storage.data.size).toBe(0);
  });

  it("mesma nota em outra grafia (7,5 vs 7.5) não conta como alteração", async () => {
    const t = setup({ initial: draftOf({ clarity: 7.5 }, "x") });
    t.change({ clarity: "7,5" });
    t.clock.advance(5000);
    await t.controller.whenIdle();
    expect(t.save).not.toHaveBeenCalled();
  });

  it("sucesso não dispara novo PUT (sem loop save → resposta → save)", async () => {
    const t = setup();
    t.change({ coherence: "7" });
    t.clock.advance(2000);
    await t.controller.whenIdle();
    t.clock.advance(20000);
    await t.controller.whenIdle();
    expect(t.save).toHaveBeenCalledTimes(1);
  });
});

describe("autosave: validação", () => {
  it("valor inválido não vai ao backend e a cópia local fica", async () => {
    const t = setup();
    t.change({ coherence: "11" });
    expect(t.clock.pendingTimers()).toBe(0);
    t.clock.advance(10000);
    await t.controller.whenIdle();
    expect(t.save).not.toHaveBeenCalled();
    expect(t.controller.getSnapshot().status).toBe("invalid");
    expect(readLocalDraft(t.storage, USER, ID)?.criteriaScores.coherence).toBe("11");
  });

  it("corrigir o valor reativa o autosave", async () => {
    const t = setup();
    t.change({ coherence: "11" });
    t.change({ coherence: "9" });
    t.clock.advance(2000);
    await t.controller.whenIdle();
    expect(t.save).toHaveBeenCalledTimes(1);
    expect(t.payloads[0].criteriaScores?.coherence).toBe(9);
  });

  it("apagar uma nota já salva é inválido: nenhum PUT", async () => {
    const t = setup();
    t.change({ clarity: "" });
    t.clock.advance(5000);
    await t.controller.whenIdle();
    expect(t.save).not.toHaveBeenCalled();
    expect(t.controller.getSnapshot().status).toBe("invalid");
  });

  it("botão manual com formulário inválido não chama a API e informa o erro", async () => {
    const t = setup();
    t.change({ coherence: "abc" });
    await t.controller.flush();
    expect(t.save).not.toHaveBeenCalled();
    const snap = t.controller.getSnapshot();
    expect(snap.lastSave).toBe("manual");
    expect(snap.message).toBe(MANUAL_INVALID_MESSAGE);
  });
});

describe("autosave: sucesso e sincronização", () => {
  it("sincroniza o estado com a resposta do servidor e limpa a cópia local", async () => {
    const t = setup();
    t.change({ coherence: "7,5" });
    t.clock.advance(2000);
    await t.controller.whenIdle();
    const snap = t.controller.getSnapshot();
    expect(snap.status).toBe("saved");
    expect(snap.lastSave).toBe("auto");
    expect(snap.form.scores.coherence).toBe("7.5");
    expect(snap.serverForm.scores.coherence).toBe("7.5");
    expect(snap.draft.criteriaScores.coherence).toBe(7.5);
    expect(t.storage.data.size).toBe(0);
  });

  it("estados visuais: dirty → saving → saved", async () => {
    const gate = deferred<void>();
    const t = setup({
      saveImpl: async (payload) => {
        await gate.promise;
        return { ok: true as const, data: responseFor(draftOf({ clarity: 8 }, "Do servidor"), payload) };
      },
    });
    t.change({ coherence: "7" });
    expect(describeSync(t.controller.getSnapshot())).toBe("Alterações não salvas");
    t.clock.advance(2000);
    expect(describeSync(t.controller.getSnapshot())).toBe("Salvando...");
    gate.resolve();
    await t.controller.whenIdle();
    expect(describeSync(t.controller.getSnapshot())).toBe("Rascunho salvo");
  });
});

describe("autosave: concorrência (alteração durante o PUT)", () => {
  function gated() {
    const gates: Array<Deferred<void>> = [];
    const t = setup({
      saveImpl: async (payload) => {
        const gate = deferred<void>();
        gates.push(gate);
        await gate.promise;
        return { ok: true as const, data: responseFor(draftOf({ clarity: 8 }, "Do servidor"), payload) };
      },
    });
    return { t, gates };
  }

  it("alteração feita durante o PUT NÃO é perdida nem sobrescrita pela resposta antiga", async () => {
    const { t, gates } = gated();
    t.change({ summary: "versão 1" });
    t.clock.advance(2000); // PUT #1 em andamento
    expect(t.save).toHaveBeenCalledTimes(1);

    t.change({ summary: "versão 2 (digitada durante o PUT)" });
    gates[0].resolve(); // resposta antiga chega
    await flushAsync();

    const snap = t.controller.getSnapshot();
    expect(snap.form.summary).toBe("versão 2 (digitada durante o PUT)");
    expect(snap.serverForm.summary).toBe("versão 1");
    // a cópia local continua guardando a versão mais nova
    expect(readLocalDraft(t.storage, USER, ID)?.summary).toBe("versão 2 (digitada durante o PUT)");
  });

  it("depois da resposta antiga há um novo save da versão mais recente", async () => {
    const { t, gates } = gated();
    t.change({ summary: "versão 1" });
    t.clock.advance(2000);
    t.change({ summary: "versão 2" });
    gates[0].resolve();
    await flushAsync();
    t.clock.advance(2000); // debounce da versão 2
    await Promise.resolve();
    expect(t.save).toHaveBeenCalledTimes(2);
    expect(t.payloads[1].summary).toBe("versão 2");
    gates[1].resolve();
    await t.controller.whenIdle();
    const snap = t.controller.getSnapshot();
    expect(snap.form.summary).toBe("versão 2");
    expect(snap.status).toBe("saved");
    expect(t.storage.data.size).toBe(0);
  });

  it("no máximo UM PUT em andamento: debounce disparado durante o PUT espera", async () => {
    const { t, gates } = gated();
    t.change({ summary: "A" });
    t.clock.advance(2000); // #1 em andamento
    t.change({ summary: "B" });
    t.clock.advance(2000); // timer dispara com #1 ainda aberto
    expect(t.save).toHaveBeenCalledTimes(1);
    gates[0].resolve();
    await new Promise((r) => setTimeout(r, 0));
    expect(t.save).toHaveBeenCalledTimes(2);
    expect(t.payloads[1].summary).toBe("B");
    gates[1].resolve();
    await t.controller.whenIdle();
    expect(t.controller.getSnapshot().form.summary).toBe("B");
  });

  it("sucesso limpa a cópia local SOMENTE se não houve mudança posterior", async () => {
    const { t, gates } = gated();
    t.change({ coherence: "7" });
    t.clock.advance(2000);
    t.change({ coherence: "9" });
    gates[0].resolve();
    await flushAsync();
    expect(t.storage.data.size).toBe(1);
    expect(readLocalDraft(t.storage, USER, ID)?.criteriaScores.coherence).toBe("9");
  });

  it("voltar manualmente ao valor confirmado durante o PUT deixa o estado limpo", async () => {
    const { t, gates } = gated();
    t.change({ coherence: "7" });
    t.clock.advance(2000);
    t.change({ coherence: "7,0" }); // mesma nota, outra grafia
    gates[0].resolve();
    await t.controller.whenIdle();
    expect(t.save).toHaveBeenCalledTimes(1);
    expect(t.storage.data.size).toBe(0);
  });
});

describe("autosave: botão Salvar rascunho", () => {
  it("força o save imediato e cancela o debounce pendente (um único PUT)", async () => {
    const t = setup();
    t.change({ coherence: "6" });
    await t.controller.flush();
    expect(t.save).toHaveBeenCalledTimes(1);
    t.clock.advance(10000);
    await t.controller.whenIdle();
    expect(t.save).toHaveBeenCalledTimes(1);
    const snap = t.controller.getSnapshot();
    expect(snap.lastSave).toBe("manual");
    expect(snap.status).toBe("saved");
    expect(describeSync(snap)).toBe("Rascunho salvo");
  });

  it("clique durante um autosave não cria request paralela", async () => {
    const gates: Array<Deferred<void>> = [];
    let concurrent = 0;
    let maxConcurrent = 0;
    const t = setup({
      saveImpl: async (payload) => {
        concurrent += 1;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        const gate = deferred<void>();
        gates.push(gate);
        await gate.promise;
        concurrent -= 1;
        return { ok: true as const, data: responseFor(draftOf({ clarity: 8 }, "Do servidor"), payload) };
      },
    });
    t.change({ coherence: "6" });
    t.clock.advance(2000); // autosave em andamento
    t.change({ coherence: "7" });
    const manual = t.controller.flush(); // clique enquanto salva
    gates[0].resolve();
    await new Promise((r) => setTimeout(r, 0));
    gates[1]?.resolve();
    await manual;
    await t.controller.whenIdle();
    expect(maxConcurrent).toBe(1);
    expect(t.save).toHaveBeenCalledTimes(2);
    expect(t.payloads[1].criteriaScores?.coherence).toBe(7);
  });

  it("clique sem alterações não chama a API", async () => {
    const t = setup();
    await t.controller.flush();
    expect(t.save).not.toHaveBeenCalled();
  });

  it("retry manual imediato depois de falha", async () => {
    let calls = 0;
    const t = setup({
      saveImpl: async (payload) => {
        calls += 1;
        return calls === 1
          ? { ok: false as const, message: "Não foi possível salvar o rascunho. Tente novamente." }
          : { ok: true as const, data: responseFor(draftOf({ clarity: 8 }, "Do servidor"), payload) };
      },
    });
    t.change({ coherence: "6" });
    await t.controller.flush();
    expect(t.controller.getSnapshot().status).toBe("failed");
    await t.controller.flush();
    expect(t.controller.getSnapshot().status).toBe("saved");
    expect(t.save).toHaveBeenCalledTimes(2);
    expect(t.storage.data.size).toBe(0);
  });
});

describe("autosave: falha de rede/API", () => {
  const failing = async () => ({ ok: false as const, message: "Não foi possível salvar o rascunho. Tente novamente." });

  it("mantém a cópia local e os valores na tela; indica salvo neste dispositivo", async () => {
    const t = setup({ saveImpl: failing });
    t.change({ coherence: "6", summary: "texto\nlongo" });
    t.clock.advance(2000);
    await t.controller.whenIdle();
    const snap = t.controller.getSnapshot();
    expect(snap.status).toBe("failed");
    expect(snap.form.scores.coherence).toBe("6");
    expect(snap.form.summary).toBe("texto\nlongo");
    expect(describeSync(snap)).toBe("Alterações salvas neste dispositivo");
    expect(readLocalDraft(t.storage, USER, ID)?.summary).toBe("texto\nlongo");
  });

  it("não entra em loop de retry: nenhum PUT extra sem nova ação", async () => {
    const t = setup({ saveImpl: failing });
    t.change({ coherence: "6" });
    t.clock.advance(2000);
    await t.controller.whenIdle();
    t.clock.advance(60000);
    await t.controller.whenIdle();
    expect(t.save).toHaveBeenCalledTimes(1);
    expect(t.clock.pendingTimers()).toBe(0);
  });

  it("nova alteração depois da falha dispara uma nova tentativa (novo debounce)", async () => {
    let calls = 0;
    const t = setup({
      saveImpl: async (payload) => {
        calls += 1;
        return calls === 1
          ? { ok: false as const, message: "falhou" }
          : { ok: true as const, data: responseFor(draftOf({ clarity: 8 }, "Do servidor"), payload) };
      },
    });
    t.change({ coherence: "6" });
    t.clock.advance(2000);
    await t.controller.whenIdle();
    t.change({ coherence: "7" });
    t.clock.advance(2000);
    await t.controller.whenIdle();
    expect(t.save).toHaveBeenCalledTimes(2);
    expect(t.controller.getSnapshot().status).toBe("saved");
  });

  it("falha com alteração feita durante o PUT: sem retry automático (nem loop) e nada se perde", async () => {
    const gate = deferred<void>();
    const t = setup({
      saveImpl: async () => {
        await gate.promise;
        return { ok: false as const, message: "falhou" };
      },
    });
    t.change({ summary: "A" });
    t.clock.advance(2000); // PUT em andamento
    t.change({ summary: "B" });
    t.clock.advance(2000); // debounce dispara com o PUT aberto
    gate.resolve();
    await flushAsync();
    await t.controller.whenIdle();
    t.clock.advance(60000);
    await flushAsync();
    expect(t.save).toHaveBeenCalledTimes(1);
    expect(t.controller.getSnapshot().form.summary).toBe("B");
    expect(readLocalDraft(t.storage, USER, ID)?.summary).toBe("B");
  });

  it("exceção inesperada na API também preserva tudo", async () => {
    const t = setup({
      saveImpl: async () => {
        throw new Error("rede caiu");
      },
    });
    t.change({ coherence: "6" });
    t.clock.advance(2000);
    await t.controller.whenIdle();
    expect(t.controller.getSnapshot().status).toBe("failed");
    expect(t.storage.data.size).toBe(1);
  });
});

describe("autosave: cópia local recuperada", () => {
  it("cópia recuperada que difere do servidor é autosalva após o debounce", async () => {
    const base = draftOf({ clarity: 8 }, "Do servidor");
    const recovered = formFromDraft(base);
    recovered.scores.coherence = "7,5";
    recovered.summary = "Recuperado do navegador";
    const t = setup({ initial: base, localForm: recovered });
    expect(t.save).not.toHaveBeenCalled();
    expect(t.controller.getSnapshot().status).toBe("dirty");
    t.clock.advance(2000);
    await t.controller.whenIdle();
    expect(t.save).toHaveBeenCalledTimes(1);
    expect(t.payloads[0]).toEqual({
      criteriaScores: { clarity: 8, coherence: 7.5 },
      summary: "Recuperado do navegador",
    });
  });

  it("cópia recuperada inválida não vai ao backend e é mantida", async () => {
    const base = draftOf({ clarity: 8 }, "Do servidor");
    const recovered = formFromDraft(base);
    recovered.scores.coherence = "99";
    const t = setup({ initial: base, localForm: recovered });
    t.clock.advance(5000);
    await t.controller.whenIdle();
    expect(t.save).not.toHaveBeenCalled();
    expect(t.controller.getSnapshot().status).toBe("invalid");
  });

  it("sem diferença para o servidor nada é enviado", async () => {
    const t = setup();
    t.clock.advance(5000);
    await t.controller.whenIdle();
    expect(t.save).not.toHaveBeenCalled();
  });
});

describe("autosave: isolamento e limpeza", () => {
  it("usa a chave userId + interviewId e não toca na de outro usuário/entrevista", async () => {
    const t = setup();
    const other = localDraftKey("user-carlos", ID);
    const otherInterview = localDraftKey(USER, "22222222-2222-4222-8222-222222222222");
    t.storage.setItem(other, "x");
    t.storage.setItem(otherInterview, "y");
    t.change({ coherence: "6" });
    t.clock.advance(2000);
    await t.controller.whenIdle();
    expect(t.storage.getItem(localDraftKey(USER, ID))).toBeNull();
    expect(t.storage.getItem(other)).toBe("x");
    expect(t.storage.getItem(otherInterview)).toBe("y");
  });

  it("continuidade entre dispositivos: o que o autosave enviou é o que o servidor devolve", async () => {
    const t = setup();
    t.change({ coherence: "6", summary: "feito no dispositivo A" });
    t.clock.advance(2000);
    await t.controller.whenIdle();
    // dispositivo B: só enxerga o backend (nenhum localStorage de A)
    const deviceB = formFromDraft(t.serverRef());
    expect(deviceB.scores.coherence).toBe("6");
    expect(deviceB.summary).toBe("feito no dispositivo A");
  });

  it("destroy cancela o debounce e silencia callbacks (sem setState após unmount)", async () => {
    const t = setup();
    t.change({ coherence: "6" });
    const before = t.snapshots.length;
    t.controller.destroy();
    t.clock.advance(10000);
    await t.controller.whenIdle();
    expect(t.save).not.toHaveBeenCalled();
    expect(t.clock.pendingTimers()).toBe(0);
    t.change({ coherence: "7" });
    expect(t.snapshots.length).toBe(before);
  });

  it("destroy durante o PUT: a resposta não dispara callbacks", async () => {
    const gate = deferred<void>();
    const t = setup({
      saveImpl: async (payload) => {
        await gate.promise;
        return { ok: true as const, data: responseFor(draftOf({ clarity: 8 }, "Do servidor"), payload) };
      },
    });
    t.change({ coherence: "6" });
    t.clock.advance(2000);
    const before = t.snapshots.length;
    t.controller.destroy();
    gate.resolve();
    await t.controller.whenIdle();
    expect(t.snapshots.length).toBe(before);
  });

  it("writeLocalDraft direto continua independente do autosave", () => {
    const storage = memoryStorage();
    expect(writeLocalDraft(storage, USER, ID, formFromDraft(draftOf({}, null)))).toBe(true);
  });
});
