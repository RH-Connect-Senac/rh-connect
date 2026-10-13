/**
 * Regras PURAS do formulário de rascunho da avaliação humana (Fase 5C.2).
 *
 * O backend é a autoridade (validação, merge e `overallScore`): aqui só se
 * impede o envio de valores inválidos e se mantém o estado digitado. Nada é
 * lido ou gravado em localStorage; as chaves dos critérios são as mesmas
 * persistidas no Back (`evaluation-criteria.ts`) e nunca mudam.
 */

export const EVALUATION_CRITERIA = [
  { key: "clarity", label: "Clareza", description: "Expressa-se com clareza e objetividade, sem ambiguidades?" },
  { key: "coherence", label: "Coerência", description: "As ideias têm relação lógica e consistência interna?" },
  { key: "objectivity", label: "Objetividade", description: "Manteve o foco na pergunta, sem desvios irrelevantes?" },
  { key: "domain_knowledge", label: "Domínio", description: "Demonstra conhecimento técnico ou experiência na área da vaga?" },
  { key: "organization", label: "Organização", description: "A resposta tem estrutura bem definida (início, desenvolvimento e conclusão)?" },
  { key: "requirements_alignment", label: "Aderência aos requisitos", description: "Dialoga com os requisitos da vaga e com o contexto apresentado?" },
  { key: "examples", label: "Capacidade de exemplificar", description: "Sustenta a resposta com exemplos, evidências ou situações concretas?" },
] as const;

export type CriterionKey = (typeof EVALUATION_CRITERIA)[number]["key"];
export type CriteriaScores = Partial<Record<CriterionKey, number>>;

export const MIN_SCORE = 0;
export const MAX_SCORE = 10;
export const MAX_SUMMARY_LENGTH = 2000;

export type EvaluationDraft = {
  interviewId: string;
  status: "DRAFT" | "COMPLETED";
  criteriaScores: CriteriaScores;
  summary: string | null;
  overallScore: number | null;
  updatedAt: string | null;
};

export type DraftPayload = {
  criteriaScores?: CriteriaScores;
  summary?: string | null;
};

// Texto digitado por critério (string, para não "corrigir" o que a pessoa digita).
export type EvaluationFormState = {
  scores: Record<CriterionKey, string>;
  summary: string;
};

export function emptyForm(): EvaluationFormState {
  const scores = {} as Record<CriterionKey, string>;
  for (const criterion of EVALUATION_CRITERIA) scores[criterion.key] = "";
  return { scores, summary: "" };
}

function scoreToText(value: number): string {
  return String(value);
}

// Monta o formulário a partir do que o BACKEND devolveu (fonte da verdade).
export function formFromDraft(draft: EvaluationDraft): EvaluationFormState {
  const form = emptyForm();
  for (const criterion of EVALUATION_CRITERIA) {
    const value = draft.criteriaScores[criterion.key];
    if (typeof value === "number" && Number.isFinite(value)) {
      form.scores[criterion.key] = scoreToText(value);
    }
  }
  form.summary = draft.summary ?? "";
  return form;
}

export type ScoreParse =
  | { kind: "empty" }
  | { kind: "ok"; value: number }
  | { kind: "invalid"; message: string };

// Aceita "7", "7.5" e "7,5" (até 2 casas). Nunca converte valor inválido em
// nota válida: "-1", "11", "abc", "1e3" e "7,5,2" são rejeitados.
export function parseScoreInput(raw: string): ScoreParse {
  const text = raw.trim();
  if (text === "") return { kind: "empty" };
  if (!/^\d{1,2}([.,]\d{1,2})?$/.test(text)) {
    return { kind: "invalid", message: `Use um número de ${MIN_SCORE} a ${MAX_SCORE} (ex.: 7,5).` };
  }
  const value = Number(text.replace(",", "."));
  if (!Number.isFinite(value) || value < MIN_SCORE || value > MAX_SCORE) {
    return { kind: "invalid", message: `A nota deve estar entre ${MIN_SCORE} e ${MAX_SCORE}.` };
  }
  return { kind: "ok", value };
}

// Tamanho em pontos de código (igual ao Back: emoji conta 1).
export function summaryLength(value: string): number {
  return Array.from(value).length;
}

