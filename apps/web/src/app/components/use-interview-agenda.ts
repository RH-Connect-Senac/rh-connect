import { useCallback, useEffect, useState } from "react";
import {
  cancelExternalInterview,
  createExternalInterview,
  listExternalInterviews,
  submitExternalInterviewFeedback,
  updateExternalInterview,
} from "../services/interview-agenda-service";
import type {
  ExternalInterview,
  ExternalInterviewFeedbackInput,
  ExternalInterviewInput,
} from "../domain/interview-agenda";

const CLOCK_TICK_MS = 30_000;

/**
 * Estado da Agenda do candidato. Depende apenas do service (assíncrono), então
 * a troca da persistência local por API não exige mudanças nos componentes.
 * `now` é atualizado periodicamente para que "aguardando feedback" apareça
 * sozinho quando data + horário passarem, sem recarregar a página.
 */
export function useExternalInterviews(candidateId: string) {
  const [interviews, setInterviews] = useState<ExternalInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  const refresh = useCallback(async () => {
    try {
      setInterviews(await listExternalInterviews(candidateId));
      setLoadError(null);
    } catch {
      setLoadError("Não foi possível carregar a agenda.");
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = window.setInterval(tick, CLOCK_TICK_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  const create = useCallback(
    async (input: ExternalInterviewInput) => {
      const created = await createExternalInterview(candidateId, input);
      await refresh();
      return created;
    },
    [candidateId, refresh],
  );

  const update = useCallback(
    async (interviewId: string, input: ExternalInterviewInput) => {
      const updated = await updateExternalInterview(candidateId, interviewId, input);
      await refresh();
      return updated;
    },
    [candidateId, refresh],
  );

  const cancel = useCallback(
    async (interviewId: string) => {
      const cancelled = await cancelExternalInterview(candidateId, interviewId);
      await refresh();
      return cancelled;
    },
    [candidateId, refresh],
  );

  const submitFeedback = useCallback(
    async (interviewId: string, input: ExternalInterviewFeedbackInput) => {
      const completed = await submitExternalInterviewFeedback(candidateId, interviewId, input);
      await refresh();
      return completed;
    },
    [candidateId, refresh],
  );

  return { interviews, loading, loadError, now, create, update, cancel, submitFeedback };
}
