import type { ProfessionalAreaId, ProfessionalSubareaId, SeniorityLevelId } from "../domain/professional-catalog";

export type JobInterviewContext = {
  sourceUrl: string;
  areaId?: ProfessionalAreaId;
  subareaId?: ProfessionalSubareaId;
  seniorityId?: SeniorityLevelId;
  jobTitle?: string;
  title: string;
  company: string;
  summary: string;
  activities?: string[];
  requirements: string[];
  location?: string | null;
  contractType?: string | null;
  workMode?: "REMOTE" | "HYBRID" | "ONSITE" | null;
};

export type InterviewQuestion = {
  id: number;
  type: "Tecnica" | "Comportamental" | "Carreira";
  text: string;
};

type ApiJobContextResponse = {
  sourceUrl?: unknown;
  title?: unknown;
  company?: unknown;
  summary?: unknown;
  activities?: unknown;
  requirements?: unknown;
  location?: unknown;
  contractType?: unknown;
  workMode?: unknown;
};

type ApiQuestionsResponse = {
  questions?: unknown;
};

type ApiEvaluationResponse = {
  scores?: unknown;
  overallScore?: unknown;
  strengths?: unknown;
  improvements?: unknown;
  recommendations?: unknown;
  summary?: unknown;
  questionsEvaluation?: unknown;
};

type AiEvaluationAnswerInput = {
  questionId: number;
  questionText: string;
  questionType: string;
  answer: string;
};

export type AiQuestionEvaluation = {
  questionId: number;
  score: number;
  reason: string;
  positives: string[];
  improvements: string[];
  suggestion: string;
};

export type AiInterviewEvaluationResult = {
  scores: Record<string, number>;
  overallScore: number;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  summary: string;
  questionsEvaluation: AiQuestionEvaluation[];
};

const API_BASE_URL =
  ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_API_URL ??
    "http://127.0.0.1:3000").replace(/\/+$/, "");

const AI_EVALUATION_CRITERIA = [
  "Clareza",
  "Coerência",
  "Objetividade",
  "Domínio",
  "Organização",
  "Aderência",
  "Exemplos",
];

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asOptionalString(value: unknown): string | null {
  const parsed = asString(value);
  return parsed || null;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(asString).filter(Boolean);
}

function asWorkMode(value: unknown): JobInterviewContext["workMode"] {
  return value === "REMOTE" || value === "HYBRID" || value === "ONSITE" ? value : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function asScores(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce((acc, [criterion, score]) => {
    const parsedScore = asNumber(score);
    if (criterion.trim() && parsedScore != null) {
      acc[criterion] = parsedScore;
    }
    return acc;
  }, {} as Record<string, number>);
}

async function readApiError(response: Response, fallback: string): Promise<string> {
  try {
    const payload = (await response.json()) as { message?: unknown; error?: unknown };
    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message;
    }
    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error;
    }
  } catch {
    // Keep the user-facing fallback when the API does not return JSON.
  }

  return fallback;
}

async function postJson<TResponse>(
  path: string,
  body: unknown,
  errorMessage: string,
): Promise<TResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(errorMessage);
  }

  if (!response.ok) {
    throw new Error(await readApiError(response, errorMessage));
  }

  return (await response.json()) as TResponse;
}

function normalizeQuestionType(value: unknown): InterviewQuestion["type"] | null {
  if (value === "Tecnica" || value === "Comportamental" || value === "Carreira") {
    return value;
  }

  return null;
}

