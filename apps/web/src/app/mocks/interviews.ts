import type { InterviewsMockState } from "../domain/interviews";

export const INTERVIEWS_MOCK_STORAGE_KEY = "rhconnect:interviews:v1";
export const INTERVIEWS_MOCK_VERSION = 1;

export const DEFAULT_CANDIDATE = {
  id: "candidate-joao-lima",
  name: "João Lima",
  email: "joao.lima@gmail.com",
};

export const DEFAULT_EVALUATOR = {
  id: "evaluator-carlos-andrade",
  name: "Carlos Andrade",
  email: "carlos.andrade@gmail.com",
};

// `email` aqui é a ponte de compatibilidade temporária entre a sessão REAL
// (Fluxo 01 / Prompt 03, `session.user.id` = `user_id` do Prisma) e o
// domínio mock de Avaliações (ainda 100% localStorage, ids estáveis tipo
// "evaluator-carlos-andrade"). Usado por `getEvaluatorIdentity()` em
// `App.tsx` para resolver, por e-mail normalizado, qual id mock corresponde
// ao avaliador real autenticado — sem isso, o id real do banco nunca bate
// com o `assignedEvaluatorId` que o Admin grava no mock de atribuição.
export const EVALUATOR_DIRECTORY = [
  { id: DEFAULT_EVALUATOR.id, name: DEFAULT_EVALUATOR.name, email: DEFAULT_EVALUATOR.email },
  { id: "evaluator-beatriz-lima", name: "Beatriz Lima", email: "beatriz.lima@gmail.com" },
  { id: "evaluator-eduardo-rocha", name: "Eduardo Rocha", email: "eduardo.rocha@gmail.com" },
  { id: "evaluator-camila-dias", name: "Camila Dias", email: "camila.dias@gmail.com" },
];

// Resolve o id mock estável de Avaliações a partir de um e-mail já
// normalizado (trim + lowercase). Retorna `null` quando não há avaliador
// mock conhecido para esse e-mail (fallback fica a cargo de quem chama).
export function findEvaluatorIdByEmail(normalizedEmail: string): string | null {
  const match = EVALUATOR_DIRECTORY.find((evaluator) => evaluator.email === normalizedEmail);
  return match ? match.id : null;
}

export function createInitialInterviewsMockState(): InterviewsMockState {
  return {
    version: INTERVIEWS_MOCK_VERSION,
    interviews: [],
    evaluations: [],
    reports: [],
    assignments: [],
  };
}
