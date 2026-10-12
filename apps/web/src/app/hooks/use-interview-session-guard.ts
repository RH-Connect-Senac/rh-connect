import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { InterviewSessionTerminalContext } from "./interview-session-terminal";
import { attachRevalidation, isInterviewEditable } from "../domain/interview-session-guard";
import { useInterviewSyncPolling } from "./use-interview-sync-polling";
import { getRealQuestionsState, type RealInterviewStatus } from "../services/candidate-interviews-service";

export type InterviewSessionGuard = {
  /** Status não editável descoberto (null = editável/desconhecido). */
  staleStatus: RealInterviewStatus | null;
  stale: boolean;
  /** Marca a sessão como stale (ex.: um PUT respondeu INTERVIEW_NOT_IN_PROGRESS). */
  markStale: (status?: RealInterviewStatus) => void;
  /** Revalida AGORA (antes de uma mutação importante). true = continua editável. */
  revalidateNow: () => Promise<boolean>;
};

/**
 * Revalida o status da entrevista quando a janela recebe foco e quando a aba
 * volta a ficar visível (sem polling). `onStale` roda uma vez, na primeira vez
 * que o Back informa que a entrevista não está mais IN_PROGRESS.
 */
export function useInterviewSessionGuard(input: {
  interviewId: string | undefined;
  enabled?: boolean;
  /** false: não revalida no foco (a tela já tem polling próprio que sincroniza ao voltar o foco). */
  revalidateOnFocus?: boolean;
  /** true: polling leve só do STATUS (telas de revisão/confirmação, sem edição de resposta). */
  pollStatus?: boolean;
  onStale?: (status: RealInterviewStatus) => void;
}): InterviewSessionGuard {
  const { interviewId, enabled = true, revalidateOnFocus = true, pollStatus = false } = input;
  const [staleStatus, setStaleStatus] = useState<RealInterviewStatus | null>(null);
  const staleRef = useRef(false);
  const onStaleRef = useRef(input.onStale);
  onStaleRef.current = input.onStale;
  // Avisa o App raiz: sessão terminal => sem proteção de saída (beforeunload etc.).
  const reportTerminal = useContext(InterviewSessionTerminalContext);
  const reportTerminalRef = useRef(reportTerminal);
  reportTerminalRef.current = reportTerminal;
  const interviewIdRef = useRef(interviewId);
  interviewIdRef.current = interviewId;

  const markStale = useCallback((status: RealInterviewStatus = "PENDING_ASSIGNMENT") => {
    if (staleRef.current) return;
    staleRef.current = true;
    setStaleStatus(status);
    if (interviewIdRef.current) reportTerminalRef.current?.(interviewIdRef.current, status);
    onStaleRef.current?.(status);
  }, []);

  const revalidateNow = useCallback(async (): Promise<boolean> => {
    if (staleRef.current) return false;
    if (!interviewId) return true;
    const result = await getRealQuestionsState(interviewId);
    if (!result.ok) {
      if (result.reason === "not_in_progress") {
        markStale(result.interviewStatus);
        return false;
      }
      // Falha de rede/servidor: não bloqueia; a escrita no Back segue sendo a barreira.
      return true;
    }
    if (!isInterviewEditable(result.data.interviewStatus)) {
      markStale(result.data.interviewStatus ?? undefined);
      return false;
    }
    return true;
  }, [interviewId, markStale]);

  useEffect(() => {
    if (!enabled || !revalidateOnFocus || !interviewId || typeof window === "undefined" || typeof document === "undefined") {
      return undefined;
    }
    return attachRevalidation({
      win: window,
      doc: document,
      revalidate: async () => {
        await revalidateNow();
      },
    });
  }, [enabled, revalidateOnFocus, interviewId, revalidateNow]);

  // Status por polling leve (mesma revalidação do foco): termina sozinho quando a sessão vira terminal.
  useInterviewSyncPolling({
    enabled: pollStatus && enabled && Boolean(interviewId) && staleStatus === null,
    sync: async () => ((await revalidateNow()) ? "ok" : "stop"),
  });

  return { staleStatus, stale: staleStatus !== null, markStale, revalidateNow };
}
