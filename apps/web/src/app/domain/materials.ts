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

export type MaterialsStorageState = {
  version: "v1";
  materials: MaterialUserState[];
};

export const MATERIALS_STORAGE_KEY = "rhconnect:materials:v1";
export const MATERIALS_STATE_VERSION = "v1";

export function getDefaultMaterialUserState(materialId: string): MaterialUserState {
  return {
    materialId,
    status: "NOT_STARTED",
    isFavorite: false,
  };
}
