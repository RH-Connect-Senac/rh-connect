export type DevelopmentArea = "TI" | "RH" | "SECRETARIADO";

export type CompetencyType = "TRANSVERSAL" | "SPECIFIC";

export type CompetencyStatus =
  | "LOCKED"
  | "AVAILABLE"
  | "IN_PROGRESS"
  | "ADVANCED"
  | "CONSOLIDATED";

export type MissionStatus =
  | "LOCKED"
  | "AVAILABLE"
  | "IN_PROGRESS"
  | "COMPLETED";

export type EvidenceType =
  | "INTERVIEW"
  | "MATERIAL"
  | "MISSION"
  | "SYSTEM_MILESTONE";

export type DevelopmentCompetency = {
  id: string;
  area: DevelopmentArea;
  track: string;
  name: string;
  type: CompetencyType;
  progress: number;
  status: CompetencyStatus;
  evidenceTypes: EvidenceType[];
  prerequisites?: string[];
};

export type DevelopmentMission = {
  id: string;
  area: DevelopmentArea;
  track: string;
  title: string;
  description: string;
  competencyId: string;
  sourceType: EvidenceType;
  progress: number;
  target: number;
  rewardXp: number;
  rewardProgress: number;
  status: MissionStatus;
  contributedReferenceIds?: string[];
};

export type DevelopmentState = {
  version: string;
  area: DevelopmentArea;
  track: string;
  xp: number;
  competencies: DevelopmentCompetency[];
  missions: DevelopmentMission[];
  currentMissionId: string | null;
  updatedAt: string;
};

export type DevelopmentLevel = {
  level: 1 | 2 | 3 | 4 | 5;
  name: string;
  minXp: number;
  nextLevelXp: number | null;
};

export type CompleteMissionResult = {
  state: DevelopmentState;
  xpGained: number;
  competencyId: string;
  oldCompetencyProgress: number;
  newCompetencyProgress: number;
  oldLevel: DevelopmentLevel;
  newLevel: DevelopmentLevel;
  oldTreeStage: number;
  newTreeStage: number;
};

export type AdvanceMissionResult = {
  state: DevelopmentState;
  advanced: boolean;
  missionCompleted: boolean;
  reason?: string;
  missionId?: string;
  referenceId?: string;
  xpGained: number;
  competencyId?: string;
  oldMissionProgress?: number;
  newMissionProgress?: number;
  oldCompetencyProgress?: number;
  newCompetencyProgress?: number;
  oldLevel: DevelopmentLevel;
  newLevel: DevelopmentLevel;
  oldTreeStage: number;
  newTreeStage: number;
};

export const DEVELOPMENT_STORAGE_KEY = "rhconnect:development:v1";
export const DEVELOPMENT_STATE_VERSION = "v1";
export const COMPETENCY_UNLOCK_THRESHOLD = 20;

export const DEVELOPMENT_LEVELS: DevelopmentLevel[] = [
  { level: 1, name: "Iniciando a Jornada", minXp: 0, nextLevelXp: 200 },
  { level: 2, name: "Em Preparação", minXp: 200, nextLevelXp: 400 },
  { level: 3, name: "Desenvolvendo Habilidades", minXp: 400, nextLevelXp: 700 },
  { level: 4, name: "Talento em Evolução", minXp: 700, nextLevelXp: 1100 },
  { level: 5, name: "Preparado para Novos Desafios", minXp: 1100, nextLevelXp: null },
];

export function clampProgress(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function getLevelFromXp(xp: number): DevelopmentLevel {
  const safeXp = Math.max(0, Math.floor(Number.isFinite(xp) ? xp : 0));

  if (safeXp >= 1100) return DEVELOPMENT_LEVELS[4];
  if (safeXp >= 700) return DEVELOPMENT_LEVELS[3];
  if (safeXp >= 400) return DEVELOPMENT_LEVELS[2];
  if (safeXp >= 200) return DEVELOPMENT_LEVELS[1];
  return DEVELOPMENT_LEVELS[0];
}

export function getCompetencyStatus(
  competency: Pick<DevelopmentCompetency, "progress" | "prerequisites">,
  competencies: Array<Pick<DevelopmentCompetency, "id" | "progress">> = [],
): CompetencyStatus {
  const hasMissingPrerequisite = (competency.prerequisites ?? []).some((prerequisiteId) => {
    const prerequisite = competencies.find((item) => item.id === prerequisiteId);
    return !prerequisite || clampProgress(prerequisite.progress) < COMPETENCY_UNLOCK_THRESHOLD;
  });

  if (hasMissingPrerequisite) return "LOCKED";

  const progress = clampProgress(competency.progress);
  if (progress >= 85) return "CONSOLIDATED";
  if (progress >= 60) return "ADVANCED";
  if (progress >= 20) return "IN_PROGRESS";
  return "AVAILABLE";
}

export function getOverallProgress(competencies: Array<Pick<DevelopmentCompetency, "progress">>) {
  if (competencies.length === 0) return 0;
  const total = competencies.reduce((sum, competency) => sum + clampProgress(competency.progress), 0);
  return Math.round(total / competencies.length);
}

export function getTreeStage(overallProgress: number) {
  const progress = clampProgress(overallProgress);
  if (progress >= 90) return 10;
  return Math.min(10, Math.max(1, Math.floor(progress / 10) + 1));
}

export function getCurrentMission(state: DevelopmentState) {
  return state.missions.find((mission) => mission.id === state.currentMissionId) ?? null;
}

export function getNextLevelXp(xp: number) {
  return getLevelFromXp(xp).nextLevelXp;
}
