import {
  DEVELOPMENT_STATE_VERSION,
  DEVELOPMENT_STORAGE_KEY,
  DEVELOPMENT_STORAGE_SCHEMA_VERSION,
  clampProgress,
  getCompetencyStatus,
  getCurrentMission,
  getLevelFromXp,
  getOverallProgress,
  getTreeStage,
  type AdvanceMissionResult,
  type CompleteMissionResult,
  type DevelopmentCompetency,
  type DevelopmentMission,
  type DevelopmentState,
  type DevelopmentStorageState,
  type MissionStatus,
} from "../domain/development";
import { createInitialDevelopmentState } from "../mocks/development";
import { findSupportMaterialById } from "../mocks/materials";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function cloneState(state: DevelopmentState): DevelopmentState {
  return {
    ...state,
    competencies: state.competencies.map((competency) => ({
      ...competency,
      prerequisites: competency.prerequisites ? [...competency.prerequisites] : undefined,
      evidenceTypes: [...competency.evidenceTypes],
    })),
    missions: state.missions.map((mission) => ({
      ...mission,
      contributedReferenceIds: mission.contributedReferenceIds ? [...mission.contributedReferenceIds] : [],
    })),
  };
}

function getMissionStatus(
  mission: Pick<DevelopmentMission, "progress" | "target" | "status" | "competencyId">,
  competencies: DevelopmentCompetency[],
): MissionStatus {
  if (mission.status === "COMPLETED" || mission.progress >= mission.target) return "COMPLETED";

  const competency = competencies.find((item) => item.id === mission.competencyId);
  if (!competency || competency.status === "LOCKED") return "LOCKED";

  if (mission.progress > 0) return "IN_PROGRESS";
  return "AVAILABLE";
}

function selectCurrentMissionId(missions: DevelopmentMission[], requestedId: string | null) {
  const requested = missions.find((mission) => mission.id === requestedId);
  if (requested && (requested.status === "AVAILABLE" || requested.status === "IN_PROGRESS")) {
    return requested.id;
  }

  return missions.find((mission) => mission.status === "IN_PROGRESS" || mission.status === "AVAILABLE")?.id ?? null;
}

function isCompatibleDevelopmentState(value: unknown): value is DevelopmentState {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<DevelopmentState>;
  const seed = createInitialDevelopmentState();
  const expectedCompetencyIds = seed.competencies.map((competency) => competency.id);
  const expectedMissionIds = seed.missions.map((mission) => mission.id);
  const hasValidCompetencies = Array.isArray(candidate.competencies) &&
    candidate.competencies.length === 10 &&
    candidate.competencies.every((competency) => (
      typeof competency.id === "string" &&
      expectedCompetencyIds.includes(competency.id) &&
      typeof competency.name === "string" &&
      typeof competency.progress === "number" &&
      Array.isArray(competency.evidenceTypes)
    ));
  const hasValidMissions = Array.isArray(candidate.missions) &&
    candidate.missions.length === 10 &&
    candidate.missions.every((mission) => (
      typeof mission.id === "string" &&
      expectedMissionIds.includes(mission.id) &&
      typeof mission.title === "string" &&
      typeof mission.competencyId === "string" &&
      expectedCompetencyIds.includes(mission.competencyId) &&
      typeof mission.progress === "number" &&
      typeof mission.target === "number" &&
      typeof mission.rewardXp === "number" &&
      typeof mission.rewardProgress === "number" &&
      (
        mission.contributedReferenceIds === undefined ||
        (
          Array.isArray(mission.contributedReferenceIds) &&
          mission.contributedReferenceIds.every((referenceId) => typeof referenceId === "string")
        )
      )
    ));

  return (
    candidate.version === DEVELOPMENT_STATE_VERSION &&
    candidate.area === "TI" &&
    candidate.track === "Desenvolvimento Front-end" &&
    typeof candidate.xp === "number" &&
    hasValidCompetencies &&
    hasValidMissions &&
    (candidate.currentMissionId === null || typeof candidate.currentMissionId === "string") &&
    typeof candidate.updatedAt === "string"
  );
}

