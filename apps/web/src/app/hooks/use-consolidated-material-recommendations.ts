import { useCallback, useEffect, useRef, useState } from "react";

import {
  getConsolidatedMaterialRecommendations,
  type ConsolidatedMaterialRecommendation,
} from "../services/candidate-material-recommendations-service";

export type ConsolidatedRecommendationsLoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; value: ConsolidatedMaterialRecommendation[] };

/**
 * Carga ÚNICA (one-shot) das recomendações consolidadas de Materiais (R7B).
 *
 * Não faz parte da arquitetura de live sync do candidato: sem polling, sem timer, sem listener de
 * foco/visibilidade/rede e sem refresh automático. Carrega uma vez ao montar (ou quando
 * `resourceKey` muda, ex.: outro candidato) e só volta a buscar em `reload` (botão
 * "Tentar novamente"). Resposta antiga nunca sobrescreve a mais nova, e nada é publicado depois
 * que a tela desmonta.
 */
export function useConsolidatedMaterialRecommendations(resourceKey: string): {
  state: ConsolidatedRecommendationsLoadState;
  reload: () => void;
} {
  const [state, setState] = useState<ConsolidatedRecommendationsLoadState>({ status: "loading" });
  const requestIdRef = useRef(0);

  const load = useCallback(() => {
    const requestId = ++requestIdRef.current;
    setState((current) => (current.status === "loading" ? current : { status: "loading" }));
    void getConsolidatedMaterialRecommendations().then((result) => {
      if (requestIdRef.current !== requestId) return;
      setState(result.ok ? { status: "ready", value: result.data } : { status: "error", message: result.message });
    });
  }, []);

  useEffect(() => {
    load();
    return () => {
      // Invalida qualquer resposta em voo ao desmontar ou trocar de candidato.
      requestIdRef.current++;
    };
  }, [resourceKey, load]);

  return { state, reload: load };
}