// Média simples dos critérios preenchidos, 1 casa decimal — a MESMA regra do
// Back, só para PRÉVIA enquanto há edição não salva. Nunca é enviada.
export function previewOverallScore(scores: CriteriaScores): number | null {
  const values = Object.values(scores).filter(
    (value): value is number => typeof value === "number",
  );
  if (values.length === 0) return null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.round((mean + Number.EPSILON) * 10) / 10;
}

export type FormValidation = {
  scoreErrors: Partial<Record<CriterionKey, string>>;
  summaryError: string | null;
  valid: boolean;
  // Notas já interpretadas (só as preenchidas e válidas).
  parsedScores: CriteriaScores;
};

export function validateForm(
  form: EvaluationFormState,
  persisted: CriteriaScores,
): FormValidation {
  const scoreErrors: Partial<Record<CriterionKey, string>> = {};
  const parsedScores: CriteriaScores = {};

  for (const criterion of EVALUATION_CRITERIA) {
    const parsed = parseScoreInput(form.scores[criterion.key]);
    if (parsed.kind === "ok") {
      parsedScores[criterion.key] = parsed.value;
    } else if (parsed.kind === "invalid") {
      scoreErrors[criterion.key] = parsed.message;
    } else if (typeof persisted[criterion.key] === "number") {
      // O Back não remove nota já salva (ausência = não alterar).
      scoreErrors[criterion.key] = "Uma nota já salva não pode ser apagada. Informe um valor.";
    }
  }

  const summaryError =
    summaryLength(form.summary) > MAX_SUMMARY_LENGTH
      ? `O comentário deve ter no máximo ${MAX_SUMMARY_LENGTH} caracteres.`
      : null;

  return {
    scoreErrors,
    summaryError,
    valid: Object.keys(scoreErrors).length === 0 && summaryError === null,
    parsedScores,
  };
}

// Alterações pendentes em relação ao que o Back devolveu.
export function isDirty(form: EvaluationFormState, saved: EvaluationFormState): boolean {
  if (form.summary !== saved.summary) return true;
  return EVALUATION_CRITERIA.some((criterion) =>
    scoreTextDiffers(form.scores[criterion.key], saved.scores[criterion.key]),
  );
}

// "7,5" e "7.5" (ou "8" e "8.0") são a MESMA nota: não contam como alteração,
// o que evita um save extra só porque o servidor devolveu outra grafia.
function scoreTextDiffers(a: string, b: string): boolean {
  const left = parseScoreInput(a);
  const right = parseScoreInput(b);
  if (left.kind === "ok" && right.kind === "ok") return left.value !== right.value;
  return a.trim() !== b.trim();
}

// Corpo do PUT: SÓ campos permitidos (criteriaScores parcial + summary).
// Identidade, status e nota final nunca são enviados.
export function buildDraftPayload(form: EvaluationFormState, parsedScores: CriteriaScores): DraftPayload {
  return { criteriaScores: parsedScores, summary: form.summary };
}

export function canSubmit(input: { saving: boolean; dirty: boolean; valid: boolean }): boolean {
  return !input.saving && input.dirty && input.valid;
}

export type SaveOutcome =
  | { kind: "saved"; draft: EvaluationDraft; form: EvaluationFormState }
  | { kind: "invalid"; validation: FormValidation }
  | { kind: "error"; message: string };

type SaveFn = (
  interviewId: string,
  payload: DraftPayload,
) => Promise<{ ok: true; data: EvaluationDraft } | { ok: false; message: string }>;

// Salva o rascunho (PUT). Em erro, devolve só a mensagem: o chamador MANTÉM o
// formulário digitado. Em sucesso, o formulário passa a refletir a resposta do Back.
export async function runSaveDraft(args: {
  interviewId: string;
  form: EvaluationFormState;
  persisted: CriteriaScores;
  save: SaveFn;
}): Promise<SaveOutcome> {
  const validation = validateForm(args.form, args.persisted);
  if (!validation.valid) return { kind: "invalid", validation };

  const result = await args.save(
    args.interviewId,
    buildDraftPayload(args.form, validation.parsedScores),
  );
  if (!result.ok) return { kind: "error", message: result.message };

  return { kind: "saved", draft: result.data, form: formFromDraft(result.data) };
}
