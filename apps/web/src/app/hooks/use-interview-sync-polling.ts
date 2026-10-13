import { useEffect, useRef } from "react";
import { attachInterviewSyncPolling, type InterviewSyncResult } from "../domain/interview-sync-poller";

/**
 * Liga o polling de sincronização entre dispositivos SÓ enquanto `enabled` (wizard aberto,
 * entrevista editável, sessão pronta). Ao desligar (sessão terminal, saída do wizard,
 * desmontagem) o efeito limpa timers e listeners.
 */
export function useInterviewSyncPolling(input: {
  enabled: boolean;
  sync: () => Promise<InterviewSyncResult | void>;
}) {
  const syncRef = useRef(input.sync);
  syncRef.current = input.sync;
  const { enabled } = input;

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || typeof document === "undefined") return undefined;
    return attachInterviewSyncPolling({
      win: window,
      doc: document,
      isOnline: () => typeof navigator === "undefined" || navigator.onLine !== false,
      sync: () => syncRef.current(),
    });
  }, [enabled]);
}
