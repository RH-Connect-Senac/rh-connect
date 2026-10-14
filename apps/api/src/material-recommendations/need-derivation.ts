import { NEED_KEYS } from './recommendation.types';
import type {
  DevelopmentNeed,
  NeedKey,
  NormalizedCriteria,
} from './recommendation.types';

// DECISÃO DE PRODUTO v1 (confirmada pelo responsável do projeto): critério com
// nota ABAIXO deste valor é uma necessidade de desenvolvimento (`gap`). Não
// existe regra oficial documentada para interpretar as notas 0–10; o valor
// acompanha o relatório do candidato ("Atenção" abaixo de 7) e a rubrica da
// avaliação ("boa" a partir de 7). Mudar a regra é mudar ESTA constante: o
// número não deve ser repetido em nenhum outro lugar do código.
export const NEED_THRESHOLD = 7;

// Sem nenhum `gap`, o pior critério ainda abaixo deste valor vira `refine`.
// Com todos os critérios a partir deste valor, não há necessidade alguma.
export const REFINE_CEILING = 9;

// Máximo de necessidades devolvidas (uma por recomendação).
export const MAX_NEEDS = 3;

// Limite superior da escala de notas.
export const MAX_SCORE = 10;

export interface NeedDerivationOptions {
  threshold?: number;
  refineCeiling?: number;
  maxNeeds?: number;
}

const SEVERITY_PRECISION = 10000;

function toSeverity(score: number): number {
  const raw = (MAX_SCORE - score) / MAX_SCORE;
  return Math.round(raw * SEVERITY_PRECISION) / SEVERITY_PRECISION;
}

function readScores(criteria: NormalizedCriteria) {
  const scores: Array<{ key: NeedKey; score: number }> = [];
  // Ordem canônica: também é o desempate quando duas notas são iguais.
  for (const key of NEED_KEYS) {
    const value = criteria[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    scores.push({ key, score: Math.min(MAX_SCORE, Math.max(0, value)) });
  }
  return scores;
}

// Regra única e pura que transforma critérios normalizados em necessidades.
// Não sabe de onde as notas vieram (qualquer modalidade de avaliação).
//
// 1. `gap`: critérios com nota < limite, do pior para o melhor, no máximo
//    `maxNeeds`.
// 2. Sem `gap`: o pior critério com nota < teto de refinamento vira `refine`.
// 3. Todos a partir do teto (ou nenhum critério válido): lista vazia, e o motor
//    usa materiais gerais.
export function deriveNeeds(
  criteria: NormalizedCriteria,
  options: NeedDerivationOptions = {},
): DevelopmentNeed[] {
  const threshold = options.threshold ?? NEED_THRESHOLD;
  const refineCeiling = options.refineCeiling ?? REFINE_CEILING;
  const maxNeeds = Math.max(0, Math.floor(options.maxNeeds ?? MAX_NEEDS));
  if (maxNeeds === 0) return [];

  const scores = readScores(criteria);

  const gaps = scores
    .filter((item) => item.score < threshold)
    // `sort` é estável: notas iguais mantêm a ordem canônica.
    .sort((a, b) => a.score - b.score)
    .slice(0, maxNeeds);

  if (gaps.length > 0) {
    return gaps.map((item) => ({
      key: item.key,
      score: item.score,
      severity: toSeverity(item.score),
      kind: 'gap' as const,
    }));
  }

  const worst = scores
    .filter((item) => item.score < refineCeiling)
    .sort((a, b) => a.score - b.score)[0];

  return worst
    ? [
        {
          key: worst.key,
          score: worst.score,
          severity: toSeverity(worst.score),
          kind: 'refine' as const,
        },
      ]
    : [];
}
