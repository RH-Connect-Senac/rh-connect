import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  BACK_TO_HISTORY_LABEL,
  EvaluatorHistoryContent,
  EvaluatorHistoryDetailContent,
  filterHistoryItems,
  historySubtitle,
  type EvaluatorHistoryDetailState,
  type EvaluatorHistoryState,
} from "./evaluator-history-content";
import { EVALUATION_CRITERIA } from "../domain/evaluator-evaluation-form";
import type {
  CompletedEvaluationDetail,
  CompletedEvaluationItem,
} from "../services/evaluator-interviews-service";

const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";

const maria: CompletedEvaluationItem = {
  id: ID_A,
  candidate: { name: "Maria Candidata", professionalTitle: "Secretária", city: "Brasília", state: "DF" },
  jobTitle: "Secretária Comercial",
  company: "Clínica Exemplo",
  overallScore: 8.5,
  completedAt: "2026-10-11T12:00:00.000Z",
  questionCount: 5,
};
const joao: CompletedEvaluationItem = {
  id: ID_B,
  candidate: { name: "João Souza", professionalTitle: null, city: null, state: null },
  jobTitle: "Auxiliar Administrativo",
  company: null,
  overallScore: 6.5,
  completedAt: "2026-10-10T12:00:00.000Z",
  questionCount: 4,
};

function listHtml(state: EvaluatorHistoryState, search = "") {
  return renderToStaticMarkup(
    createElement(EvaluatorHistoryContent, {
      state,
      search,
      onSearchChange: vi.fn(),
      onView: vi.fn(),
      onRetry: vi.fn(),
    }),
  );
}

describe("histórico real: lista", () => {
  it("loading", () => {
    expect(listHtml({ status: "loading" })).toContain("Carregando histórico...");
  });

  it("erro mostra a mensagem e o botão de tentar novamente", () => {
    const html = listHtml({ status: "error", message: "Não foi possível carregar." });
    expect(html).toContain("Não foi possível carregar.");
    expect(html).toContain("Tentar novamente");
  });

  it("vazio: mensagem própria e sem tabela nem campo de busca", () => {
    const html = listHtml({ status: "ready", items: [] });
    expect(html).toContain("Nenhuma avaliação concluída");
    expect(html).not.toContain("<table");
  });

  it("lista: candidato, vaga, média final e ação por item", () => {
    const html = listHtml({ status: "ready", items: [maria, joao] });
    expect(html).toContain("Maria Candidata");
    expect(html).toContain("João Souza");
    expect(html).toContain("Secretária Comercial");
    expect(html).toContain("8,5");
    expect(html).toContain("6,5");
    expect(html).toContain("Ver avaliação de Maria Candidata");
    expect(html).toContain('data-history-row="' + ID_A + '"');
  });

  it("não tem botão Exportar nem controles de edição", () => {
    const html = listHtml({ status: "ready", items: [maria] });
    expect(html).not.toContain("Exportar");
    expect(html).not.toContain("Editar");
    expect(html).not.toContain("Concluir");
  });

  it("busca sem resultado mostra estado próprio", () => {
    const html = listHtml({ status: "ready", items: [maria, joao] }, "zzz");
    expect(html).toContain("Nenhuma avaliação encontrada");
    expect(html).not.toContain("<table");
  });

  it("filterHistoryItems: por candidato, vaga e empresa, sem diferenciar maiúsculas", () => {
    const items = [maria, joao];
    expect(filterHistoryItems(items, "").length).toBe(2);
    expect(filterHistoryItems(items, "  ")).toEqual(items);
    expect(filterHistoryItems(items, "MARIA")).toEqual([maria]);
    expect(filterHistoryItems(items, "auxiliar")).toEqual([joao]);
    expect(filterHistoryItems(items, "clínica")).toEqual([maria]);
    expect(filterHistoryItems(items, "nada")).toEqual([]);
  });

  it("subtítulo: contagem com singular/plural", () => {
    expect(historySubtitle({ status: "loading" })).toBe("Avaliações que você já concluiu");
    expect(historySubtitle({ status: "ready", items: [maria] })).toBe("1 avaliação concluída");
    expect(historySubtitle({ status: "ready", items: [maria, joao] })).toBe("2 avaliações concluídas");
  });
});

