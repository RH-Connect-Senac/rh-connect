/**
 * Relatório do candidato (6A.3) — parte PURA (sem React, sem rede, sem armazenamento).
 *
 * A fonte é `GET /interviews/:id/result` (avaliação HUMANA concluída). Tudo aqui é só
 * apresentação do que o Back persistiu:
 * - a nota geral NÃO é recalculada (vem de `evaluation.overallScore`);
 * - os critérios são os 7 canônicos do Back, na ordem canônica; chaves desconhecidas são ignoradas;
 * - não existe nota nem comentário por pergunta no modelo humano: nada disso é inventado.
 */

import { EVALUATION_CRITERIA } from "./evaluator-evaluation-form";
import { formatTrackingDate } from "./interview-tracking-view";
import { findSupportMaterialBySlug } from "../mocks/materials";
import type { RealInterviewResult } from "../services/candidate-interviews-service";
import { buildRecommendedMaterialsView, type RecommendedMaterialsView } from "./candidate-report-materials-view";

/** Rótulo curto só para o eixo do gráfico radar (o nome completo vai na lista). */
const CHART_LABELS: Record<string, string> = {
  requirements_alignment: "Aderência",
  examples: "Exemplos",
};

export type ReportCriterion = {
  key: string;
  /** Rótulo aprovado do projeto (mesmo do formulário do avaliador). */
  label: string;
  /** Rótulo do eixo do radar. */
  chartLabel: string;
  score: number;
};

export type ReportQuestion = {
  id: string;
  position: number;
  typeLabel: string;
  text: string;
  /** null = sem resposta registrada. */
  answer: string | null;
};

export type ReportDetail = { label: string; value: string };

export type ReportView = {
  title: string;
  company: string | null;
  /** Só campos com valor (sem placeholder artificial). */
  details: ReportDetail[];
  overallScore: number;
  criteria: ReportCriterion[];
  summary: string | null;
  questions: ReportQuestion[];
  /** Materiais recomendados (R6). `null` = sem recomendação: a seção não é renderizada. */
  materials: RecommendedMaterialsView | null;
};

const WORK_MODE_LABEL: Record<string, string> = {
  REMOTE: "Remoto",
  HYBRID: "Híbrido",
  ONSITE: "Presencial",
};

const QUESTION_TYPE_LABEL: Record<string, string> = {
  Tecnica: "Técnica",
  Comportamental: "Comportamental",
  Carreira: "Carreira",
};

/** v1: só o resultado HUMANO concluído é suportado. IA continua fora (Fase 3/6B). */
export function isSupportedReportResult(result: RealInterviewResult): boolean {
  return result.interview.evaluationMode === "HUMAN" && result.interview.status === "COMPLETED";
}

export function buildReportCriteria(criteriaScores: Record<string, number>): ReportCriterion[] {
  return EVALUATION_CRITERIA.filter((criterion) => Number.isFinite(criteriaScores[criterion.key])).map((criterion) => ({
    key: criterion.key,
    label: criterion.label,
    chartLabel: CHART_LABELS[criterion.key] ?? criterion.label,
    score: criteriaScores[criterion.key],
  }));
}

export function buildReportView(result: RealInterviewResult): ReportView {
  const { interview, evaluation } = result;
  const context = interview.context;
  const details: ReportDetail[] = [];
  const add = (label: string, value: string | null | undefined) => {
    if (typeof value === "string" && value.trim()) details.push({ label, value: value.trim() });
  };
  add("Empresa", interview.company);
  add("Local", context.location);
  add("Contrato", context.contractType);
  add("Modalidade de trabalho", context.workMode ? WORK_MODE_LABEL[context.workMode] : null);
  add("Enviada em", formatTrackingDate(interview.submittedAt));
  add("Avaliação concluída em", formatTrackingDate(evaluation.completedAt ?? interview.completedAt));

  return {
    title: interview.title,
    company: interview.company,
    details,
    overallScore: evaluation.overallScore,
    criteria: buildReportCriteria(evaluation.criteriaScores),
    summary: evaluation.summary.trim() ? evaluation.summary.trim() : null,
    questions: [...result.questions]
      .sort((a, b) => a.position - b.position)
      .map((question) => ({
        id: question.id,
        position: question.position,
        typeLabel: QUESTION_TYPE_LABEL[question.type] ?? question.type,
        text: question.text,
        answer: question.answer && question.answer.trim() ? question.answer : null,
      })),
    materials: buildRecommendedMaterialsView(result.materialRecommendations, {
      hasInternalMaterial: (slug) => findSupportMaterialBySlug(slug) !== undefined,
    }),
  };
}

export const REPORT_NOT_AVAILABLE_MESSAGE = "O resultado desta entrevista ainda não está disponível.";

export type ReportFailureAction = "back-to-status" | "back-to-history" | "retry";

export type ReportFailureView = {
  title: string;
  description: string;
  /** Ação principal; "back-to-status" só quando há acompanhamento coerente (409). */
  primary: ReportFailureAction;
  /** Ação secundária (sempre o histórico, quando a principal não for ele). */
  secondary: ReportFailureAction | null;
};

/**
 * Falha de `GET /interviews/:id/result` → texto de produto. A mensagem recebida já foi
 * sanitizada pelo serviço (sem detalhe técnico); 409 e 404 têm texto próprio.
 */
export function describeReportFailure(reason: string, message: string): ReportFailureView {
  if (reason === "result_not_available") {
    return {
      title: "Resultado ainda não disponível",
      description: REPORT_NOT_AVAILABLE_MESSAGE,
      primary: "back-to-status",
      secondary: "back-to-history",
    };
  }
  if (reason === "not_found" || reason === "validation") {
    return {
      title: "Relatório não encontrado",
      description: "Este relatório não foi encontrado ou não está disponível para a sua conta. Acesse o histórico para ver suas entrevistas.",
      primary: "back-to-history",
      secondary: null,
    };
  }
  if (reason === "unauthorized" || reason === "forbidden") {
    return { title: "Não foi possível abrir este relatório", description: message, primary: "back-to-history", secondary: null };
  }
  return { title: "Não foi possível carregar o relatório", description: message, primary: "retry", secondary: "back-to-history" };
}

/** Resultado de IA (ou combinação sem suporte nesta fase): estado amigável, sem inventar dados. */
export const UNSUPPORTED_REPORT_VIEW: ReportFailureView = {
  title: "Relatório indisponível por aqui",
  description: "Ainda não conseguimos mostrar o relatório desta entrevista nesta tela. Consulte o acompanhamento ou o histórico.",
  primary: "back-to-status",
  secondary: "back-to-history",
};