export async function analyzeJobUrl(url: string): Promise<JobInterviewContext> {
  const trimmedUrl = url.trim();

  if (!/^https?:\/\/\S+\.\S+/i.test(trimmedUrl)) {
    throw new Error("Informe uma URL valida da vaga para analisar o contexto.");
  }

  const context = await postJson<ApiJobContextResponse>(
    "/interviews/ai/job-context",
    { url: trimmedUrl },
    "Não foi possível analisar a vaga. Verifique o link e tente novamente.",
  );
  const title = asString(context.title);

  if (!title) {
    throw new Error("Não foi possível identificar o título da vaga informada.");
  }

  return {
    sourceUrl: asString(context.sourceUrl) || trimmedUrl,
    jobTitle: title,
    title,
    company: asString(context.company),
    summary: asString(context.summary),
    activities: asStringList(context.activities),
    requirements: asStringList(context.requirements),
    location: asOptionalString(context.location),
    contractType: asOptionalString(context.contractType),
    workMode: asWorkMode(context.workMode),
  };
}

export async function generateInterviewQuestions(
  context: JobInterviewContext,
): Promise<InterviewQuestion[]> {
  const response = await postJson<ApiQuestionsResponse>(
    "/interviews/ai/questions",
    {
      context: {
        title: context.title,
        company: context.company,
        summary: context.summary,
        activities: context.activities ?? [],
        requirements: context.requirements,
        location: context.location ?? null,
        contractType: context.contractType ?? null,
        workMode: context.workMode ?? null,
        sourceUrl: context.sourceUrl,
      },
    },
    "Não foi possível gerar as perguntas da entrevista. Tente novamente.",
  );

  if (!Array.isArray(response.questions) || response.questions.length !== 5) {
    throw new Error("Não foi possível gerar as 5 perguntas da entrevista. Tente novamente.");
  }

  return response.questions.map((question, index) => {
    const item = question as { id?: unknown; type?: unknown; text?: unknown };
    const type = normalizeQuestionType(item.type);
    const text = asString(item.text);

    if (!type || !text) {
      throw new Error("A API retornou uma pergunta em formato inválido.");
    }

    return {
      id: Number(item.id) || index + 1,
      type,
      text,
    };
  });
}

export async function evaluateInterviewWithAi(
  context: JobInterviewContext,
  answers: AiEvaluationAnswerInput[],
): Promise<AiInterviewEvaluationResult> {
  const response = await postJson<ApiEvaluationResponse>(
    "/interviews/ai/evaluate",
    {
      context: {
        title: context.title,
        company: context.company,
        summary: context.summary,
        activities: context.activities ?? [],
        requirements: context.requirements,
        location: context.location ?? null,
        contractType: context.contractType ?? null,
        workMode: context.workMode ?? null,
        sourceUrl: context.sourceUrl,
      },
      answers,
    },
    "Não foi possível avaliar a entrevista por IA. Tente novamente.",
  );

  const scores = asScores(response.scores);
  const overallScore = asNumber(response.overallScore);
  const hasExpectedScores = AI_EVALUATION_CRITERIA.every((criterion) => {
    const score = scores[criterion];
    return typeof score === "number" && score >= 0 && score <= 10;
  });

  if (!hasExpectedScores || overallScore == null) {
    throw new Error("A API retornou a avaliação da entrevista em formato inválido.");
  }

  const questionsEvaluation = Array.isArray(response.questionsEvaluation)
    ? response.questionsEvaluation.map((item) => {
        const questionEvaluation = item as {
          questionId?: unknown;
          score?: unknown;
          reason?: unknown;
          positives?: unknown;
          improvements?: unknown;
          suggestion?: unknown;
        };
        return {
          questionId: asNumber(questionEvaluation.questionId) ?? 0,
          score: asNumber(questionEvaluation.score) ?? 0,
          reason: asString(questionEvaluation.reason),
          positives: asStringList(questionEvaluation.positives),
          improvements: asStringList(questionEvaluation.improvements),
          suggestion: asString(questionEvaluation.suggestion),
        };
      }).filter((item) => item.questionId > 0)
    : [];

  return {
    scores,
    overallScore,
    strengths: asStringList(response.strengths),
    improvements: asStringList(response.improvements),
    recommendations: asStringList(response.recommendations),
    summary: asString(response.summary),
    questionsEvaluation,
  };
}
