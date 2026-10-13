import { describe, expect, it } from "vitest";
import type { RealInterviewResult } from "../services/candidate-interviews-service";
import {
  REPORT_NOT_AVAILABLE_MESSAGE,
  UNSUPPORTED_REPORT_VIEW,
  buildReportCriteria,
  buildReportView,
  describeReportFailure,
  isSupportedReportResult,
} from "./candidate-report-view";

const CRITERIA = {
  clarity: 8,
  coherence: 7,
  objectivity: 9,
  domain_knowledge: 6,
  organization: 8,
  requirements_alignment: 7,
  examples: 5,
};

function result(overrides: Partial<RealInterviewResult> = {}): RealInterviewResult {
  return {
    interview: {
      id: "11111111-1111-4111-8111-111111111111",
      status: "COMPLETED",
      evaluationMode: "HUMAN",
      submittedAt: "2026-10-12T13:00:00.000Z",
      createdAt: "2026-10-12T12:00:00.000Z",
      assignedAt: "2026-10-13T01:00:00.000Z",
      completedAt: "2026-10-13T03:28:52.775Z",
      title: "Analista de Dados",
      company: "ACME",
      context: {
        sourceUrl: "",
        title: "Analista de Dados",
        company: "ACME",
        summary: "",
        activities: [],
        requirements: [],
        location: "Brasília - DF",
        contractType: "CLT",
        workMode: "HYBRID",
      },
    },
    evaluation: { overallScore: 5.6, criteriaScores: CRITERIA, summary: "Bom desempenho geral.", completedAt: "2026-10-13T03:28:52.775Z" },
    questions: [
      { id: "q2", position: 2, type: "Comportamental", text: "Conte um conflito.", answer: "Conversei.", answeredAt: null },
      { id: "q1", position: 1, type: "Tecnica", text: "Fale de SQL.", answer: "Uso há 3 anos.", answeredAt: null },
    ],
    ...overrides,
  };
}

describe("relatório real (6A.3): critérios", () => {
  it("expõe os 7 critérios reais, na ordem canônica, com os rótulos aprovados", () => {
    const criteria = buildReportCriteria({ ...CRITERIA });
    expect(criteria.map((c) => c.key)).toEqual([
      "clarity",
      "coherence",
      "objectivity",
      "domain_knowledge",
      "organization",
      "requirements_alignment",
      "examples",
    ]);
    expect(criteria.map((c) => c.label)).toEqual([
      "Clareza",
      "Coerência",
      "Objetividade",
      "Domínio",
      "Organização",
      "Aderência aos requisitos",
      "Capacidade de exemplificar",
    ]);
    expect(criteria.map((c) => c.score)).toEqual([8, 7, 9, 6, 8, 7, 5]);
  });

  it("as chaves reais não são alteradas e chaves desconhecidas/antigas são ignoradas", () => {
    const criteria = buildReportCriteria({ clarity: 8, hacker: 10, "Aderência aos requisitos": 3, DOMAIN: 4 });
    expect(criteria.map((c) => c.key)).toEqual(["clarity"]);
  });

  it("rótulos curtos só no eixo do gráfico", () => {
    const criteria = buildReportCriteria({ ...CRITERIA });
    expect(criteria.find((c) => c.key === "requirements_alignment")).toMatchObject({ label: "Aderência aos requisitos", chartLabel: "Aderência" });
    expect(criteria.find((c) => c.key === "examples")).toMatchObject({ label: "Capacidade de exemplificar", chartLabel: "Exemplos" });
    expect(criteria.find((c) => c.key === "clarity")).toMatchObject({ label: "Clareza", chartLabel: "Clareza" });
  });
});

