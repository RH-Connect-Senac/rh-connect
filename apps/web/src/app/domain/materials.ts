export type MaterialArea = "TI" | "RH" | "SECRETARIADO";

export type MaterialType = "READING";

export type MaterialStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

export type SupportMaterialSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  example?: string;
  tip?: string;
};

export type SupportMaterial = {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: MaterialType;
  category: string;
  area?: MaterialArea;
  track?: string;
  competencyIds: string[];
  recommended?: boolean;
  content: {
    intro?: string;
    sections: SupportMaterialSection[];
    summary?: string;
  };
};

export type MaterialUserState = {
  materialId: string;
  status: MaterialStatus;
  isFavorite: boolean;
  lastAccessedAt?: string;
  completedAt?: string;
};

export type CompleteMaterialResult = {
  state: MaterialUserState;
  completedNow: boolean;
};

// Prompt 09 — Parte A: isolamento por candidato real. Antes (v1), este
// storage era um único array global de MaterialUserState, compartilhado por
// qualquer usuário do navegador. Agora (v2) o progresso fica isolado por
// candidateId real (session.user.id), dentro de `byCandidate`. Dado que o
// formato v1 não tinha noção de candidateId (não há dono conhecido para os
// dados antigos), o bump de versão faz `normalizeMaterialsStorage` rejeitar
// o formato antigo e a leitura seguinte recomeça limpa — nunca atribuindo o
// progresso antigo a quem logar primeiro (ver materials-service.ts).
export type MaterialsStorageState = {
  version: "v2";
  byCandidate: Record<string, MaterialUserState[]>;
};

export const MATERIALS_STORAGE_KEY = "rhconnect:materials:v1";
export const MATERIALS_STATE_VERSION = "v2";

export function getDefaultMaterialUserState(materialId: string): MaterialUserState {
  return {
    materialId,
    status: "NOT_STARTED",
    isFavorite: false,
  };
}