export function normalizeDevelopmentState(state: DevelopmentState): DevelopmentState {
  const competencies = state.competencies.map((competency) => ({
    ...competency,
    progress: clampProgress(competency.progress),
  }));

  const normalizedCompetencies = competencies.map((competency) => ({
    ...competency,
    status: getCompetencyStatus(competency, competencies),
  }));

  const missions = state.missions.map((mission) => {
    const target = Math.max(1, Math.floor(mission.target));
    const progress = Math.min(target, Math.max(0, Math.floor(mission.progress)));
    const contributedReferenceIds = Array.from(new Set(
      (mission.contributedReferenceIds ?? []).filter((referenceId) => typeof referenceId === "string"),
    ));
    const normalizedMission = { ...mission, target, progress, contributedReferenceIds };

    return {
      ...normalizedMission,
      status: getMissionStatus(normalizedMission, normalizedCompetencies),
    };
  });

  return {
    ...state,
    version: DEVELOPMENT_STATE_VERSION,
    xp: Math.max(0, Math.floor(Number.isFinite(state.xp) ? state.xp : 0)),
    competencies: normalizedCompetencies,
    missions,
    currentMissionId: selectCurrentMissionId(missions, state.currentMissionId),
  };
}

function getDevelopmentSnapshot(state: DevelopmentState) {
  const overallProgress = getOverallProgress(state.competencies);

  return {
    level: getLevelFromXp(state.xp),
    treeStage: getTreeStage(overallProgress),
  };
}

export function getDevelopmentDerivedState(state: DevelopmentState) {
  const normalized = normalizeDevelopmentState(state);
  const overallProgress = getOverallProgress(normalized.competencies);

  return {
    level: getLevelFromXp(normalized.xp),
    nextLevelXp: getLevelFromXp(normalized.xp).nextLevelXp,
    overallProgress,
    treeStage: getTreeStage(overallProgress),
    currentMission: getCurrentMission(normalized),
  };
}

function createEmptyDevelopmentStorage(): DevelopmentStorageState {
  return {
    schemaVersion: DEVELOPMENT_STORAGE_SCHEMA_VERSION,
    byCandidate: {},
  };
}

// Prompt 09 — Parte A: só aceita o envelope v2 (`schemaVersion` +
// `byCandidate`, isolado por candidateId real). Um DevelopmentState "solto"
// no formato antigo (sem envelope, sem dono conhecido) — ou qualquer JSON
// que não bata com o formato esperado — é tratado como incompatível e
// descartado por inteiro; NUNCA é migrado/atribuído a um candidateId
// específico.
function isCompatibleDevelopmentStorage(value: unknown): value is DevelopmentStorageState {
  if (!value || typeof value !== "object") return false;
  const storage = value as Partial<DevelopmentStorageState>;
  if (storage.schemaVersion !== DEVELOPMENT_STORAGE_SCHEMA_VERSION) return false;
  if (!storage.byCandidate || typeof storage.byCandidate !== "object" || Array.isArray(storage.byCandidate)) return false;

  return Object.values(storage.byCandidate).every((candidateState) => isCompatibleDevelopmentState(candidateState));
}

function saveDevelopmentStorage(storage: DevelopmentStorageState) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(DEVELOPMENT_STORAGE_KEY, JSON.stringify(storage));
  } catch {
    // A persistência local é temporária; falhas de storage não devem quebrar a jornada.
  }
}

function readDevelopmentStorage(): DevelopmentStorageState {
  if (!canUseStorage()) return createEmptyDevelopmentStorage();

  try {
    const raw = window.localStorage.getItem(DEVELOPMENT_STORAGE_KEY);
    if (!raw) return createEmptyDevelopmentStorage();

    const parsed = JSON.parse(raw);
    if (!isCompatibleDevelopmentStorage(parsed)) {
      const empty = createEmptyDevelopmentStorage();
      saveDevelopmentStorage(empty);
      return empty;
    }

    return parsed;
  } catch {
    const empty = createEmptyDevelopmentStorage();
    saveDevelopmentStorage(empty);
    return empty;
  }
}

