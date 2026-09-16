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
    materials: [],
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

function normalizeMaterialsStorage(value: unknown): MaterialsStorageState | null {
  if (!value || typeof value !== "object") return null;

  const state = value as Partial<MaterialsStorageState>;
  if (state.version !== MATERIALS_STATE_VERSION) return null;
  if (!Array.isArray(state.materials)) return null;

  const byMaterialId = new Map<string, MaterialUserState>();
  for (const rawItem of state.materials) {
    const item = normalizeMaterialUserState(rawItem);
    if (!item) return null;
    byMaterialId.set(item.materialId, item);
  }

  return {
    version: MATERIALS_STATE_VERSION,
    materials: Array.from(byMaterialId.values()),
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
    // Invalid localStorage data is safely replaced by a clean V1 state.
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
  materialId: string,
  update: (current: MaterialUserState) => MaterialUserState,
): MaterialUserState {
  const state = readMaterialsStorage();
  const existing = state.materials.find((item) => item.materialId === materialId) ?? getDefaultMaterialUserState(materialId);
  const nextItem = update(existing);

  const nextState: MaterialsStorageState = {
    version: MATERIALS_STATE_VERSION,
    materials: [
      ...state.materials.filter((item) => item.materialId !== materialId),
      nextItem,
    ],
  };

  saveMaterialsStorage(nextState);
  return nextItem;
}

export function getMaterialUserStates() {
  return readMaterialsStorage().materials;
}

export function getMaterialUserState(materialId: string) {
  return readMaterialsStorage().materials.find((item) => item.materialId === materialId) ?? getDefaultMaterialUserState(materialId);
}

export function openMaterial(materialId: string, openedAt = new Date().toISOString()) {
  return upsertMaterialUserState(materialId, (current) => ({
    ...current,
    status: current.status === "NOT_STARTED" ? "IN_PROGRESS" : current.status,
    lastAccessedAt: openedAt,
  }));
}

export function completeMaterial(materialId: string, completedAt = new Date().toISOString()): CompleteMaterialResult {
  let completedNow = false;
  const state = upsertMaterialUserState(materialId, (current) => {
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

export function toggleMaterialFavorite(materialId: string) {
  return upsertMaterialUserState(materialId, (current) => ({
    ...current,
    isFavorite: !current.isFavorite,
  }));
}

export function resetMaterialsState() {
  const state = createEmptyMaterialsState();
  saveMaterialsStorage(state);
  return state;
}
