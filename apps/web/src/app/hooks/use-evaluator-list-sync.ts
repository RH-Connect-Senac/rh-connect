import { useCallback, useEffect, useRef, useState } from "react";
import {
  EvaluatorListLoader,
  attachEvaluatorListSync,
  type EvaluatorListResult,
  type EvaluatorListState,
} from "../domain/evaluator-list-sync";

/**
 * Lista do avaliador com carga inicial + sincronização leve (Fase 6A.3), SÓ
 * enquanto a tela está montada. `reload` é a recarga manual (mostra loading);
 * o polling/focus/visible/online usa o refresh silencioso. Ao desmontar, limpa
 * timers e listeners e descarta respostas em voo. Não é usado nas telas de
 * edição, revisão, sucesso nem nos detalhes.
 */
export function useEvaluatorListSync<T>(input: {
  fetch: () => Promise<EvaluatorListResult<T>>;
  intervalMs: number;
  maxBackoffMs: number;
}): [EvaluatorListState<T>, () => void] {
  const [state, setState] = useState<EvaluatorListState<T>>({ status: "loading" });
  const fetchRef = useRef(input.fetch);
  fetchRef.current = input.fetch;
  const loaderRef = useRef<EvaluatorListLoader<T> | null>(null);
  const { intervalMs, maxBackoffMs } = input;

  useEffect(() => {
    const loader = new EvaluatorListLoader<T>({
      fetch: () => fetchRef.current(),
      onState: setState,
    });
    loaderRef.current = loader;
    void loader.load();

    if (typeof window === "undefined" || typeof document === "undefined") {
      return () => {
        loader.dispose();
        loaderRef.current = null;
      };
    }
    const detach = attachEvaluatorListSync({
      win: window,
      doc: document,
      isOnline: () => typeof navigator === "undefined" || navigator.onLine !== false,
      refresh: () => loader.refresh(),
      intervalMs,
      maxBackoffMs,
    });
    return () => {
      detach();
      loader.dispose();
      loaderRef.current = null;
    };
  }, [intervalMs, maxBackoffMs]);

  const reload = useCallback(() => {
    void loaderRef.current?.load();
  }, []);

  return [state, reload];
}