describe("relatório real (6A.3): visão", () => {
  it("usa a nota geral do backend (5.6), nunca a média dos critérios", () => {
    const view = buildReportView(result());
    const mean = Object.values(CRITERIA).reduce((sum, value) => sum + value, 0) / 7;
    expect(view.overallScore).toBe(5.6);
    expect(view.overallScore).not.toBe(mean);
  });

  it("parecer e perguntas/respostas reais, ordenadas por posição, sem nota por pergunta", () => {
    const view = buildReportView(result());
    expect(view.summary).toBe("Bom desempenho geral.");
    expect(view.questions.map((q) => q.position)).toEqual([1, 2]);
    expect(view.questions[0]).toMatchObject({ typeLabel: "Técnica", text: "Fale de SQL.", answer: "Uso há 3 anos." });
    for (const question of view.questions) {
      expect(Object.keys(question)).not.toEqual(expect.arrayContaining(["score"]));
      expect(Object.keys(question).join(",")).not.toMatch(/score|justif|comment|feedback/i);
    }
  });

  it("mostra só dados reais da vaga (sem placeholder para campo vazio)", () => {
    const full = buildReportView(result());
    expect(full.details.map((d) => d.label)).toEqual([
      "Empresa",
      "Local",
      "Contrato",
      "Modalidade de trabalho",
      "Enviada em",
      "Avaliação concluída em",
    ]);
    expect(full.details.find((d) => d.label === "Modalidade de trabalho")?.value).toBe("Híbrido");

    const base = result();
    const sparse = buildReportView(
      result({
        interview: {
          ...base.interview,
          company: null,
          submittedAt: null,
          context: { ...base.interview.context, location: null, contractType: null, workMode: null },
        },
        evaluation: { ...base.evaluation, completedAt: null },
      }),
    );
    // sem empresa/local/contrato/modalidade/envio: sobra apenas a conclusão (completedAt da entrevista)
    expect(sparse.details.map((d) => d.label)).toEqual(["Avaliação concluída em"]);
    expect(JSON.stringify(sparse.details)).not.toMatch(/—|Invalid|undefined|null/);
  });

  it("resposta vazia vira null (a tela decide o texto), parecer vazio vira null", () => {
    const base = result();
    const view = buildReportView(
      result({
        evaluation: { ...base.evaluation, summary: "   " },
        questions: [{ id: "q1", position: 1, type: "Carreira", text: "P", answer: "  ", answeredAt: null }],
      }),
    );
    expect(view.summary).toBeNull();
    expect(view.questions[0].answer).toBeNull();
  });
});

describe("relatório real (6A.3): suporte e falhas", () => {
  it("só HUMAN + COMPLETED é suportado; IA fica fora", () => {
    expect(isSupportedReportResult(result())).toBe(true);
    const base = result();
    expect(isSupportedReportResult(result({ interview: { ...base.interview, evaluationMode: "AI" } }))).toBe(false);
    expect(isSupportedReportResult(result({ interview: { ...base.interview, status: "ASSIGNED" } }))).toBe(false);
    expect(isSupportedReportResult(result({ interview: { ...base.interview, evaluationMode: null } }))).toBe(false);
  });

  it("409: mensagem amigável e volta ao acompanhamento", () => {
    const failure = describeReportFailure("result_not_available", "texto do servidor");
    expect(failure.description).toBe("O resultado desta entrevista ainda não está disponível.");
    expect(failure.description).toBe(REPORT_NOT_AVAILABLE_MESSAGE);
    expect(failure.primary).toBe("back-to-status");
    expect(failure.secondary).toBe("back-to-history");
  });

  it("404: relatório não encontrado / indisponível para a conta, sem expor ownership", () => {
    const failure = describeReportFailure("not_found", "");
    expect(failure.title).toBe("Relatório não encontrado");
    expect(failure.description).toMatch(/sua conta/);
    expect(failure.description).not.toMatch(/outro candidato|pertence|owner/i);
    expect(failure.primary).toBe("back-to-history");
  });

  it("401/403 repassam a mensagem amigável; 5xx/rede oferecem tentar novamente", () => {
    expect(describeReportFailure("unauthorized", "Sua sessão expirou. Entre novamente para continuar.").description).toBe(
      "Sua sessão expirou. Entre novamente para continuar.",
    );
    const server = describeReportFailure("error", "O serviço está temporariamente indisponível. Tente novamente em alguns instantes.");
    expect(server.primary).toBe("retry");
    expect(server.description).not.toMatch(/prisma|groq|stack|failed to fetch|\b5\d\d\b/i);
  });

  it("combinação sem suporte (IA) tem estado amigável e não promete dados", () => {
    expect(UNSUPPORTED_REPORT_VIEW.primary).toBe("back-to-status");
    expect(JSON.stringify(UNSUPPORTED_REPORT_VIEW)).not.toMatch(/groq|python|nota|score/i);
  });
});
