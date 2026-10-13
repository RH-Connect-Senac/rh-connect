import { useEffect, useRef } from "react";
import { attachDashboardInterviewsSync } from "../domain/dashboard-interviews-sync";
import type { InterviewSyncResult } from "../domain/interview-sync-poller";

/**
 * Mantém o Dashboard do candidato atualizado entre dispositivos SÓ enquanto ele está montado:
 * refresh imediato em focus/visible/online e polling de 15 s (pausado em hidden/offline).
 * Ao desmontar, limpa timers e listeners. Não é usado no wizard, Admin, Avaliador, histórico nem agenda.
 */
export function useDashboardInterviewsSync(refresh: () => Promise<InterviewSyncResult | void>) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return undefined;
    return attachDashboardInterviewsSync({
      win: window,
      doc: document,
      isOnline: () => typeof navigator === "undefined" || navigator.onLine !== false,
      refresh: () => refreshRef.current(),
    });
  }, []);
}
