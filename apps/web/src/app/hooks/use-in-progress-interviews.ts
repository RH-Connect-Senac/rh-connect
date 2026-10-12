import { useCallback, useEffect, useRef, useState } from "react";
import {
  listInProgressInterviews,
  type RealInProgressInterview,
} from "../services/candidate-interviews-service";
import {
  applyInProgressResult,
  type InProgressInterviewsState as BaseState,
} from "../domain/dashboard-interviews-sync";

export type InProgressInterviewsState = BaseState<RealInProgressInterview>;

/**
 * Entrevistas IN_PROGRESS do candidato logado (GET /interviews/in-progress).
 * Só descoberta: não grava nada no navegador e não redireciona.
 */
export function useInProgressInterviews() {
  const [state, setState] = useState<InProgressInterviewsState>({
    status: "loading",
    items: null,
    error: null,
  });
  const requestId = useRef(0);

  const inFlight = useRef(false);

  const run = useCallback(async (silent: boolean) => {
    const current = ++requestId.current;
    inFlight.current = true;
    let result: Awaited<ReturnType<typeof listInProgressInterviews>>;
    try {
      result = await listInProgressInterviews();
    } finally {
      if (current === requestId.current) inFlight.current = false;
    }
    if (current !== requestId.current) return result.ok; // resposta obsoleta / desmontado
    setState((prev) => applyInProgressResult(prev, result, { silent }));
    return result.ok;
  }, []);

  const load = useCallback(async () => {
    await run(false);
  }, [run]);

  /**
   * Leitura silenciosa (polling/focus do Dashboard): não derruba o estado em caso de erro e
   * não inicia outra requisição se já houver uma em andamento.
   */
  const refresh = useCallback(async (): Promise<"ok" | "error"> => {
    if (inFlight.current) return "ok";
    return (await run(true)) ? "ok" : "error";
  }, [run]);

  useEffect(() => {
    void load();
    return () => {
      requestId.current += 1;
      inFlight.current = false;
    };
  }, [load]);

  return { ...state, reload: load, refresh };
}
