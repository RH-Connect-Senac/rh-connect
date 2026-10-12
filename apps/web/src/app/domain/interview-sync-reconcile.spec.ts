import { describe, expect, it } from "vitest";
import { diffQuestionState, diffServerState, type KnownQuestionState, type ServerQuestionState } from "./interview-sync-reconcile";
import { deriveHighestReachedIndex } from "../services/interview-ux-state";

const known = (answer: string, text: string | null, version: number): KnownQuestionState => ({
  answer,
  draft: { text, version, updatedAt: null },
});
const server = (id: string, over: Partial<ServerQuestionState> = {}): ServerQuestionState => ({
  id,
  answer: null,
  draftText: null,
  draftUpdatedAt: null,
  draftVersion: 0,
  ...over,
});

describe("diffQuestionState", () => {
  it("sem mudança: null (nada a aplicar)", () => {
    expect(diffQuestionState(known("", null, 0), server("q1"))).toBeNull();
    expect(diffQuestionState(known("a", "d", 2), server("q1", { answer: "a", draftText: "d", draftVersion: 2 }))).toBeNull();
  });

  it("resposta oficial remota é detectada", () => {
    const change = diffQuestionState(known("", null, 0), server("q1", { answer: "feita no celular", draftVersion: 1 }));
    expect(change?.answerChanged).toBe(true);
    expect(change?.answer).toBe("feita no celular");
  });

  it("rascunho remoto novo (versão maior) é detectado", () => {
    const change = diffQuestionState(known("", null, 1), server("q1", { draftText: "novo", draftVersion: 2 }));
    expect(change?.draftChanged).toBe(true);
    expect(change?.answerChanged).toBe(false);
  });

  it("versão MENOR (leitura velha, nosso save chegou depois) nunca retrocede", () => {
    expect(diffQuestionState(known("", "meu", 5), server("q1", { draftText: "antigo", draftVersion: 4 }))).toBeNull();
  });

  it("fim de linha diferente com a mesma versão não conta como mudança", () => {
    expect(diffQuestionState(known("", "a\nb", 2), server("q1", { draftText: "a\r\nb", draftVersion: 2 }))).toBeNull();
  });
});

describe("diffServerState + progresso", () => {
  const ids = ["q1", "q2", "q3", "q4", "q5"];

  it("PC na Q1, celular confirma Q1 e Q2: as duas mudam e a Q3 deixa de estar bloqueada", () => {
    const state: Record<string, KnownQuestionState> = Object.fromEntries(ids.map((id) => [id, known("", null, 0)]));
    const serverList = ids.map((id) => server(id, id === "q1" || id === "q2" ? { answer: `resp ${id}`, draftVersion: 1 } : {}));
    const changes = diffServerState(serverList, (id) => state[id]);
    expect(changes.map((c) => c.id)).toEqual(["q1", "q2"]);

    const answered = changes.filter((c) => c.answer.trim()).map((c) => ids.indexOf(c.id));
    const highestBefore = deriveHighestReachedIndex({ storedHighest: 0, currentIndex: 0, answeredIndexes: [], questionCount: 5 });
    const highestAfter = deriveHighestReachedIndex({ storedHighest: 0, currentIndex: 0, answeredIndexes: answered, questionCount: 5 });
    expect(highestBefore).toBe(0);
    expect(highestAfter).toBe(2); // Q3 acessível (pendente), Q4/Q5 seguem bloqueadas
  });

  it("rascunho remoto na Q3 não conta como resposta, mas a mantém acessível", () => {
    const answeredIndexes = [0, 1];
    const highest = deriveHighestReachedIndex({ storedHighest: 0, currentIndex: 0, answeredIndexes, draftedIndexes: [2], questionCount: 5 });
    expect(highest).toBe(2);
    expect(answeredIndexes.includes(2)).toBe(false);
  });
});
