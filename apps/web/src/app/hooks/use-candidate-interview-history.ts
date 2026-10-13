import { useMemo } from "react";
import {
  listRealInterviewHistory,
  type RealInterviewHistory,
} from "../services/candidate-interviews-service";
import {
  CANDIDATE_HISTORY_SYNC_INTERVAL_MS,
  CANDIDATE_HISTORY_SYNC_MAX_BACKOFF_MS,
} from "../domain/candidate-live-sync";
import { useCandidateLiveResource } from "./use-candidate-live-resource";

export type CandidateInterviewHistoryState =
  | { status: "loading" }
  | { status: "ready"; history: RealInterviewHistory }
  | { status: "error"; reason: string; message: string };

/**
 * Entrevistas reais do candidato (GET /interviews), uma única fonte para Histórico e Dashboard.
 *
 * - `autoSync: true` (Histórico): sincroniza sozinho (30 s + focus/visible/online, pausa em
 *   hidden/offline), só enquanto a tela está montada.
 * - `autoSync: false` (Dashboard): NÃO cria polling próprio; o Dashboard chama `refresh()` no
 *   seu ciclo único, junto com o de in-progress.
 * Sem armazenamento do navegador, sem mock.
 */
export function useCandidateInterviewHistory(options: { autoSync: boolean }) {
  const live = useCandidateLiveResource<RealInterviewHistory>({
    resourceKey: "candidate-interview-history",
    fetch: () => listRealInterviewHistory(),
    sync: options.autoSync
      ? { intervalMs: CANDIDATE_HISTORY_SYNC_INTERVAL_MS, maxBackoffMs: CANDIDATE_HISTORY_SYNC_MAX_BACKOFF_MS }
      : undefined,
  });
  const liveState = live.state;
  const state = useMemo<CandidateInterviewHistoryState>(
    () => (liveState.status === "ready" ? { status: "ready", history: liveState.value } : liveState),
    [liveState],
  );
  return { state, reload: live.reload, refresh: live.refresh };
}
