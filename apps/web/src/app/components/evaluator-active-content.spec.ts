import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { EvaluatorActiveContent, type EvaluatorActiveState } from "./evaluator-active-content";
import type { EvaluatorQueueItem } from "../services/evaluator-interviews-service";

const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";

function item(id: string, filled: number, name = "Maria Candidata"): EvaluatorQueueItem {
  return {
    id,
    status: "ASSIGNED",
    candidate: { name, professionalTitle: null, city: null, state: null },
    jobTitle: "Secretária Comercial",
    company: "Clínica Exemplo",
    location: null,
    workMode: null,
    assignedAt: "2026-10-09T15:00:00.000Z",
    submittedAt: "2026-10-09T14:00:00.000Z",
    questionCount: 5,
    evaluation: {
      status: "DRAFT",
      startedAt: "2026-10-09T16:00:00.000Z",
      updatedAt: "2026-10-10T17:30:00.000Z",
      filledCriteria: filled,
      totalCriteria: 7,
      hasSummary: false,
      inProgress: true,
    },
  };
}

function render(state: EvaluatorActiveState, handlers: Partial<{ onContinue: (id: string) => void; onGoToQueue: () => void }> = {}) {
  return renderToStaticMarkup(
    createElement(EvaluatorActiveContent, {
      state,
      onContinue: handlers.onContinue ?? vi.fn(),
      onGoToQueue: handlers.onGoToQueue ?? vi.fn(),
      onRetry: vi.fn(),
    }),
  );
}

describe("EvaluatorActiveContent (Em Andamento real)", () => {
  it("loading", () => {
    expect(render({ status: "loading" })).toContain("Carregando avaliações em andamento...");
  });

  it("erro com a mensagem e Tentar novamente", () => {
    const html = render({ status: "error", message: "Não foi possível carregar." });
    expect(html).toContain("Não foi possível carregar.");
    expect(html).toContain("Tentar novamente");
  });

  it("vazio: mensagem própria e CTA Ir para a Fila", () => {
    const html = render({ status: "ready", items: [] });
    expect(html).toContain("Nenhuma em andamento");
    expect(html).toContain("Inicie uma avaliação da fila para aparecer aqui.");
    expect(html).toContain("Ir para a Fila");
    expect(html).not.toContain("Continuar");
  });

  it("lista: candidato, vaga, empresa, progresso X / 7 critérios e datas", () => {
    const html = render({ status: "ready", items: [item(ID_A, 3), item(ID_B, 7, "João Souza")] });
    expect(html).toContain("Maria Candidata");
    expect(html).toContain("João Souza");
    expect(html).toContain("Secretária Comercial");
    expect(html).toContain("Clínica Exemplo");
    expect(html).toContain("3 / 7 critérios");
    expect(html).toContain("7 / 7 critérios");
    expect(html).toContain("Iniciada em");
    expect(html).toContain("Última atualização em");
    expect(html).toContain('aria-valuenow="3"');
    expect(html).toContain('aria-valuemax="7"');
  });

  it("um cartão com botão Continuar por item", () => {
    const html = render({ status: "ready", items: [item(ID_A, 1), item(ID_B, 2)] });
    expect(html.match(/Continuar/g)?.length).toBe(2);
  });

  it("não traz conceitos do mock: progresso por questões, Tempo, Recomeçar, id cru", () => {
    const html = render({ status: "ready", items: [item(ID_A, 2)] });
    expect(html).not.toContain("Progresso das questões");
    expect(html).not.toContain("Tempo");
    expect(html).not.toContain("Recomeçar");
    expect(html).not.toContain(ID_A);
  });

  it("datas ausentes viram traço, sem quebrar", () => {
    const base = item(ID_A, 1);
    const html = render({
      status: "ready",
      items: [{ ...base, evaluation: { ...base.evaluation!, startedAt: null, updatedAt: null } }],
    });
    expect(html).toContain("Iniciada em —");
  });
});
