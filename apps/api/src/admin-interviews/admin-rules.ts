// Regras compartilhadas entre a fila/avaliadores do Admin e o Dashboard Admin.
// Ficam num arquivo próprio para que o Dashboard nunca divirja da fila real.

// Fila de atribuição: somente entrevistas HUMAN aguardando atribuição.
export const PENDING_ASSIGNMENT_WHERE = {
  evaluation_mode: 'HUMAN',
  status: 'PENDING_ASSIGNMENT',
} as const;

// Única regra de elegibilidade de avaliador (conta ACTIVE). Não usa
// availability_status. INVITED/INACTIVE/BLOCKED/PENDING_VERIFICATION não contam.
export const ELIGIBLE_EVALUATOR_ACCOUNT_STATUS = 'ACTIVE' as const;

export const ACTIVE_EVALUATOR_WHERE = {
  app_user: {
    user_role: 'EVALUATOR',
    account_status: ELIGIBLE_EVALUATOR_ACCOUNT_STATUS,
  },
} as const;

export function isEligibleEvaluatorStatus(accountStatus: string): boolean {
  return accountStatus === ELIGIBLE_EVALUATOR_ACCOUNT_STATUS;
}

// Filtro `candidateId` da listagem geral do Admin: inteiro positivo, compatível
// com o `Int` do Postgres. Qualquer outra coisa (vazio, "abc", "1.5", "-1",
// "1e3", repetido na query, maior que o limite) é inválida => 400.
export const MAX_CANDIDATE_ID = 2147483647;

export function parseCandidateIdFilter(raw: unknown): number | undefined | null {
  if (raw === undefined) return undefined;
  if (typeof raw !== 'string' || !/^[1-9]\d{0,9}$/.test(raw)) return null;
  const value = Number(raw);
  return value <= MAX_CANDIDATE_ID ? value : null;
}
