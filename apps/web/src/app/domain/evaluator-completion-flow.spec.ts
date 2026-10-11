import { describe, expect, it, vi } from "vitest";
import {
  EvaluationCompletionFlow,
  type CompletionSnapshot,
} from "./evaluator-completion-flow";
import { emptyForm } from "./evaluator-evaluation-form";
import { localDraftKey, writeLocalDraft, type StorageLike } from "./evaluator-local-draft";

const USER = "user-beatriz";
const OTHER = "user-camila";
const ID = "11111111-1111-4111-8111-111111111111";
const flushAsync = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function memoryStorage(): StorageLike {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => (data.has(k) ? (data.get(k) as string) : null),
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

type Outcome =
  | { ok: true; data: { interviewId: string; overallScore: number | null; completedAt: string | null } }
  | { ok: false; reason: "invalid" | "not_found" | "conflict" | "error" | "unauthorized" | "forbidden"; message: string };

const SUCCESS: Outcome = {
  ok: true,
  data: { interviewId: ID, overallScore: 7.8, completedAt: "2026-10-10T13:00:00.000Z" },
};

function setup(impl: () => Promise<Outcome> = async () => SUCCESS, canComplete = true) {
  const storage = memoryStorage();
  const form = emptyForm();
  form.summary = "rascunho local";
  writeLocalDraft(storage, USER, ID, form);
  writeLocalDraft(storage, OTHER, ID, form);
  const snapshots: CompletionSnapshot[] = [];
  const complete = vi.fn(async (_id: string) => impl());
  const flow = new EvaluationCompletionFlow({
    userId: USER,
    interviewId: ID,
    storage,
    complete,
    canComplete: () => canComplete,
    onChange: (s) => snapshots.push(s),
  });
  const has = (user: string) => storage.getItem(localDraftKey(user, ID)) !== null;
  return { flow, storage, snapshots, complete, has };
}

describe("fluxo de conclusão: confirmação", () => {
  it("o primeiro clique só abre a confirmação: NENHUM POST", () => {
    const t = setup();
    t.flow.requestConfirm();
    expect(t.flow.getSnapshot().phase).toBe("confirming");
    expect(t.complete).not.toHaveBeenCalled();
  });
  it("Cancelar volta a idle sem chamar a API e sem apagar a cópia local", () => {
    const t = setup();
    t.flow.requestConfirm();
    t.flow.cancel();
    expect(t.flow.getSnapshot().phase).toBe("idle");
    expect(t.complete).not.toHaveBeenCalled();
    expect(t.has(USER)).toBe(true);
  });
  it("confirm sem confirmação aberta não faz POST", async () => {
    const t = setup();
    await t.flow.confirm();
    expect(t.complete).not.toHaveBeenCalled();
  });
  it("avaliação incompleta (canComplete=false) nem abre a confirmação", () => {
    const t = setup(undefined, false);
    t.flow.requestConfirm();
    expect(t.flow.getSnapshot().phase).toBe("idle");
  });
});

describe("fluxo de conclusão: POST", () => {
  it("confirma => UM POST com o interviewId, estado submitting durante", async () => {
    let release!: (o: Outcome) => void;
    const t = setup(() => new Promise<Outcome>((r) => (release = r)));
    t.flow.requestConfirm();
    const pending = t.flow.confirm();
    expect(t.flow.getSnapshot().phase).toBe("submitting");
    expect(t.complete).toHaveBeenCalledTimes(1);
    expect(t.complete.mock.calls[0][0]).toBe(ID);
    release(SUCCESS);
    await pending;
    expect(t.flow.getSnapshot().phase).toBe("done");
  });
  it("duplo clique / confirmações repetidas não geram novo POST", async () => {
    let release!: (o: Outcome) => void;
    const t = setup(() => new Promise<Outcome>((r) => (release = r)));
    t.flow.requestConfirm();
    const a = t.flow.confirm();
    const b = t.flow.confirm();
    t.flow.requestConfirm();
    t.flow.cancel();
    expect(t.flow.getSnapshot().phase).toBe("submitting");
    release(SUCCESS);
    await Promise.all([a, b]);
    expect(t.complete).toHaveBeenCalledTimes(1);
  });
  it("depois de concluído nada reabre nem reenvia", async () => {
    const t = setup();
    t.flow.requestConfirm();
    await t.flow.confirm();
    t.flow.requestConfirm();
    await t.flow.confirm();
    expect(t.flow.getSnapshot().phase).toBe("done");
    expect(t.complete).toHaveBeenCalledTimes(1);
  });
  it("sucesso guarda nota e data do response", async () => {
    const t = setup();
    t.flow.requestConfirm();
    await t.flow.confirm();
    expect(t.flow.getSnapshot().result).toEqual(SUCCESS.ok ? SUCCESS.data : null);
  });
});

describe("fluxo de conclusão: cópia local", () => {
  it("sucesso apaga SOMENTE a cópia do usuário+entrevista", async () => {
    const t = setup();
    t.flow.requestConfirm();
    await t.flow.confirm();
    expect(t.has(USER)).toBe(false);
    expect(t.has(OTHER)).toBe(true);
  });
  it.each([
    ["invalid", "Preencha tudo"],
    ["not_found", "x"],
    ["conflict", "x"],
    ["error", "x"],
    ["unauthorized", "x"],
  ] as const)("falha %s NÃO apaga a cópia local e mostra o erro", async (reason, message) => {
    const t = setup(async () => ({ ok: false, reason, message }));
    t.flow.requestConfirm();
    await t.flow.confirm();
    const snap = t.flow.getSnapshot();
    expect(snap.phase).toBe("error");
    expect(snap.error).toEqual({ reason, message });
    expect(t.has(USER)).toBe(true);
  });
  it("exceção inesperada (rede) vira erro e preserva a cópia", async () => {
    const t = setup(async () => {
      throw new Error("boom");
    });
    t.flow.requestConfirm();
    await t.flow.confirm();
    expect(t.flow.getSnapshot().phase).toBe("error");
    expect(t.flow.getSnapshot().error?.reason).toBe("error");
    expect(t.has(USER)).toBe(true);
  });
  it("após falha 500 dá para tentar de novo e então concluir", async () => {
    let n = 0;
    const t = setup(async () => (++n === 1 ? { ok: false, reason: "error", message: "x" } : SUCCESS));
    t.flow.requestConfirm();
    await t.flow.confirm();
    expect(t.flow.getSnapshot().phase).toBe("error");
    t.flow.requestConfirm();
    await t.flow.confirm();
    expect(t.flow.getSnapshot().phase).toBe("done");
    expect(t.complete).toHaveBeenCalledTimes(2);
    expect(t.has(USER)).toBe(false);
  });
});

describe("fluxo de conclusão: sair da tela", () => {
  it("destroy silencia callbacks e não limpa a cópia nem altera estado depois", async () => {
    let release!: (o: Outcome) => void;
    const t = setup(() => new Promise<Outcome>((r) => (release = r)));
    t.flow.requestConfirm();
    const pending = t.flow.confirm();
    const before = t.snapshots.length;
    t.flow.destroy();
    release(SUCCESS);
    await pending;
    await flushAsync();
    expect(t.snapshots.length).toBe(before);
    expect(t.has(USER)).toBe(true);
  });
  it("destruído, requestConfirm/confirm não fazem nada", async () => {
    const t = setup();
    t.flow.destroy();
    t.flow.requestConfirm();
    await t.flow.confirm();
    expect(t.complete).not.toHaveBeenCalled();
    expect(t.snapshots).toHaveLength(0);
  });
});
