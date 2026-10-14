import { readCriteriaScores } from '../../evaluator-interviews/evaluation-criteria';
import type { CriterionKey } from '../../evaluator-interviews/evaluation-criteria';
import type { NeedKey, NormalizedCriteria } from '../recommendation.types';

// Adapter da avaliação HUMANA: é a ÚNICA peça desta feature que conhece o
// formato persistido do avaliador (JSONB `criteria_scores`). Tudo o que vem
// depois (derivação de necessidades e motor) recebe apenas critérios
// normalizados. Um adapter de outra modalidade teria o mesmo contrato de saída.
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

// Lê o JSONB de forma defensiva (só chaves canônicas com número finito) e o
// devolve com as chaves de necessidade. Não calcula nada, não grava nada.
export function normalizeHumanCriteria(
  rawCriteriaScores: unknown,
): NormalizedCriteria {
  const scores = readCriteriaScores(rawCriteriaScores);
  const normalized: NormalizedCriteria = {};
  for (const [criterion, score] of Object.entries(scores)) {
    normalized[CRITERION_TO_NEED[criterion as CriterionKey]] = score;
  }
  return normalized;
}
