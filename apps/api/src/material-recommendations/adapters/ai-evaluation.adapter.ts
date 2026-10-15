import { EVALUATION_CRITERIA } from '../../evaluator-interviews/evaluation-criteria';
import type { CriterionKey } from '../../evaluator-interviews/evaluation-criteria';
import type { NormalizedAiEvaluation } from '../../interviews-ai/ai-evaluation.types';
import type { NeedKey, NormalizedCriteria } from '../recommendation.types';

// Adapter da avaliação por IA: converte uma avaliação JÁ NORMALIZADA
// (`NormalizedAiEvaluation`, saída de `normalizeAiEvaluation`) para os critérios
// normalizados que o motor de Materiais consome. Nunca recebe a resposta bruta do
// Python, não calcula nada, não grava nada e não conhece banco nem modalidade de
// fluxo: é independente do adapter humano (mesmo contrato de saída, entrada
// própria). Usa só as notas agregadas por critério (`criteriaScores`); notas e
// textos por pergunta não entram na derivação de necessidades.
//
// O `Record` exaustivo faz o compilador acusar qualquer critério novo sem
// correspondência de necessidade.
const CRITERION_TO_NEED: Record<CriterionKey, NeedKey> = {
  clarity: 'clarity',
  coherence: 'coherence',
  objectivity: 'objectivity',
  domain_knowledge: 'domain_knowledge',
  organization: 'organization',
  requirements_alignment: 'requirements_alignment',
  examples: 'examples',
};

// Só o que o adapter lê da avaliação (um `NormalizedAiEvaluation` completo é
// aceito, mas nada além das notas por critério é usado).
export type AiEvaluationCriteriaSource = Readonly<
  Pick<NormalizedAiEvaluation, 'criteriaScores'>
>;

// Devolve as notas (sem alteração) com as chaves de necessidade, na ordem
// canônica. Nota que não seja número finito é omitida (o critério simplesmente
// não gera necessidade), como no adapter humano.
export function normalizeAiCriteria(
  evaluation: AiEvaluationCriteriaSource,
): NormalizedCriteria {
  const normalized: NormalizedCriteria = {};
  for (const criterion of EVALUATION_CRITERIA) {
    const score = evaluation.criteriaScores[criterion.key];
    if (typeof score === 'number' && Number.isFinite(score)) {
      normalized[CRITERION_TO_NEED[criterion.key]] = score;
    }
  }
  return normalized;
}
