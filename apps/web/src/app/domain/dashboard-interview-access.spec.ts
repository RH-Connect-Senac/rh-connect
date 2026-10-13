import { describe, expect, it } from "vitest";
import {
  mergeInProgressEntries,
  resolveDashboardInterviewAccess,
  resolveNewInterviewGate,
  type InProgressListItem,
} from "./interview-resume";

const item = (id: string) => ({ id, title: "Dev", company: "Acme", createdAt: "2026-10-01T10:00:00Z", latestDraftUpdatedAt: null, answeredQuestionCount: 1, questionCount: 5, evaluationMode: null, status: "IN_PROGRESS" }) as unknown as InProgressListItem;
const accessFor = (server: InProgressListItem[] | null, local = false) =>
  resolveDashboardInterviewAccess(resolveNewInterviewGate(mergeInProgressEntries({ server, localInterviewId: local ? "x" : null, localActive: local })));

describe("acessos à entrevista no Dashboard (estado dinâmico)", () => {
  it("sem IN_PROGRESS: card principal e atalho oferecem nova entrevista", () => {
    const access = accessFor([]);
    expect(access.action).toBe("start");
    expect(access.main).toEqual({ title: "Nova entrevista", description: "Cole a URL da vaga e pratique com perguntas contextualizadas.", cta: "Praticar" });
    expect(access.quick).toEqual({ title: "Nova entrevista", description: "Use o link da vaga para contextualizar sua prática" });
  });

  it("com IN_PROGRESS: os dois acessos viram continuação, sem 'Praticar' nem 'Nova entrevista'", () => {
    const access = accessFor([item("a")]);
    expect(access.action).toBe("continue");
    expect(access.main).toEqual({
      title: "Entrevista em andamento",
      description: "Você tem uma entrevista que ainda não foi concluída. Continue de onde parou.",
      cta: "Continuar entrevista",
    });
    expect(access.quick).toEqual({ title: "Continuar entrevista", description: "Retome sua prática de onde parou." });
    const text = JSON.stringify(access);
    expect(text).not.toContain("Praticar");
    expect(text).not.toContain("Nova entrevista");
  });

  it("os dois acessos apontam para a mesma entrevista existente (a do gate)", () => {
    const gate = resolveNewInterviewGate(mergeInProgressEntries({ server: [item("a"), item("b")], localInterviewId: null, localActive: false }));
    expect(gate).toEqual({ blocked: true, resume: { source: "server", interviewId: "a" } });
    expect(resolveDashboardInterviewAccess(gate).action).toBe("continue");
  });

  it("após CANCELLED ou envio (a lista real deixa de trazer a entrevista) volta a 'Nova entrevista' / 'Praticar'", () => {
    expect(accessFor([item("a")]).action).toBe("continue");
    const after = accessFor([]);
    expect(after.action).toBe("start");
    expect(after.main.cta).toBe("Praticar");
    expect(after.main.title).toBe("Nova entrevista");
    // rascunho local de uma entrevista já não-IN_PROGRESS no Back não segura o estado de continuação
    expect(accessFor([], true).action).toBe("start");
  });

  it("fallback local enquanto a lista do Back não chegou continua oferecendo continuar", () => {
    expect(accessFor(null, true).action).toBe("continue");
    expect(accessFor(null, false).action).toBe("start");
  });
});
