import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  EvaluatorDetailContent,
  EvaluatorQueueContent,
  formatQuestionType,
  formatWorkMode,
  type EvaluatorDetailState,
  type EvaluatorQueueState,
} from "./evaluator-real-content";
import type {
  EvaluatorInterviewDetail,
  EvaluatorQueueItem,
} from "../services/evaluator-interviews-service";

const ID = "11111111-1111-4111-8111-111111111111";

const item: EvaluatorQueueItem = {
  id: ID,
  status: "ASSIGNED",
  candidate: { name: "Maria Candidata", professionalTitle: "Secretária", city: "Brasília", state: "DF" },
  jobTitle: "Secretária Comercial",
  company: "Clínica Exemplo",
  location: "Três Lagoas/MS",
  workMode: "HYBRID",
  assignedAt: "2026-10-09T15:00:00.000Z",
  submittedAt: "2026-10-09T14:00:00.000Z",
  questionCount: 5,
};

const interview: EvaluatorInterviewDetail = {
  id: ID,
  status: "ASSIGNED",
  evaluationMode: "HUMAN",
  assignedAt: "2026-10-09T15:00:00.000Z",
  submittedAt: "2026-10-09T14:00:00.000Z",
  candidate: item.candidate,
  context: {
    sourceUrl: null,
    title: "Secretária Comercial",
    company: "Clínica Exemplo",
    summary: "Resumo da vaga",
    activities: ["Agendar consultas"],
    requirements: ["Pacote Office"],
    location: "Três Lagoas/MS",
    contractType: "PJ",
    workMode: "HYBRID",
  },
  questions: [
    { id: "q1", position: 1, type: "TECHNICAL", text: "Como organiza agendas?", answer: "Linha 1\nLinha 2\n\nLinha 4", answeredAt: "2026-10-09T13:00:00.000Z" },
    { id: "q2", position: 2, type: "BEHAVIORAL", text: "Conte um caso.", answer: null, answeredAt: null },
  ],
};

const noop = () => undefined;
const queue = (state: EvaluatorQueueState) =>
  renderToStaticMarkup(createElement(EvaluatorQueueContent, { state, onEvaluate: noop, onRetry: noop }));
const detail = (state: EvaluatorDetailState) =>
  renderToStaticMarkup(createElement(EvaluatorDetailContent, { state, onBack: noop, onRetry: noop }));

describe("fila real do avaliador (apresentação)", () => {
  it("loading", () => {
    const html = queue({ status: "loading" });
    expect(html).toContain("Carregando entrevistas...");
    expect(html).toContain('role="status"');
  });

  it("fila vazia: estado vazio coerente, sem item algum", () => {
    const html = queue({ status: "ready", items: [] });
    expect(html).toContain("Nenhuma entrevista atribuída no momento");
    expect(html).not.toContain("Avaliar");
  });

  it("erro: mensagem segura e botão de tentar novamente", () => {
    const html = queue({ status: "error", message: "Não foi possível carregar suas avaliações. Tente novamente." });
    expect(html).toContain("Não foi possível carregar suas avaliações");
    expect(html).toContain("Tentar novamente");
    expect(html).toContain('role="alert"');
  });

  it("itens reais: candidato, vaga, empresa, local, modalidade, perguntas e datas", () => {
    const html = queue({ status: "ready", items: [item] });
    for (const text of [
      "Maria Candidata",
      "Secretária",
      "Secretária Comercial · Clínica Exemplo",
      "Três Lagoas/MS · Híbrido",
      "5 perguntas",
      "Atribuída em",
      ">Avaliar</button>",
    ]) {
      expect(html).toContain(text);
    }
    expect(html).not.toContain("Ver entrevista");
    expect(html).not.toMatch(/Urgente|Normal|Baixa|prioridade/i);
    expect(html).not.toContain(ID);
    expect(html).not.toMatch(/Carlos|Camila Dias|Beatriz|mock/i);
  });
});