function saveCandidateDevelopmentState(candidateId: string, state: DevelopmentState) {
  // Leitura fresca do storage completo a cada escrita, para nunca
  // sobrescrever o progresso de outro candidateId já persistido.
  const storage = readDevelopmentStorage();
  const nextStorage: DevelopmentStorageState = {
    schemaVersion: DEVELOPMENT_STORAGE_SCHEMA_VERSION,
    byCandidate: {
      ...storage.byCandidate,
      [candidateId]: state,
    },
  };
  saveDevelopmentStorage(nextStorage);
}

export function getDevelopmentState(candidateId: string): DevelopmentState {
  const storage = readDevelopmentStorage();
  const existing = storage.byCandidate[candidateId];

  if (!existing) {
    const seed = normalizeDevelopmentState(createInitialDevelopmentState());
    saveCandidateDevelopmentState(candidateId, seed);
    return seed;
  }

  const normalized = normalizeDevelopmentState(existing);
  saveCandidateDevelopmentState(candidateId, normalized);
  return normalized;
}

export function resetDevelopmentState(candidateId: string): DevelopmentState {
  const seed = normalizeDevelopmentState(createInitialDevelopmentState());
  saveCandidateDevelopmentState(candidateId, seed);
  return seed;
}

export function completeMission(candidateId: string, missionId?: string): CompleteMissionResult {
  const currentState = getDevelopmentState(candidateId);
  const state = normalizeDevelopmentState(cloneState(currentState));
  const missionToComplete = missionId
    ? state.missions.find((mission) => mission.id === missionId)
    : getCurrentMission(state);

  if (!missionToComplete) {
    throw new Error("Nenhuma missão válida encontrada para conclusão.");
  }

  if (missionToComplete.status === "COMPLETED") {
    throw new Error("Esta missão já foi concluída.");
  }

  if (missionToComplete.status === "LOCKED") {
    throw new Error("Esta missão ainda está bloqueada.");
  }

  const competency = state.competencies.find((item) => item.id === missionToComplete.competencyId);
  if (!competency || competency.status === "LOCKED") {
    throw new Error("A competência relacionada à missão não está disponível.");
  }

  const oldOverallProgress = getOverallProgress(state.competencies);
  const oldLevel = getLevelFromXp(state.xp);
  const oldTreeStage = getTreeStage(oldOverallProgress);
  const oldCompetencyProgress = competency.progress;

  missionToComplete.progress = missionToComplete.target;
  missionToComplete.status = "COMPLETED";

  competency.progress = clampProgress(competency.progress + missionToComplete.rewardProgress);
  const newCompetencyProgress = competency.progress;

  state.xp = Math.max(0, state.xp + missionToComplete.rewardXp);
  state.updatedAt = new Date().toISOString();

  const normalized = normalizeDevelopmentState(state);
  const newOverallProgress = getOverallProgress(normalized.competencies);
  const newLevel = getLevelFromXp(normalized.xp);
  const newTreeStage = getTreeStage(newOverallProgress);

  saveCandidateDevelopmentState(candidateId, normalized);

  return {
    state: normalized,
    xpGained: missionToComplete.rewardXp,
    competencyId: missionToComplete.competencyId,
    oldCompetencyProgress,
    newCompetencyProgress,
    oldLevel,
    newLevel,
    oldTreeStage,
    newTreeStage,
  };
}

