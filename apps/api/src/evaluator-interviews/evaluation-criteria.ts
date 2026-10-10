import { BadRequestException } from '@nestjs/common';
import { normalizeAnswer } from '../interviews/interview-flow';
import { textLength } from '../interviews/job-context';

// Critérios humanos canônicos. A CHAVE é o que vai para o JSONB
// (`criteria_scores`) e nunca muda; o RÓTULO é só apresentação em português.
export const EVALUATION_CRITERIA = [
  { key: 'clarity', label: 'Clareza' },
  { key: 'coherence', label: 'Coerência' },
  { key: 'objectivity', label: 'Objetividade' },
  { key: 'domain_knowledge', label: 'Domínio' },
  { key: 'organization', label: 'Organização' },
  { key: 'requirements_alignment', label: 'Aderência aos requisitos' },
  { key: 'examples', label: 'Capacidade de exemplificar' },
] as const;

export type CriterionKey = (typeof EVALUATION_CRITERIA)[number]['key'];
export type CriteriaScores = Partial<Record<CriterionKey, number>>;

export const CRITERION_KEYS: readonly string[] = EVALUATION_CRITERIA.map(
  (criterion) => criterion.key,
);

export const MIN_SCORE = 0;
export const MAX_SCORE = 10;
// Comentário geral: o banco é TEXT (sem limite); este teto segue o padrão das
// respostas da entrevista (1000) com folga para um parecer.
export const MAX_SUMMARY_LENGTH = 2000;

const ALLOWED_BODY_KEYS = ['criteriaScores', 'summary'];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export interface DraftInput {
  criteriaScores: CriteriaScores;
  // undefined => não alterar; null => limpar o comentário.
  summary: string | null | undefined;
}

// Valida o corpo do PUT do rascunho. Nada é aceito "por tolerância": campo ou
// critério desconhecido, nota fora de 0–10, string, null, NaN e Infinity => 400.
export function parseDraftInput(body: unknown): DraftInput {
  if (!isPlainObject(body)) {
    throw new BadRequestException('Corpo da avaliação inválido.');
  }

  for (const key of Object.keys(body)) {
    if (!ALLOWED_BODY_KEYS.includes(key)) {
      throw new BadRequestException(`Campo não permitido: ${key}.`);
    }
  }

  const hasScores = body.criteriaScores !== undefined;
  const hasSummary = body.summary !== undefined;
  if (!hasScores && !hasSummary) {
    throw new BadRequestException('Nenhum dado de avaliação para salvar.');
  }

  const criteriaScores: CriteriaScores = {};
  if (hasScores) {
    if (!isPlainObject(body.criteriaScores)) {
      throw new BadRequestException('criteriaScores deve ser um objeto.');
    }
    for (const [key, value] of Object.entries(body.criteriaScores)) {
      if (!CRITERION_KEYS.includes(key)) {
        throw new BadRequestException(`Critério desconhecido: ${key}.`);
      }
      if (
        typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value < MIN_SCORE ||
        value > MAX_SCORE
      ) {
        throw new BadRequestException(
          `A nota de "${key}" deve ser um número entre ${MIN_SCORE} e ${MAX_SCORE}.`,
        );
      }
      criteriaScores[key as CriterionKey] = value;
    }
  }

  let summary: string | null | undefined;
  if (hasSummary) {
    if (body.summary === null) {
      summary = null;
    } else if (typeof body.summary === 'string') {
      // Preserva parágrafos; só padroniza fim de linha e apara as pontas.
      const normalized = normalizeAnswer(body.summary);
      if (textLength(normalized) > MAX_SUMMARY_LENGTH) {
        throw new BadRequestException(
          `O comentário deve ter no máximo ${MAX_SUMMARY_LENGTH} caracteres.`,
        );
      }
      summary = normalized === '' ? null : normalized;
    } else {
      throw new BadRequestException('summary deve ser texto.');
    }
  }

  return { criteriaScores, summary };
}

// Lê o JSONB persistido de forma defensiva: só chaves canônicas com número
// finito, em ordem canônica (resposta determinística).
export function readCriteriaScores(raw: unknown): CriteriaScores {
  const result: CriteriaScores = {};
  if (!isPlainObject(raw)) return result;
  for (const key of CRITERION_KEYS) {
    const value = raw[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      result[key as CriterionKey] = value;
    }
  }
  return result;
}

// Merge controlado: ausência significa "não alterar".
export function mergeCriteriaScores(
  current: CriteriaScores,
  incoming: CriteriaScores,
): CriteriaScores {
  return readCriteriaScores({ ...current, ...incoming });
}

// Indicativo do rascunho: média simples SÓ dos critérios preenchidos, 1 casa
// decimal (coluna DECIMAL(3,1)). Sem nenhum critério => null.
export function computeDraftOverallScore(
  scores: CriteriaScores,
): number | null {
  const values = Object.values(scores).filter(
    (value): value is number => typeof value === 'number',
  );
  if (values.length === 0) return null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.round((mean + Number.EPSILON) * 10) / 10;
}
