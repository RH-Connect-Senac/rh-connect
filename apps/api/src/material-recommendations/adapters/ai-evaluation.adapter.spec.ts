import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CRITERION_KEYS,
  EVALUATION_CRITERIA,
} from '../../evaluator-interviews/evaluation-criteria';
import type { CriterionKey } from '../../evaluator-interviews/evaluation-criteria';
import type { NormalizedAiEvaluation } from '../../interviews-ai/ai-evaluation.types';
import { deriveNeeds } from '../need-derivation';
import { recommendMaterials } from '../recommendation-engine';
import { NEED_KEYS } from '../recommendation.types';
import { normalizeAiCriteria } from './ai-evaluation.adapter';
import { normalizeHumanCriteria } from './human-evaluation.adapter';

const SCORES: Record<CriterionKey, number> = {
  clarity: 8,
  coherence: 6.5,
  objectivity: 7,
  domain_knowledge: 5,
  organization: 9,
  requirements_alignment: 4,
  examples: 10,
};

function evaluationWith(
  criteriaScores: Record<CriterionKey, number>,
  overrides: Partial<NormalizedAiEvaluation> = {},
): NormalizedAiEvaluation {
  return {
    criteriaScores,
    overallScore: 7.1,
    strengths: ['Boa estrutura.'],
    improvements: ['Mais exemplos.'],
    recommendations: ['Praticar o método STAR.'],
    summary: 'Resumo.',
    questionsEvaluation: [1, 2, 3, 4, 5].map((position) => ({
      questionId: `00000000-0000-4000-8000-00000000000${position}`,
      position,
      score: 7.5,
      reason: 'Justificativa.',
      positives: ['Ponto forte.'],
      improvements: ['Melhoria.'],
      suggestion: 'Sugestão.',
    })),
    ...overrides,
  };
}

function constant(value: number): Record<CriterionKey, number> {
  return {
    clarity: value,
    coherence: value,
    objectivity: value,
    domain_knowledge: value,
    organization: value,
    requirements_alignment: value,
    examples: value,
  };
}

describe('normalizeAiCriteria', () => {
  it('mapeia os sete critérios canônicos para as chaves de necessidade', () => {
    expect(normalizeAiCriteria(evaluationWith(SCORES))).toEqual({
      clarity: 8,
      coherence: 6.5,
      objectivity: 7,
      domain_knowledge: 5,
      organization: 9,
      requirements_alignment: 4,
      examples: 10,
    });
  });

  it('as chaves de saída são exatamente as necessidades v1, na ordem canônica', () => {
    const result = normalizeAiCriteria(evaluationWith(SCORES));
    expect(Object.keys(result)).toEqual([...NEED_KEYS]);
    expect(Object.keys(result)).toEqual([...CRITERION_KEYS]);
  });

  it('preserva as notas normalizadas sem arredondar nem reescalar', () => {
    const scores = {
      ...SCORES,
      clarity: 7.25,
      coherence: 0,
      objectivity: 10,
      examples: 3.14159,
    };
    const result = normalizeAiCriteria(evaluationWith(scores));
    for (const criterion of EVALUATION_CRITERIA) {
      expect(result[criterion.key]).toBe(scores[criterion.key]);
    }
  });

  it('usa só as notas por critério: nota geral, textos e perguntas não alteram o resultado', () => {
    const base = normalizeAiCriteria(evaluationWith(SCORES));
    const other = normalizeAiCriteria(
      evaluationWith(SCORES, {
        overallScore: 1,
        summary: 'Outro resumo.',
        strengths: [],
        improvements: [],
        recommendations: [],
        questionsEvaluation: [],
      }),
    );
    expect(other).toEqual(base);
  });

  it('não altera a entrada (nem congelada) e devolve um objeto novo', () => {
    const evaluation = evaluationWith({ ...SCORES });
    Object.freeze(evaluation.criteriaScores);
    Object.freeze(evaluation);
    const snapshot = JSON.stringify(evaluation);

    const result = normalizeAiCriteria(evaluation);

    expect(JSON.stringify(evaluation)).toBe(snapshot);
    expect(result).not.toBe(evaluation.criteriaScores);
  });

  it('omite nota que não é número finito (o critério não gera necessidade)', () => {
    const result = normalizeAiCriteria(
      evaluationWith({
        ...SCORES,
        clarity: Number.NaN,
        coherence: Number.POSITIVE_INFINITY,
      }),
    );
    expect(result).not.toHaveProperty('clarity');
    expect(result).not.toHaveProperty('coherence');
    expect(result.objectivity).toBe(7);
  });

  describe('notas mínimas e máximas', () => {
    it('todas 0: as três piores necessidades (gap, severidade máxima), em ordem canônica', () => {
      const needs = deriveNeeds(
        normalizeAiCriteria(evaluationWith(constant(0))),
      );
      expect(needs.map((need) => [need.key, need.kind, need.severity])).toEqual(
        [
          ['clarity', 'gap', 1],
          ['coherence', 'gap', 1],
          ['objectivity', 'gap', 1],
        ],
      );
    });

    it('todas 10: nenhuma necessidade', () => {
      const criteria = normalizeAiCriteria(evaluationWith(constant(10)));
      expect(Object.values(criteria)).toEqual(new Array(7).fill(10));
      expect(deriveNeeds(criteria)).toEqual([]);
    });
  });

  describe('compatibilidade com o motor', () => {
    it('alimenta deriveNeeds ponta a ponta (adapter -> critérios -> necessidades)', () => {
      const needs = deriveNeeds(
        normalizeAiCriteria(
          evaluationWith({
            ...constant(9),
            objectivity: 5,
            organization: 6,
          }),
        ),
      );
      expect(needs.map((need) => [need.key, need.kind])).toEqual([
        ['objectivity', 'gap'],
        ['organization', 'gap'],
      ]);
    });

    it.each(['information-technology', 'hr-management', 'secretariat', null])(
      'gera as mesmas recomendações que o adapter humano para as mesmas notas (área %p)',
      (professionalArea) => {
        const viaAi = recommendMaterials({
          needs: deriveNeeds(normalizeAiCriteria(evaluationWith(SCORES))),
          professionalArea,
        });
        const viaHuman = recommendMaterials({
          needs: deriveNeeds(normalizeHumanCriteria({ ...SCORES })),
          professionalArea,
        });
        expect(viaAi).toEqual(viaHuman);
      },
    );
  });

  describe('independência em relação ao adapter humano', () => {
    const source = readFileSync(
      join(__dirname, 'ai-evaluation.adapter.ts'),
      'utf8',
    );

    it('não importa nem referencia o adapter humano', () => {
      expect(source).not.toMatch(/human-evaluation\.adapter/);
      expect(source).not.toMatch(/normalizeHumanCriteria/);
    });

    it('o adapter humano continua com o mesmo resultado antes e depois do adapter de IA', () => {
      const before = normalizeHumanCriteria({ ...SCORES });
      normalizeAiCriteria(evaluationWith(constant(0)));
      expect(normalizeHumanCriteria({ ...SCORES })).toEqual(before);
    });

    it('o adapter humano não aceita o formato do adapter de IA (continua lendo só o JSONB persistido)', () => {
      expect(normalizeHumanCriteria(evaluationWith(SCORES))).toEqual({});
    });

    it('não lê banco, rede nem o formato bruto do Python', () => {
      expect(source).not.toMatch(/prisma/i);
      expect(source).not.toMatch(/fetch\(/);
      expect(source).not.toMatch(/PythonEvaluationResponse/);
    });
  });
});