export function advanceDevelopmentFromMaterial(candidateId: string, materialId: string): AdvanceMissionResult {
  const currentState = getDevelopmentState(candidateId);
  const state = normalizeDevelopmentState(cloneState(currentState));
  const beforeSnapshot = getDevelopmentSnapshot(state);
  const material = findSupportMaterialById(materialId);
  // V1: material only advances the mission that is active at completion time; no retroactive progress.
  const currentMission = getCurrentMission(state);
  const unchangedBase = {
    state,
    advanced: false,
    missionCompleted: false,
    xpGained: 0,
    oldLevel: beforeSnapshot.level,
    newLevel: beforeSnapshot.level,
    oldTreeStage: beforeSnapshot.treeStage,
    newTreeStage: beforeSnapshot.treeStage,
  };

  if (!material) {
    return { ...unchangedBase, reason: "MATERIAL_NOT_FOUND" };
  }

  if (!currentMission) {
    return { ...unchangedBase, reason: "NO_ACTIVE_MISSION", referenceId: material.id };
  }

  if (currentMission.sourceType !== "MATERIAL") {
    return {
      ...unchangedBase,
      reason: "CURRENT_MISSION_NOT_MATERIAL",
      missionId: currentMission.id,
      referenceId: material.id,
    };
  }

  if (currentMission.status !== "AVAILABLE" && currentMission.status !== "IN_PROGRESS") {
    return {
      ...unchangedBase,
      reason: "CURRENT_MISSION_NOT_ADVANCEABLE",
      missionId: currentMission.id,
      referenceId: material.id,
    };
  }

  if (!material.competencyIds.includes(currentMission.competencyId)) {
    return {
      ...unchangedBase,
      reason: "MATERIAL_NOT_COMPATIBLE_WITH_CURRENT_MISSION",
      missionId: currentMission.id,
      referenceId: material.id,
    };
  }

  const competency = state.competencies.find((item) => item.id === currentMission.competencyId);
  if (!competency || competency.status === "LOCKED") {
    return {
      ...unchangedBase,
      reason: "COMPETENCY_NOT_AVAILABLE",
      missionId: currentMission.id,
      referenceId: material.id,
    };
  }

  const referenceId = `material:${material.id}`;
  const contributedReferenceIds = currentMission.contributedReferenceIds ?? [];
  if (contributedReferenceIds.includes(referenceId)) {
    return {
      ...unchangedBase,
      reason: "REFERENCE_ALREADY_CONTRIBUTED",
      missionId: currentMission.id,
      referenceId: material.id,
    };
  }

  const oldMissionProgress = currentMission.progress;
  const oldCompetencyProgress = competency.progress;
  currentMission.contributedReferenceIds = [...contributedReferenceIds, referenceId];
  currentMission.progress = Math.min(currentMission.target, currentMission.progress + 1);

  let xpGained = 0;
  let missionCompleted = false;
  let newCompetencyProgress = oldCompetencyProgress;

  if (currentMission.progress >= currentMission.target) {
    currentMission.status = "COMPLETED";
    missionCompleted = true;
    xpGained = currentMission.rewardXp;
    competency.progress = clampProgress(competency.progress + currentMission.rewardProgress);
    newCompetencyProgress = competency.progress;
    state.xp = Math.max(0, state.xp + xpGained);
  } else {
    currentMission.status = "IN_PROGRESS";
  }

  state.updatedAt = new Date().toISOString();

  const normalized = normalizeDevelopmentState(state);
  const afterSnapshot = getDevelopmentSnapshot(normalized);
  saveCandidateDevelopmentState(candidateId, normalized);

  return {
    state: normalized,
    advanced: true,
    missionCompleted,
    missionId: currentMission.id,
    referenceId: material.id,
    xpGained,
    competencyId: currentMission.competencyId,
    oldMissionProgress,
    newMissionProgress: currentMission.progress,
    oldCompetencyProgress,
    newCompetencyProgress,
    oldLevel: beforeSnapshot.level,
    newLevel: afterSnapshot.level,
    oldTreeStage: beforeSnapshot.treeStage,
    newTreeStage: afterSnapshot.treeStage,
  };
}
