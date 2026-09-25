import {
  MATERIALS_STATE_VERSION,
  MATERIALS_STORAGE_KEY,
  getDefaultMaterialUserState,
  type CompleteMaterialResult,
  type MaterialsStorageState,
  type MaterialStatus,
  type MaterialUserState,
} from "../domain/materials";
import { SUPPORT_MATERIALS } from "../mocks/materials";

const supportMaterialIds = new Set(SUPPORT_MATERIALS.map((material) => material.id));

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function createEmptyMaterialsState(): MaterialsStorageState {
  return {
    version: MATERIALS_STATE_VERSION,
    byCandidate: {},
  };
}

function isMaterialStatus(value: unknown): value is MaterialStatus {
  return value === "NOT_STARTED" || value === "IN_PROGRESS" || value === "COMPLETED";
}

function normalizeMaterialUserState(value: unknown): MaterialUserState | null {
  if (!value || typeof value !== "object") return null;

  const item = value as Partial<MaterialUserState>;
  if (typeof item.materialId !== "string" || !supportMaterialIds.has(item.materialId)) return null;
  if (!isMaterialStatus(item.status)) return null;
  if (typeof item.isFavorite !== "boolean") return null;
  if (item.lastAccessedAt !== undefined && typeof item.lastAccessedAt !== "string") return null;
  if (item.completedAt !== undefined && typeof item.completedAt !== "string") return null;

  return {
    materialId: item.materialId,
    status: item.status,
    isFavorite: item.isFavorite,
    lastAccessedAt: item.lastAccessedAt,
    completedAt: item.completedAt,
  };
}

function normalizeCandidateMaterials(value: unknown): MaterialUserState[] | null {
  if (!Array.isArray(value)) return null;

  const byMaterialId = new Map<string, MaterialUserState>();
  for (const rawItem of value) {
    const item = normalizeMaterialUserState(rawItem);
    if (!item) return null;
    byMaterialId.set(item.materialId, item);
  }

  return Array.from(byMaterialId.values());
}

// Prompt 09 — Parte A: só aceita o formato v2 (`byCandidate`, isolado por
// candidateId real). Um storage v1 (array global `materials`, sem dono
// conhecido) — ou qualquer JSON que não bata com o formato esperado — é
// tratado como incompatível e descartado por inteiro nesta leitura; NUNCA é
// migrado/atribuído a um candidateId específico. Isso é intencional: dados
// antigos não têm um dono real identificável.
function normalizeMaterialsStorage(value: unknown): MaterialsStorageState | null {
  if (!value || typeof value !== "object") return null;

  const state = value as Partial<MaterialsStorageState>;
  if (state.version !== MATERIALS_STATE_VERSION) return null;
  if (!state.byCandidate || typeof state.byCandidate !== "object" || Array.isArray(state.byCandidate)) return null;

  const byCandidate: Record<string, MaterialUserState[]> = {};
  for (const [candidateId, rawList] of Object.entries(state.byCandidate)) {
    const normalizedList = normalizeCandidateMaterials(rawList);
    if (!normalizedList) return null;
    byCandidate[candidateId] = normalizedList;
  }

  return {
    version: MATERIALS_STATE_VERSION,
    byCandidate,
  };
}

function readMaterialsStorage(): MaterialsStorageState {
  if (!canUseLocalStorage()) return createEmptyMaterialsState();

  const raw = window.localStorage.getItem(MATERIALS_STORAGE_KEY);
  if (!raw) return createEmptyMaterialsState();

  try {
    const parsed = JSON.parse(raw);
    const normalized = normalizeMaterialsStorage(parsed);
    if (normalized) return normalized;
  } catch {
    // Invalid localStorage data is safely replaced by a clean state.
  }

  const resetState = createEmptyMaterialsState();
  saveMaterialsStorage(resetState);
  return resetState;
}

function saveMaterialsStorage(state: MaterialsStorageState) {
  if (!canUseLocalStorage()) return;

  try {
    window.localStorage.setItem(MATERIALS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage failures should not break the candidate flow.
  }
}

function upsertMaterialUserState(
  candidateId: string,
  materialId: string,
  update: (current: MaterialUserState) => MaterialUserState,
): MaterialUserState {
  // Leitura fresca do storage completo a cada escrita (não a partir de um
  // estado em memória) para nunca sobrescrever o progresso de outro
  // candidateId já persistido.
  const state = readMaterialsStorage();
  const candidateMaterials = state.byCandidate[candidateId] ?? [];
  const existing = candidateMaterials.find((item) => item.materialId === materialId) ?? getDefaultMaterialUserState(materialId);
  const nextItem = update(existing);

  const nextState: MaterialsStorageState = {
    version: MATERIALS_STATE_VERSION,
    byCandidate: {
      ...state.byCandidate,
      [candidateId]: [
        ...candidateMaterials.filter((item) => item.materialId !== materialId),
        nextItem,
      ],
    },
  };

  saveMaterialsStorage(nextState);
  return nextItem;
}

export function getMaterialUserStates(candidateId: string) {
  return readMaterialsStorage().byCandidate[candidateId] ?? [];
}

export function getMaterialUserState(candidateId: string, materialId: string) {
  return getMaterialUserStates(candidateId).find((item) => item.materialId === materialId) ?? getDefaultMaterialUserState(materialId);
}

export function openMaterial(candidateId: string, materialId: string, openedAt = new Date().toISOString()) {
  return upsertMaterialUserState(candidateId, materialId, (current) => ({
    ...current,
    status: current.status === "NOT_STARTED" ? "IN_PROGRESS" : current.status,
    lastAccessedAt: openedAt,
  }));
}

export function completeMaterial(candidateId: string, materialId: string, completedAt = new Date().toISOString()): CompleteMaterialResult {
  let completedNow = false;
  const state = upsertMaterialUserState(candidateId, materialId, (current) => {
    if (current.status === "COMPLETED") return current;

    completedNow = true;

    return {
      ...current,
      status: "COMPLETED",
      lastAccessedAt: completedAt,
      completedAt,
    };
  });

  return { state, completedNow };
}

export function toggleMaterialFavorite(candidateId: string, materialId: string) {
  return upsertMaterialUserState(candidateId, materialId, (current) => ({
    ...current,
    isFavorite: !current.isFavorite,
  }));
}

// Reseta apenas o progresso do candidateId informado; o progresso de outros
// candidatos já persistidos no mesmo localStorage não é afetado.
export function resetMaterialsState(candidateId: string) {
  const state = readMaterialsStorage();
  const nextState: MaterialsStorageState = {
    version: MATERIALS_STATE_VERSION,
    byCandidate: {
      ...state.byCandidate,
      [candidateId]: [],
    },
  };
  saveMaterialsStorage(nextState);
  return nextState.byCandidate[candidateId];
}
