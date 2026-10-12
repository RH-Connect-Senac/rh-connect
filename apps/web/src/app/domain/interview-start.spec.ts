import { describe, expect, it, vi } from "vitest";
import { startInterviewForContext } from "./interview-start";
import type { CandidateInterviewResult } from "../services/candidate-interviews-service";

const CONTEXT = { sourceUrl: "https://empregare.com/vaga-x", title: "Vaga X" };
const question = (id: string) => ({ id, type: "Tecnica", text: "?" });

function fakeApi(statusById: Record<string, "IN_PROGRESS" | "CANCELLED">) {
  let seq = 0;
  const calls: string[] = [];
  const create = vi.fn(async (): Promise<CandidateInterviewResult<{ id: string }>> => {
    const id = `interview-${String.fromCharCode(66 + seq++)}`; // B, C...
    statusById[id] = "IN_PROGRESS";
    calls.push(`create:${id}`);
    return { ok: true, data: { id } };
  });
  const generate = vi.fn(async (id: string): Promise<CandidateInterviewResult<ReturnType<typeof question>[]>> => {
    calls.push(`generate:${id}`);
    if (statusById[id] === "CANCELLED") {
      return { ok: false, reason: "not_in_progress", message: "Esta entrevista foi cancelada e não aceita mais alterações.", interviewStatus: "CANCELLED" };
    }
    return { ok: true, data: [question(`${id}-q1`)] };
  });
  return { create, generate, calls };
}

describe("mesma vaga após CANCELLED gera uma entrevista NOVA", () => {
  it("sem id atual (estado limpo): cria B ≠ A, IN_PROGRESS, e gera perguntas com B", async () => {
    const api = fakeApi({ "interview-A": "CANCELLED" });
    const outcome = await startInterviewForContext({ context: CONTEXT, create: api.create, generate: api.generate });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.interviewId).toBe("interview-B");
    expect(outcome.interviewId === "interview-A").toBe(false);
    expect(api.calls).toEqual(["create:interview-B", "generate:interview-B"]);
    expect(api.create).toHaveBeenCalledWith(CONTEXT);
    expect(api.calls.some((call) => call.endsWith("interview-A"))).toBe(false);
  });

  it("estado residual da A cancelada (F5 na tela terminal): descarta A, cria B e nenhuma mutação usa A depois", async () => {
    const api = fakeApi({ "interview-A": "CANCELLED" });
    const onObsolete = vi.fn();
    const onCreated = vi.fn();
    const outcome = await startInterviewForContext({
      context: CONTEXT,
      currentInterviewId: "interview-A",
      create: api.create,
      generate: api.generate,
      onCreated,
      onObsolete,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.interviewId).toBe("interview-B");
    expect(onObsolete).toHaveBeenCalledWith("interview-A");
    expect(onCreated).toHaveBeenCalledWith("interview-B");
    expect(api.calls).toEqual(["generate:interview-A", "create:interview-B", "generate:interview-B"]);
    expect(api.calls.indexOf("create:interview-B") < api.calls.lastIndexOf("generate:interview-B")).toBe(true);
  });

  it("id atual ainda IN_PROGRESS (voltar/avançar): é reaproveitado, sem criar outra", async () => {
    const api = fakeApi({ "interview-A": "IN_PROGRESS" });
    const outcome = await startInterviewForContext({ context: CONTEXT, currentInterviewId: "interview-A", create: api.create, generate: api.generate });
    expect(outcome.ok && outcome.interviewId).toBe("interview-A");
    expect(api.create).not.toHaveBeenCalled();
  });

  it("regra de uma IN_PROGRESS intacta: 409 already_in_progress vira o gate, sem gerar perguntas", async () => {
    const generate = vi.fn();
    const outcome = await startInterviewForContext({
      context: CONTEXT,
      create: async () => ({ ok: false, reason: "already_in_progress", message: "Você já possui uma entrevista em andamento.", existingInterviewId: "interview-Z" }),
      generate,
    });
    expect(outcome).toEqual({ ok: false, kind: "already_in_progress", existingInterviewId: "interview-Z" });
    expect(generate).not.toHaveBeenCalled();
  });

  it("falha genérica não troca de entrevista nem esconde a mensagem", async () => {
    const outcome = await startInterviewForContext({
      context: CONTEXT,
      currentInterviewId: "interview-A",
      create: async () => ({ ok: true, data: { id: "x" } }),
      generate: async () => ({ ok: false, reason: "error", message: "Falha" }),
    });
    expect(outcome).toEqual({ ok: false, kind: "error", message: "Falha" });
  });
});
