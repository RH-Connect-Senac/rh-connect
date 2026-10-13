import { useCallback, useEffect, useRef, useState } from "react";
import {
  LiveResourceLoader,
  attachCandidateLiveSync,
  type LiveResult,
  type LiveState,
} from "../domain/candidate-live-sync";
import type { InterviewSyncResult } from "../domain/interview-sync-poller";

/**
 * Recurso real do candidato com carga inicial + sincronização leve (Fase 6A.6), SÓ enquanto a
 * tela está montada. `reload` é a recarga manual (mostra loading); `refresh` é a leitura
 * silenciosa (nunca mostra loading nem troca dados válidos por erro).
 *
 * `sync` (opcional) liga o polling/focus/visible/online próprio do recurso. Sem `sync`, o chamador
 * decide quando chamar `refresh` (ex.: Dashboard, que já tem UM ciclo compartilhado). Ao desmontar
 * ou mudar `resourceKey`, limpa timers e listeners e descarta respostas em voo.
 */
export function useCandidateLiveResource<T>(input: {
  resourceKey: string;
  fetch: () => Promise<LiveResult<T>>;
  isTerminal?: (value: T) => boolean;
  sync?: { intervalMs: number; maxBackoffMs: number };
}): { state: LiveState<T>; reload: () => void; refresh: () => Promise<InterviewSyncResult> } {
  const [state, setState] = useState<LiveState<T>>({ status: "loading" });
  const fetchRef = useRef(input.fetch);
  fetchRef.current = input.fetch;
  const terminalRef = useRef(input.isTerminal);
  terminalRef.current = input.isTerminal;
  const loaderRef = useRef<LiveResourceLoader<T> | null>(null);
  const { resourceKey } = input;
  const intervalMs = input.sync?.intervalMs;
  const maxBackoffMs = input.sync?.maxBackoffMs;

  useEffect(() => {
    // Já nasce em "loading" (useState acima): não troca por um objeto novo, para não gerar render extra.
    setState((prev) => (prev.status === "loading" ? prev : { status: "loading" }));
    const loader = new LiveResourceLoader<T>({
      fetch: () => fetchRef.current(),
      onState: setState,
      isTerminal: (value) => Boolean(terminalRef.current?.(value)),
    });
    loaderRef.current = loader;
    void loader.load();

    let detach: (() => void) | null = null;
    if (intervalMs !== undefined && maxBackoffMs !== undefined && typeof window !== "undefined" && typeof document !== "undefined") {
      detach = attachCandidateLiveSync({
        win: window,
        doc: document,
        isOnline: () => typeof navigator === "undefined" || navigator.onLine !== false,
        refresh: () => loader.refresh(),
        intervalMs,
        maxBackoffMs,
      });
    }
    return () => {
      detach?.();
      loader.dispose();
      loaderRef.current = null;
    };
  }, [resourceKey, intervalMs, maxBackoffMs]);

  const reload = useCallback(() => {
    void loaderRef.current?.load();
  }, []);

  const refresh = useCallback(async (): Promise<InterviewSyncResult> => (await loaderRef.current?.refresh()) ?? "ok", []);

  return { state, reload, refresh };
}
