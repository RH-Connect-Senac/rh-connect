import { useCallback, useEffect, useRef, useState } from "react";
import {
  listRealInterviewHistory,
  type RealInterviewHistory,
} from "../services/candidate-interviews-service";

export type CandidateInterviewHistoryState =
  | { status: "loading" }
  | { status: "ready"; history: RealInterviewHistory }
  | { status: "error"; reason: string; message: string };

/**
 * Entrevistas reais do candidato (GET /interviews) para o Dashboard (6A.5).
 * Uma única chamada ao montar e em `reload()` manual. Sem polling, sem listeners e sem
 * armazenamento do navegador: não deriva nada de mock nem de rascunho local.
 */
export function useCandidateInterviewHistory() {
  const [state, setState] = useState<CandidateInterviewHistoryState>({ status: "loading" });
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const current = ++requestId.current;
    setState({ status: "loading" });
    const result = await listRealInterviewHistory();
    if (current !== requestId.current) return; // resposta obsoleta / desmontado
    setState(
      result.ok
        ? { status: "ready", history: result.data }
        : { status: "error", reason: result.reason, message: result.message },
    );
  }, []);

  useEffect(() => {
    void reload();
    return () => {
      requestId.current += 1;
    };
  }, [reload]);

  return { state, reload };
}
