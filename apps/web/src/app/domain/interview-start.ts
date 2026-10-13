import type { CandidateInterviewResult } from "../services/candidate-interviews-service";

export type StartInterviewOutcome<Q> =
  | { ok: true; interviewId: string; questions: Q[] }
  | { ok: false; kind: "already_in_progress"; existingInterviewId?: string }
  | { ok: false; kind: "error"; message: string };

/**
 * "Analisar e gerar perguntas": garante uma Interview IN_PROGRESS para o contexto e gera as perguntas.
 * - Sem id atual: cria uma NOVA entrevista (a mesma vaga/link pode gerar várias; nunca se deduplica por URL).
 * - Com id atual (voltar/avançar): reaproveita; se o Back diz que ele já saiu de IN_PROGRESS
 *   (cancelada/enviada em outro dispositivo), descarta o id antigo e cria outra. Nenhuma mutação
 *   volta a usar o id obsoleto depois disso.
 */
export async function startInterviewForContext<C, Q>(input: {
  context: C;
  currentInterviewId?: string;
  create: (context: C) => Promise<CandidateInterviewResult<{ id: string }>>;
  generate: (interviewId: string) => Promise<CandidateInterviewResult<Q[]>>;
  onCreated?: (interviewId: string) => void;
  onObsolete?: (interviewId: string) => void;
}): Promise<StartInterviewOutcome<Q>> {
  const createNew = async (): Promise<{ id: string } | StartInterviewOutcome<Q>> => {
    const created = await input.create(input.context);
    if (!created.ok) {
      if (created.reason === "already_in_progress") {
        return { ok: false, kind: "already_in_progress", existingInterviewId: created.existingInterviewId };
      }
      return { ok: false, kind: "error", message: created.message };
    }
    input.onCreated?.(created.data.id);
    return { id: created.data.id };
  };

  let interviewId = input.currentInterviewId;
  if (!interviewId) {
    const created = await createNew();
    if (!("id" in created)) return created;
    interviewId = created.id;
  }
  let generated = await input.generate(interviewId);
  if (!generated.ok && generated.reason === "not_in_progress" && input.currentInterviewId && interviewId === input.currentInterviewId) {
    input.onObsolete?.(input.currentInterviewId);
    const created = await createNew();
    if (!("id" in created)) return created;
    interviewId = created.id;
    generated = await input.generate(interviewId);
  }
  if (!generated.ok) return { ok: false, kind: "error", message: generated.message };
  return { ok: true, interviewId, questions: generated.data };
}