function scores(value: number) {
  const out: CompletedEvaluationDetail["evaluation"]["criteriaScores"] = {};
  for (const c of EVALUATION_CRITERIA) out[c.key] = value;
  return out;
}

const detail: CompletedEvaluationDetail = {
  id: ID_A,
  submittedAt: "2026-10-09T11:00:00.000Z",
  candidate: maria.candidate,
  context: {
    sourceUrl: null,
    title: "Secretária Comercial",
    company: "Clínica Exemplo",
    summary: null,
    activities: [],
    requirements: [],
    location: "Três Lagoas/MS",
    contractType: "PJ",
    workMode: "HYBRID",
  },
  questions: [
    { id: "q1", position: 1, type: "TECHNICAL", text: "Como organiza agendas?", answer: "Calendário compartilhado", answeredAt: null },
    { id: "q2", position: 2, type: "BEHAVIORAL", text: "Conte um desafio.", answer: null, answeredAt: null },
  ],
  evaluation: {
    criteriaScores: { ...scores(8), clarity: 9 },
    summary: "Linha 1\nLinha 2",
    overallScore: 8.1,
    completedAt: "2026-10-11T12:00:00.000Z",
  },
};

function detailHtml(state: EvaluatorHistoryDetailState) {
  return renderToStaticMarkup(
    createElement(EvaluatorHistoryDetailContent, {
      state,
      ui: { onBack: vi.fn(), onRetry: vi.fn() },
    }),
  );
}

describe("histórico real: detalhe somente leitura", () => {
  const html = detailHtml({ status: "ready", detail });

  it("mostra candidato, vaga, perguntas, respostas, critérios, comentário e data", () => {
    expect(html).toContain("Avaliação concluída");
    expect(html).toContain("Maria Candidata");
    expect(html).toContain("Secretária Comercial");
    expect(html).toContain("Como organiza agendas?");
    expect(html).toContain("Calendário compartilhado");
    expect(html).toContain("Sem resposta registrada.");
    for (const criterion of EVALUATION_CRITERIA) expect(html).toContain(criterion.label);
    expect(html).toContain("Linha 1");
    expect(html).toContain("Concluída em");
  });

  it('usa "Média final" (nunca "Média prevista") e a nota do servidor', () => {
    expect(html).toContain("Média final");
    expect(html).not.toContain("Média prevista");
    expect(html).toContain("8,1");
    expect(html).not.toContain("apenas para conferência");
  });

  it("sem nota do servidor, usa a média dos critérios", () => {
    const fallback = detailHtml({
      status: "ready",
      detail: { ...detail, evaluation: { ...detail.evaluation, overallScore: null, criteriaScores: scores(7) } },
    });
    expect(fallback).toContain("7,0");
  });

  it("é somente leitura: sem editar, concluir, confirmar nem campos", () => {
    expect(html).toContain('data-readonly="true"');
    expect(html).not.toContain("Editar avaliação");
    expect(html).not.toContain("Voltar e editar");
    expect(html).not.toContain("Concluir avaliação");
    expect(html).not.toContain("Revisar avaliação");
    expect(html).not.toContain("<textarea");
    expect(html).not.toContain("<input");
    expect(html).not.toContain('role="alertdialog"');
    expect(html).not.toContain("Rascunho");
  });

  it("oferece apenas o retorno seguro ao histórico", () => {
    expect(html).toContain(BACK_TO_HISTORY_LABEL);
    expect(html).toContain('data-action="back-to-history"');
  });

  it("não mostra e-mail do candidato", () => {
    expect(html).not.toMatch(/@[a-z0-9-]+\.[a-z]{2,}/i);
  });

  it("estados: loading, não encontrada e erro", () => {
    expect(detailHtml({ status: "loading" })).toContain("Carregando avaliação...");
    const missing = detailHtml({ status: "not_found", message: "Indisponível." });
    expect(missing).toContain("Avaliação não encontrada ou indisponível");
    expect(missing).toContain(BACK_TO_HISTORY_LABEL);
    const failed = detailHtml({ status: "error", message: "Falhou." });
    expect(failed).toContain("Falhou.");
    expect(failed).toContain("Tentar novamente");
    expect(failed).toContain(BACK_TO_HISTORY_LABEL);
  });
});
