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
};

export const EVALUATOR_DIRECTORY = [
  { id: DEFAULT_EVALUATOR.id, name: DEFAULT_EVALUATOR.name },
  { id: "evaluator-beatriz-lima", name: "Beatriz Lima" },
  { id: "evaluator-eduardo-rocha", name: "Eduardo Rocha" },
  { id: "evaluator-camila-dias", name: "Camila Dias" },
];

export function createInitialInterviewsMockState(): InterviewsMockState {
  return {
    version: INTERVIEWS_MOCK_VERSION,
    interviews: [],
    evaluations: [],
    reports: [],
    assignments: [],
  };
}
