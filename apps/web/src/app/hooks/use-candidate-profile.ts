import { useCallback, useEffect, useRef, useState } from "react";
import type { ProfessionalProfile } from "../domain/professional-profile";
import {
  getCandidateProfile,
  type ProfileFailureReason,
} from "../services/candidate-profile-service";

export type CandidateProfileState =
  | { status: "loading"; profile: null; error: null; reason: null }
  | { status: "ready"; profile: ProfessionalProfile; error: null; reason: null }
  | { status: "error"; profile: null; error: string; reason: ProfileFailureReason };

/**
 * Carrega o Perfil Profissional real do candidato logado (GET /candidate/profile).
 * `setProfile` aceita o perfil devolvido por uma escrita da API (que já vem
 * recalculado) — nunca um valor montado no cliente.
 */
export function useCandidateProfile() {
  const [state, setState] = useState<CandidateProfileState>({
    status: "loading",
    profile: null,
    error: null,
    reason: null,
  });
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const current = ++requestId.current;
    setState({ status: "loading", profile: null, error: null, reason: null });
    const result = await getCandidateProfile();
    if (current !== requestId.current) return; // resposta obsoleta / desmontado
    setState(
      result.ok
        ? { status: "ready", profile: result.data, error: null, reason: null }
        : { status: "error", profile: null, error: result.message, reason: result.reason },
    );
  }, []);

  useEffect(() => {
    void load();
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  const setProfile = useCallback((profile: ProfessionalProfile) => {
    setState({ status: "ready", profile, error: null, reason: null });
  }, []);

  return { ...state, reload: load, setProfile };
}
