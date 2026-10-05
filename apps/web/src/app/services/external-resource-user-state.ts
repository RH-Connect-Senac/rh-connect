import type { ExternalLearningResource, ExternalResourceSource } from "./external-resources-service";

// Estado local (histórico de acesso e favoritos) dos conteúdos de parceiros
// (Cachola / Orango). Segue o mesmo princípio dos materiais RH Connect:
// localStorage, isolado por candidateId. Como os conteúdos externos vêm de uma
// API paginada, guarda-se também um snapshot do recurso, para que Histórico e
// Favoritos consigam exibi-lo sem precisar buscá-lo de novo. Nada é enviado ao
// backend.

export const EXTERNAL_RESOURCES_STORAGE_KEY = "rhconnect:external-resources:v1";
const EXTERNAL_RESOURCES_STATE_VERSION = 1;

export type ExternalResourceUserState = {
  resourceId: string;
  source: ExternalResourceSource;
  isFavorite: boolean;
  lastAccessedAt?: string;
  resource: ExternalLearningResource;
};

type ExternalResourcesStorageState = {
  version: number;
  byCandidate: Record<string, ExternalResourceUserState[]>;
};

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function createEmptyState(): ExternalResourcesStorageState {
  return { version: EXTERNAL_RESOURCES_STATE_VERSION, byCandidate: {} };
}

function isSource(value: unknown): value is ExternalResourceSource {
  return value === "CACHOLA" || value === "ORANGO";
}

function normalizeItem(value: unknown): ExternalResourceUserState | null {
  if (!value || typeof value !== "object") return null;

  const item = value as Partial<ExternalResourceUserState>;
  if (typeof item.resourceId !== "string" || !isSource(item.source)) return null;
  if (typeof item.isFavorite !== "boolean") return null;
  if (item.lastAccessedAt !== undefined && typeof item.lastAccessedAt !== "string") return null;
  if (!item.resource || typeof item.resource !== "object") return null;
  if (typeof item.resource.id !== "string" || typeof item.resource.title !== "string") return null;

  return {
    resourceId: item.resourceId,
    source: item.source,
    isFavorite: item.isFavorite,
    lastAccessedAt: item.lastAccessedAt,
    resource: item.resource,
  };
}

function normalizeStorage(value: unknown): ExternalResourcesStorageState | null {
  if (!value || typeof value !== "object") return null;

  const state = value as Partial<ExternalResourcesStorageState>;
  if (state.version !== EXTERNAL_RESOURCES_STATE_VERSION) return null;
  if (!state.byCandidate || typeof state.byCandidate !== "object" || Array.isArray(state.byCandidate)) return null;

  const byCandidate: Record<string, ExternalResourceUserState[]> = {};
  for (const [candidateId, rawList] of Object.entries(state.byCandidate)) {
    if (!Array.isArray(rawList)) return null;
    const list: ExternalResourceUserState[] = [];
    for (const rawItem of rawList) {
      const item = normalizeItem(rawItem);
      if (!item) return null;
      list.push(item);
    }
    byCandidate[candidateId] = list;
  }

  return { version: EXTERNAL_RESOURCES_STATE_VERSION, byCandidate };
}

function readStorage(): ExternalResourcesStorageState {
  if (!canUseLocalStorage()) return createEmptyState();

  try {
    const raw = window.localStorage.getItem(EXTERNAL_RESOURCES_STORAGE_KEY);
    if (!raw) return createEmptyState();
    const normalized = normalizeStorage(JSON.parse(raw));
    if (normalized) return normalized;
  } catch {
    // Dados inválidos no localStorage são descartados com segurança.
  }

  return createEmptyState();
}

function saveStorage(state: ExternalResourcesStorageState) {
  if (!canUseLocalStorage()) return;

  try {
    window.localStorage.setItem(EXTERNAL_RESOURCES_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Falhas de storage não devem quebrar o fluxo do candidato.
  }
}

function upsert(
  candidateId: string,
  resource: ExternalLearningResource,
  update: (current: ExternalResourceUserState) => ExternalResourceUserState,
) {
  // Leitura fresca a cada escrita para não sobrescrever outro candidateId.
  const state = readStorage();
  const list = state.byCandidate[candidateId] ?? [];
  const existing = list.find((item) => item.resourceId === resource.id && item.source === resource.source) ?? {
    resourceId: resource.id,
    source: resource.source,
    isFavorite: false,
    resource,
  };
  // O snapshot é sempre atualizado com o recurso mais recente visto na API.
  const next = update({ ...existing, resource });
  const keep = next.isFavorite || next.lastAccessedAt !== undefined;

  saveStorage({
    version: EXTERNAL_RESOURCES_STATE_VERSION,
    byCandidate: {
      ...state.byCandidate,
      [candidateId]: [
        ...list.filter((item) => !(item.resourceId === resource.id && item.source === resource.source)),
        ...(keep ? [next] : []),
      ],
    },
  });
}

export function getExternalResourceUserStates(candidateId: string): ExternalResourceUserState[] {
  return readStorage().byCandidate[candidateId] ?? [];
}

// Registra o acesso (clique em "Acessar na ..."). Não abre nada: a abertura da
// plataforma externa continua sendo feita pelo chamador.
export function recordExternalResourceAccess(
  candidateId: string,
  resource: ExternalLearningResource,
  accessedAt = new Date().toISOString(),
) {
  upsert(candidateId, resource, (current) => ({ ...current, lastAccessedAt: accessedAt }));
}

export function toggleExternalResourceFavorite(candidateId: string, resource: ExternalLearningResource) {
  upsert(candidateId, resource, (current) => ({ ...current, isFavorite: !current.isFavorite }));
}
