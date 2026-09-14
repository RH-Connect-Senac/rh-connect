export const CANDIDATE_PROFILE_VERSION = 1;
export const CANDIDATE_PROFILE_STORAGE_KEY = "rhconnect:candidate-profiles:v1";

export type CandidateFormation = {
  id: string;
  title: string;
  institution: string;
  level: string;
  status: string;
  startDate: string;
  endDate: string;
  period?: string;
};

export type CandidateCourse = {
  id: string;
  name: string;
  institution: string;
  workload: string;
  completedAt: string;
};

export type CandidateExperience = {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
};

export type CandidateProfile = {
  version: typeof CANDIDATE_PROFILE_VERSION;
  candidateId: string;
  phone: string;
  city: string;
  state: string;
  professionalSummary: string;
  areaId: string;
  subareaId: string;
  desiredRole: string;
  seniority: string;
  contractType: string;
  formations: CandidateFormation[];
  courses: CandidateCourse[];
  experiences: CandidateExperience[];
  technicalSkills: string[];
  behavioralSkills: string[];
  updatedAt: string;
};

export type CandidateProfilesStorage = {
  version: typeof CANDIDATE_PROFILE_VERSION;
  profiles: CandidateProfile[];
};

export type CandidateProfilePatch = Partial<Omit<CandidateProfile, "version" | "candidateId" | "updatedAt">>;