describe("fila: ação Avaliar", () => {
  it("clicar em Avaliar entrega o UUID real da API (nunca outro id)", () => {
    const calls: string[] = [];
    const tree = EvaluatorQueueContent({
      state: { status: "ready", items: [item, { ...item, id: "22222222-2222-4222-8222-222222222222" }] },
      onEvaluate: (id: string) => calls.push(id),
    }) as any;
    const buttons: any[] = [];
    const walk = (node: any) => {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) return node.forEach(walk);
      if (node.type === "button") buttons.push(node);
      walk(node.props?.children);
    };
    walk(tree);
    expect(buttons).toHaveLength(2);
    buttons.forEach((b) => b.props.onClick());
    expect(calls).toEqual([ID, "22222222-2222-4222-8222-222222222222"]);
  });
});

describe("detalhe real da entrevista (apresentação)", () => {
  it("loading", () => {
    expect(detail({ status: "loading" })).toContain("Carregando entrevista...");
  });

  it("404: entrevista não encontrada ou indisponível, com volta para a fila", () => {
    const html = detail({ status: "not_found", message: "Entrevista não encontrada ou indisponível." });
    expect(html).toContain("Entrevista não encontrada ou indisponível");
    expect(html).toContain("Voltar para a fila");
  });

  it("erro genérico: mensagem segura e tentar novamente", () => {
    const html = detail({ status: "error", message: "Não foi possível carregar a entrevista. Tente novamente." });
    expect(html).toContain("Não foi possível carregar a entrevista");
    expect(html).toContain("Tentar novamente");
  });

  it("renderiza candidato, vaga, perguntas e respostas reais", () => {
    const html = detail({ status: "ready", interview });
    for (const text of [
      "Maria Candidata",
      "Secretária Comercial",
      "Clínica Exemplo",
      "Pacote Office",
      "Agendar consultas",
      "Pergunta 1 · Técnica",
      "Pergunta 2 · Comportamental",
      "Como organiza agendas?",
      "Sem resposta registrada.",
      "Perguntas e respostas (2)",
    ]) {
      expect(html).toContain(text);
    }
  });

  it("preserva as quebras de linha da resposta (texto cru + whitespace-pre-wrap)", () => {
    const html = detail({ status: "ready", interview });
    expect(html).toContain("Linha 1\nLinha 2\n\nLinha 4");
    expect(html).toMatch(/whitespace-pre-wrap[^"]*"[^>]*>Linha 1\nLinha 2/);
  });

  it("o CTA Avaliar está habilitado e o detalhe continua somente leitura (sem campos de nota)", () => {
    const html = detail({ status: "ready", interview });
    expect(html).toMatch(/<button(?![^>]*disabled)[^>]*>Avaliar<\/button>/);
    expect(html).not.toContain("em breve");
    expect(html).not.toMatch(/<input|<textarea|type="range"/);
  });

  it("onEvaluate recebe o UUID real da entrevista (nunca um id fictício)", () => {
    const calls: string[] = [];
    const element = EvaluatorDetailContent({
      state: { status: "ready", interview },
      onBack: () => undefined,
      onEvaluate: (id: string) => calls.push(id),
    }) as any;
    const found: any[] = [];
    const walk = (node: any) => {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) return node.forEach(walk);
      if (node.type === "button" && node.props?.children === "Avaliar") found.push(node);
      walk(node.props?.children);
    };
    walk(element);
    expect(found).toHaveLength(1);
    found[0].props.onClick();
    expect(calls).toEqual([ID]);
  });
});

describe("rótulos", () => {
  it("modalidade e tipo de pergunta", () => {
    expect(formatWorkMode("REMOTE")).toBe("Remoto");
    expect(formatWorkMode("ONSITE")).toBe("Presencial");
    expect(formatWorkMode(null)).toBeNull();
    expect(formatQuestionType("CAREER")).toBe("Carreira");
    expect(formatQuestionType("OUTRO")).toBe("Pergunta");
  });
});
