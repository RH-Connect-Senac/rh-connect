import { describe, expect, it } from "vitest";
import { criteriaProgressLabel, isInProgress, partitionQueue } from "./evaluator-queue-partition";
import type { EvaluatorQueueItem } from "../services/evaluator-interviews-service";

function item(id: string, evaluation?: EvaluatorQueueItem["evaluation"]): EvaluatorQueueItem {
  return {
    id,
    status: "ASSIGNED",
    candidate: { name: `Cand ${id}`, professionalTitle: null, city: null, state: null },
    jobTitle: "Vaga",
    company: null,
    location: null,
    workMode: null,
    assignedAt: null,
    submittedAt: null,
    questionCount: 3,
    evaluation,
  };
}

const progress = (inProgress: boolean, filledCriteria = 0) => ({
  status: "DRAFT" as const,
  startedAt: "2026-10-09T12:00:00.000Z",
  updatedAt: "2026-10-10T12:00:00.000Z",
  filledCriteria,
  totalCriteria: 7,
  hasSummary: false,
  inProgress,
});

describe("partitionQueue", () => {
  it("sem evaluation (ausente ou null) fica na Fila", () => {
    const result = partitionQueue([item("a"), item("b", null)]);
    expect(result.pending.map((i) => i.id)).toEqual(["a", "b"]);
    expect(result.inProgress).toEqual([]);
  });

  it("rascunho vazio (inProgress=false) fica na Fila", () => {
    const result = partitionQueue([item("a", progress(false))]);
    expect(result.pending.map((i) => i.id)).toEqual(["a"]);
    expect(result.inProgress).toEqual([]);
  });

  it("inProgress=true vai para Em Andamento e sai da Fila", () => {
    const result = partitionQueue([item("a", progress(true, 2)), item("b")]);
    expect(result.inProgress.map((i) => i.id)).toEqual(["a"]);
    expect(result.pending.map((i) => i.id)).toEqual(["b"]);
  });

  it("nunca duplica: pendentes + em andamento = total, ids disjuntos", () => {
    const items = [item("a", progress(true, 1)), item("b"), item("c", progress(false)), item("d", progress(true, 7))];
    const { pending, inProgress } = partitionQueue(items);
    expect(pending.length + inProgress.length).toBe(items.length);
    const ids = [...pending, ...inProgress].map((i) => i.id).sort();
    expect(ids).toEqual(["a", "b", "c", "d"]);
  });

  it("preserva a ordem recebida em cada lista", () => {
    const { inProgress, pending } = partitionQueue([
      item("z", progress(true, 1)),
      item("y"),
      item("x", progress(true, 2)),
      item("w"),
    ]);
    expect(inProgress.map((i) => i.id)).toEqual(["z", "x"]);
    expect(pending.map((i) => i.id)).toEqual(["y", "w"]);
  });

  it("lista vazia => duas listas vazias", () => {
    expect(partitionQueue([])).toEqual({ pending: [], inProgress: [] });
  });

  it("não recalcula: só o inProgress do servidor decide (critérios altos com inProgress=false ficam na Fila)", () => {
    expect(isInProgress(item("a", progress(false, 5)))).toBe(false);
    expect(isInProgress(item("a", progress(true, 0)))).toBe(true);
  });
});

describe("criteriaProgressLabel", () => {
  it("formata X / 7 critérios", () => {
    expect(criteriaProgressLabel(0, 7)).toBe("0 / 7 critérios");
    expect(criteriaProgressLabel(3, 7)).toBe("3 / 7 critérios");
    expect(criteriaProgressLabel(7, 7)).toBe("7 / 7 critérios");
  });
});
