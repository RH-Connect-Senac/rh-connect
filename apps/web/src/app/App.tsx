/** RH Connect — Aplicação Front-end */

import { friendlyErrorMessage } from "./domain/user-friendly-error";
import { useState, useRef, useEffect, useCallback, useContext, useId, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import {
  ChevronRight, ChevronLeft, Check, CheckCircle, User, Briefcase,
  Clock, Mic, Home, History, Settings, LogOut, Bell,
  Eye, Plus, Edit2, RotateCcw, AlertCircle, ArrowRight,
  Award, TrendingUp, X, Shield, GraduationCap, Zap, BookOpen,
  Star, Monitor, ChevronDown, Lightbulb, Info, MessageSquare,
  Target, Send, Upload, Menu,
  Heart, FileText, Trash2, Lock, Database, Bot,
  ToggleLeft, ToggleRight, ChevronUp, Filter, CalendarDays,
  Building2, MapPin, FileBadge2, ListChecks, CheckCircle2, AlignLeft, Link as LinkIcon
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { DevelopmentContent } from "./components/development-screen";
import { DiscTestScreen } from "./components/disc-test-screen";
import { InterviewAgendaContent } from "./components/interview-agenda-screen";
import { NextInterviewCard } from "./components/next-interview-card";
import {
  CANDIDATE_ACCOUNT, CANDIDATE_NOTIFS,
  type AccountConfig,
} from "./components/header-popovers";
import { ProfileShell, type ProfileShellNavItem } from "./components/shared/profile-shell";
import { RHConnectLogo } from "./components/brand/rh-connect-logo";
import { LegalDocumentContent, getLegalIndexItems, type LegalIndexItem } from "./components/legal/legal-document-view";
import { LandingFooter } from "./components/landing-footer";
import { BackToTop } from "./components/ui/back-to-top";
import { LegalHeader } from "./components/legal/legal-header";
import { SETTINGS_PATH, isSettingsTabKey, resolveLegalOrigin } from "./components/legal/legal-origin";
import { clearRegisterDraft, getRegisterDraft, saveRegisterDraft } from "./services/register-draft-store";
import { LegalHero } from "./components/legal/legal-hero";
import {
  LegalDocumentSwitch,
  LegalMobileIndex,
  LegalSidebarIndex,
  useLegalActiveSection,
  useLegalHashScroll,
  type LegalDocumentKey,
} from "./components/legal/legal-navigation";
import type { LegalDocument } from "./domain/legal/legal-types";
import { privacyPolicy } from "./domain/legal/privacy-policy";
import { termsOfUse } from "./domain/legal/terms-of-use";
import { LandingScreen as LandingScreenComponent } from "./components/landing-screen";
import { SuggestionsScreen } from "./components/suggestions-screen";
import { SuggestedJobsSection } from "./components/suggested-jobs-section";
import {
  SPEECH_GENERIC_ERROR_MESSAGE,
  SPEECH_INSECURE_CONTEXT_MESSAGE,
  SPEECH_UNSUPPORTED_MESSAGE,
  appendDictation,
  getNewTranscript,
  getSpeechErrorMessage,
  isSpeechContextSecure,
} from "./domain/speech-dictation";
import {
  EvalCriteriaScreen, EvalSettingsScreen,
  EvalActivateScreen, EvalOnboardingScreen,
} from "./components/eval-screens";
import { EvalDashboardScreen, EvalQueueScreen, EvalActiveScreen, EvalInterviewDetailScreen, EvalDraftEvaluationScreen, EvalRealReviewScreen, EvalCompletionSuccessScreen, EvalHistoryScreen, EvalHistoryDetailScreen } from "./components/evaluator-real-screens";
import {
  AdminDashboardScreen, AdminCandidatesScreen, AdminCandidateDetailScreen,
  AdminEvaluatorsScreen, AdminEvaluatorFormScreen,
  AdminInterviewsScreen, AdminAssignScreen,
  AdminRolesScreen, AdminCriteriaScreen,
  AdminConsentScreen, AdminAuditScreen, AdminSettingsScreen,
  AdminOnboardingScreen,
} from "./components/admin-screens";
import { CandidateOnboardingScreen } from "./components/onboarding-screens";
import { Input } from "./components/ui/input";
import { MaterialsPageHeader } from "./components/materials/materials-page-header";
import {
  EditorialMaterialCard,
  externalResourceToEditorialCard,
  rhConnectMaterialToEditorialCard,
} from "./components/materials/editorial-material-card";
import { ContinueLearningSection } from "./components/materials/continue-learning-section";
import { ExploreCatalogGroup, ExploreCatalogSection } from "./components/materials/explore-catalog-section";
import { NativeSelect } from "./components/ui/native-select";
import { PasswordInput } from "./components/ui/password-input";
import { Textarea } from "./components/ui/textarea";
import { Checkbox } from "./components/ui/checkbox";
import { Button as UIButton, buttonVariants } from "./components/ui/button";
import { cn } from "./components/ui/utils";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./components/ui/alert-dialog";
import { Card as UICard } from "./components/ui/card";
import { Badge as UIBadge } from "./components/ui/badge";
import { StatusBadge } from "./components/ui/status-badge";
import { Switch } from "./components/ui/switch";
import { Alert } from "./components/ui/alert";
import { FilterChip } from "./components/ui/filter-chip";
import { EmptyState } from "./components/ui/empty-state";
import { Spinner } from "./components/ui/spinner";
import { Toaster } from "./components/ui/sonner";
import {
  ROUTER_BASENAME,
  getPathForScreen,
  type AppScreen as Screen,
} from "./router/routes";
import {
  analyzeJobUrl,
  type JobInterviewContext,
} from "./services/interview-context-service";
import {
  cancelRealInterview,
  createRealInterview,
  generateRealQuestions,
  getRealInterview,
  getRealInterviewResult,
  getRealQuestions,
  getRealQuestionsState,
  getRealQuestionsStateForResume,
  isUuid,
  listRealInterviewHistory,
  saveRealAnswer,
  saveRealAnswerDraft,
  saveRealEvaluationMode,
  submitRealInterview,
  type RealInterview,
  type RealInterviewHistory,
  type RealInterviewResult,
  type RealInterviewQuestion,
  type RealInterviewStatus,
} from "./services/candidate-interviews-service";
import {
  clearAnswerDraft,
  clearAnswerDraftsForInterview,
  clearInterviewUrlPrefill,
  deriveHighestReachedIndex,
  getAnswerDraft,
  getQuestionNavState,
  isQuestionNavigable,
  normalizeInterviewAnswer,
  peekInterviewUrlPrefill,
  resolveLinkCopyEffect,
  resolveRestoredAnswer,
  shouldShowCopiedLinkNotice,
  resolveInitialQuestionIndex,
  safeLocalStorage,
  storeInterviewUrlPrefill,
} from "./services/interview-ux-state";
import {
  ANSWER_SYNC_TONE_CLASS,
  AnswerDraftAutosave,
  describeAnswerSync,
  describeAnswerSyncTone,
  type AnswerAutosaveSnapshot,
  type RemoteDraft,
} from "./domain/interview-answer-autosave";
import { confirmOfficialAnswer, withOfficialAnswer } from "./domain/interview-answer-confirmation";
import {
  attachExitProtection,
  describeStaleInterview,
  flushBeforeLeaving,
  isExitProtectionActive,
  shouldDiscardTerminalDraft,
  isInterviewEditable,
  staleNoticeTone,
} from "./domain/interview-session-guard";
import { startInterviewForContext } from "./domain/interview-start";
import {
  UNSUPPORTED_REPORT_VIEW,
  buildReportView,
  describeReportFailure,
  isSupportedReportResult,
  type ReportFailureAction,
  type ReportFailureView,
} from "./domain/candidate-report-view";
import {
  HISTORY_EMPTY_VIEW,
  HISTORY_FILTERS,
  HISTORY_FILTER_EMPTY_MESSAGE,
  buildHistoryItemView,
  countByFilter,
  describeHistoryFailure,
  filterHistory,
  historyActionPath,
  visibleHistoryItems,
  type HistoryActionKind,
  type HistoryFilter,
} from "./domain/candidate-history-view";
import { buildTrackingView, describeTrackingFailure, isTrackingTerminal, resolveSubmitDestination } from "./domain/interview-tracking-view";
import { diffServerState } from "./domain/interview-sync-reconcile";
import { CANCELLED_TEXTAREA_CLASS, PROGRESS_LABELS, isCancelledSession, resolveProgressVisual } from "./domain/interview-terminal-view";
import type { InterviewSyncResult } from "./domain/interview-sync-poller";
import { useInterviewSyncPolling } from "./hooks/use-interview-sync-polling";
import { InterviewSessionTerminalContext } from "./hooks/interview-session-terminal";
import { useInterviewSessionGuard } from "./hooks/use-interview-session-guard";
import { useInProgressInterviews } from "./hooks/use-in-progress-interviews";
import { useCandidateInterviewHistory } from "./hooks/use-candidate-interview-history";
import { useCandidateLiveResource } from "./hooks/use-candidate-live-resource";
import { CANDIDATE_TRACKING_SYNC_INTERVAL_MS, CANDIDATE_TRACKING_SYNC_MAX_BACKOFF_MS } from "./domain/candidate-live-sync";
import {
  DASHBOARD_RECENT_EMPTY,
  buildDashboardRecent,
  buildDashboardSummary,
  dashboardActionPath,
  describeDashboardInterviewsFailure,
  formatDashboardScore,
} from "./domain/candidate-dashboard-view";
import { useDashboardInterviewsSync } from "./hooks/use-dashboard-interviews-sync";
import {
  CONFIRM_MODAL_DANGER_FOCUS_RING,
  CONFIRM_MODAL_FOCUS_RING,
  CONFIRM_MODAL_HIDDEN_FOCUS_RING,
  resolveInitialFocus,
  shouldHideInitialFocusRing,
  type ConfirmInitialFocus,
} from "./domain/confirm-modal-focus";
import {
  NEW_INTERVIEW_BLOCKED_MESSAGE,
  buildResumePlan,
  mergeInProgressEntries,
  resolveNewInterviewGate,
  resolveDashboardInterviewAccess,
} from "./domain/interview-resume";
import { SavedNotice } from "./domain/evaluator-save-notice";
import {
  PROFESSIONAL_AREAS,
  type ProfessionalAreaId,
  getProfessionalSubareasByArea,
} from "./domain/professional-catalog";
import type { MaterialStatus, MaterialUserState, SupportMaterial } from "./domain/materials";
import { SUPPORT_MATERIAL_CATEGORIES, SUPPORT_MATERIALS, findSupportMaterialBySlug } from "./mocks/materials";
import {
  completeMaterial,
  getMaterialUserState,
  getMaterialUserStates,
  openMaterial,
  toggleMaterialFavorite,
} from "./services/materials-service";
import {
  getExternalResourceUserStates,
  recordExternalResourceAccess,
  type ExternalResourceUserState,
  toggleExternalResourceFavorite,
} from "./services/external-resource-user-state";
import {
  listExternalResourceCategories,
  listExternalResources,
  type ExternalLearningResource,
  type ExternalResourceCategory,
  type ExternalResourcesPagination,
  type ExternalResourceSource,
} from "./services/external-resources-service";
import { advanceDevelopmentFromMaterial } from "./services/development-service";
import {
  clearRememberedLoginEmail,
  getRememberedLoginEmail,
  saveRememberedLoginEmail,
  type MockAuthSession,
  type MockAuthUser,
  type MockUserRole,
} from "./services/auth-service";
import { SessionContext, UNAUTHENTICATED_SESSION } from "./session-context";
import { registerRealCandidate } from "./services/candidate-registration-service";
import {
  completeRealOnboarding,
  loginRealWithCredentials,
  logoutRealSession,
  restoreRealSession,
} from "./services/real-session-service";
import * as profileApi from "./services/candidate-profile-service";
import type { ProfileResult } from "./services/candidate-profile-service";
import { useCandidateProfile } from "./hooks/use-candidate-profile";
import type { EvaluationMode } from "./domain/interviews";
import {
  ACADEMIC_LEVEL_OPTIONS,
  CONTRACT_TYPE_OPTIONS,
  EDUCATION_STATUS_OPTIONS,
  COURSE_STATUS_OPTIONS,
  LEVEL_NOT_APPLICABLE_LABEL,
  getLevelOptionsForContract,
  isLevelApplicable,
  levelAfterContractChange,
  levelForApi,
  PROFILE_FIELD_LIMITS,
  academicLevelLabel,
  apiMonthToMonthYear,
  describeMissingObjectiveFields,
  getProfileNotice,
  formatCoursePeriod,
  formatEducationPeriod,
  formatProfilePeriod,
  getNoneDeclarationState,
  educationStatusLabel,
  getProfileCompletionPercent,
  maskMonthYear,
  type AcademicLevel,
  type ContractType,
  type CourseStatus,
  type DeclarationSection,
  type EducationStatus,
  type ProfessionalProfile,
  type ProfileCourse,
  type ProfileEducation,
  type ProfileExperience,
  type ProfileSectionKey,
  type SkillType,
} from "./domain/professional-profile";
import {
  EMPTY_COURSE_FORM,
  EMPTY_EDUCATION_FORM,
  EMPTY_EXPERIENCE_FORM,
  validateCourseForm,
  isDegreeRequired,
  validateEducationForm,
  validateExperienceForm,
  validateSkillName,
  type CourseForm,
  type EducationForm,
  type ExperienceForm,
  type FormErrors,
} from "./domain/professional-profile-forms";
import { getCourseWarnings, getEducationWarnings, getExperienceWarnings } from "./domain/professional-plausibility";

// ─── Types & Constants ────────────────────────────────────────────────────────

const AUTH_SCREENS: Screen[] = [
  "dashboard","profile","settings","materials","notifications",
  "interview-history","agenda","development","disc-test",
  "interview-setup","consent","evaluation-mode","prep","interview","review","interview-confirm","interview-done",
  "pending","report",
  "eval-dashboard","eval-queue","eval-active","eval-screen","eval-review","eval-done","eval-history","eval-criteria","eval-settings",
  "admin-dashboard","admin-candidates","admin-candidate-detail","admin-evaluators","admin-evaluator-form",
  "admin-interviews","admin-assign",
  "admin-roles","admin-criteria","admin-consent","admin-audit","admin-settings",
];

const DASHBOARD_BY_ROLE: Record<MockUserRole, string> = {
  CANDIDATE: "/candidate/dashboard",
  EVALUATOR: "/evaluator/dashboard",
  ADMIN: "/admin/dashboard",
};

const ONBOARDING_BY_ROLE: Record<MockUserRole, string> = {
  CANDIDATE: "/candidate/onboarding",
  EVALUATOR: "/evaluator/onboarding",
  ADMIN: "/admin/onboarding",
};

// Identidade neutra, sem dados fictícios: só é usada quando não há candidato
// autenticado (as telas de candidato ficam atrás de `protect("CANDIDATE", …)`,
// então na prática nunca é exibida).
const UNAUTHENTICATED_CANDIDATE_IDENTITY = { id: "", name: "", email: "" };

function getCandidateIdentity(session: MockAuthSession) {
  const user = session.user;
  if (session.authenticated && user?.role === "CANDIDATE") {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
    };
  }

  return UNAUTHENTICATED_CANDIDATE_IDENTITY;
}

function getEntryPathForSession(session: MockAuthSession) {
  if (!session.authenticated || !session.user) return "/login";
  return session.user.onboardingCompleted ? DASHBOARD_BY_ROLE[session.user.role] : ONBOARDING_BY_ROLE[session.user.role];
}

function isOnboardingPathForRole(pathname: string, role: MockUserRole) {
  return pathname === ONBOARDING_BY_ROLE[role];
}

// `UNAUTHENTICATED_SESSION`/`SessionContext` foram movidos para
// `./session-context` no Prompt 08 — mesmo contexto de antes (dá acesso à
// sessão REAL atual para componentes que não a recebem via props, ex.:
// `AuthLayout`, chamado em ~25 lugares sem prop `session`), só que agora
// também importável por `eval-screens.tsx`/`admin-screens.tsx`, sem criar
// dependência circular com este arquivo. Ver comentário completo lá.

// Pergunta exibida no wizard: vem SEMPRE da API (id = UUID persistido).
type InterviewQuestion = Pick<RealInterviewQuestion, "id" | "type" | "text">;

// ATENÇÃO (Fase 2B): este rascunho em localStorage é SOMENTE progresso
// temporário de UX (retomar a tela/pergunta). A fonte da verdade da entrevista
// (id, perguntas, respostas, modalidade, status, envio) é o Back/PostgreSQL:
// `interviewId` e `questions[].id` são os da API e as respostas são
// regravadas/relidas do Back (ver InterviewScreen).
type InterviewDraft = {
  interviewId?: string;
  context: JobInterviewContext | null;
  questions: InterviewQuestion[];
  answers: Record<string, string>;
  evaluationMode: EvaluationMode | null;
};

type ResumeInterviewResult =
  | { ok: true }
  | { ok: false; reason: "not_in_progress" | "not_found" | "error"; message: string };

type InterviewDraftScreen =
  | "interview-setup"
  | "consent"
  | "evaluation-mode"
  | "prep"
  | "interview"
  | "review"
  | "interview-confirm";

type InterviewDraftProgress = {
  currentScreen: InterviewDraftScreen;
  currentQuestionIndex: number;
  // Maior pergunta já alcançada (UX/navegação local; o Back não guarda isso).
  highestQuestionIndex?: number;
};

type StoredInterviewDraftEntry = {
  draft: InterviewDraft;
  progress: InterviewDraftProgress;
  updatedAt: string;
};

type StoredInterviewDraftState = {
  version: 1;
  draftsByCandidateId: Record<string, StoredInterviewDraftEntry>;
};

const INTERVIEW_DRAFT_STORAGE_KEY = "rhconnect:interview-draft:v1";
const DEFAULT_INTERVIEW_DRAFT_PROGRESS: InterviewDraftProgress = {
  currentScreen: "interview-setup",
  currentQuestionIndex: 0,
};

const ANSWER_MAX_CHARS = 1000;

function isValidInterviewAnswer(value?: string) {
  return Boolean(value?.trim());
}

function getFirstPendingQuestionIndex(draft: InterviewDraft) {
  return draft.questions.findIndex((question) => !isValidInterviewAnswer(draft.answers[question.id]));
}

function hasAllRequiredInterviewAnswers(draft: InterviewDraft) {
  return draft.questions.length > 0 && getFirstPendingQuestionIndex(draft) === -1;
}

const createEmptyInterviewDraft = (): InterviewDraft => ({
  interviewId: undefined,
  context: null,
  questions: [],
  answers: {},
  evaluationMode: null,
});

function hasActiveInterviewDraft(draft: InterviewDraft) {
  return Boolean(
    draft.context ||
    draft.questions.length > 0 ||
    Object.keys(draft.answers).length > 0 ||
    draft.evaluationMode,
  );
}

function isInterviewDraftInProgress(draft: InterviewDraft) {
  return draft.questions.length === 5 && draft.questions.every((question) => Boolean(question.text?.trim()));
}

function formatInterviewDateTime(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;

  const formattedDate = date.toLocaleDateString("pt-BR");
  const hasTime = /T\d{2}:\d{2}/.test(timestamp);
  if (!hasTime) return formattedDate;

  return `${formattedDate} · ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

function normalizeInterviewDraftProgress(value?: Partial<InterviewDraftProgress> | null): InterviewDraftProgress {
  const allowedScreens: InterviewDraftScreen[] = ["interview-setup", "consent", "evaluation-mode", "prep", "interview", "review", "interview-confirm"];
  return {
    currentScreen: value?.currentScreen && allowedScreens.includes(value.currentScreen)
      ? value.currentScreen
      : DEFAULT_INTERVIEW_DRAFT_PROGRESS.currentScreen,
    currentQuestionIndex: Number.isInteger(value?.currentQuestionIndex) && value!.currentQuestionIndex! >= 0
      ? value!.currentQuestionIndex!
      : DEFAULT_INTERVIEW_DRAFT_PROGRESS.currentQuestionIndex,
    ...(Number.isInteger(value?.highestQuestionIndex) && value!.highestQuestionIndex! >= 0
      ? { highestQuestionIndex: value!.highestQuestionIndex! }
      : {}),
  };
}

function normalizeStoredInterviewDraftEntry(value: unknown): StoredInterviewDraftEntry | null {
  if (!value || typeof value !== "object") return null;
  const entry = value as Partial<StoredInterviewDraftEntry>;
  const draft = entry.draft as Partial<InterviewDraft> | undefined;
  if (!draft || typeof draft !== "object") return null;

  const normalizedDraft: InterviewDraft = {
    interviewId: typeof draft.interviewId === "string" ? draft.interviewId : undefined,
    context: draft.context ?? null,
    questions: Array.isArray(draft.questions) ? draft.questions : [],
    answers: draft.answers && typeof draft.answers === "object" && !Array.isArray(draft.answers)
      ? draft.answers as Record<string, string>
      : {},
    evaluationMode: draft.evaluationMode === "AI" || draft.evaluationMode === "HUMAN" ? draft.evaluationMode : null,
  };

  // Rascunho legado (ids numéricos 1..5 / sem Interview real) não é mais
  // aproveitado: perguntas só são válidas se vieram da API (UUID) e ligadas a
  // um interviewId real.
  if (normalizedDraft.interviewId && !isUuid(normalizedDraft.interviewId)) {
    normalizedDraft.interviewId = undefined;
  }
  if (
    normalizedDraft.questions.length > 0 &&
    (!normalizedDraft.interviewId || normalizedDraft.questions.some((question) => !isUuid(question?.id)))
  ) {
    return null;
  }

  if (!hasActiveInterviewDraft(normalizedDraft)) return null;

  return {
    draft: normalizedDraft,
    progress: normalizeInterviewDraftProgress(entry.progress),
    updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : new Date().toISOString(),
  };
}

function readStoredInterviewDraftState(): StoredInterviewDraftState {
  if (typeof window === "undefined") {
    return { version: 1, draftsByCandidateId: {} };
  }

  try {
    const raw = window.localStorage.getItem(INTERVIEW_DRAFT_STORAGE_KEY);
    if (!raw) return { version: 1, draftsByCandidateId: {} };
    const parsed = JSON.parse(raw) as Partial<StoredInterviewDraftState>;
    if (parsed.version !== 1 || !parsed.draftsByCandidateId || typeof parsed.draftsByCandidateId !== "object") {
      return { version: 1, draftsByCandidateId: {} };
    }

    const draftsByCandidateId = Object.entries(parsed.draftsByCandidateId).reduce((acc, [candidateId, entry]) => {
      const normalized = normalizeStoredInterviewDraftEntry(entry);
      if (normalized) acc[candidateId] = normalized;
      return acc;
    }, {} as Record<string, StoredInterviewDraftEntry>);

    return { version: 1, draftsByCandidateId };
  } catch {
    return { version: 1, draftsByCandidateId: {} };
  }
}

function getStoredInterviewDraft(candidateId: string) {
  return readStoredInterviewDraftState().draftsByCandidateId[candidateId] ?? null;
}

function saveStoredInterviewDraft(candidateId: string, draft: InterviewDraft, progress: InterviewDraftProgress) {
  if (typeof window === "undefined" || !hasActiveInterviewDraft(draft)) return;
  const state = readStoredInterviewDraftState();
  state.draftsByCandidateId[candidateId] = {
    draft,
    progress: normalizeInterviewDraftProgress(progress),
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(INTERVIEW_DRAFT_STORAGE_KEY, JSON.stringify(state));
}

function clearStoredInterviewDraft(candidateId: string) {
  if (typeof window === "undefined") return;
  const state = readStoredInterviewDraftState();
  delete state.draftsByCandidateId[candidateId];
  if (Object.keys(state.draftsByCandidateId).length === 0) {
    window.localStorage.removeItem(INTERVIEW_DRAFT_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(INTERVIEW_DRAFT_STORAGE_KEY, JSON.stringify(state));
}

function getInterviewDraftScreenFromPath(pathname: string): InterviewDraftScreen | null {
  if (pathname === getPathForScreen("interview-setup")) return "interview-setup";
  if (pathname === getPathForScreen("consent")) return "consent";
  if (pathname === getPathForScreen("evaluation-mode")) return "evaluation-mode";
  if (pathname === getPathForScreen("prep")) return "prep";
  if (pathname === getPathForScreen("interview")) return "interview";
  if (pathname === getPathForScreen("review")) return "review";
  if (pathname === getPathForScreen("interview-confirm")) return "interview-confirm";
  return null;
}

// A janela é o container de scroll (o <main> do shell não tem overflow próprio).
function scrollPageToTop() {
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
}

const INTERVIEW_DONE_PATH_PATTERN = /^\/candidate\/interviews\/[^/]+\/success$/;

function evaluationModeLabel(mode?: EvaluationMode | null) {
  if (mode === "AI") return "Avaliação por IA";
  if (mode === "HUMAN") return "Avaliação humana";
  return "Não selecionada";
}

type SpeechRecognitionConstructor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

// ─── Shared UI Components ─────────────────────────────────────────────────────

function Btn({
  variant = "primary", size = "md", children, onClick, disabled = false, className = "", type,
}: {
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const buttonVariant = variant === "danger" ? "destructive" : variant;
  const buttonClassName = `${size === "sm" ? "text-xs" : ""} font-semibold cursor-pointer ${className}`;

  return (
    <UIButton
      variant={buttonVariant}
      size={size}
      className={buttonClassName}
      onClick={onClick}
      disabled={disabled}
      type={type}
    >
      {children}
    </UIButton>
  );
}

function Badge({ variant = "default", children }: {
  variant?: "default" | "success" | "warning" | "error" | "info" | "purple";
  children: React.ReactNode;
}) {
  const vars = {
    default: "bg-slate-100 text-slate-600",
    success: "bg-green-100 text-green-700",
    warning: "bg-amber-100 text-amber-700",
    error:   "bg-red-100 text-red-700",
    info:    "bg-blue-100 text-blue-700",
    purple:  "bg-purple-100 text-purple-700",
  };
  return <UIBadge variant="neutral" className={`font-semibold ${vars[variant]}`}>{children}</UIBadge>;
}

function EvaluationModeBadge({ mode }: { mode?: EvaluationMode | null }) {
  if (!mode) return null;
  const Icon = mode === "AI" ? Bot : User;
  const className = mode === "AI"
    ? "border-blue-100 bg-blue-50 text-blue-700"
    : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <UIBadge variant="neutral" className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold ${className}`}>
      <Icon className="h-3 w-3" />
      {evaluationModeLabel(mode)}
    </UIBadge>
  );
}

function statusToneFromBadge(variant: "default" | "success" | "warning" | "error" | "info" | "purple") {
  const tones = {
    default: "neutral",
    success: "success",
    warning: "warning",
    error: "error",
    info: "info",
    purple: "neutral",
  } as const;
  return tones[variant];
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "RC";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function getCandidateAccountConfig(user?: MockAuthUser | null): AccountConfig {
  if (!user) return CANDIDATE_ACCOUNT;
  return {
    ...CANDIDATE_ACCOUNT,
    name: user.name,
    email: user.email,
    initials: getInitials(user.name),
  };
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <UICard padding="none" className={className}>
      {children}
    </UICard>
  );
}

type FieldProps = {
  label: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

function Field({ label, type = "text", placeholder, hint, required, id, labelClassName, ...props }: FieldProps & { labelClassName?: string }) {
  const isPassword = type === "password";
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <div>
      <label htmlFor={fieldId} className={labelClassName ?? "block text-sm font-semibold text-foreground mb-1.5"}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {isPassword ? (
        <PasswordInput
          id={fieldId}
          placeholder={placeholder}
          required={required}
          {...props}
        />
      ) : (
        <Input
          id={fieldId}
          type={type}
          placeholder={placeholder}
          required={required}
          {...props}
        />
      )}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function FieldSelect({ label, options, required, ...props }: {
  label: string; options: string[]; required?: boolean;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label className="block text-sm font-semibold text-foreground mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <NativeSelect required={required} {...props}>
          <option value="">Selecione...</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </NativeSelect>
        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );
}

type FieldAreaProps = {
  label: string;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>;

function FieldArea({ label, placeholder, rows = 3, required, ...props }: FieldAreaProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-foreground mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <Textarea
        placeholder={placeholder}
        rows={rows}
        required={required}
        {...props}
      />
    </div>
  );
}

function StatCard({ value, label, icon: Icon, color }: {
  value: string | number; label: string; icon: React.ElementType; color: string;
}) {
  return (
    <Card className="p-3 sm:p-5 flex items-center gap-2 sm:gap-4">
      <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-4 h-4 sm:w-6 sm:h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-lg sm:text-2xl font-bold text-foreground leading-tight">{value}</p>
        <p className="text-[11px] sm:text-xs text-muted-foreground font-medium mt-0.5 leading-snug line-clamp-2">{label}</p>
      </div>
    </Card>
  );
}

// ─── Authenticated Layout ─────────────────────────────────────────────────────

const NAV_ITEMS: ProfileShellNavItem[] = [
  { icon: Home,      label: "Dashboard",    screen: "dashboard" as Screen },
  { icon: User,      label: "Meu Perfil",   screen: "profile" as Screen },
  { icon: History,   label: "Histórico",       screen: "interview-history" as Screen },
  { icon: CalendarDays, label: "Agenda",       screen: "agenda" as Screen },
  { icon: TrendingUp,label: "Desenvolvimento", screen: "development" as Screen },
  { icon: FileText,  label: "Teste DISC",      screen: "disc-test" as Screen },
  { icon: BookOpen,  label: "Materiais",       screen: "materials" as Screen },
  { icon: Settings,  label: "Configurações",screen: "settings" as Screen },
];

function AuthLayout({
  current, onNavigate, title, subtitle, actions, account, children,
}: {
  current: Screen; onNavigate: (s: Screen) => void;
  title: string; subtitle?: string; actions?: React.ReactNode;
  account?: AccountConfig;
  children: React.ReactNode;
}) {
  const activeSession = useContext(SessionContext);
  const resolvedAccount = account ?? (
    activeSession.authenticated && activeSession.user?.role === "CANDIDATE"
      ? getCandidateAccountConfig(activeSession.user)
      : CANDIDATE_ACCOUNT
  );

  return (
    <ProfileShell
      current={current}
      navItems={NAV_ITEMS}
      profileLabel="Candidato"
      account={resolvedAccount}
      notifications={CANDIDATE_NOTIFS}
      title={title}
      subtitle={subtitle}
      actions={actions}
      onNavigate={(screen) => onNavigate(screen as Screen)}
    >
      {children}
    </ProfileShell>
  );
}

// ─── Screen 1: Landing ────────────────────────────────────────────────────────

function LandingScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  return <LandingScreenComponent onNavigate={onNavigate} />;
}

// ─── Screen 2: Auth ───────────────────────────────────────────────────────────

// Tipografia compartilhada por Login e Cadastro (mesmos tokens para elementos equivalentes).
// Atenção: <label>/<button> têm tamanho-base próprio no tema (16px); por isso o tamanho é explícito.
const AUTH_LABEL_CLASS = "block text-sm font-medium text-foreground mb-1.5";
const AUTH_FIELD_PROPS = { labelClassName: AUTH_LABEL_CLASS, className: "text-sm font-normal" } as const;
const AUTH_SMALL_TEXT_CLASS = "text-[13px] leading-relaxed";

function AuthScreen({
  onNavigate,
  onLoginWithCredentials,
  onRegister,
  initialTab = "register",
}: {
  onNavigate: (s: Screen) => void;
  onLoginWithCredentials: (email: string, password: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  onRegister: (data: { name: string; email: string; password: string; termsAccepted: boolean }) => Promise<{ ok: true } | { ok: false; message: string }>;
  initialTab?: "login" | "register";
}) {
  const [tab, setTab] = useState<"login" | "register">(initialTab);
  const [loginEmail, setLoginEmail] = useState(() => getRememberedLoginEmail());
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberAccess, setRememberAccess] = useState(() => Boolean(getRememberedLoginEmail()));
  const [loginError, setLoginError] = useState("");
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);
  const [registerName, setRegisterName] = useState(() => getRegisterDraft()?.name ?? "");
  const [registerEmail, setRegisterEmail] = useState(() => getRegisterDraft()?.email ?? "");
  const [registerPassword, setRegisterPassword] = useState(() => getRegisterDraft()?.password ?? "");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState(() => getRegisterDraft()?.confirmPassword ?? "");
  const [registerAcceptedTerms, setRegisterAcceptedTerms] = useState(() => getRegisterDraft()?.acceptedTerms ?? false);
  const [registerError, setRegisterError] = useState("");
  const [isRegisterSubmitting, setIsRegisterSubmitting] = useState(false);
  const authNavigate = useNavigate();

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  // Rascunho do cadastro apenas em memória, para sobreviver à ida aos Termos/Privacidade.
  useEffect(() => {
    saveRegisterDraft({
      name: registerName,
      email: registerEmail,
      password: registerPassword,
      confirmPassword: registerConfirmPassword,
      acceptedTerms: registerAcceptedTerms,
    });
  }, [registerName, registerEmail, registerPassword, registerConfirmPassword, registerAcceptedTerms]);

  const selectAuthTab = (nextTab: "login" | "register") => {
    setTab(nextTab);
    setLoginError("");
    setRegisterError("");
    authNavigate(nextTab === "login" ? "/login" : "/register");
  };

  const loginSubmittingRef = useRef(false);
  const handleLoginSubmit = async () => {
    // Enter e o botão passam pelo mesmo caminho; sem double submit enquanto carrega.
    if (loginSubmittingRef.current) return;
    loginSubmittingRef.current = true;
    setLoginError("");

    setIsLoginSubmitting(true);
    try {
      const result = await onLoginWithCredentials(loginEmail, loginPassword);
      if (!result.ok) {
        setLoginError(result.message);
        return;
      }

      if (rememberAccess) {
        saveRememberedLoginEmail(loginEmail);
      } else {
        clearRememberedLoginEmail();
      }
    } finally {
      loginSubmittingRef.current = false;
      setIsLoginSubmitting(false);
    }
  };

  const handleRegisterSubmit = async () => {
    const name = registerName.trim();
    const email = registerEmail.trim().toLowerCase();
    const password = registerPassword;
    const confirmPassword = registerConfirmPassword;

    if (!name || !email || !password || !confirmPassword) {
      setRegisterError("Preencha todos os campos obrigatórios para criar sua conta.");
      return;
    }

    if (!/^[^\s@]+@gmail\.com$/i.test(email)) {
      setRegisterError("Use um e-mail válido do Gmail, no formato nome@gmail.com.");
      return;
    }

    if (password.length < 8) {
      setRegisterError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setRegisterError("A confirmação de senha deve ser igual à senha informada.");
      return;
    }

    if (!registerAcceptedTerms) {
      setRegisterError("Você precisa aceitar os Termos de uso e a Política de privacidade para continuar.");
      return;
    }

    setRegisterError("");
    setIsRegisterSubmitting(true);
    try {
      const result = await onRegister({ name, email, password, termsAccepted: registerAcceptedTerms });
      if (!result.ok) {
        setRegisterError(result.message);
      } else {
        clearRegisterDraft();
      }
    } finally {
      setIsRegisterSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-8 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <button
            type="button"
            onClick={() => onNavigate("landing")}
            className="mx-auto mb-3 block cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Ir para a página inicial"
          >
            <RHConnectLogo className="h-10 w-auto" />
          </button>
          <p className="text-muted-foreground text-sm">Seu treinamento inteligente para entrevistas</p>
        </div>

        <Card className="overflow-hidden">
          <div className="grid grid-cols-2 border-b border-border">
            {(["login","register"] as const).map(t => (
              <button
                key={t}
                onClick={() => selectAuthTab(t)}
                aria-pressed={tab === t}
                className={`py-4 text-sm font-medium transition-all ${tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t === "login" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          <div className="p-5 sm:p-7">
            {tab === "login" ? (
              // Formulário semântico: Enter nos campos e o botão "Entrar na plataforma" disparam o mesmo submit.
              // noValidate mantém a validação atual (feita pelo login), sem balões nativos do navegador.
              <form
                className="space-y-4"
                noValidate
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleLoginSubmit();
                }}
              >
                <Field
                  {...AUTH_FIELD_PROPS}
                  label="E-mail"
                  type="email"
                  autoComplete="username"
                  placeholder="seuemail@gmail.com"
                  value={loginEmail}
                  onChange={(event) => {
                    setLoginEmail(event.target.value);
                    setLoginError("");
                  }}
                  required
                />
                <Field
                  {...AUTH_FIELD_PROPS}
                  label="Senha"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Sua senha"
                  value={loginPassword}
                  onChange={(event) => {
                    setLoginPassword(event.target.value);
                    setLoginError("");
                  }}
                  required
                />
                {loginError && (
                  <Alert variant="error" className="rounded-xl p-3 text-xs">
                    {loginError}
                  </Alert>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember-access"
                      checked={rememberAccess}
                      onCheckedChange={(checked) => {
                        const nextChecked = checked === true;
                        setRememberAccess(nextChecked);
                        if (!nextChecked) {
                          clearRememberedLoginEmail();
                        }
                      }}
                    />
                    <label htmlFor="remember-access" className="text-sm font-normal text-muted-foreground cursor-pointer">
                      Lembrar acesso
                    </label>
                  </div>
                  <button type="button" onClick={() => onNavigate("forgot-password")} className="text-primary font-medium hover:underline text-sm">Esqueci minha senha</button>
                </div>
                <Btn variant="primary" type="submit" className="w-full !py-3" disabled={isLoginSubmitting}>
                  {isLoginSubmitting ? "Entrando..." : "Entrar na plataforma"}
                </Btn>
              </form>
            ) : (
              <div className="space-y-4">
                <Field
                  {...AUTH_FIELD_PROPS}
                  label="Nome completo"
                  placeholder="João da Silva Lima"
                  value={registerName}
                  onChange={(event) => {
                    setRegisterName(event.target.value);
                    setRegisterError("");
                  }}
                  required
                />
                <Field
                  {...AUTH_FIELD_PROPS}
                  label="E-mail"
                  type="email"
                  placeholder="nome@gmail.com"
                  value={registerEmail}
                  onChange={(event) => {
                    setRegisterEmail(event.target.value);
                    setRegisterError("");
                  }}
                  required
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field
                    {...AUTH_FIELD_PROPS}
                    label="Senha"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    value={registerPassword}
                    onChange={(event) => {
                      setRegisterPassword(event.target.value);
                      setRegisterError("");
                    }}
                    required
                  />
                  <Field
                    {...AUTH_FIELD_PROPS}
                    label="Confirmar senha"
                    type="password"
                    placeholder="Repita a senha"
                    value={registerConfirmPassword}
                    onChange={(event) => {
                      setRegisterConfirmPassword(event.target.value);
                      setRegisterError("");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        handleRegisterSubmit();
                      }
                    }}
                    required
                  />
                </div>
                <div className="bg-accent rounded-xl px-4 py-3.5">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 rounded shrink-0"
                      checked={registerAcceptedTerms}
                      onChange={(event) => {
                        setRegisterAcceptedTerms(event.target.checked);
                        setRegisterError("");
                      }}
                    />
                    <span className={`${AUTH_SMALL_TEXT_CLASS} font-normal text-foreground`}>
                      Li e aceito os <button onClick={() => onNavigate("terms")} className="text-[13px] leading-relaxed text-primary font-medium whitespace-nowrap hover:underline">Termos de uso</button> e a <button onClick={() => onNavigate("privacy")} className="text-[13px] leading-relaxed text-primary font-medium whitespace-nowrap hover:underline">Política de privacidade</button>. <span className="text-red-500">*</span>
                    </span>
                  </label>
                </div>
                {registerError && (
                  <Alert variant="error" className="rounded-xl p-3 text-xs">
                    {registerError}
                  </Alert>
                )}
                <Btn variant="primary" className="w-full !py-3" onClick={handleRegisterSubmit} disabled={isRegisterSubmitting}>
                  {isRegisterSubmitting ? "Criando conta..." : "Criar minha conta"}
                </Btn>
              </div>
            )}

            <p className={`text-center ${AUTH_SMALL_TEXT_CLASS} font-normal text-muted-foreground mt-5`}>
              {tab === "login" ? "Não tem uma conta? " : "Já tem uma conta? "}
              <button onClick={() => selectAuthTab(tab === "login" ? "register" : "login")} className="text-[13px] leading-relaxed text-primary font-medium hover:underline">
                {tab === "login" ? "Criar conta" : "Entrar"}
              </button>
            </p>
          </div>
        </Card>

      </div>
    </div>
  );
}

// ─── Screen 3: Dashboard ──────────────────────────────────────────────────────

/**
 * Casca ÚNICA de um card de "Entrevistas recentes". O item real e o skeleton usam esta mesma estrutura
 * (mesmas classes, mesmos tamanhos de texto), então a altura do loading acompanha a do conteúdo.
 */
function RecentInterviewShell({ title, subtitle, badges, action }: {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  badges: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="p-3 sm:p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center border border-border shrink-0 mt-0.5">
          <Briefcase className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {badges}
            {action}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Blocos neutros (texto invisível sobre fundo) que ocupam o mesmo espaço do texto real. */
const skeletonBlock = "rounded bg-muted text-transparent select-none";

/** Loading inicial de "Entrevistas recentes": até 3 cards com a mesma casca dos reais (reserva a altura, sem layout shift). */
function RecentInterviewsSkeleton() {
  return (
    <div role="status" aria-busy="true" data-testid="recent-interviews-skeleton">
      <span className="sr-only">Carregando suas entrevistas...</span>
      <div className="space-y-3" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <div key={index} className={index > 0 ? "hidden lg:block" : ""}>
            <RecentInterviewShell
              title={<span className={`${skeletonBlock} inline-block max-w-full`}>Título da vaga carregando</span>}
              subtitle={<span className={`${skeletonBlock} inline-block max-w-full`}>Empresa · 00/00/0000 00:00</span>}
              badges={
                <>
                  <span className={`${skeletonBlock} rounded-full px-2 py-0.5 text-[11px] border border-transparent`}>Avaliação humana</span>
                  <span className={`${skeletonBlock} rounded-full px-2.5 py-0.5 text-xs leading-[1.5] border border-transparent`}>Aguardando avaliação</span>
                </>
              }
              action={<span className={`${skeletonBlock} rounded-lg px-3 py-1.5 text-xs font-semibold`}>Acompanhar</span>}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardScreen({
  onNavigate,
  session,
  activeDraftEntry,
  onContinueDraft,
  onResumeInterview,
}: {
  onNavigate: (s: Screen) => void;
  session: MockAuthSession;
  activeDraftEntry?: StoredInterviewDraftEntry | null;
  onContinueDraft?: () => void;
  onResumeInterview?: (interviewId: string) => Promise<ResumeInterviewResult>;
}) {
  const routerNavigate = useNavigate();
  const inProgress = useInProgressInterviews();
  const reloadInProgress = inProgress.reload;
  // Entrevistas reais (GET /interviews): métricas e "Entrevistas recentes". CANCELLED fica fora (6A.4/6A.5).
  const interviewsHistory = useCandidateInterviewHistory({ autoSync: false });
  const refreshInterviewsHistory = interviewsHistory.refresh;
  // Dashboard reativo entre dispositivos (focus/visible/online + polling de 15 s), só enquanto montado.
  // UM único ciclo atualiza as duas fontes reais (in-progress e GET /interviews), em silêncio.
  useDashboardInterviewsSync(async () => {
    const [progress, history] = await Promise.all([inProgress.refresh(), refreshInterviewsHistory()]);
    if (history === "stop") return "stop"; // 401/403: não insistir
    return progress === "error" || history === "error" ? "error" : "ok";
  });
  const [resumingId, setResumingId] = useState<string | null>(null);
  const [resumeMessage, setResumeMessage] = useState<string | null>(null);
  const resumeInterview = async (interviewId: string) => {
    if (!onResumeInterview || resumingId) return;
    setResumingId(interviewId);
    setResumeMessage(null);
    const result = await onResumeInterview(interviewId);
    setResumingId(null);
    if (result.ok) return;
    setResumeMessage(result.message);
    // Enviada/encerrada entre a listagem e o clique: atualiza a lista do Dashboard.
    if (result.reason === "not_in_progress" || result.reason === "not_found") {
      void reloadInProgress();
      void refreshInterviewsHistory();
    }
  };
  const candidateUser = session.user;
  const candidateIdentity = getCandidateIdentity(session);
  const candidateId = candidateIdentity.id;
  const account = getCandidateAccountConfig(candidateUser);
  const firstName = (candidateUser?.name ?? CANDIDATE_ACCOUNT.name).trim().split(/\s+/)[0] ?? "candidato";
  const { status: profileStatus, profile: candidateProfile, reload: reloadProfile } = useCandidateProfile();
  const profileCompleteness = candidateProfile ? getProfileCompletionPercent(candidateProfile) : 0;
  const historyReady = interviewsHistory.state.status === "ready" ? interviewsHistory.state.history.interviews : null;
  const dashboardSummary = historyReady ? buildDashboardSummary(historyReady) : null;
  const recentItems = historyReady ? buildDashboardRecent(historyReady) : [];
  // Back autoritativo (por interviewId, sem duplicar); o rascunho local só aparece
  // como fallback enquanto a lista carrega/falha.
  const inProgressEntries = mergeInProgressEntries({
    server: inProgress.items,
    localInterviewId: activeDraftEntry?.draft.interviewId,
    localActive: Boolean(activeDraftEntry?.draft.context),
  });
  // UX preventiva da regra V1 (uma IN_PROGRESS por candidato); o Back segue como barreira.
  const newInterviewGate = resolveNewInterviewGate(inProgressEntries);
  // Os dois acessos do Dashboard (card principal e atalho) acompanham a lista real de IN_PROGRESS.
  const interviewAccess = resolveDashboardInterviewAccess(newInterviewGate);
  const continueExistingInterview = () => {
    if (!newInterviewGate.blocked) return;
    if (newInterviewGate.resume.source === "server") void resumeInterview(newInterviewGate.resume.interviewId);
    else onContinueDraft?.();
  };
  const startNewInterview = () => {
    // Defesa: com IN_PROGRESS nunca abre outro wizard; continua a existente.
    if (newInterviewGate.blocked) {
      continueExistingInterview();
      return;
    }
    onNavigate("interview-setup");
  };
  const openInterviewAccess = interviewAccess.action === "continue" ? continueExistingInterview : startNewInterview;

  return (
    <AuthLayout current="dashboard" onNavigate={onNavigate} title="Dashboard" subtitle={`Bem-vindo de volta, ${firstName}!`} account={account}>
      {/* Aviso do perfil — dados reais da API. A entrevista depende só do Objetivo Profissional (`isInterviewReady`). */}
      {profileStatus === "ready" && candidateProfile && getProfileNotice(candidateProfile) === "objective-pending" && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 sm:p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">Complete seu Objetivo Profissional</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Para realizar entrevistas, falta preencher: {describeMissingObjectiveFields(candidateProfile.missingObjectiveFields).join(", ")}.
              </p>
            </div>
          </div>
          <Btn variant="secondary" size="sm" onClick={() => onNavigate("profile")} className="self-start sm:self-auto shrink-0">
            Completar objetivo
          </Btn>
        </div>
      )}
      {profileStatus === "ready" && candidateProfile && getProfileNotice(candidateProfile) === "optional-sections" && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3 mb-6">
          <p className="text-xs text-muted-foreground">
            Seu perfil está {profileCompleteness}% completo. Preencher as demais seções é opcional para iniciar entrevistas.
          </p>
          <button type="button" onClick={() => onNavigate("profile")} className="self-start sm:self-auto shrink-0 text-xs font-semibold text-primary hover:underline">
            Ver perfil
          </button>
        </div>
      )}
      {profileStatus === "error" && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-amber-800">Não foi possível verificar o status do seu perfil profissional.</p>
          <Btn variant="outline" size="sm" onClick={() => void reloadProfile()} className="self-start sm:self-auto shrink-0">
            Tentar novamente
          </Btn>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard value={dashboardSummary ? dashboardSummary.total : "—"} label="Entrevistas realizadas" icon={MessageSquare} color="bg-blue-50 text-blue-600" />
        <StatCard value={dashboardSummary ? dashboardSummary.waiting : "—"} label="Aguardando avaliação"   icon={Clock}       color="bg-amber-50 text-amber-600" />
        <StatCard value={dashboardSummary ? dashboardSummary.resultsAvailable : "—"} label="Resultado disponível"   icon={CheckCircle} color="bg-green-50 text-green-600" />
        <StatCard value={formatDashboardScore(dashboardSummary ? dashboardSummary.bestScore : null)} label="Melhor pontuação"       icon={Award}       color="bg-purple-50 text-purple-600" />
      </div>

      {/* Agenda (entrevistas reais/externas) — não confundir com "Entrevistas recentes" (simuladas) */}
      <NextInterviewCard
        candidateId={candidateId}
        onViewAgenda={() => onNavigate("agenda")}
        onAddInterview={() => routerNavigate(`${getPathForScreen("agenda")}?new=1`)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6 items-stretch">
        {/* CTA principal (acompanha a altura da coluna "Entrevistas recentes" no desktop; no mobile fica na altura natural) */}
        <div className="flex flex-col" data-testid="new-interview-card">
          <div className="flex-1 rounded-2xl p-5 sm:p-6 text-white flex flex-col justify-between" style={{ background: "linear-gradient(135deg, #1D4ED8, #0F2652)" }}>
            <div>
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center mb-4">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-2">{interviewAccess.main.title}</h3>
              <p className="text-blue-200 text-sm leading-relaxed mb-4">{interviewAccess.main.description}</p>
            </div>
            <Btn size="md" onClick={openInterviewAccess} disabled={interviewAccess.action === "continue" && resumingId !== null} className="!bg-white !text-blue-700 hover:!bg-blue-50 font-bold w-full">
              {interviewAccess.main.cta} <ArrowRight className="w-4 h-4" />
            </Btn>
          </div>
        </div>

        {/* Entrevistas recentes */}
        <div className="lg:col-span-2">
          <Card className="p-5 sm:p-6 h-full">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-foreground">Entrevistas recentes</h3>
              <button onClick={() => onNavigate("interview-history")} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 shrink-0">
                Ver histórico <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-3">
              {resumeMessage && (
                <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{resumeMessage}</div>
              )}
              {interviewsHistory.state.status === "loading" ? (
                <RecentInterviewsSkeleton />
              ) : interviewsHistory.state.status === "error" ? (
                (() => {
                  const failure = describeDashboardInterviewsFailure(interviewsHistory.state.reason, interviewsHistory.state.message);
                  return (
                    <EmptyState
                      icon={AlertCircle}
                      title={failure.title}
                      description={failure.description}
                      className="border-none bg-muted/40 p-6"
                      action={failure.canRetry ? <Btn size="sm" variant="outline" onClick={() => interviewsHistory.reload()}>Tentar novamente</Btn> : undefined}
                    />
                  );
                })()
              ) : recentItems.length ? (
                recentItems.map((item) => (
                  <RecentInterviewShell
                    key={item.id}
                    title={item.title}
                    subtitle={[item.company, item.dateText].filter(Boolean).join(" · ")}
                    badges={
                      <>
                        <EvaluationModeBadge mode={item.evaluationMode} />
                        <StatusBadge tone={item.tone}><span className="truncate max-w-[140px] sm:max-w-none">{item.statusLabel}</span></StatusBadge>
                      </>
                    }
                    action={item.action && (
                      <Btn
                        size="sm"
                        variant={item.action.kind === "track" ? "outline" : "primary"}
                        disabled={item.action.kind === "resume" && resumingId !== null}
                        onClick={() => {
                          if (!item.action) return;
                          if (item.action.kind === "resume") {
                            void resumeInterview(item.id);
                            return;
                          }
                          const path = dashboardActionPath(item.action, item.id);
                          if (path) routerNavigate(path);
                        }}
                      >
                        {item.action.kind === "resume" && resumingId === item.id ? "Carregando..." : item.action.label}
                      </Btn>
                    )}
                  />
                ))
              ) : (
                <EmptyState
                  icon={MessageSquare}
                  title={DASHBOARD_RECENT_EMPTY.title}
                  description={DASHBOARD_RECENT_EMPTY.description}
                  className="border-none bg-muted/40 p-6"
                />
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: User,      label: "Completar perfil",    desc: "Formação, experiência e habilidades",      screen: "profile" as Screen, color: "text-blue-600 bg-blue-50" },
          { icon: MessageSquare, label: interviewAccess.quick.title, desc: interviewAccess.quick.description, screen: "interview-setup" as Screen, color: "text-green-600 bg-green-50" },
          { icon: BookOpen,  label: "Materiais de apoio",  desc: "Dicas e conteúdos de preparação",          screen: "materials" as Screen, color: "text-purple-600 bg-purple-50" },
        ].map(q => (
          <button key={q.label} onClick={() => q.screen === "interview-setup" ? openInterviewAccess() : q.screen && onNavigate(q.screen)} className="text-left w-full">
            <Card className="p-5 hover:shadow-md transition-all cursor-pointer">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${q.color}`}>
                <q.icon className="w-4 h-4" />
              </div>
              <p className="font-semibold text-foreground text-sm mb-1">{q.label}</p>
              <p className="text-xs text-muted-foreground">{q.desc}</p>
            </Card>
          </button>
        ))}
      </div>
    </AuthLayout>
  );
}

// ─── Screen 4: Perfil Profissional ────────────────────────────────────────────

function ProfileField({ error, warning, ...props }: FieldProps & { error?: string; warning?: string }) {
  return (
    <div>
      <Field {...props} />
      {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
      {!error && warning && <p role="status" className="mt-1 text-xs text-amber-700">{warning}</p>}
    </div>
  );
}

function ProfileSelect({ label, options, required, error, placeholder = "Selecione...", ...props }: {
  label: string;
  options: { value: string; label: string }[];
  required?: boolean;
  error?: string;
  placeholder?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label className="block text-sm font-semibold text-foreground mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <NativeSelect {...props}>
          <option value="">{placeholder}</option>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </NativeSelect>
        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>
      {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function CharCounter({ value, limit }: { value: string; limit: number }) {
  return <p className="mt-1 text-right text-[11px] text-muted-foreground">{value.length}/{limit}</p>;
}

function NoneDeclarationBox({ checked, disabled, label, hint, onToggle }: {
  checked: boolean;
  disabled: boolean;
  label: string;
  hint?: string;
  onToggle: () => void;
}) {
  return (
    <div className="bg-muted/40 rounded-xl p-4 border border-border">
      <label className={`flex items-start gap-2 text-sm ${disabled ? "text-muted-foreground" : "text-foreground"}`}>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={onToggle}
          className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
        />
        <span className="font-medium">{label}</span>
      </label>
      {hint && <p className="mt-1 ml-6 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const PROFILE_ITEM_CARD = "bg-muted/50 rounded-xl p-4 border border-border flex items-start justify-between gap-3";
const PROFILE_ADD_BUTTON = "w-full border-2 border-dashed border-border rounded-xl py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed";

function ProfileItemActions({ onEdit, onRemove, label, disabled }: {
  onEdit?: () => void;
  onRemove: () => void;
  label: string;
  disabled: boolean;
}) {
  return (
    <div className="flex gap-1 shrink-0">
      {onEdit && (
        <button onClick={onEdit} disabled={disabled} className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50" aria-label={`Editar ${label}`}>
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      )}
      <button onClick={onRemove} disabled={disabled} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50" aria-label={`Remover ${label}`}>
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

type ObjectiveForm = {
  professionalTitle: string;
  professionalArea: string;
  professionalSubarea: string;
  desiredPosition: string;
  professionalLevel: string;
  contractType: string;
  professionalSummary: string;
};

const EMPTY_OBJECTIVE_FORM: ObjectiveForm = {
  professionalTitle: "",
  professionalArea: "",
  professionalSubarea: "",
  desiredPosition: "",
  professionalLevel: "",
  contractType: "",
  professionalSummary: "",
};

function toObjectiveForm(profile: ProfessionalProfile): ObjectiveForm {
  return {
    professionalTitle: profile.professionalTitle ?? "",
    professionalArea: profile.professionalArea ?? "",
    professionalSubarea: profile.professionalSubarea ?? "",
    desiredPosition: profile.desiredPosition ?? "",
    professionalLevel: profile.professionalLevel ?? "",
    contractType: profile.contractType ?? "",
    professionalSummary: profile.professionalSummary ?? "",
  };
}

function ProfileScreen({ onNavigate, session }: { onNavigate: (s: Screen) => void; session: MockAuthSession }) {
  const candidateUser = session.user?.role === "CANDIDATE" ? session.user : null;
  const candidateIdentity = getCandidateIdentity(session);
  const account = getCandidateAccountConfig(candidateUser);
  const { status, profile, error: loadError, reason: loadReason, reload, setProfile } = useCandidateProfile();
  const [openSection, setOpenSection] = useState<string | null>("objetivo");
  // Chave da ação em andamento (uma por vez): desabilita botões e evita duplo envio.
  const [busy, setBusy] = useState<string | null>(null);

  const [objective, setObjective] = useState<ObjectiveForm>(EMPTY_OBJECTIVE_FORM);
  const objectiveSyncedRef = useRef(false);

  const [educationForm, setEducationForm] = useState<EducationForm>(EMPTY_EDUCATION_FORM);
  const [educationErrors, setEducationErrors] = useState<FormErrors<EducationForm>>({});
  const [editingEducationId, setEditingEducationId] = useState<number | null>(null);

  const [courseForm, setCourseForm] = useState<CourseForm>(EMPTY_COURSE_FORM);
  const [courseErrors, setCourseErrors] = useState<FormErrors<CourseForm>>({});
  const [editingCourseId, setEditingCourseId] = useState<number | null>(null);

  const [experienceForm, setExperienceForm] = useState<ExperienceForm>(EMPTY_EXPERIENCE_FORM);
  const [experienceErrors, setExperienceErrors] = useState<FormErrors<ExperienceForm>>({});
  const [editingExperienceId, setEditingExperienceId] = useState<number | null>(null);

  // Avisos de plausibilidade (duração): só apresentação, nunca bloqueiam o salvamento.
  const educationWarnings = getEducationWarnings(educationForm);
  const courseWarnings = getCourseWarnings(courseForm);
  const experienceWarnings = getExperienceWarnings(experienceForm);

  const [newTechnicalSkill, setNewTechnicalSkill] = useState("");
  const [newBehavioralSkill, setNewBehavioralSkill] = useState("");

  // O formulário do objetivo é preenchido UMA vez com o que veio do banco (e
  // de novo só após salvar o próprio objetivo) — assim, ações em outras seções
  // não sobrescrevem edições ainda não salvas.
  useEffect(() => {
    if (status === "ready" && profile && !objectiveSyncedRef.current) {
      objectiveSyncedRef.current = true;
      setObjective(toObjectiveForm(profile));
    }
  }, [status, profile]);

  const availableSubareas = objective.professionalArea
    ? getProfessionalSubareasByArea(objective.professionalArea as ProfessionalAreaId)
    : [];
  const profileCompleteness = profile ? getProfileCompletionPercent(profile) : 0;
  const missing = new Set<ProfileSectionKey>(profile?.missingSections ?? []);

  // Toda escrita passa por aqui: só reflete na tela o que a API confirmou.
  const runAction = async (
    key: string,
    action: () => Promise<ProfileResult<ProfessionalProfile>>,
    successMessage: string,
  ): Promise<boolean> => {
    if (busy) return false;
    setBusy(key);
    const result = await action();
    setBusy(null);
    if (!result.ok) {
      toast.error(result.message);
      // Registro removido em outra aba/dispositivo: recarrega o estado real.
      if (result.reason === "not_found") void reload();
      return false;
    }
    setProfile(result.data);
    toast.success(successMessage);
    return true;
  };

  // ── Objetivo profissional ─────────────────────────────────────────────────
  const handleSaveObjective = async () => {
    const saved = await runAction(
      "objective",
      () => profileApi.updateCandidateObjective({
        professionalTitle: objective.professionalTitle,
        professionalArea: objective.professionalArea || null,
        professionalSubarea: objective.professionalSubarea || null,
        desiredPosition: objective.desiredPosition,
        professionalLevel: levelForApi(objective.contractType, objective.professionalLevel),
        contractType: (objective.contractType || null) as ContractType | null,
        professionalSummary: objective.professionalSummary,
      }),
      "Objetivo profissional salvo.",
    );
    if (saved) objectiveSyncedRef.current = false; // re-sincroniza com o que o banco devolveu
  };

  // ── Formação ──────────────────────────────────────────────────────────────
  const resetEducation = () => {
    setEducationForm(EMPTY_EDUCATION_FORM);
    setEducationErrors({});
    setEditingEducationId(null);
  };

  const startEditEducation = (item: ProfileEducation) => {
    setEditingEducationId(item.id);
    setEducationErrors({});
    setEducationForm({
      academicLevel: item.academicLevel,
      status: item.status,
      degree: item.degree ?? "",
      educationInstitution: item.educationInstitution,
      startDate: apiMonthToMonthYear(item.startDate),
      endDate: apiMonthToMonthYear(item.endDate),
    });
  };

  const submitEducation = async () => {
    const result = validateEducationForm(educationForm);
    if (!result.ok) {
      setEducationErrors(result.errors);
      toast.error("Revise os campos da formação.");
      return;
    }
    setEducationErrors({});
    const editingId = editingEducationId;
    const ok = await runAction(
      "education",
      () => editingId === null ? profileApi.addEducation(result.payload) : profileApi.updateEducation(editingId, result.payload),
      editingId === null ? "Formação adicionada." : "Formação atualizada.",
    );
    if (ok) resetEducation();
  };

  const handleRemoveEducation = async (id: number) => {
    const ok = await runAction(`education-remove-${id}`, () => profileApi.removeEducation(id), "Formação removida.");
    if (ok && editingEducationId === id) resetEducation();
  };

  // ── Cursos ────────────────────────────────────────────────────────────────
  const resetCourse = () => {
    setCourseForm(EMPTY_COURSE_FORM);
    setCourseErrors({});
    setEditingCourseId(null);
  };

  const startEditCourse = (item: ProfileCourse) => {
    setEditingCourseId(item.id);
    setCourseErrors({});
    setCourseForm({
      courseName: item.courseName,
      courseInstitution: item.courseInstitution ?? "",
      workloadHours: item.workloadHours === null ? "" : String(item.workloadHours),
      status: item.status,
      startDate: apiMonthToMonthYear(item.startDate),
      completedAt: apiMonthToMonthYear(item.completedAt),
    });
  };

  const submitCourse = async () => {
    const result = validateCourseForm(courseForm);
    if (!result.ok) {
      setCourseErrors(result.errors);
      toast.error("Revise os campos do curso.");
      return;
    }
    setCourseErrors({});
    const editingId = editingCourseId;
    const ok = await runAction(
      "course",
      () => editingId === null ? profileApi.addCourse(result.payload) : profileApi.updateCourse(editingId, result.payload),
      editingId === null ? "Curso adicionado." : "Curso atualizado.",
    );
    if (ok) resetCourse();
  };

  const handleRemoveCourse = async (id: number) => {
    const ok = await runAction(`course-remove-${id}`, () => profileApi.removeCourse(id), "Curso removido.");
    if (ok && editingCourseId === id) resetCourse();
  };

  // ── Experiência ───────────────────────────────────────────────────────────
  const resetExperience = () => {
    setExperienceForm(EMPTY_EXPERIENCE_FORM);
    setExperienceErrors({});
    setEditingExperienceId(null);
  };

  const startEditExperience = (item: ProfileExperience) => {
    setEditingExperienceId(item.id);
    setExperienceErrors({});
    setExperienceForm({
      companyName: item.companyName,
      jobRole: item.jobRole,
      startDate: apiMonthToMonthYear(item.startDate),
      endDate: apiMonthToMonthYear(item.endDate),
      isCurrent: item.isCurrent,
      description: item.description ?? "",
    });
  };

  const submitExperience = async () => {
    const result = validateExperienceForm(experienceForm);
    if (!result.ok) {
      setExperienceErrors(result.errors);
      toast.error("Revise os campos da experiência.");
      return;
    }
    setExperienceErrors({});
    const editingId = editingExperienceId;
    const ok = await runAction(
      "experience",
      () => editingId === null ? profileApi.addExperience(result.payload) : profileApi.updateExperience(editingId, result.payload),
      editingId === null ? "Experiência adicionada." : "Experiência atualizada.",
    );
    if (ok) resetExperience();
  };

  const handleRemoveExperience = async (id: number) => {
    const ok = await runAction(`experience-remove-${id}`, () => profileApi.removeExperience(id), "Experiência removida.");
    if (ok && editingExperienceId === id) resetExperience();
  };

  // ── Habilidades ───────────────────────────────────────────────────────────
  const handleAddSkill = async (type: SkillType, raw: string) => {
    const validation = validateSkillName(raw);
    if (!validation.ok) {
      toast.error(validation.error);
      return;
    }
    const ok = await runAction(`skill-${type}`, () => profileApi.addSkill(type, validation.name), "Habilidade adicionada.");
    if (ok) {
      if (type === "TECHNICAL") setNewTechnicalSkill("");
      else setNewBehavioralSkill("");
    }
  };

  const handleRemoveSkill = (id: number) =>
    runAction(`skill-remove-${id}`, () => profileApi.removeSkill(id), "Habilidade removida.");

  // ── Declarações "não possuo" ──────────────────────────────────────────────
  const handleToggleDeclaration = (section: DeclarationSection, declared: boolean) =>
    runAction(
      `declaration-${section}`,
      () => declared ? profileApi.removeDeclaration(section) : profileApi.declareNone(section),
      declared ? "Declaração removida." : "Declaração registrada.",
    );

  const sections = [
    { id: "objetivo", label: "Objetivo profissional", icon: Target, filled: !missing.has("objective") },
    { id: "formacao", label: "Formação acadêmica", icon: GraduationCap, filled: !missing.has("education") },
    { id: "cursos", label: "Cursos complementares", icon: BookOpen, filled: !missing.has("courses") },
    { id: "experiencia", label: "Experiência profissional", icon: Briefcase, filled: !missing.has("experience") },
    { id: "habilidades", label: "Habilidades e competências", icon: Star, filled: !missing.has("technicalSkills") && !missing.has("behavioralSkills") },
  ];

  if (status !== "ready" || !profile) {
    return (
      <AuthLayout
        current="profile"
        onNavigate={onNavigate}
        title="Perfil Profissional"
        subtitle="Preencha seu perfil para receber perguntas mais relevantes"
        account={account}
      >
        <Card className="w-full p-6 sm:p-8">
          {status === "loading" ? (
            <div role="status" aria-live="polite" className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
              <Spinner size="md" /> Carregando seu perfil profissional...
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center">
              <AlertCircle className="w-10 h-10 text-amber-500" />
              <h3 className="font-bold text-foreground">Não foi possível carregar seu perfil</h3>
              <p className="text-sm text-muted-foreground max-w-md">{loadError}</p>
              {loadReason === "unauthorized" ? (
                <Btn variant="primary" onClick={() => window.location.reload()}>Recarregar página</Btn>
              ) : (
                <Btn variant="primary" onClick={() => void reload()}>Tentar novamente</Btn>
              )}
            </div>
          )}
        </Card>
      </AuthLayout>
    );
  }

  const isBusy = busy !== null;
  const hasCourses = profile.courses.length > 0;
  const hasExperiences = profile.experiences.length > 0;
  const hasTechnicalSkills = profile.technicalSkills.length > 0;

  return (
    <AuthLayout
      current="profile"
      onNavigate={onNavigate}
      title="Perfil Profissional"
      subtitle="Preencha seu perfil para receber perguntas mais relevantes"
      account={account}
      actions={
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">{profileCompleteness}% completo</span>
          <div className="w-20 sm:w-24 bg-muted rounded-full h-1.5">
            <div className="bg-primary h-1.5 rounded-full" style={{ width: `${profileCompleteness}%` }} />
          </div>
        </div>
      }
    >
      <div className="w-full space-y-4">
        {/* Avatar / dados básicos */}
        <Card className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-700 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0">
              {getInitials(candidateIdentity.name)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-foreground text-lg">{candidateIdentity.name}</h2>
              <p className="text-muted-foreground text-sm">{candidateIdentity.email}</p>
              {profile.professionalTitle && (
                <p className="text-sm font-medium text-foreground mt-1 break-words">{profile.professionalTitle}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1 italic break-words">
                {profile.professionalSummary ? `"${profile.professionalSummary}"` : "Resumo profissional ainda não preenchido."}
              </p>
            </div>
            <Btn variant="outline" size="sm" className="self-start sm:self-auto shrink-0" onClick={() => void handleSaveObjective()} disabled={isBusy}>
              <Check className="w-3.5 h-3.5" /> Salvar perfil
            </Btn>
          </div>
          {!profile.isInterviewReady && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                Para realizar entrevistas, complete o Objetivo Profissional. Falta preencher: {describeMissingObjectiveFields(profile.missingObjectiveFields).join(", ")}.
              </p>
            </div>
          )}
        </Card>

        {/* Accordion sections */}
        {sections.map(sec => (
          <Card key={sec.id} className="overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-muted/30 transition-colors text-left"
              onClick={() => setOpenSection(openSection === sec.id ? null : sec.id)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${sec.filled ? "bg-green-50 text-green-600" : "bg-muted text-muted-foreground"}`}>
                  <sec.icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">{sec.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {sec.filled ? "Preenchido" : "Clique para adicionar"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                {sec.filled && <Badge variant="success"><Check className="w-3 h-3" /></Badge>}
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openSection === sec.id ? "rotate-180" : ""}`} />
              </div>
            </button>

            {openSection === sec.id && (
              <div className="border-t border-border p-4 sm:p-6 space-y-4">
                {sec.id === "objetivo" && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                      <Field
                        label="Título profissional"
                        placeholder="Ex: Desenvolvedora Front-end"
                        hint="Como você se apresenta hoje."
                        maxLength={PROFILE_FIELD_LIMITS.professionalTitle}
                        value={objective.professionalTitle}
                        onChange={(event) => setObjective((current) => ({ ...current, professionalTitle: event.target.value }))}
                        required
                      />
                      <ProfileSelect
                        label="Área de interesse"
                        required
                        options={PROFESSIONAL_AREAS.map((area) => ({ value: area.id, label: area.name }))}
                        value={objective.professionalArea}
                        onChange={(event) => setObjective((current) => ({ ...current, professionalArea: event.target.value, professionalSubarea: "" }))}
                      />
                      <ProfileSelect
                        label="Subárea de interesse"
                        required
                        options={availableSubareas.map((subarea) => ({ value: subarea.id, label: subarea.name }))}
                        value={objective.professionalSubarea}
                        disabled={!objective.professionalArea}
                        onChange={(event) => setObjective((current) => ({ ...current, professionalSubarea: event.target.value }))}
                      />
                      <Field
                        label="Cargo desejado"
                        placeholder="Ex: Desenvolvedor Front-end"
                        hint="A posição que você está buscando."
                        maxLength={PROFILE_FIELD_LIMITS.desiredPosition}
                        value={objective.desiredPosition}
                        onChange={(event) => setObjective((current) => ({ ...current, desiredPosition: event.target.value }))}
                        required
                      />
                      <ProfileSelect
                        label="Tipo de contrato"
                        required
                        options={CONTRACT_TYPE_OPTIONS}
                        value={objective.contractType}
                        onChange={(event) => {
                          const contractType = event.target.value;
                          setObjective((current) => ({
                            ...current,
                            contractType,
                            professionalLevel: levelAfterContractChange(contractType, current.professionalLevel),
                          }));
                        }}
                      />
                      <ProfileSelect
                        label="Senioridade profissional"
                        required={isLevelApplicable(objective.contractType)}
                        disabled={!isLevelApplicable(objective.contractType)}
                        placeholder={isLevelApplicable(objective.contractType) ? undefined : LEVEL_NOT_APPLICABLE_LABEL}
                        options={getLevelOptionsForContract(objective.contractType)}
                        value={objective.professionalLevel}
                        onChange={(event) => setObjective((current) => ({ ...current, professionalLevel: event.target.value }))}
                      />
                    </div>
                    <div>
                      <FieldArea
                        label="Resumo profissional"
                        placeholder="Escreva um breve texto sobre sua trajetória, objetivos e diferenciais..."
                        rows={3}
                        maxLength={PROFILE_FIELD_LIMITS.professionalSummary}
                        value={objective.professionalSummary}
                        onChange={(event) => setObjective((current) => ({ ...current, professionalSummary: event.target.value }))}
                        required
                      />
                      <CharCounter value={objective.professionalSummary} limit={PROFILE_FIELD_LIMITS.professionalSummary} />
                    </div>
                    <div className="flex justify-end pt-2 border-t border-border">
                      <Btn variant="primary" size="sm" onClick={() => void handleSaveObjective()} disabled={isBusy}>
                        {busy === "objective" ? "Salvando..." : "Salvar alterações"}
                      </Btn>
                    </div>
                  </>
                )}

                {sec.id === "formacao" && (
                  <>
                    {profile.educations.length > 0 ? (
                      profile.educations.map((item) => (
                        <div key={item.id} className={PROFILE_ITEM_CARD}>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground break-words">{item.degree ?? item.educationInstitution}</p>
                            {item.degree && item.educationInstitution && (
                              <p className="text-xs text-muted-foreground break-words">{item.educationInstitution}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {[academicLevelLabel(item.academicLevel), educationStatusLabel(item.status), formatEducationPeriod(item)].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                          <ProfileItemActions
                            label="formação"
                            disabled={isBusy}
                            onEdit={() => startEditEducation(item)}
                            onRemove={() => void handleRemoveEducation(item.id)}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="bg-muted/40 rounded-xl p-4 border border-border">
                        <p className="text-sm font-semibold text-foreground">Nenhuma formação adicionada</p>
                        <p className="text-xs text-muted-foreground mt-1">Adicione pelo menos uma formação para completar seu perfil profissional.</p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 border-2 border-dashed border-border rounded-xl p-4">
                      <ProfileSelect
                        label="Nível/tipo"
                        required
                        options={ACADEMIC_LEVEL_OPTIONS}
                        value={educationForm.academicLevel}
                        error={educationErrors.academicLevel}
                        onChange={(event) => setEducationForm((current) => ({ ...current, academicLevel: event.target.value as AcademicLevel | "" }))}
                      />
                      <ProfileSelect
                        label="Situação"
                        required
                        options={EDUCATION_STATUS_OPTIONS}
                        value={educationForm.status}
                        error={educationErrors.status}
                        onChange={(event) => {
                          const nextStatus = event.target.value as EducationStatus | "";
                          setEducationForm((current) => ({ ...current, status: nextStatus }));
                        }}
                      />
                      <ProfileField
                        label="Curso/formação"
                        required={isDegreeRequired(educationForm.academicLevel)}
                        maxLength={PROFILE_FIELD_LIMITS.degree}
                        value={educationForm.degree}
                        error={educationErrors.degree}
                        onChange={(event) => setEducationForm((current) => ({ ...current, degree: event.target.value }))}
                      />
                      <ProfileField
                        label="Instituição"
                        required
                        maxLength={PROFILE_FIELD_LIMITS.educationInstitution}
                        value={educationForm.educationInstitution}
                        error={educationErrors.educationInstitution}
                        onChange={(event) => setEducationForm((current) => ({ ...current, educationInstitution: event.target.value }))}
                      />
                      <ProfileField
                        label="Início"
                        required
                        placeholder="MM/AAAA"
                        inputMode="numeric"
                        maxLength={7}
                        value={educationForm.startDate}
                        error={educationErrors.startDate}
                        warning={educationWarnings.startDate}
                        onChange={(event) => setEducationForm((current) => ({ ...current, startDate: maskMonthYear(event.target.value) }))}
                      />
                      <ProfileField
                        label={educationForm.status === "EM_ANDAMENTO" ? "Previsão de conclusão" : "Conclusão"}
                        required={educationForm.status === "CONCLUIDO"}
                        placeholder="MM/AAAA"
                        inputMode="numeric"
                        maxLength={7}
                        value={educationForm.endDate}
                        error={educationErrors.endDate}
                        warning={educationWarnings.endDate}
                        onChange={(event) => setEducationForm((current) => ({ ...current, endDate: maskMonthYear(event.target.value) }))}
                      />
                    </div>
                    <button onClick={() => void submitEducation()} disabled={isBusy} className={PROFILE_ADD_BUTTON}>
                      {editingEducationId === null ? <><Plus className="w-4 h-4" /> Adicionar formação</> : <><Check className="w-4 h-4" /> Salvar formação</>}
                    </button>
                    {editingEducationId !== null && (
                      <button onClick={resetEducation} disabled={isBusy} className="w-full text-sm text-muted-foreground hover:text-foreground">Cancelar edição</button>
                    )}
                  </>
                )}

                {sec.id === "cursos" && (
                  <>
                    {profile.declarations.noCourses ? (
                      <NoneDeclarationBox
                        checked
                        disabled={isBusy}
                        label="Não possuo cursos complementares"
                        hint="Declaração registrada. Desmarque para voltar a adicionar cursos."
                        onToggle={() => void handleToggleDeclaration("courses", true)}
                      />
                    ) : (
                      <>
                        {hasCourses ? (
                          profile.courses.map((item) => (
                            <div key={item.id} className={PROFILE_ITEM_CARD}>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground break-words">{item.courseName}</p>
                                {item.courseInstitution && <p className="text-xs text-muted-foreground break-words">{item.courseInstitution}</p>}
                                <p className="text-xs text-muted-foreground mt-1">
                                  {[
                                    item.workloadHours !== null ? `${item.workloadHours} h` : "",
                                    formatCoursePeriod(item),
                                  ].filter(Boolean).join(" · ")}
                                </p>
                              </div>
                              <ProfileItemActions
                                label="curso"
                                disabled={isBusy}
                                onEdit={() => startEditCourse(item)}
                                onRemove={() => void handleRemoveCourse(item.id)}
                              />
                            </div>
                          ))
                        ) : (
                          <div className="bg-muted/40 rounded-xl p-4 border border-border">
                            <p className="text-sm font-semibold text-foreground">Nenhum curso complementar adicionado</p>
                            <p className="text-xs text-muted-foreground mt-1">Adicione um curso ou declare que não possui cursos complementares.</p>
                          </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 border-2 border-dashed border-border rounded-xl p-4">
                          <ProfileField
                            label="Curso"
                            required
                            maxLength={PROFILE_FIELD_LIMITS.courseName}
                            value={courseForm.courseName}
                            error={courseErrors.courseName}
                            onChange={(event) => setCourseForm((current) => ({ ...current, courseName: event.target.value }))}
                          />
                          <ProfileField
                            label="Instituição/plataforma"
                            maxLength={PROFILE_FIELD_LIMITS.courseInstitution}
                            value={courseForm.courseInstitution}
                            error={courseErrors.courseInstitution}
                            onChange={(event) => setCourseForm((current) => ({ ...current, courseInstitution: event.target.value }))}
                          />
                          <ProfileField
                            label="Carga horária (horas)"
                            inputMode="numeric"
                            maxLength={5}
                            value={courseForm.workloadHours}
                            error={courseErrors.workloadHours}
                            onChange={(event) => setCourseForm((current) => ({ ...current, workloadHours: event.target.value.replace(/\D/g, "") }))}
                          />
                          <ProfileSelect
                            label="Situação"
                            required
                            options={COURSE_STATUS_OPTIONS}
                            value={courseForm.status}
                            error={courseErrors.status}
                            onChange={(event) => setCourseForm((current) => ({ ...current, status: event.target.value as CourseStatus | "" }))}
                          />
                          <ProfileField
                            label="Data de início"
                            placeholder="MM/AAAA"
                            inputMode="numeric"
                            maxLength={7}
                            value={courseForm.startDate}
                            error={courseErrors.startDate}
                            warning={courseWarnings.startDate}
                            onChange={(event) => setCourseForm((current) => ({ ...current, startDate: maskMonthYear(event.target.value) }))}
                          />
                          <ProfileField
                            label={courseForm.status === "EM_ANDAMENTO" ? "Previsão de conclusão" : "Conclusão"}
                            required={courseForm.status === "CONCLUIDO"}
                            placeholder="MM/AAAA"
                            inputMode="numeric"
                            maxLength={7}
                            value={courseForm.completedAt}
                            error={courseErrors.completedAt}
                            warning={courseWarnings.completedAt}
                            onChange={(event) => setCourseForm((current) => ({ ...current, completedAt: maskMonthYear(event.target.value) }))}
                          />
                        </div>
                        <button onClick={() => void submitCourse()} disabled={isBusy} className={PROFILE_ADD_BUTTON}>
                          {editingCourseId === null ? <><Plus className="w-4 h-4" /> Adicionar curso</> : <><Check className="w-4 h-4" /> Salvar curso</>}
                        </button>
                        {editingCourseId !== null && (
                          <button onClick={resetCourse} disabled={isBusy} className="w-full text-sm text-muted-foreground hover:text-foreground">Cancelar edição</button>
                        )}
                        {getNoneDeclarationState({ recordCount: profile.courses.length, declared: false }).showOption && (
                          <NoneDeclarationBox
                            checked={false}
                            disabled={isBusy}
                            label="Não possuo cursos complementares"
                            onToggle={() => void handleToggleDeclaration("courses", false)}
                          />
                        )}
                      </>
                    )}
                  </>
                )}

                {sec.id === "experiencia" && (
                  <>
                    {profile.declarations.noExperience ? (
                      <NoneDeclarationBox
                        checked
                        disabled={isBusy}
                        label="Eu ainda não possuo experiência profissional"
                        hint="Declaração registrada. Desmarque para voltar a adicionar experiências."
                        onToggle={() => void handleToggleDeclaration("experience", true)}
                      />
                    ) : (
                      <>
                        {hasExperiences ? (
                          profile.experiences.map((item) => (
                            <div key={item.id} className={PROFILE_ITEM_CARD}>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground break-words">{item.jobRole} · {item.companyName}</p>
                                <p className="text-xs text-muted-foreground mt-1">{formatProfilePeriod(item.startDate, item.endDate, item.isCurrent)}</p>
                                {item.description && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line break-words">{item.description}</p>}
                              </div>
                              <ProfileItemActions
                                label="experiência"
                                disabled={isBusy}
                                onEdit={() => startEditExperience(item)}
                                onRemove={() => void handleRemoveExperience(item.id)}
                              />
                            </div>
                          ))
                        ) : (
                          <div className="bg-muted/40 rounded-xl p-4 border border-border">
                            <p className="text-sm font-semibold text-foreground">Nenhuma experiência profissional adicionada</p>
                            <p className="text-xs text-muted-foreground mt-1">Adicione uma experiência ou declare que ainda não possui experiência profissional.</p>
                          </div>
                        )}
                        <div className="border-2 border-dashed border-border rounded-xl p-4 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                            <ProfileField
                              label="Empresa"
                              required
                              maxLength={PROFILE_FIELD_LIMITS.companyName}
                              value={experienceForm.companyName}
                              error={experienceErrors.companyName}
                              onChange={(event) => setExperienceForm((current) => ({ ...current, companyName: event.target.value }))}
                            />
                            <ProfileField
                              label="Cargo"
                              required
                              maxLength={PROFILE_FIELD_LIMITS.jobRole}
                              value={experienceForm.jobRole}
                              error={experienceErrors.jobRole}
                              onChange={(event) => setExperienceForm((current) => ({ ...current, jobRole: event.target.value }))}
                            />
                            <ProfileField
                              label="Início"
                              required
                              placeholder="MM/AAAA"
                              inputMode="numeric"
                              maxLength={7}
                              value={experienceForm.startDate}
                              error={experienceErrors.startDate}
                              warning={experienceWarnings.startDate}
                              onChange={(event) => setExperienceForm((current) => ({ ...current, startDate: maskMonthYear(event.target.value) }))}
                            />
                            <ProfileField
                              label="Fim"
                              required={!experienceForm.isCurrent}
                              placeholder="MM/AAAA"
                              inputMode="numeric"
                              maxLength={7}
                              disabled={experienceForm.isCurrent}
                              value={experienceForm.endDate}
                              error={experienceErrors.endDate}
                              warning={experienceWarnings.endDate}
                              onChange={(event) => setExperienceForm((current) => ({ ...current, endDate: maskMonthYear(event.target.value) }))}
                            />
                          </div>
                          <label className="flex items-center gap-2 text-sm text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={experienceForm.isCurrent}
                              onChange={(event) => setExperienceForm((current) => ({ ...current, isCurrent: event.target.checked, endDate: event.target.checked ? "" : current.endDate }))}
                              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                            />
                            Trabalho atualmente nesta experiência
                          </label>
                          <div>
                            <FieldArea
                              label="Descrição/responsabilidades"
                              rows={3}
                              maxLength={PROFILE_FIELD_LIMITS.description}
                              value={experienceForm.description}
                              onChange={(event) => setExperienceForm((current) => ({ ...current, description: event.target.value }))}
                            />
                            <CharCounter value={experienceForm.description} limit={PROFILE_FIELD_LIMITS.description} />
                            {experienceErrors.description && <p role="alert" className="mt-1 text-xs text-red-600">{experienceErrors.description}</p>}
                          </div>
                        </div>
                        <button onClick={() => void submitExperience()} disabled={isBusy} className={PROFILE_ADD_BUTTON}>
                          {editingExperienceId === null ? <><Plus className="w-4 h-4" /> Adicionar experiência</> : <><Check className="w-4 h-4" /> Salvar experiência</>}
                        </button>
                        {editingExperienceId !== null && (
                          <button onClick={resetExperience} disabled={isBusy} className="w-full text-sm text-muted-foreground hover:text-foreground">Cancelar edição</button>
                        )}
                        {getNoneDeclarationState({ recordCount: profile.experiences.length, declared: false }).showOption && (
                          <NoneDeclarationBox
                            checked={false}
                            disabled={isBusy}
                            label="Eu ainda não possuo experiência profissional"
                            onToggle={() => void handleToggleDeclaration("experience", false)}
                          />
                        )}
                      </>
                    )}
                  </>
                )}

                {sec.id === "habilidades" && (
                  <>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Habilidades técnicas</p>
                      {profile.declarations.noTechnicalSkills ? (
                        <NoneDeclarationBox
                          checked
                          disabled={isBusy}
                          label="Eu ainda não possuo habilidades técnicas cadastradas"
                          hint="Declaração registrada. Desmarque para voltar a adicionar habilidades técnicas."
                          onToggle={() => void handleToggleDeclaration("technicalSkills", true)}
                        />
                      ) : (
                        <>
                          <div className="flex flex-wrap gap-2">
                            {profile.technicalSkills.map(s => (
                              <UIBadge key={s.id} variant="primary" className="px-3 py-1 font-medium">
                                {s.name}
                                <button onClick={() => void handleRemoveSkill(s.id)} disabled={isBusy} className="ml-1 text-blue-700/70 hover:text-blue-900 disabled:opacity-50" aria-label={`Remover ${s.name}`}>
                                  <X className="w-3 h-3" />
                                </button>
                              </UIBadge>
                            ))}
                            {!hasTechnicalSkills && (
                              <span className="text-xs text-muted-foreground">Nenhuma habilidade técnica adicionada.</span>
                            )}
                          </div>
                          <div className="mt-3 flex flex-col sm:flex-row gap-2">
                            <Input
                              value={newTechnicalSkill}
                              maxLength={PROFILE_FIELD_LIMITS.skillName}
                              onChange={(event) => setNewTechnicalSkill(event.target.value)}
                              onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void handleAddSkill("TECHNICAL", newTechnicalSkill); } }}
                              placeholder="Adicionar habilidade técnica"
                            />
                            <Btn variant="secondary" size="sm" disabled={isBusy} onClick={() => void handleAddSkill("TECHNICAL", newTechnicalSkill)}>
                              <Plus className="w-3.5 h-3.5" /> Adicionar
                            </Btn>
                          </div>
                          <div className="mt-3">
                            <NoneDeclarationBox
                              checked={false}
                              disabled={isBusy || hasTechnicalSkills}
                              label="Eu ainda não possuo habilidades técnicas cadastradas"
                              hint={hasTechnicalSkills ? "Remova as habilidades técnicas adicionadas para poder fazer esta declaração." : undefined}
                              onToggle={() => void handleToggleDeclaration("technicalSkills", false)}
                            />
                          </div>
                        </>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Competências comportamentais</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.behavioralSkills.map(s => (
                          <UIBadge key={s.id} variant="neutral" className="border-green-100 bg-green-50 px-3 py-1 font-medium text-green-700">
                            {s.name}
                            <button onClick={() => void handleRemoveSkill(s.id)} disabled={isBusy} className="ml-1 text-green-700/70 hover:text-green-900 disabled:opacity-50" aria-label={`Remover ${s.name}`}>
                              <X className="w-3 h-3" />
                            </button>
                          </UIBadge>
                        ))}
                        {profile.behavioralSkills.length === 0 && (
                          <span className="text-xs text-muted-foreground">Nenhuma competência adicionada (pelo menos uma é necessária).</span>
                        )}
                      </div>
                      <div className="mt-3 flex flex-col sm:flex-row gap-2">
                        <Input
                          value={newBehavioralSkill}
                          maxLength={PROFILE_FIELD_LIMITS.skillName}
                          onChange={(event) => setNewBehavioralSkill(event.target.value)}
                          onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void handleAddSkill("BEHAVIORAL", newBehavioralSkill); } }}
                          placeholder="Adicionar competência comportamental"
                        />
                        <Btn variant="secondary" size="sm" disabled={isBusy} onClick={() => void handleAddSkill("BEHAVIORAL", newBehavioralSkill)}>
                          <Plus className="w-3.5 h-3.5" /> Adicionar
                        </Btn>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </Card>
        ))}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Btn variant="outline" onClick={() => onNavigate("dashboard")}>← Dashboard</Btn>
          <Btn variant="primary" onClick={() => onNavigate("interview-setup")}>
            <span className="hidden sm:inline">Próximo: Nova entrevista</span>
            <span className="sm:hidden">Nova entrevista</span>
            <ChevronRight className="w-4 h-4" />
          </Btn>
        </div>
      </div>
    </AuthLayout>
  );
}

// ─── Screen 6: Preparação ─────────────────────────────────────────────────────

// Protege TODAS as etapas do fluxo de realização da entrevista (setup,
// consentimento, modo de avaliação, preparação, perguntas, revisão e envio):
// rota por URL, continuação de rascunho e qualquer outro caminho passam por
// aqui. A decisão vem de `isInterviewReady`/`missingObjectiveFields` da API (só o
// Objetivo Profissional libera a entrevista; as demais seções do perfil não
// bloqueiam) — o Front não reimplementa a regra de completude. (A checagem equivalente no Back da
// entrevista será feita junto com o Fluxo 03.)
function InterviewProfileGuard({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { status, profile, error, reason, reload } = useCandidateProfile();

  if (status === "ready" && profile?.isInterviewReady) {
    return <Outlet />;
  }

  return (
    <AuthLayout
      current="interview-setup"
      onNavigate={onNavigate}
      title="Nova entrevista"
      subtitle="Complete seu contexto profissional para começar"
    >
      <Card className="w-full max-w-2xl p-5 sm:p-6">
        {status === "loading" && (
          <div role="status" aria-live="polite" className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <Spinner size="md" /> Verificando seu perfil profissional...
          </div>
        )}
        {status === "error" && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-foreground">Não foi possível verificar seu perfil</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{error}</p>
              <div className="mt-5">
                {reason === "unauthorized" ? (
                  <Btn variant="primary" onClick={() => window.location.reload()}>Recarregar página</Btn>
                ) : (
                  <Btn variant="primary" onClick={() => void reload()}>Tentar novamente</Btn>
                )}
              </div>
            </div>
          </div>
        )}
        {status === "ready" && profile && !profile.isInterviewReady && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-foreground">Complete seu Objetivo Profissional para iniciar uma entrevista</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Precisamos do seu objetivo profissional para contextualizar melhor sua entrevista. Ainda falta preencher:
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-foreground">
                {describeMissingObjectiveFields(profile.missingObjectiveFields).map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
              <div className="mt-5">
                <Btn variant="primary" onClick={() => onNavigate("profile")}>
                  Completar perfil
                </Btn>
              </div>
            </div>
          </div>
        )}
      </Card>
    </AuthLayout>
  );
}

function DraftWizardGuard({ current, onNavigate }: { current: Screen; onNavigate: (s: Screen) => void }) {
  return (
    <AuthLayout current={current} onNavigate={onNavigate} title="Nova entrevista" subtitle="Contexto da vaga necessário">
      <Card className="w-full max-w-2xl p-6 text-center">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h3 className="font-bold text-foreground mb-2">Configure a entrevista antes de continuar</h3>
        <p className="text-sm text-muted-foreground mb-5">
          Cole a URL da vaga, confirme o contexto e gere as perguntas antes de continuar.
        </p>
        <Btn variant="primary" onClick={() => onNavigate("interview-setup")}>Ir para Nova entrevista</Btn>
      </Card>
    </AuthLayout>
  );
}

function PrepScreen({ onNavigate, draft }: { onNavigate: (s: Screen) => void; draft: InterviewDraft }) {
  const TIPS = [
    { icon: Monitor,   title: "Ambiente",  desc: "Escolha um local tranquilo para se concentrar nas respostas." },
    { icon: MessageSquare, title: "Texto", desc: "Responda com clareza, exemplos concretos e frases completas." },
    { icon: Mic,       title: "Ditado",     desc: "Se o navegador suportar, use voz apenas para preencher o texto. O áudio não será armazenado." },
    { icon: Lightbulb, title: "Conteúdo",  desc: "Revise a descrição da vaga e pense em exemplos reais das suas experiências. Use o método STAR." },
  ];
  const context = draft.context;

  if (!context || draft.questions.length === 0) {
    return <DraftWizardGuard current="prep" onNavigate={onNavigate} />;
  }

  if (!draft.evaluationMode) {
    return (
      <AuthLayout current="prep" onNavigate={onNavigate} title="Modalidade de avaliação" subtitle="Escolha necessária antes das orientações">
        <Card className="w-full max-w-2xl p-6 text-center">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h3 className="font-bold text-foreground mb-2">Escolha a modalidade antes de continuar</h3>
          <p className="text-sm text-muted-foreground mb-5">
            A modalidade de avaliação precisa ser definida antes de iniciar as perguntas.
          </p>
          <Btn variant="primary" onClick={() => onNavigate("evaluation-mode")}>Escolher modalidade</Btn>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout current="prep" onNavigate={onNavigate} title="Orientações da Entrevista" subtitle="Leia as orientações antes de responder">
      <div className="w-full">
        {/* Context card */}
        <Card className="p-4 sm:p-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <p className="text-xs text-muted-foreground font-medium">Contexto confirmado</p>
                <EvaluationModeBadge mode={draft.evaluationMode} />
              </div>
              <p className="font-bold text-foreground">{context?.title ?? "Vaga em análise"}</p>
              <p className="text-sm text-muted-foreground">{context?.company ?? "Empresa não informada"}</p>
            </div>
          </div>
        </Card>

        {/* Interview info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-7">
          {[
            { icon: MessageSquare, label: "5 perguntas",    desc: "Contextualizadas pela vaga" },
            { icon: Clock,         label: "No seu ritmo",    desc: "Responda com calma" },
            { icon: FileText,      label: "Respostas textuais", desc: "Digite ou dite sem armazenar áudio" },
          ].map(i => (
            <Card key={i.label} className="p-4 flex gap-3 items-center">
              <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                <i.icon className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">{i.label}</p>
                <p className="text-xs text-muted-foreground">{i.desc}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Tips */}
        <Card className="p-5 sm:p-6 mb-6">
          <h3 className="font-bold text-foreground mb-5 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" /> Dicas para uma boa entrevista
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TIPS.map(t => (
              <div key={t.title} className="flex gap-3 p-4 bg-muted/40 rounded-xl">
                <div className="w-8 h-8 bg-white rounded-lg border border-border flex items-center justify-center shrink-0">
                  <t.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm mb-1">{t.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* STAR method */}
        <Card className="p-5 sm:p-6 mb-7">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Star className="w-4 h-4 text-blue-600" /> Método STAR para suas respostas
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { l: "S", t: "Situação",  d: "Descreva o contexto e a situação em que esteve" },
              { l: "T", t: "Tarefa",    d: "Qual era o desafio ou responsabilidade sua?" },
              { l: "A", t: "Ação",      d: "O que você fez especificamente para resolver?" },
              { l: "R", t: "Resultado", d: "Qual foi o resultado concreto da sua ação?" },
            ].map(s => (
              <div key={s.l} className="text-center">
                <div className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold text-lg mx-auto mb-2">{s.l}</div>
                <p className="font-semibold text-foreground text-xs mb-1">{s.t}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </Card>

        <Alert variant="info" className="mb-7 flex gap-3 rounded-2xl p-4">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">
            <strong>Importante:</strong> responda com calma e revise suas respostas antes de concluir o envio.
          </p>
        </Alert>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Btn variant="outline" onClick={() => onNavigate("evaluation-mode")}>Voltar</Btn>
          <Btn variant="primary" size="lg" onClick={() => onNavigate("interview")}>
            Iniciar perguntas
            <ChevronRight className="w-5 h-5" />
          </Btn>
        </div>
      </div>
    </AuthLayout>
  );
}

// ─── Screen 8: Entrevista Simulada ────────────────────────────────────────────

function getQuestionIndexFromSearchParam(value: string | null, questionCount: number) {
  const questionNumber = Number(value);
  if (!Number.isInteger(questionNumber) || questionNumber < 1 || questionNumber > questionCount) {
    return 0;
  }
  return questionNumber - 1;
}

// Entrevista enviada/encerrada em outro dispositivo: aviso claro + volta ao Dashboard (sem redirecionar sozinho).
function StaleInterviewNotice({ message, status, onBack }: { message: string; status?: string | null; onBack: () => void }) {
  // Cancelada é terminal/destrutiva: identidade própria em vermelho. Enviada em outro
  // dispositivo e demais avisos seguem em âmbar.
  const tone = staleNoticeTone(status);
  const cancelled = tone === "error";
  return (
    <Alert variant={tone} role="alert" data-tone={tone} className="mb-4 flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <AlertCircle className={`mt-0.5 h-4 w-4 shrink-0 ${cancelled ? "text-red-600" : "text-amber-600"}`} />
        <p className={`text-sm font-medium ${cancelled ? "text-red-800" : "text-amber-800"}`}>{message}</p>
      </div>
      <Btn variant="outline" size="sm" onClick={onBack}>Voltar ao Dashboard</Btn>
    </Alert>
  );
}

function InterviewScreen({
  onNavigate,
  draft,
  setDraft,
  onQuestionIndexChange,
  candidateId,
  restoredQuestionIndex,
  restoredHighestIndex,
  registerLeaveFlush,
  registerStopActivity,
  onStaleExit,
}: {
  onNavigate: (s: Screen) => void;
  draft: InterviewDraft;
  setDraft: Dispatch<SetStateAction<InterviewDraft>>;
  // Cancelamento real: o App raiz manda parar autosave e ditado antes de limpar o estado local.
  registerStopActivity?: (stop: (() => void) | null) => void;
  onQuestionIndexChange?: (index: number, highestReached: number) => void;
  // "Sair e continuar depois": o App raiz chama isto para tentar enviar o rascunho pendente ao Back.
  registerLeaveFlush?: (flush: (() => Promise<void>) | null) => void;
  // Entrevista já enviada em outro dispositivo: descarta o estado local do wizard e volta ao Dashboard.
  onStaleExit?: () => void;
  // Namespace local dos rascunhos de resposta (UX); o dono real vem do JWT no Back.
  candidateId: string;
  // Pergunta salva quando a página é recarregada DENTRO desta etapa (undefined ao chegar de outra tela).
  restoredQuestionIndex?: number;
  // Maior pergunta já alcançada antes do reload (só UX; define o que o painel mantém clicável).
  restoredHighestIndex?: number;
}) {
  const [searchParams] = useSearchParams();
  const questions = draft.questions;
  const targetQuestionIndex = getQuestionIndexFromSearchParam(searchParams.get("question"), questions.length);
  const [qIdx, setQIdx] = useState(() =>
    resolveInitialQuestionIndex({ restoredIndex: restoredQuestionIndex, urlIndex: targetQuestionIndex, questionCount: questions.length }),
  );
  // Maior pergunta já alcançada (só cresce). O estado de cada item do painel deriva disto + da resposta.
  const [storedHighest, setStoredHighest] = useState<number | undefined>(restoredHighestIndex);
  // Pergunta cujo rascunho local já foi conferido (ver efeito de restauração).
  const [draftCheckedFor, setDraftCheckedFor] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const [dictating, setDictating] = useState(false);
  const advancingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [syncState, setSyncState] = useState<"loading" | "ready" | "error">(draft.interviewId ? "loading" : "ready");
  const [syncError, setSyncError] = useState("");
  // Última resposta CONFIRMADA pelo Back, por pergunta (evita PUT desnecessário).
  const persistedAnswersRef = useRef<Record<string, string>>({});
  const recognitionRef = useRef<InstanceType<SpeechRecognitionConstructor> | null>(null);
  // Rascunho do Back por pergunta (NÃO é resposta). `draft.answers` guarda SÓ a
  // resposta OFICIAL confirmada; o texto em edição vive em `workingText`.
  const remoteDraftsRef = useRef<Record<string, RemoteDraft>>({});
  const workingRef = useRef<Record<string, string>>({});
  const [workingText, setWorkingText] = useState<Record<string, string>>({});
  const controllerRef = useRef<AnswerDraftAutosave | null>(null);
  const [autosaveSnap, setAutosaveSnap] = useState<AnswerAutosaveSnapshot | null>(null);
  const [savedNoticeVisible, setSavedNoticeVisible] = useState(false);
  const savedNoticeRef = useRef<SavedNotice | null>(null);
  const question = questions[qIdx];
  const answer = question ? workingText[question.id] ?? draft.answers[question.id] ?? "" : "";
  const answerLength = answer.length;
  const highestReached = deriveHighestReachedIndex({
    storedHighest,
    currentIndex: qIdx,
    answeredIndexes: questions.flatMap((item, index) => (isValidInterviewAnswer(draft.answers[item.id]) ? [index] : [])),
    // Rascunho do Back (de qualquer dispositivo) prova que a pergunta já foi aberta; NÃO conta como resposta.
    draftedIndexes: questions.flatMap((item, index) => (remoteDraftsRef.current[item.id]?.text?.trim() ? [index] : [])),
    questionCount: questions.length,
  });
  const progress = questions.length ? ((qIdx + 1) / questions.length) * 100 : 0;
  const supportsSpeech = typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  // Sessão em mais de um dispositivo: revalida o status (focus / aba visível). Se a
  // entrevista deixou de ser IN_PROGRESS, o autosave é travado e a edição bloqueada;
  // o texto local NÃO é apagado.
  const sessionGuard = useInterviewSessionGuard({
    interviewId: draft.interviewId,
    enabled: syncState === "ready",
    // O polling abaixo já sincroniza ao voltar foco/visibilidade: sem revalidação duplicada.
    revalidateOnFocus: false,
    onStale: () => {
      controllerRef.current?.lock();
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setDictating(false);
    },
  });
  const stale = sessionGuard.stale;

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  // "Sair e continuar depois" precisa conseguir enviar o rascunho que ainda está no debounce.
  useEffect(() => {
    if (!registerLeaveFlush) return undefined;
    registerLeaveFlush(async () => {
      // "Sair e continuar depois": este dispositivo para de sincronizar antes de enviar o rascunho.
      syncPausedRef.current = true;
      try {
        await controllerRef.current?.flush();
      } finally {
        // Se o usuário desistir de sair, o polling volta; ao sair de fato o wizard desmonta e o limpa.
        syncPausedRef.current = false;
      }
    });
    return () => registerLeaveFlush(null);
  }, [registerLeaveFlush]);

  useEffect(() => {
    if (!registerStopActivity) return undefined;
    registerStopActivity(() => {
      syncPausedRef.current = true;
      controllerRef.current?.lock();
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setDictating(false);
    });
    return () => registerStopActivity(null);
  }, [registerStopActivity]);

  // `?question=` só move a pergunta quando MUDA depois da montagem; na montagem o
  // índice inicial já foi resolvido acima (inclusive o restaurado após F5).
  const seenQuestionParamRef = useRef(searchParams.get("question"));
  useEffect(() => {
    const param = searchParams.get("question");
    if (seenQuestionParamRef.current === param) return;
    seenQuestionParamRef.current = param;
    setQIdx((current) => current === targetQuestionIndex ? current : targetQuestionIndex);
  }, [searchParams, targetQuestionIndex]);

  // Ao entrar na etapa: relê perguntas/respostas CONFIRMADAS do Back (fonte da
  // verdade). Nada do localStorage é enviado ao Back aqui; falha bloqueia a tela
  // com opção de tentar de novo.
  const interviewIdForSync = draft.interviewId;
  const syncWithServer = useCallback(async () => {
    if (!interviewIdForSync) return;
    setSyncState("loading");
    setSyncError("");
    const loaded = await getRealQuestionsState(interviewIdForSync);
    if (!loaded.ok) {
      if (loaded.reason === "not_in_progress") sessionGuard.markStale(loaded.interviewStatus);
      setSyncError(loaded.message);
      setSyncState("error");
      return;
    }
    // Entrar numa entrevista que outro dispositivo já enviou: abre bloqueada (somente leitura).
    if (!isInterviewEditable(loaded.data.interviewStatus)) {
      sessionGuard.markStale(loaded.data.interviewStatus ?? undefined);
    }
    const serverAnswers: Record<string, string> = {};
    loaded.data.questions.forEach((item) => {
      persistedAnswersRef.current[item.id] = item.answer ?? "";
      remoteDraftsRef.current[item.id] = {
        text: item.draftText,
        version: item.draftVersion,
        updatedAt: item.draftUpdatedAt,
      };
      if (item.answer) serverAnswers[item.id] = item.answer;
    });
    // Nova leitura do Back: o texto em edição é resolvido de novo (ver restauração).
    controllerRef.current?.destroy();
    controllerRef.current = null;
    workingRef.current = {};
    setWorkingText({});
    setDraftCheckedFor(null);
    setDraft((current) => ({
      ...current,
      questions: loaded.data.questions.map(({ id, type, text }) => ({ id, type, text })),
      answers: serverAnswers,
    }));
    setSyncState("ready");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewIdForSync, setDraft]);

  useEffect(() => {
    void syncWithServer();
  }, [syncWithServer]);

  const answerDraftScope = (questionId: string) => ({
    candidateId,
    interviewId: draft.interviewId ?? "",
    questionId,
  });

  // RESTAURAÇÃO ao abrir uma pergunta (rascunho ≠ resposta). Precedência
  // (ver `resolveRestoredAnswer`): resposta oficial do Back é a base; o rascunho
  // local só vale se nasceu dessa mesma resposta e não é mais velho que o do Back;
  // senão vale o rascunho do Back (o que atravessa dispositivos); senão a oficial.
  // Nada disso marca a pergunta como respondida.
  useEffect(() => {
    if (syncState !== "ready" || !question || !draft.interviewId) return;
    if (draftCheckedFor === question.id) return;
    const interviewId = draft.interviewId;
    const questionId = question.id;
    const scope = answerDraftScope(questionId);
    const official = persistedAnswersRef.current[questionId] ?? "";
    const remote = remoteDraftsRef.current[questionId] ?? { text: null, version: 0, updatedAt: null };
    const resolved = resolveRestoredAnswer({ official, remote, local: getAnswerDraft(scope) });
    if (resolved.discardLocal) clearAnswerDraft(scope);

    controllerRef.current?.destroy();
    const controller: AnswerDraftAutosave = new AnswerDraftAutosave({
      scope,
      storage: safeLocalStorage(),
      save: async (text, version) => {
        const result = await saveRealAnswerDraft(interviewId, questionId, text, version);
        if (result.ok) {
          return {
            ok: true,
            data: { text: result.data.draftText, version: result.data.draftVersion, updatedAt: result.data.draftUpdatedAt },
          };
        }
        if (result.reason === "conflict" && result.conflict) {
          return {
            ok: false,
            reason: "conflict",
            message: result.message,
            conflict: {
              text: result.conflict.draftText,
              version: result.conflict.draftVersion,
              updatedAt: result.conflict.draftUpdatedAt,
            },
          };
        }
        if (result.reason === "not_in_progress") sessionGuard.markStale(result.interviewStatus);
        return { ok: false, reason: result.reason, message: result.message };
      },
      onChange: (snapshot) => {
        if (controllerRef.current !== controller) return;
        // Houve gravação deste dispositivo: uma leitura do polling iniciada antes pode estar velha.
        if (snapshot.saving || snapshot.remoteVersion !== remoteDraftsRef.current[snapshot.questionId]?.version) {
          localWriteEpochRef.current += 1;
        }
        remoteDraftsRef.current[snapshot.questionId] = controller.getRemote();
        setAutosaveSnap(snapshot);
      },
    });
    controllerRef.current = controller;
    workingRef.current = { ...workingRef.current, [questionId]: resolved.text };
    setWorkingText(workingRef.current);
    controller.load({ official, text: resolved.text, remote });
    // Sessão já stale (entrevista enviada em outro dispositivo): nenhuma gravação nasce.
    if (sessionGuard.stale) controller.lock();
    setDraftCheckedFor(questionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncState, question?.id, draftCheckedFor]);

  useEffect(() => {
    const notice = new SavedNotice(setSavedNoticeVisible);
    savedNoticeRef.current = notice;
    return () => {
      notice.destroy();
      savedNoticeRef.current = null;
      controllerRef.current?.destroy();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    savedNoticeRef.current?.update(autosaveSnap?.status === "saved" ? "saved" : "dirty");
  }, [autosaveSnap]);

  // Texto em edição: estado local + (se a pergunta tem controlador) cópia local
  // imediata e autosave do rascunho. Nunca grava a resposta oficial.
  const setWorking = (questionId: string, value: string) => {
    workingRef.current = { ...workingRef.current, [questionId]: value };
    setWorkingText(workingRef.current);
    const controller = controllerRef.current;
    if (controller && controller.questionId === questionId) controller.edit(value);
  };

  // O outro dispositivo alterou o rascunho: relê o Back e recomeça a partir dele.
  const useRemoteVersion = async () => {
    if (!question || !draft.interviewId) return;
    const loaded = await getRealQuestions(draft.interviewId);
    if (!loaded.ok) {
      toast.error(loaded.message);
      return;
    }
    const item = loaded.data.find((entry) => entry.id === question.id);
    if (!item) return;
    persistedAnswersRef.current[item.id] = item.answer ?? "";
    remoteDraftsRef.current[item.id] = { text: item.draftText, version: item.draftVersion, updatedAt: item.draftUpdatedAt };
    setDraft((current) => ({ ...current, answers: withOfficialAnswer(current.answers, item.id, item.answer ?? "") }));
    clearAnswerDraft(answerDraftScope(item.id));
    const rest = { ...workingRef.current };
    delete rest[item.id];
    workingRef.current = rest;
    setWorkingText(rest);
    setDraftCheckedFor(null);
  };

  // SINCRONIZAÇÃO ENTRE DISPOSITIVOS (polling leve, sem UI): relê entrevista/perguntas do Back
  // e reconcilia com o estado local. Back manda em status, resposta oficial e versão do rascunho;
  // o local protege texto não sincronizado (ver `AnswerDraftAutosave.receiveRemote`).
  const syncPausedRef = useRef(false);
  const localWriteEpochRef = useRef(0);
  const [, bumpSyncTick] = useState(0);
  const pollRemoteState = async (): Promise<InterviewSyncResult> => {
    const interviewId = draft.interviewId;
    if (!interviewId || syncPausedRef.current || sessionGuard.stale) return "ok";
    // Operação do usuário em curso (confirmar/avançar): a leitura chegaria velha; o próximo ciclo reavalia.
    if (advancingRef.current) return "ok";
    const epochAtStart = localWriteEpochRef.current;
    const loaded = await getRealQuestionsState(interviewId);
    if (!loaded.ok) {
      if (loaded.reason === "not_in_progress") {
        sessionGuard.markStale(loaded.interviewStatus);
        return "stop";
      }
      // Rede/servidor: silencioso, estado local intacto, tenta no próximo ciclo (com intervalo maior).
      return "error";
    }
    if (syncPausedRef.current || advancingRef.current) return "ok";
    if (!isInterviewEditable(loaded.data.interviewStatus)) {
      sessionGuard.markStale(loaded.data.interviewStatus ?? undefined);
      return "stop";
    }
    // Este dispositivo gravou durante a leitura: ela pode estar velha; o próximo ciclo reavalia.
    if (localWriteEpochRef.current !== epochAtStart) return "ok";
    const emptyDraft: RemoteDraft = { text: null, version: 0, updatedAt: null };
    const changes = diffServerState(loaded.data.questions, (id) => ({
      answer: persistedAnswersRef.current[id] ?? "",
      draft: remoteDraftsRef.current[id] ?? emptyDraft,
    }));
    if (changes.length === 0) return "ok";

    const officialUpdates: Record<string, string> = {};
    let touched = false;
    for (const change of changes) {
      const controller = controllerRef.current;
      if (controller && controller.questionId === change.id) {
        // Pergunta aberta: adota em silêncio SÓ sem edição local; com edição, abre o conflito já existente.
        const outcome = controller.receiveRemote({ answer: change.answer, draft: change.draft });
        if (outcome === "deferred" || outcome === "unchanged") continue;
        persistedAnswersRef.current[change.id] = change.answer;
        remoteDraftsRef.current[change.id] = change.draft;
        officialUpdates[change.id] = change.answer;
        if (outcome === "adopted") {
          workingRef.current = { ...workingRef.current, [change.id]: controller.getText() };
          setWorkingText(workingRef.current);
        }
        touched = true;
        continue;
      }
      // Pergunta fechada com texto local ainda não sincronizado: não troca a base (a restauração
      // e o optimistic locking decidem ao abrir). Nunca sobrescreve em silêncio.
      const local = getAnswerDraft(answerDraftScope(change.id));
      if (local && local.text.trim() !== change.answer.trim()) continue;
      persistedAnswersRef.current[change.id] = change.answer;
      remoteDraftsRef.current[change.id] = change.draft;
      officialUpdates[change.id] = change.answer;
      touched = true;
    }
    if (touched) {
      setDraft((current) => {
        let answers = current.answers;
        for (const [id, value] of Object.entries(officialUpdates)) {
          if ((answers[id] ?? "") !== value) answers = withOfficialAnswer(answers, id, value);
        }
        return answers === current.answers ? current : { ...current, answers };
      });
      bumpSyncTick((tick) => tick + 1);
    }
    return "ok";
  };
  useInterviewSyncPolling({
    enabled: syncState === "ready" && !sessionGuard.stale && Boolean(draft.interviewId),
    sync: pollRemoteState,
  });

  // CONFIRMA a resposta OFICIAL da pergunta no Back (única ação que muda
  // answer_text). Antes, o autosave do rascunho é quietado para não concorrer
  // com este PUT. Só retorna true quando o Back confirmou (ou já estava igual):
  // em erro NÃO avança, mantém rascunho local/Back e mostra a mensagem.
  const persistAnswer = async (target: InterviewQuestion, value: string): Promise<boolean> => {
    const interviewId = draft.interviewId;
    if (!interviewId) {
      setSaveError("Entrevista não encontrada. Volte ao início e tente novamente.");
      return false;
    }
    if (sessionGuard.stale) {
      setSaveError(describeStaleInterview(sessionGuard.staleStatus));
      return false;
    }
    const controller = controllerRef.current?.questionId === target.id ? controllerRef.current : null;
    if (controller?.getSnapshot().status === "conflict") {
      const message = "Resolva o conflito desta pergunta (manter seu texto ou usar a versão do outro dispositivo) antes de avançar.";
      setSaveError(message);
      toast.error(message);
      return false;
    }
    const outcome = await confirmOfficialAnswer({
      value,
      persisted: persistedAnswersRef.current[target.id] ?? "",
      controller,
      knownVersion: () => remoteDraftsRef.current[target.id]?.version ?? 0,
      hasRemoteDraft: () => (remoteDraftsRef.current[target.id]?.text ?? "").trim() !== "",
      saveAnswer: async (normalized, draftVersion) => {
        const result = await saveRealAnswer(interviewId, target.id, normalized, draftVersion);
        if (result.ok) return { ok: true, data: { answer: result.data.answer, draftVersion: result.data.draftVersion } };
        if (result.reason === "conflict" && result.conflict) {
          return { ok: false, reason: "conflict", message: result.message, conflict: result.conflict };
        }
        if (result.reason === "not_in_progress") {
          return { ok: false, reason: "not_in_progress", message: result.message, interviewStatus: result.interviewStatus };
        }
        return { ok: false, message: result.message };
      },
      clearLocalDraft: () => clearAnswerDraft(answerDraftScope(target.id)),
    });
    if (!outcome.ok) {
      if (outcome.reason === "not_in_progress") {
        // Enviada em outro dispositivo: bloqueia a edição; o texto local fica intacto.
        sessionGuard.markStale(outcome.interviewStatus as RealInterviewStatus | undefined);
        return false;
      }
      if (outcome.reason === "conflict") {
        // Conflito real: a resposta vigente no Back vira a oficial conhecida; o texto
        // local permanece e o usuário decide (nada foi sobrescrito).
        const { conflict } = outcome;
        persistedAnswersRef.current[target.id] = conflict.answer ?? "";
        remoteDraftsRef.current[target.id] = { text: conflict.draftText, version: conflict.draftVersion, updatedAt: conflict.draftUpdatedAt };
        setDraft((current) => ({ ...current, answers: withOfficialAnswer(current.answers, target.id, conflict.answer ?? "") }));
        setSaveError("");
        toast.error("Esta resposta foi alterada em outro dispositivo. Escolha qual versão manter.");
        return false;
      }
      setSaveError(outcome.message);
      toast.error(outcome.message);
      return false;
    }
    // Back confirmou: ele é a resposta oficial (e já limpou o rascunho dela).
    localWriteEpochRef.current += 1;
    persistedAnswersRef.current[target.id] = outcome.answer;
    if (outcome.draftVersion !== null) {
      // Rascunho resolvido no Back: a versão devolvida é a nova base (nada reaparece).
      remoteDraftsRef.current[target.id] = { text: null, version: outcome.draftVersion, updatedAt: null };
    }
    setDraft((current) => ({
      ...current,
      answers: withOfficialAnswer(current.answers, target.id, outcome.answer),
    }));
    setSaveError("");
    return true;
  };

  // Executa uma ação que sai da pergunta atual só depois de salvá-la.
  const withSavedAnswer = async (action: () => void) => {
    if (advancingRef.current || !question || sessionGuard.stale) return;
    advancingRef.current = true;
    setSaving(true);
    stopDictation();
    try {
      if (await persistAnswer(question, answer)) action();
    } finally {
      advancingRef.current = false;
      setSaving(false);
    }
  };

  useEffect(() => {
    onQuestionIndexChange?.(qIdx, highestReached);
  }, [onQuestionIndexChange, qIdx, highestReached]);

  useEffect(() => {
    setStoredHighest((current) => (current !== undefined && current >= highestReached ? current : highestReached));
  }, [highestReached]);

  // Entrada na etapa e troca de pergunta: volta ao topo da tela.
  useEffect(() => {
    scrollPageToTop();
  }, [qIdx]);

  const updateAnswer = (value: string) => {
    if (!question) return;
    const normalizedValue = normalizeInterviewAnswer(value);
    setWorking(question.id, normalizedValue);
    if (isValidInterviewAnswer(normalizedValue)) setValidationMessage("");
    setSaveError("");
  };

  const stopDictation = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setDictating(false);
  };

  const toggleDictation = () => {
    if (!question) return;
    if (!supportsSpeech) {
      setSpeechError(SPEECH_UNSUPPORTED_MESSAGE);
      return;
    }
    if (!isSpeechContextSecure(window.isSecureContext)) {
      setSpeechError(SPEECH_INSECURE_CONTEXT_MESSAGE);
      return;
    }
    if (dictating) {
      stopDictation();
      return;
    }

    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) return;
    let recognition: InstanceType<SpeechRecognitionConstructor>;
    try {
      recognition = new Recognition();
    } catch {
      setSpeechError(SPEECH_GENERIC_ERROR_MESSAGE);
      return;
    }
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = false;
    // Acrescenta SEMPRE ao valor mais recente da resposta (atualização funcional),
    // nunca ao `answer` capturado quando o ditado começou: o que o usuário digitar
    // durante o ditado é preservado. `event.results` é cumulativo no modo contínuo,
    // então só os resultados novos (desde o último evento) são acrescentados.
    const dictationQuestionId = question.id;
    let processedResults = 0;
    recognition.onresult = (event) => {
      const { transcript, processed } = getNewTranscript(event.results, processedResults);
      processedResults = processed;
      if (!transcript) return;
      const base = workingRef.current[dictationQuestionId] ?? persistedAnswersRef.current[dictationQuestionId] ?? "";
      const next = normalizeInterviewAnswer(appendDictation(base, transcript, ANSWER_MAX_CHARS));
      if (next === base) return;
      setWorking(dictationQuestionId, next);
      setValidationMessage("");
    };
    // Erro e fim sempre devolvem o estado ao normal. Eventos de uma instância
    // antiga (já parada ou substituída) são ignorados para não afetar a atual.
    recognition.onerror = (event) => {
      if (recognitionRef.current !== recognition) return;
      recognitionRef.current = null;
      setDictating(false);
      const message = getSpeechErrorMessage(event?.error);
      if (message) setSpeechError(message);
    };
    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return;
      recognitionRef.current = null;
      setDictating(false);
    };
    recognitionRef.current = recognition;
    setSpeechError("");
    setDictating(true);
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setDictating(false);
      setSpeechError(SPEECH_GENERIC_ERROR_MESSAGE);
    }
  };

  // Avançar = salvar a resposta atual no Back e só então mudar de pergunta.
  const goNext = async () => {
    if (advancingRef.current) return;
    if (!isValidInterviewAnswer(answer)) {
      setValidationMessage("Responda a pergunta atual antes de avançar.");
      toast.error("Responda a pergunta atual antes de avançar.");
      return;
    }
    await withSavedAnswer(() => {
      if (qIdx < questions.length - 1) {
        setQIdx(qIdx + 1);
        setValidationMessage("");
      } else {
        // A pergunta atual acabou de ser confirmada; as demais valem pela resposta OFICIAL.
        const confirmedAnswers = withOfficialAnswer(draft.answers, question.id, normalizeInterviewAnswer(answer).trim());
        const pendingIndex = questions.findIndex((item) => !isValidInterviewAnswer(confirmedAnswers[item.id]));
        if (pendingIndex >= 0) {
          setQIdx(pendingIndex);
          setValidationMessage("Responda todas as perguntas antes de revisar.");
          toast.error("Responda todas as perguntas antes de revisar.");
        } else {
          // Revalida o status antes de ir para a revisão (outro dispositivo pode ter enviado).
          void sessionGuard.revalidateNow().then((editable) => {
            if (editable) onNavigate("review");
          });
        }
      }
    });
  };

  if (!draft.context || !question || !draft.interviewId) {
    return <DraftWizardGuard current="interview" onNavigate={onNavigate} />;
  }

  if (!draft.evaluationMode) {
    return (
      <AuthLayout current="interview" onNavigate={onNavigate} title="Modalidade de avaliação" subtitle="Escolha necessária antes das perguntas">
        <Card className="w-full max-w-2xl p-6 text-center">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h3 className="font-bold text-foreground mb-2">Escolha a modalidade antes de responder</h3>
          <p className="text-sm text-muted-foreground mb-5">
            A entrevista só pode iniciar depois da escolha entre avaliação por IA ou avaliação humana.
          </p>
          <Btn variant="primary" onClick={() => onNavigate("evaluation-mode")}>Escolher modalidade</Btn>
        </Card>
      </AuthLayout>
    );
  }

  if (syncState !== "ready") {
    return (
      <AuthLayout current="interview" onNavigate={onNavigate} title="Responder Perguntas" subtitle={`${draft.context.title} · ${draft.context.company}`}>
        <Card className="w-full max-w-2xl p-6 text-center">
          {syncState === "loading" ? (
            <>
              <Spinner />
              <p className="text-sm text-muted-foreground mt-3">Carregando sua entrevista...</p>
            </>
          ) : (
            <>
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <h3 className="font-bold text-foreground mb-2">Não foi possível carregar sua entrevista</h3>
              <p className="text-sm text-muted-foreground mb-5">{syncError}</p>
              <Btn variant="primary" onClick={() => void syncWithServer()}>Tentar novamente</Btn>
            </>
          )}
        </Card>
      </AuthLayout>
    );
  }

  // Navegação entre perguntas: regra única, usada pelo painel detalhado (sm+) e pelo compacto (mobile).
  // "Respondida/Pendente" (resposta) é separado de "Bloqueada" (nunca alcançada): só esta última não abre.
  const navStateAt = (item: (typeof questions)[number], index: number) =>
    getQuestionNavState({
      index,
      currentIndex: qIdx,
      highestReached,
      answered: isValidInterviewAnswer(draft.answers[item.id]),
    });
  const openQuestion = (index: number) => {
    void withSavedAnswer(() => setQIdx(index));
  };
  // Cancelada em outro dispositivo: SÓ visual (a pergunta aberta vira "foto" somente leitura).
  const cancelled = stale && isCancelledSession(sessionGuard.staleStatus);
  // Contador/indicadores: SÓ a resposta OFICIAL (draft.answers) conta como respondida.
  const answeredCount = questions.filter((item) => isValidInterviewAnswer(draft.answers[item.id])).length;
  const syncSnap = autosaveSnap && autosaveSnap.questionId === question.id ? autosaveSnap : null;
  const syncLabel = syncSnap
    ? describeAnswerSync({ status: syncSnap.status === "saved" && !savedNoticeVisible ? "clean" : syncSnap.status })
    : null;

  return (
    <AuthLayout current="interview" onNavigate={onNavigate} title="Responder Perguntas" subtitle={`${draft.context.title} · ${draft.context.company}`}>
      <div className="mb-2 min-w-0 sm:hidden">
        <p className="break-words text-sm font-bold text-foreground">{draft.context.title}</p>
        <p className="break-words text-xs text-muted-foreground">{draft.context.company}</p>
      </div>
      <div className="mb-3">
        <EvaluationModeBadge mode={draft.evaluationMode} />
      </div>
      <div className="w-full bg-muted rounded-full h-1 mb-5">
        <div className="bg-primary h-1 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 space-y-4">
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <UIBadge variant="primary">{question.type}</UIBadge>
              <span className="text-xs text-muted-foreground">Pergunta {qIdx + 1} de {questions.length}</span>
            </div>
            <h3 className="text-lg font-bold text-foreground leading-relaxed mb-5">{question.text}</h3>
            {stale && (
              <StaleInterviewNotice message={describeStaleInterview(sessionGuard.staleStatus)} status={sessionGuard.staleStatus} onBack={() => onStaleExit?.()} />
            )}
            <Textarea
              value={answer}
              onChange={(event) => updateAnswer(event.target.value)}
              readOnly={stale}
              aria-readonly={stale || undefined}
              data-cancelled={cancelled || undefined}
              maxLength={ANSWER_MAX_CHARS}
              placeholder="Digite sua resposta. Se preferir, use o ditado por voz para preencher este campo."
              className={`min-h-44 sm:min-h-56 max-h-72 overflow-y-auto ${cancelled ? CANCELLED_TEXTAREA_CLASS : ""}`}
            />
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
              <div className={`text-xs ${answerLength >= ANSWER_MAX_CHARS ? "text-amber-700 font-semibold" : "text-muted-foreground"}`}>
                {answerLength} / {ANSWER_MAX_CHARS} caracteres
                {syncLabel && (
                  <span
                    role="status"
                    aria-live="polite"
                    data-sync={syncSnap?.status}
                    className={`ml-3 font-medium ${ANSWER_SYNC_TONE_CLASS[describeAnswerSyncTone(syncSnap?.status ?? "clean")]}`}
                  >
                    {syncLabel}
                  </span>
                )}
              </div>
              {!cancelled && (
                <Btn variant={dictating ? "secondary" : "outline"} size="sm" onClick={toggleDictation} disabled={stale}>
                  <Mic className="w-4 h-4" /> {dictating ? "Parar ditado" : "Ditado por voz"}
                </Btn>
              )}
            </div>
            {syncSnap?.status === "conflict" && !stale && (
              <Alert variant="warning" role="alert" className="mt-4 rounded-2xl p-4">
                <p className="text-xs text-amber-700">
                  {syncSnap.conflictKind === "answer"
                    ? "A resposta desta pergunta foi alterada em outro dispositivo. Seu texto continua salvo neste dispositivo e nada foi sobrescrito. Escolha qual versão manter e, depois, avance novamente."
                    : "Este rascunho foi alterado em outro dispositivo. Seu texto continua salvo neste dispositivo e nada foi sobrescrito."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Btn variant="outline" size="sm" onClick={() => void controllerRef.current?.keepMine()}>
                    Manter meu texto
                  </Btn>
                  <Btn variant="outline" size="sm" onClick={() => void useRemoteVersion()}>
                    Usar a versão do outro dispositivo
                  </Btn>
                </div>
              </Alert>
            )}
            {validationMessage && (
              <p className="text-xs text-destructive mt-3 font-medium">{validationMessage}</p>
            )}
            {saveError && (
              <p role="alert" className="text-xs text-destructive mt-3 font-medium">
                {saveError} Sua resposta ainda não foi salva; clique em avançar para tentar novamente.
              </p>
            )}
            {speechError && (
              <Alert variant="warning" className="mt-4 flex gap-3 rounded-2xl p-4">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">{speechError}</p>
              </Alert>
            )}
            {!cancelled && (
              <p className="text-xs text-muted-foreground mt-3">
                O ditado usa o recurso do navegador para inserir texto no campo. O RH Connect não cria, envia ou armazena arquivo de áudio nesta etapa.
              </p>
            )}
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4 sm:hidden">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
              Progresso · {answeredCount} de {questions.length} respondidas
            </p>
            <div className="flex flex-wrap gap-2">
              {questions.map((item, index) => {
                const navState = navStateAt(item, index);
                const canOpenQuestion = isQuestionNavigable(navState);
                const visual = resolveProgressVisual(navState, cancelled);
                const stateLabel = { CURRENT: "atual", READONLY: "somente leitura", ANSWERED: "respondida", VISITED_PENDING: "pendente", LOCKED: "bloqueada" }[visual];
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!canOpenQuestion || stale}
                    aria-current={visual === "CURRENT" ? "step" : undefined}
                    aria-label={`Pergunta ${index + 1}: ${stateLabel}`}
                    onClick={() => {
                      if (!canOpenQuestion) return;
                      openQuestion(index);
                    }}
                    className={`flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-xl border px-3 text-sm font-bold transition-colors outline-none focus-visible:ring-[4px] focus-visible:ring-[rgba(29,78,216,0.24)] ${
                      visual === "CURRENT"
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : visual === "READONLY"
                          ? "cursor-default border-border bg-muted text-muted-foreground"
                          : navState === "ANSWERED"
                          ? "border-green-200 bg-green-50 text-green-700"
                          : navState === "VISITED_PENDING"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "cursor-not-allowed border-border bg-muted text-muted-foreground opacity-60"
                    }`}
                  >
                    {navState === "ANSWERED" && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                    {navState === "LOCKED" && <Lock className="h-3.5 w-3.5" aria-hidden="true" />}
                    <span>{index + 1}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="hidden p-5 sm:block">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Progresso</p>
            <div className="space-y-2">
              {questions.map((item, index) => {
                const navState = navStateAt(item, index);
                const canOpenQuestion = isQuestionNavigable(navState);
                const visual = resolveProgressVisual(navState, cancelled);
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!canOpenQuestion || stale}
                    onClick={() => {
                      if (!canOpenQuestion) return;
                      openQuestion(index);
                    }}
                    className={`w-full flex items-center gap-2 text-left p-2 rounded-lg transition-colors ${
                      visual === "CURRENT"
                        ? "bg-blue-50 text-blue-700"
                        : visual === "READONLY"
                          ? "cursor-default bg-muted/50 text-muted-foreground"
                          : canOpenQuestion
                          ? "hover:bg-muted"
                          : "cursor-not-allowed opacity-60"
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                      visual === "CURRENT"
                        ? "bg-blue-100 text-blue-700"
                        : visual === "READONLY"
                          ? "bg-muted text-muted-foreground"
                          : navState === "ANSWERED"
                          ? "bg-green-100 text-green-700"
                          : navState === "VISITED_PENDING"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-muted text-muted-foreground"
                    }`}>
                      {navState === "LOCKED" ? <Lock className="h-3 w-3" aria-hidden="true" /> : index + 1}
                    </span>
                    <span className={`flex items-center gap-1 text-xs font-medium truncate ${navState === "VISITED_PENDING" ? "text-amber-700" : ""}`}>
                      {navState === "ANSWERED" && <Check className="h-3 w-3 text-green-700" aria-hidden="true" />}
                      {PROGRESS_LABELS[visual]}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          <div className="flex gap-3">
            <Btn variant="outline" onClick={() => { const previous = Math.max(0, qIdx - 1); void withSavedAnswer(() => setQIdx(previous)); }} disabled={qIdx === 0 || saving || stale}>
              Anterior
            </Btn>
            <Btn variant="primary" className="flex-1" onClick={() => void goNext()} disabled={saving || stale}>
              {saving ? <><Spinner /> Salvando...</> : <>{qIdx < questions.length - 1 ? "Próxima" : "Revisar"} <ArrowRight className="w-4 h-4" /></>}
            </Btn>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}

// ─── Screen 9: Revisão e Envio ────────────────────────────────────────────────

function ReviewScreen({ onNavigate, draft, onStaleExit }: { onNavigate: (s: Screen) => void; draft: InterviewDraft; onStaleExit?: () => void }) {
  const routerNavigate = useNavigate();
  const [sending, setSending] = useState(false);
  const [confirm, setConfirm] = useState(false);
  // Outro dispositivo pode ter enviado a entrevista enquanto esta tela estava aberta.
  const { stale, staleStatus } = useInterviewSessionGuard({ interviewId: draft.interviewId, pollStatus: true });
  const answeredCount = draft.questions.filter((question) => isValidInterviewAnswer(draft.answers[question.id])).length;
  const allAnswersReady = hasAllRequiredInterviewAnswers(draft);
  const editQuestion = (index: number) => {
    routerNavigate(`${getPathForScreen("interview")}?question=${index + 1}`);
  };

  if (!draft.context || draft.questions.length === 0) {
    return <DraftWizardGuard current="review" onNavigate={onNavigate} />;
  }

  const handleSend = () => {
    if (stale) return;
    if (!allAnswersReady) {
      toast.error("Responda todas as perguntas antes de revisar.");
      return;
    }
    setSending(true);
    setTimeout(() => { setSending(false); onNavigate("interview-confirm"); }, 1800);
  };

  return (
    <AuthLayout current="review" onNavigate={onNavigate} title="Revisão das Respostas" subtitle="Confira perguntas e respostas antes de escolher a modalidade de avaliação">
      <div className="w-full">
        {stale && <StaleInterviewNotice message={describeStaleInterview(staleStatus)} status={staleStatus} onBack={() => onStaleExit?.()} />}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
          <Card className="p-3 sm:p-4 text-center">
            <p className="text-lg sm:text-2xl font-bold text-green-600 leading-tight">{answeredCount}</p>
            <p className="text-[11px] sm:text-xs text-muted-foreground leading-snug mt-0.5">respostas<br className="sm:hidden" /> preenchidas</p>
          </Card>
          <Card className="p-3 sm:p-4 text-center">
            <p className="text-lg sm:text-2xl font-bold text-foreground leading-tight">{draft.questions.length}</p>
            <p className="text-[11px] sm:text-xs text-muted-foreground leading-snug mt-0.5">perguntas</p>
          </Card>
          <Card className="p-3 sm:p-4 text-center">
            <p className={`text-lg sm:text-2xl font-bold leading-tight ${allAnswersReady ? "text-blue-600" : "text-amber-600"}`}>
              {allAnswersReady ? "OK" : "Pend."}
            </p>
            <p className="text-[11px] sm:text-xs text-muted-foreground leading-snug mt-0.5">pronto p/<br className="sm:hidden" /> envio</p>
          </Card>
        </div>

        {!allAnswersReady && (
          <Alert variant="warning" className="mb-6 flex gap-3 rounded-2xl p-4">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">Responda todas as perguntas antes de revisar.</p>
          </Alert>
        )}

        <Card className="mb-6">
          <div className="p-4 sm:p-5 border-b border-border">
            <h3 className="font-bold text-foreground">Suas respostas</h3>
          </div>
          <div className="divide-y divide-border">
            {draft.questions.map((q, i) => {
              const answered = isValidInterviewAnswer(draft.answers[q.id]);
              return (
                <div key={q.id} className="p-4 sm:p-5 flex items-start sm:items-center gap-3 sm:gap-4">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${answered ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
                    {answered ? (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Pergunta {i + 1}</p>
                    <p className="text-sm text-foreground line-clamp-2 sm:truncate">{q.text}</p>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-2 mb-1">Resposta:</p>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 whitespace-pre-line break-words">{draft.answers[q.id] || "Resposta ainda não preenchida."}</p>
                  </div>
                  <Btn variant="outline" size="sm" onClick={() => editQuestion(i)} disabled={stale} className="shrink-0">
                    <Edit2 className="w-4 h-4" /> Editar
                  </Btn>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Consent */}
        <Card className="p-4 sm:p-5 mb-6 bg-blue-50 border-blue-100">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" className="mt-0.5 rounded shrink-0" checked={confirm} onChange={e => setConfirm(e.target.checked)} />
            <span className="text-sm text-foreground leading-relaxed">
              Confirmo que revisei minhas respostas textuais e concordo com o envio para avaliação conforme a modalidade escolhida. Entendo que o envio é uma ação de difícil reversão.
            </span>
          </label>
        </Card>

        <Alert variant="warning" className="mb-7 flex gap-3 rounded-2xl p-4">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Após o envio, suas respostas serão registradas para avaliação conforme a modalidade escolhida.
          </p>
        </Alert>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Btn variant="outline" onClick={() => editQuestion(0)} disabled={stale}>
            <Edit2 className="w-4 h-4" /> Editar respostas
          </Btn>
          <Btn variant="primary" size="lg" disabled={!confirm || sending || !allAnswersReady || stale} onClick={handleSend}>
            {sending ? (
              <><Spinner />Preparando...</>
            ) : (
              <><Send className="w-4 h-4" /> Continuar para confirmação</>
            )}
          </Btn>
        </div>
      </div>
    </AuthLayout>
  );
}

// ─── Screen 10: Acompanhamento da entrevista (real, 6A.2) ─────────────────────
// Fonte da verdade: GET /interviews/:id (Interview persistida). Sem mock e sem localStorage de
// domínio. O resultado NÃO é carregado aqui: só há um CTA para /candidate/reports/:id.

type TrackingLoadState =
  | { status: "loading" }
  | { status: "error"; reason: string; message: string }
  | { status: "ready"; interview: RealInterview };

const TRACKING_TONE_CLASSES: Record<"warning" | "info" | "success" | "neutral", string> = {
  warning: "bg-amber-50 border-amber-200 text-amber-500",
  info: "bg-blue-50 border-blue-200 text-blue-600",
  success: "bg-green-50 border-green-200 text-green-600",
  neutral: "bg-muted border-border text-muted-foreground",
};

const TRACKING_ABOUT: Record<"HUMAN" | "AI", { q: string; a: string }[]> = {
  HUMAN: [
    { q: "Quem avalia?", a: "Um avaliador humano autorizado, com critérios padronizados de RH." },
    { q: "O que você vai receber?", a: "Nota por critério, pontos fortes, oportunidades e recomendações." },
    { q: "Quem vê minhas respostas?", a: "Apenas o avaliador atribuído e o administrador da plataforma." },
  ],
  AI: [
    { q: "Quem avalia?", a: "A IA Avaliadora do RH Connect analisa suas respostas considerando o contexto da vaga." },
    { q: "O que você vai receber?", a: "Pontos fortes, pontos de atenção e recomendações para evoluir." },
    { q: "Quem vê minhas respostas?", a: "Apenas perfis autorizados envolvidos no funcionamento da plataforma." },
  ],
};

function PendingScreen({
  onNavigate,
  onResumeInterview,
}: {
  onNavigate: (s: Screen) => void;
  onResumeInterview?: (interviewId: string) => Promise<ResumeInterviewResult>;
}) {
  const routerNavigate = useNavigate();
  const { id } = useParams();
  const validId = Boolean(id && isUuid(id));
  // GET /interviews/:id com sincronização leve (15 s + focus/visible/online) SÓ enquanto o estado
  // não é terminal (COMPLETED/CANCELLED). Refresh silencioso: sem spinner e sem redirecionar.
  const live = useCandidateLiveResource<RealInterview>({
    resourceKey: `tracking:${id ?? ""}`,
    fetch: () =>
      id && isUuid(id)
        ? getRealInterview(id)
        : Promise.resolve({ ok: false as const, reason: "not_found", message: "" }),
    isTerminal: (interview) => isTrackingTerminal(interview.status),
    sync: validId
      ? { intervalMs: CANDIDATE_TRACKING_SYNC_INTERVAL_MS, maxBackoffMs: CANDIDATE_TRACKING_SYNC_MAX_BACKOFF_MS }
      : undefined,
  });
  const loadState: TrackingLoadState =
    live.state.status === "ready" ? { status: "ready", interview: live.state.value } : live.state;
  const [resuming, setResuming] = useState(false);
  const [resumeMessage, setResumeMessage] = useState<string | null>(null);

  if (loadState.status === "loading") {
    return (
      <AuthLayout current="pending" onNavigate={onNavigate} title="Acompanhamento da Entrevista">
        <Card className="w-full max-w-xl p-10 text-center">
          <Spinner />
          <p className="text-sm text-muted-foreground mt-3">Carregando o acompanhamento da entrevista...</p>
        </Card>
      </AuthLayout>
    );
  }

  if (loadState.status === "error") {
    const failure = describeTrackingFailure(loadState.reason, loadState.message);
    return (
      <AuthLayout current="pending" onNavigate={onNavigate} title="Acompanhamento da Entrevista">
        <EmptyState
          icon={AlertCircle}
          title={failure.title}
          description={failure.description}
          className="w-full max-w-xl p-10"
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              {failure.canRetry && (
                <Btn variant="primary" onClick={() => live.reload()}>Tentar novamente</Btn>
              )}
              <Btn variant={failure.canRetry ? "outline" : "primary"} onClick={() => onNavigate("interview-history")}>Voltar ao histórico</Btn>
            </div>
          }
        />
      </AuthLayout>
    );
  }

  const interview = loadState.interview;
  const view = buildTrackingView(interview);
  const aboutMode = interview.evaluationMode === "HUMAN" || interview.evaluationMode === "AI" ? interview.evaluationMode : null;
  const showAbout = aboutMode !== null && ["pending-assignment", "assigned", "completed", "pending-ai"].includes(view.kind);
  const showWaiting = ["pending-assignment", "assigned", "pending-ai"].includes(view.kind);
  const HeroIcon = view.kind === "completed" ? Check : view.kind === "cancelled" || view.kind === "unsupported" ? AlertCircle : Clock;

  const handlePrimary = async () => {
    if (view.primaryCta === "view-result") {
      routerNavigate(`/candidate/reports/${interview.id}`);
      return;
    }
    if (view.primaryCta === "resume-interview") {
      if (!onResumeInterview || resuming) return;
      setResuming(true);
      setResumeMessage(null);
      const result = await onResumeInterview(interview.id);
      setResuming(false);
      if (!result.ok) setResumeMessage(result.message);
      return;
    }
    onNavigate("interview-history");
  };

  return (
    <AuthLayout
      current="pending"
      onNavigate={onNavigate}
      title="Acompanhamento da Entrevista"
      subtitle={interview.company ? `${interview.title} · ${interview.company}` : interview.title}
    >
      <div className="w-full">
        {/* Status principal */}
        <Card className="p-6 sm:p-8 mb-6 text-center">
          <div className={`w-16 h-16 border-2 rounded-2xl flex items-center justify-center mx-auto mb-4 ${TRACKING_TONE_CLASSES[view.badgeTone]}`}>
            <HeroIcon className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">{view.title}</h2>
          <p className={`text-muted-foreground text-sm max-w-md mx-auto ${view.deadlineNotice ? "mb-2" : "mb-5"}`}>{view.description}</p>
          {view.deadlineNotice && (
            <p className="text-muted-foreground text-sm max-w-md mx-auto mb-5">{view.deadlineNotice}</p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <StatusBadge tone={view.badgeTone}>
              {view.badgeLive && <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse mr-1" />}
              {view.badgeLabel}
            </StatusBadge>
            <span className="text-xs text-muted-foreground">· Protocolo {interview.id}</span>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {view.steps.length > 0 && (
            <Card className="p-5">
              <h3 className="font-bold text-foreground mb-5 text-sm">Histórico da entrevista</h3>
              {view.steps.map((timelineStep, i) => (
                <div key={timelineStep.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${timelineStep.state === "done" ? "bg-green-100 border-2 border-green-500" : timelineStep.state === "current" ? "bg-amber-100 border-2 border-amber-400" : "bg-muted border-2 border-border"}`}>
                      {timelineStep.state === "done"
                        ? <Check className="w-3.5 h-3.5 text-green-600" />
                        : timelineStep.state === "current"
                        ? <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                        : <div className="w-2 h-2 bg-muted-foreground/30 rounded-full" />}
                    </div>
                    {i < view.steps.length - 1 && (
                      <div className={`w-px h-7 ${timelineStep.state === "done" ? "bg-green-300" : "bg-border"}`} />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className={`text-sm font-semibold ${timelineStep.state === "upcoming" ? "text-muted-foreground" : "text-foreground"}`}>{timelineStep.label}</p>
                    {timelineStep.date && <p className="text-xs text-muted-foreground">{timelineStep.date}</p>}
                  </div>
                </div>
              ))}
            </Card>
          )}

          {showAbout && aboutMode && (
            <Card className="p-5">
              <h3 className="font-bold text-foreground mb-4 text-sm flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600" /> Sobre a avaliação
              </h3>
              <div className="space-y-3">
                {TRACKING_ABOUT[aboutMode].map(({ q, a }) => (
                  <div key={q} className="p-3 bg-muted/40 rounded-xl">
                    <p className="text-xs font-bold text-foreground mb-1">{q}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{a}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="space-y-4 xl:col-start-3">
            {showWaiting && (
              <Card className="p-5 bg-blue-50 border-blue-100">
                <p className="text-sm font-bold text-foreground mb-3">Enquanto aguarda...</p>
                <ul className="space-y-2">
                  {["Revise materiais de preparação", "Complete seu perfil profissional", "Analise outra URL de vaga", "Pratique uma nova entrevista"].map((s) => (
                    <li key={s} className="flex items-center gap-2 text-xs text-foreground">
                      <ChevronRight className="w-3.5 h-3.5 text-blue-600 shrink-0" /> {s}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {resumeMessage && (
              <Alert variant="warning" className="flex gap-3 rounded-2xl p-4">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">{resumeMessage}</p>
              </Alert>
            )}
            <Btn
              variant={view.primaryCta === "back-to-history" ? "outline" : "primary"}
              className="w-full"
              disabled={resuming}
              onClick={() => void handlePrimary()}
            >
              {resuming ? <><Spinner />Abrindo...</> : <>{view.primaryCtaLabel} <ArrowRight className="w-4 h-4" /></>}
            </Btn>
            {view.primaryCta !== "back-to-history" && (
              <Btn variant="outline" className="w-full" onClick={() => onNavigate("interview-history")}>
                Voltar ao histórico
              </Btn>
            )}
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}

// ─── Screen 11: Resultado e Relatório (real, 6A.3) ────────────────────────────
// Fonte da verdade: GET /interviews/:id/result (avaliação HUMANA concluída). Sem mock, sem
// localStorage de resultado e sem recalcular a nota. IA continua fora desta fase.

type ReportLoadState =
  | { status: "loading" }
  | { status: "error"; reason: string; message: string }
  | { status: "ready"; result: RealInterviewResult };

function reportScoreState(score: number) {
  if (score >= 9) return { label: "Excelente", color: "#16A34A", bg: "bg-green-50", text: "text-green-700", border: "border-green-200" };
  if (score >= 7) return { label: "Bom", color: "#1D4ED8", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" };
  return { label: "Atenção", color: "#D97706", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" };
}

const formatReportScore = (score: number) => score.toFixed(1).replace(".", ",");

function ReportScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const routerNavigate = useNavigate();
  const { id } = useParams();
  const [loadState, setLoadState] = useState<ReportLoadState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!id || !isUuid(id)) {
      setLoadState({ status: "error", reason: "not_found", message: "" });
      return;
    }
    setLoadState({ status: "loading" });
    void getRealInterviewResult(id).then((result) => {
      if (cancelled) return;
      setLoadState(
        result.ok
          ? { status: "ready", result: result.data }
          : { status: "error", reason: result.reason, message: result.message },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  const renderFailure = (failure: ReportFailureView) => {
    const run = (action: ReportFailureAction) => {
      if (action === "retry") setReloadKey((key) => key + 1);
      else if (action === "back-to-status" && id) routerNavigate(`/candidate/interviews/${id}/status`);
      else onNavigate("interview-history");
    };
    const labels: Record<ReportFailureAction, string> = {
      retry: "Tentar novamente",
      "back-to-status": "Voltar ao acompanhamento",
      "back-to-history": "Voltar ao histórico",
    };
    return (
      <AuthLayout current="report" onNavigate={onNavigate} title="Resultado e Relatório" subtitle="Relatório da entrevista">
        <EmptyState
          icon={failure.primary === "back-to-status" ? Clock : AlertCircle}
          title={failure.title}
          description={failure.description}
          className="w-full max-w-xl p-10"
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Btn variant="primary" onClick={() => run(failure.primary)}>{labels[failure.primary]}</Btn>
              {failure.secondary && <Btn variant="outline" onClick={() => run(failure.secondary!)}>{labels[failure.secondary]}</Btn>}
            </div>
          }
        />
      </AuthLayout>
    );
  };

  if (loadState.status === "loading") {
    return (
      <AuthLayout current="report" onNavigate={onNavigate} title="Resultado e Relatório" subtitle="Relatório da entrevista">
        <Card className="w-full max-w-xl p-10 text-center">
          <Spinner />
          <p className="text-sm text-muted-foreground mt-3">Carregando o relatório da entrevista...</p>
        </Card>
      </AuthLayout>
    );
  }

  if (loadState.status === "error") {
    return renderFailure(describeReportFailure(loadState.reason, loadState.message));
  }

  if (!isSupportedReportResult(loadState.result)) {
    return renderFailure(UNSUPPORTED_REPORT_VIEW);
  }

  return <ReportContent result={loadState.result} onNavigate={onNavigate} />;
}

function ReportContent({ result, onNavigate }: { result: RealInterviewResult; onNavigate: (s: Screen) => void }) {
  const [hoveredCriterion, setHoveredCriterion] = useState<string | null>(null);
  const view = buildReportView(result);
  const radarData = view.criteria.map((criterion) => ({ name: criterion.chartLabel, label: criterion.label, score: criterion.score }));
  const generalState = reportScoreState(view.overallScore);
  const subtitle = view.company ? `${view.title} · ${view.company}` : view.title;

  const renderRadarTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;
    const state = reportScoreState(item.score);
    return (
      <div className="rounded-xl border border-border bg-white px-3 py-2 shadow-lg">
        <p className="text-xs font-bold text-foreground">{item.label}</p>
        <p className="text-lg font-extrabold leading-tight" style={{ color: state.color }}>{formatReportScore(item.score)}</p>
        <p className={`text-[11px] font-semibold ${state.text}`}>{state.label}</p>
      </div>
    );
  };

  return (
    <AuthLayout current="report" onNavigate={onNavigate} title="Resultado e Relatório" subtitle={subtitle}>
      <div className="w-full">
        {/* Score hero — two-panel */}
        <Card className="mb-6 overflow-hidden">
          <div className="flex flex-col md:grid md:grid-cols-2">
            {/* Left: Desempenho Geral */}
            <div className="p-6 sm:p-8 border-b border-border md:border-b-0 md:border-r" style={{ background: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 60%)" }}>
              <p className="text-[11px] font-bold uppercase tracking-widest text-blue-700 mb-5 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5" /> Desempenho Geral
              </p>
              <div className="flex items-end gap-2 mb-4">
                <span className="text-[72px] sm:text-[80px] font-extrabold text-foreground leading-none">{formatReportScore(view.overallScore)}</span>
                <span className="text-2xl font-bold text-muted-foreground mb-3">/ 10</span>
              </div>
              <div className="mb-5">
                <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 ${generalState.bg} ${generalState.text} text-sm font-bold rounded-full border ${generalState.border}`}>
                  <CheckCircle className="w-3.5 h-3.5" /> {generalState.label}
                </span>
              </div>
              {view.summary && (
                <>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700 mb-1.5">Parecer do avaliador</p>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line break-words">{view.summary}</p>
                </>
              )}
            </div>

            {/* Right: Radar chart */}
            <div className="p-6 sm:p-8 bg-card">
              <div className="flex flex-col gap-4 mb-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <p className="text-sm font-bold text-foreground">Desempenho por critério</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: "#16A34A" }} /><span className="text-[11px] text-muted-foreground">Excelente (≥ 9)</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: "#1D4ED8" }} /><span className="text-[11px] text-muted-foreground">Bom (7–8)</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: "#D97706" }} /><span className="text-[11px] text-muted-foreground">Atenção (&lt; 7)</span></div>
                  </div>
                </div>
                <EvaluationModeBadge mode={result.interview.evaluationMode} />
              </div>
              <ResponsiveContainer width="100%" height={268}>
                <RadarChart data={radarData} outerRadius="68%" margin={{ top: 14, right: 34, bottom: 14, left: 34 }}>
                  <PolarGrid stroke="#E2E8F0" />
                  <PolarAngleAxis
                    dataKey="name"
                    tick={({ payload, x, y, cx, cy, textAnchor, ...rest }: any) => {
                      const dx = x - (cx ?? 0);
                      const dy = y - (cy ?? 0);
                      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                      const labelOffset = 16;
                      const labelX = x + (dx / distance) * labelOffset;
                      const labelY = y + (dy / distance) * labelOffset + (dy > 0 ? 4 : -2);
                      return (
                        <text x={labelX} y={labelY} textAnchor={textAnchor} fontSize={10} fontWeight={600} fill="#0F1B2D" {...rest}>
                          {payload.value}
                        </text>
                      );
                    }}
                  />
                  <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                  <Tooltip content={renderRadarTooltip} cursor={false} />
                  <Radar
                    name="Desempenho"
                    dataKey="score"
                    stroke="#1D4ED8"
                    fill="#1D4ED8"
                    fillOpacity={0.12}
                    strokeWidth={2}
                    isAnimationActive
                    animationBegin={0}
                    animationDuration={420}
                    animationEasing="ease-out"
                    activeDot={false}
                    dot={(props: any) => {
                      const { cx, cy, payload, key } = props;
                      if (cx == null || cy == null) return <circle key={key} cx={0} cy={0} r={0} fill="transparent" />;
                      const score = payload?.score ?? payload?.payload?.score ?? props.value ?? 0;
                      const name = payload?.name ?? payload?.payload?.name ?? "";
                      const state = reportScoreState(score);
                      const isHovered = hoveredCriterion === name;
                      return (
                        <g
                          key={key ?? `radar-dot-${name || cx}-${cy}`}
                          onMouseEnter={() => setHoveredCriterion(name)}
                          onMouseLeave={() => setHoveredCriterion(null)}
                          style={{ cursor: "pointer" }}
                        >
                          <g
                            key={name}
                            style={{
                              transformBox: "fill-box",
                              transformOrigin: "center",
                              transform: isHovered ? "scale(1.28)" : "scale(1)",
                              transition: "transform 150ms ease-out",
                              animation: "reportRadarDotIn 500ms ease-out",
                            }}
                          >
                            <circle cx={cx} cy={cy} r={17} fill={state.color} fillOpacity={isHovered ? 0.28 : 0.14} style={{ transition: "fill-opacity 150ms ease-out" }} />
                            <circle cx={cx} cy={cy} r={10} fill={state.color} fillOpacity={1} />
                          </g>
                        </g>
                      );
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
              <div className="mt-3 grid grid-cols-1 gap-x-3 gap-y-1.5 border-t border-border pt-3 sm:grid-cols-2" style={{ animation: "reportCriteriaIn 350ms ease-out" }}>
                {view.criteria.map((item) => {
                  const state = reportScoreState(item.score);
                  const isHovered = hoveredCriterion === item.chartLabel;
                  return (
                    <div key={item.key} className={`flex items-center justify-between gap-2 rounded-md px-1 py-1 transition-colors ${isHovered ? "bg-blue-50" : ""}`}>
                      <span className="min-w-0 truncate text-xs font-medium text-foreground">{item.label}</span>
                      <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${state.bg} ${state.text}`}>
                        {formatReportScore(item.score)} · {state.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* Dados da entrevista (só o que existe) */}
        {view.details.length > 0 && (
          <Card className="p-5 sm:p-6 mb-5">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-600" /> Sobre a entrevista
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {view.details.map((detail) => (
                <div key={detail.label} className="min-w-0">
                  <p className="text-[11px] text-muted-foreground mb-0.5">{detail.label}</p>
                  <p className="text-sm font-semibold text-foreground break-words">{detail.value}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Perguntas e respostas (sem nota por pergunta: não existe na avaliação humana) */}
        <Card className="mb-5">
          <div className="p-5 sm:p-6 border-b border-border">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" /> Perguntas e respostas
            </h3>
          </div>
          <div className="divide-y divide-border">
            {view.questions.map((question) => (
              <div key={question.id} className="p-5 sm:p-6">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Pergunta {question.position} · {question.typeLabel}
                </p>
                <p className="text-sm font-semibold text-foreground mb-3 break-words">{question.text}</p>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Sua resposta</p>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line break-words">
                  {question.answer ?? "Resposta não registrada."}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* Disclaimer */}
        <div className="flex items-start gap-3 mb-6 p-4 bg-muted rounded-2xl border border-border">
          <Shield className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>Atenção:</strong> Este relatório é uma ferramenta de aprendizagem e não deve ser interpretado como garantia de aprovação em processos seletivos.
          </p>
        </div>

        {/* CTA */}
        <div className="rounded-2xl p-6 sm:p-7 text-center" style={{ background: "linear-gradient(135deg, #0F2652, #1D4ED8)" }}>
          <p className="text-white font-bold text-lg mb-2">Pronto para a próxima prática?</p>
          <p className="text-blue-200 text-sm mb-5">A melhora vem com a repetição. Cada entrevista é uma oportunidade de avançar mais um passo.</p>
          <Btn onClick={() => onNavigate("interview-setup")} className="!bg-white !text-blue-700 hover:!bg-blue-50 font-bold" size="lg">
            Iniciar nova entrevista <ArrowRight className="w-5 h-5" />
          </Btn>
        </div>
      </div>
      <style>{`
        @keyframes reportRadarDotIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes reportCriteriaIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </AuthLayout>
  );
}

// ─── Fase A: CAN-007 Histórico de Entrevistas ─────────────────────────────────

function InterviewHistoryScreen({
  onNavigate,
  onResumeInterview,
}: {
  onNavigate: (s: Screen) => void;
  onResumeInterview?: (interviewId: string) => Promise<ResumeInterviewResult>;
}) {
  const routerNavigate = useNavigate();
  // GET /interviews com sincronização leve (30 s + focus/visible/online). Refresh silencioso: sem
  // spinner, sem piscar, filtro e scroll preservados (o estado do filtro vive só nesta tela).
  const { state: loadState, reload } = useCandidateInterviewHistory({ autoSync: true });
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [resumingId, setResumingId] = useState<string | null>(null);
  const [resumeMessage, setResumeMessage] = useState<string | null>(null);

  const handleAction = async (kind: HistoryActionKind, id: string) => {
    if (kind === "resume") {
      if (!onResumeInterview || resumingId) return;
      setResumingId(id);
      setResumeMessage(null);
      const result = await onResumeInterview(id);
      setResumingId(null);
      if (!result.ok) setResumeMessage(result.message);
      return;
    }
    const path = historyActionPath(kind, id);
    if (path) routerNavigate(path);
  };

  let content: ReactNode;
  if (loadState.status === "loading") {
    content = (
      <Card className="p-10 text-center">
        <Spinner />
        <p className="text-sm text-muted-foreground mt-3">Carregando o seu histórico de entrevistas...</p>
      </Card>
    );
  } else if (loadState.status === "error") {
    const failure = describeHistoryFailure(loadState.reason, loadState.message);
    content = (
      <EmptyState
        icon={AlertCircle}
        title={failure.title}
        description={failure.description}
        className="p-10"
        action={failure.canRetry ? <Btn variant="primary" onClick={() => reload()}>Tentar novamente</Btn> : undefined}
      />
    );
  } else if (visibleHistoryItems(loadState.history.interviews).length === 0) {
    content = (
      <EmptyState
        icon={History}
        title={HISTORY_EMPTY_VIEW.title}
        description={HISTORY_EMPTY_VIEW.description}
        className="p-10"
        action={<Btn variant="primary" onClick={() => onNavigate("interview-setup")}>{HISTORY_EMPTY_VIEW.cta}</Btn>}
      />
    );
  } else {
    const all = visibleHistoryItems(loadState.history.interviews);
    const counts = countByFilter(all);
    const filtered = filterHistory(all, filter);
    content = (
      <>
        <Card className="p-4 sm:p-5">
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-sm font-semibold text-foreground shrink-0">Filtrar por:</span>
            {HISTORY_FILTERS.map((option) => (
              <FilterChip key={option.key} onClick={() => setFilter(option.key)} selected={option.key === filter}>
                {option.key === "all" ? option.label : `${option.label} (${counts[option.key]})`}
              </FilterChip>
            ))}
          </div>
        </Card>

        {resumeMessage && (
          <p role="alert" className="text-sm text-red-600">{resumeMessage}</p>
        )}

        <div className="space-y-3">
          {filtered.length === 0 && (
            <EmptyState
              className="p-8"
              title={<span className="text-sm font-normal text-muted-foreground">{HISTORY_FILTER_EMPTY_MESSAGE}</span>}
            />
          )}
          {filtered.map((item) => {
            const h = buildHistoryItemView(item);
            return (
              <Card key={h.id} className="p-4 sm:p-5 hover:shadow-md transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-bold text-foreground text-sm">{h.title}</p>
                      <StatusBadge tone={h.tone}>{h.statusLabel}</StatusBadge>
                      <EvaluationModeBadge mode={h.evaluationMode} />
                    </div>
                    <p className="text-xs text-muted-foreground">{h.meta.join(" · ")}</p>
                    {h.dateText && <p className="text-xs text-muted-foreground mt-0.5">{h.dateText}</p>}
                    {h.score && (
                      <p className="text-xs font-semibold text-green-700 mt-1.5">Nota: {h.score} / 10</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {h.actions.map((action) => (
                      <Btn
                        key={action.kind}
                        variant={action.variant}
                        size="sm"
                        disabled={action.kind === "resume" && resumingId !== null}
                        onClick={() => void handleAction(action.kind, h.id)}
                      >
                        {action.kind === "resume" && resumingId === h.id ? "Abrindo..." : action.label}
                      </Btn>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </>
    );
  }

  return (
    <AuthLayout
      current="interview-history"
      onNavigate={onNavigate}
      title="Histórico de Entrevistas"
      subtitle="Todas as suas entrevistas simuladas"
    >
      <div className="w-full space-y-4">{content}</div>
    </AuthLayout>
  );
}

// ─── Fase A: ENT-001 Nova entrevista ─────────────────────────────────────────

// Linha do card "Contexto extraído": ícone em destaque, rótulo pequeno e valor.
function ContextInfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Briefcase;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3.5 px-5 py-4 sm:px-6">
      <span
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100"
      >
        <Icon className="h-[1.125rem] w-[1.125rem]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="mt-1.5">{children}</div>
      </div>
    </div>
  );
}

function InterviewSetupScreen({
  onNavigate,
  draft,
  setDraft,
  session,
  savedDraftAvailable,
  onContinueSavedDraft,
  onCancelInterview,
  onCancelPreparation,
  onResumeInterview,
}: {
  onNavigate: (s: Screen) => void;
  draft: InterviewDraft;
  setDraft: Dispatch<SetStateAction<InterviewDraft>>;
  session: MockAuthSession;
  onResumeInterview?: (interviewId: string) => Promise<ResumeInterviewResult>;
  savedDraftAvailable?: boolean;
  onContinueSavedDraft?: () => void;
  onCancelInterview?: () => void;
  onCancelPreparation?: () => void;
}) {
  // Prefill (UX): URL de uma vaga sugerida já copiada neste navegador. Só lê; nunca analisa nem cria nada.
  const [url, setUrl] = useState(() => draft.context?.sourceUrl ?? peekInterviewUrlPrefill() ?? "");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">(draft.context ? "success" : "idle");
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(Boolean(draft.context));
  const [generating, setGenerating] = useState(false);
  // URL preenchida pelo clique em "Copiar link" de uma vaga sugerida (nunca por digitação/colagem).
  const [copiedLinkUrl, setCopiedLinkUrl] = useState<string | null>(null);
  const continuingRef = useRef(false);
  // 409 INTERVIEW_ALREADY_IN_PROGRESS: id da entrevista existente (só exibe a oferta; não grava nada).
  const [existingInProgress, setExistingInProgress] = useState<{ id: string | null } | null>(null);
  const [resumingExisting, setResumingExisting] = useState(false);
  const [resumeExistingError, setResumeExistingError] = useState<string | null>(null);
  const keepUrlOnContextClearRef = useRef(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const hadContextRef = useRef(Boolean(draft.context));
  const contextCardRef = useRef<HTMLDivElement>(null);
  // Marcada apenas quando uma análise termina com sucesso; consumida uma única vez pelo efeito de scroll.
  const scrollToContextRef = useRef(false);
  const urlFieldRef = useRef<HTMLDivElement>(null);
  const urlHighlightTimerRef = useRef<number | null>(null);
  const [urlHighlighted, setUrlHighlighted] = useState(false);
  const requirementSections = draft.context
    ? [{ title: "Requisitos", items: draft.context.requirements }]
    : [];
  const jobLocation = draft.context?.location?.trim();
  const jobContractType = draft.context?.contractType?.trim();
  const jobWorkMode = draft.context?.workMode === "REMOTE"
    ? "Remoto"
    : draft.context?.workMode === "HYBRID"
      ? "Híbrido"
      : draft.context?.workMode === "ONSITE"
        ? "Presencial"
        : "";
  const jobDescription = draft.context?.summary?.trim() ?? "";
  const descriptionIsLong = jobDescription.length > 320;

  const handleAnalyze = async () => {
    setCopiedLinkUrl(null);
    setStatus("loading");
    setError("");
    setConfirmed(false);
    setDescriptionExpanded(false);
    try {
      const context = await analyzeJobUrl(url);
      // Novo contexto => nova entrevista real (o interviewId anterior é descartado,
      // junto com os rascunhos locais de resposta dela).
      clearAnswerDraftsForInterview(getCandidateIdentity(session).id, draft.interviewId);
      setDraft((current) => ({
        ...current,
        interviewId: undefined,
        context,
        questions: [],
        answers: {},
        evaluationMode: null,
      }));
      scrollToContextRef.current = true;
      setStatus("success");
    } catch (err) {
      scrollToContextRef.current = false;
      setStatus("error");
      setError(friendlyErrorMessage(err, "Não foi possível analisar a vaga. Verifique o link e tente novamente."));
    }
  };

  // Contexto confirmado: cria a Interview REAL (POST /interviews) UMA vez e gera
  // as perguntas persistidas (idempotente). O id nunca nasce no navegador e o
  // candidato vem do JWT. `continuingRef` bloqueia clique duplo; se o
  // interviewId já existe (voltar/avançar), ele é reaproveitado.
  const handleContinue = async () => {
    if (continuingRef.current) return;
    if (!draft.context || !confirmed) {
      toast.error("Confirme o contexto da vaga antes de continuar.");
      return;
    }
    continuingRef.current = true;
    setGenerating(true);
    try {
      const outcome = await startInterviewForContext({
        context: draft.context,
        currentInterviewId: draft.interviewId,
        create: createRealInterview,
        generate: generateRealQuestions,
        onCreated: (createdId) => setDraft((current) => ({ ...current, interviewId: createdId })),
        onObsolete: (staleId) => clearAnswerDraftsForInterview(getCandidateIdentity(session).id, staleId),
      });
      if (!outcome.ok) {
        if (outcome.kind === "already_in_progress") {
          // Sem erro genérico, sem wizard novo e sem alterar o rascunho salvo.
          setExistingInProgress({ id: outcome.existingInterviewId ?? null });
          setResumeExistingError(null);
        } else {
          toast.error(outcome.message);
        }
        return;
      }
      const interviewId = outcome.interviewId;
      const generated = { data: outcome.questions };
      const readyInterviewId = interviewId;
      const questions: InterviewQuestion[] = generated.data.map(({ id, type, text }) => ({ id, type, text }));
      const answers: Record<string, string> = {};
      generated.data.forEach((question) => {
        if (question.answer) answers[question.id] = question.answer;
      });
      setDraft((current) => ({ ...current, interviewId: readyInterviewId, questions, answers, evaluationMode: null }));
      onNavigate("consent");
    } finally {
      continuingRef.current = false;
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (hadContextRef.current && !draft.context) {
      // Troca de vaga por "Copiar link": a nova URL já está no campo e deve permanecer.
      if (!keepUrlOnContextClearRef.current) setUrl("");
      keepUrlOnContextClearRef.current = false;
      setStatus("idle");
      setError("");
      setConfirmed(false);
      setDescriptionExpanded(false);
    }
    hadContextRef.current = Boolean(draft.context);
  }, [draft.context]);

  // O prefill vale para esta abertura da tela; consumido, não reaparece depois.
  useEffect(() => {
    clearInterviewUrlPrefill();
  }, []);

  useEffect(() => () => {
    if (urlHighlightTimerRef.current !== null) window.clearTimeout(urlHighlightTimerRef.current);
  }, []);

  // Após copiar um link sugerido: rola até o campo de URL e o destaca por instantes.
  // Só foca o input com mouse/ponteiro preciso (no celular abriria o teclado).
  const handleSuggestedLinkCopied = (copiedUrl: string) => {
    // Guarda a URL conhecida no clique (sem ler o clipboard e sem requisição) e SEMPRE
    // a coloca no campo, substituindo a de outra vaga. Não analisa e não cria Interview.
    storeInterviewUrlPrefill(copiedUrl);
    const linkEffect = resolveLinkCopyEffect(copiedUrl, draft.context?.sourceUrl);
    if (linkEffect.invalidateContext) {
      // O contexto extraído era de OUTRA vaga: sai da tela e exige nova análise. A
      // Interview já criada no Back não é apagada; só deixa de ser a do fluxo atual
      // (o próximo "Analisar" já descarta o interviewId, como antes).
      clearAnswerDraftsForInterview(getCandidateIdentity(session).id, draft.interviewId);
      keepUrlOnContextClearRef.current = true;
      setDraft((current) => ({ ...current, interviewId: undefined, context: null, questions: [], answers: {}, evaluationMode: null }));
      setStatus("idle");
      setError("");
      setConfirmed(false);
      setDescriptionExpanded(false);
    }
    setUrl(linkEffect.nextUrl);
    setCopiedLinkUrl(linkEffect.nextUrl);
    const field = urlFieldRef.current;
    if (!field) return;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    field.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    const finePointer = window.matchMedia?.("(hover: hover) and (pointer: fine)").matches ?? false;
    if (finePointer) field.querySelector("input")?.focus({ preventScroll: true });
    setUrlHighlighted(true);
    if (urlHighlightTimerRef.current !== null) window.clearTimeout(urlHighlightTimerRef.current);
    urlHighlightTimerRef.current = window.setTimeout(() => setUrlHighlighted(false), 2500);
  };

  const contextReady = Boolean(draft.context && status === "success");

  // Após uma análise bem-sucedida, leva o usuário ao INÍCIO do card "Contexto extraído".
  // O flag é consumido aqui, então re-renders, edição de campos e análises com falha não rolam a página.
  useEffect(() => {
    if (!contextReady || !scrollToContextRef.current) return;
    scrollToContextRef.current = false;
    const card = contextCardRef.current;
    if (!card) return;
    // No layout de duas colunas (xl) o contexto já fica ao lado da URL; não rola se já estiver visível.
    const twoColumns = window.matchMedia?.("(min-width: 1280px)").matches ?? false;
    const rect = card.getBoundingClientRect();
    if (twoColumns && rect.top >= 0 && rect.top <= window.innerHeight * 0.5) return;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    card.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }, [contextReady, draft.context]);

  if (savedDraftAvailable && draft.context) {
    return (
      <AuthLayout
        current="interview-setup"
        onNavigate={onNavigate}
        title="Nova entrevista"
        subtitle="Retome ou cancele a entrevista em andamento"
      >
        <div className="w-full max-w-2xl space-y-5">
          <Card className="p-5 sm:p-6 border-blue-100 bg-blue-50">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-foreground">Você possui uma entrevista em andamento.</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Continue de onde parou em {draft.context.title} ou cancele a entrevista para iniciar uma nova.
                </p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Btn variant="primary" onClick={onContinueSavedDraft}>
                    Continuar entrevista
                  </Btn>
                  <Btn variant="outline" onClick={() => onCancelInterview?.()}>
                    Cancelar entrevista
                  </Btn>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </AuthLayout>
    );
  }

  // Ações da tela; renderizadas em um único ponto por vez (dentro do bloco de contexto ou ao final).
  const continueExistingFromSetup = async () => {
    if (!existingInProgress?.id || !onResumeInterview || resumingExisting) return;
    setResumingExisting(true);
    setResumeExistingError(null);
    const result = await onResumeInterview(existingInProgress.id);
    setResumingExisting(false);
    if (!result.ok) setResumeExistingError(result.message);
  };
  const setupActions = (
    <div className="flex flex-col gap-3">
      {existingInProgress && (
        <Alert variant="warning" role="alert" className="rounded-2xl p-4" data-testid="already-in-progress">
          <p className="text-sm font-semibold text-amber-800">{NEW_INTERVIEW_BLOCKED_MESSAGE}</p>
          {resumeExistingError && <p className="text-xs text-amber-700 mt-1">{resumeExistingError}</p>}
          {existingInProgress.id && onResumeInterview && (
            <Btn variant="primary" size="sm" className="mt-3" onClick={() => void continueExistingFromSetup()} disabled={resumingExisting}>
              {resumingExisting ? "Carregando..." : "Continuar entrevista"}
            </Btn>
          )}
        </Alert>
      )}
    <div className="flex gap-3">
      <Btn variant="outline" className="min-w-28 sm:min-w-32" onClick={() => isInterviewDraftInProgress(draft) ? onCancelInterview?.() : onCancelPreparation?.()}>Cancelar</Btn>
      <Btn variant="primary" onClick={handleContinue} disabled={!draft.context || !confirmed || generating} className="flex-1">
        {generating ? <><Spinner /> Gerando perguntas</> : <>Continuar <ArrowRight className="w-4 h-4" /></>}
      </Btn>
    </div>
    </div>
  );

  return (
    <AuthLayout
      current="interview-setup"
      onNavigate={onNavigate}
      title="Nova entrevista"
      subtitle="Cole a URL da vaga para contextualizar as perguntas"
    >
      <div
        className={
          contextReady
            ? "flex w-full max-w-2xl flex-col gap-5 xl:max-w-6xl xl:grid xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] xl:grid-rows-[auto_1fr] xl:items-start xl:gap-x-6 xl:gap-y-5"
            : "w-full max-w-2xl space-y-5"
        }
      >
        <Card className={contextReady ? "min-w-0 p-5 sm:p-6 xl:col-start-1 xl:row-start-1" : "p-5 sm:p-6"}>
          <div className="mb-4 flex items-start gap-3.5">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100"
            >
              <LinkIcon className="h-[1.125rem] w-[1.125rem]" />
            </span>
            <div className="min-w-0">
              <h3 className="font-bold text-foreground mb-0.5">URL da vaga</h3>
              <p className="text-sm text-muted-foreground">
                Cole aqui o link da vaga escolhida abaixo e toque em Analisar.
              </p>
            </div>
          </div>
          <div ref={urlFieldRef} className="flex flex-col sm:flex-row gap-3">
            <Input
              value={url}
              onChange={(event) => {
                setCopiedLinkUrl(null);
                setUrl(event.target.value);
              }}
              placeholder="https://www.empregare.com/pt-br/vaga/..."
              aria-label="URL da vaga"
              className={urlHighlighted ? "border-[#2563EB] shadow-[0_0_0_4px_rgba(37,99,235,0.2)]" : undefined}
            />
            <Btn variant="primary" onClick={handleAnalyze} disabled={status === "loading" || !url.trim()}>
              {status === "loading" ? <><Spinner /> Analisando</> : <>Analisar</>}
            </Btn>
          </div>
          <div role="status" aria-live="polite">
            {status !== "loading" && shouldShowCopiedLinkNotice(copiedLinkUrl, url) && (
              <p className="mt-3 text-sm font-medium text-blue-700">Link preenchido. Agora toque em Analisar.</p>
            )}
          </div>
          {status === "error" && (
            <Alert variant="error" className="mt-4 flex gap-3 rounded-2xl p-4">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </Alert>
          )}
        </Card>

        {draft.context && status === "success" && (
          <div className="min-w-0 space-y-4 xl:col-start-2 xl:row-start-1 xl:row-span-2">
            <div ref={contextCardRef} className="scroll-mt-24">
            <Card className="overflow-hidden rounded-2xl border-border bg-white p-0 shadow-sm">
              <div className="flex items-center gap-3 border-b border-border bg-slate-50 px-5 py-4 sm:px-6">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500 text-white shadow-sm"
                >
                  <FileText className="h-4 w-4" />
                </span>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Contexto extraído</p>
              </div>
              <div className="divide-y divide-border/40">
                <ContextInfoRow icon={Briefcase} label="Cargo">
                  <p className="break-words text-sm font-semibold leading-snug text-foreground sm:text-base">{draft.context.title}</p>
                </ContextInfoRow>
                <ContextInfoRow icon={Building2} label="Empresa">
                  <p className="break-words text-sm font-semibold leading-snug text-foreground sm:text-base">{draft.context.company}</p>
                </ContextInfoRow>
                {jobLocation && (
                  <ContextInfoRow icon={MapPin} label="Localização">
                    <p className="break-words text-sm font-semibold leading-snug text-foreground sm:text-base">{jobLocation}</p>
                  </ContextInfoRow>
                )}
                {jobContractType && (
                  <ContextInfoRow icon={FileBadge2} label="Tipo de contrato">
                    <p className="break-words text-sm font-semibold leading-snug text-foreground sm:text-base">{jobContractType}</p>
                  </ContextInfoRow>
                )}
                {jobWorkMode && (
                  <ContextInfoRow icon={Monitor} label="Modalidade">
                    <p className="break-words text-sm font-semibold leading-snug text-foreground sm:text-base">{jobWorkMode}</p>
                  </ContextInfoRow>
                )}
                {jobDescription && (
                  <ContextInfoRow icon={AlignLeft} label="Descrição">
                    <p
                      className="break-words text-sm leading-relaxed text-foreground/80"
                      style={
                        descriptionIsLong && !descriptionExpanded
                          ? {
                            display: "-webkit-box",
                            WebkitBoxOrient: "vertical",
                            WebkitLineClamp: 4,
                            overflow: "hidden",
                          }
                          : undefined
                      }
                    >
                      {draft.context.summary}
                    </p>
                    {descriptionIsLong && (
                      <button
                        type="button"
                        className="mt-2 text-xs font-semibold text-blue-700 hover:text-blue-800"
                        onClick={() => setDescriptionExpanded((current) => !current)}
                      >
                        {descriptionExpanded ? "Ver menos" : "Ver mais"}
                      </button>
                    )}
                  </ContextInfoRow>
                )}
                {requirementSections.map((section) => (
                  <ContextInfoRow key={section.title} icon={ListChecks} label={section.title}>
                    <ul className="space-y-2.5">
                      {section.items.map((requirement) => (
                        <li key={requirement} className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />
                          <span className="min-w-0 break-words">{requirement}</span>
                        </li>
                      ))}
                    </ul>
                  </ContextInfoRow>
                ))}
              </div>
            </Card>
            </div>

            <Card className="p-5 sm:p-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-0.5 rounded shrink-0" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
                <span className="text-sm text-foreground leading-relaxed">
                  Confirmo que este contexto será usado para configurar minha entrevista textual simulada.
                </span>
              </label>
            </Card>

            {setupActions}
          </div>
        )}

        <div className={contextReady ? "min-w-0 xl:col-start-1 xl:row-start-2" : undefined}>
          <SuggestedJobsSection onLinkCopied={handleSuggestedLinkCopied} />
        </div>

        {!contextReady && setupActions}
      </div>
    </AuthLayout>
  );
}

// ─── Fase A: ENT-004 Consentimento ───────────────────────────────────────────

function ConsentScreen({ onNavigate, draft }: { onNavigate: (s: Screen) => void; draft: InterviewDraft }) {
  const [consentRequired, setConsentRequired] = useState(false);
  const [consentOptional, setConsentOptional] = useState(false);

  if (!draft.context || draft.questions.length === 0) {
    return <DraftWizardGuard current="consent" onNavigate={onNavigate} />;
  }

  return (
    <AuthLayout
      current="consent"
      onNavigate={onNavigate}
      title="Consentimento"
      subtitle="Leia com atenção antes de iniciar a entrevista"
    >
      <div className="w-full max-w-2xl space-y-5">
        {/* Intro */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-foreground mb-1">Privacidade e uso de dados</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Para realizar a entrevista simulada, usaremos suas respostas textuais e o contexto da vaga para avaliação conforme a modalidade escolhida.
              </p>
            </div>
          </div>
          <Alert variant="warning" className="flex items-start gap-3 p-4">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              O texto jurídico/LGPD desta tela ainda está sujeito à validação. O ditado por voz, quando usado, serve apenas para preencher o texto no navegador e não gera armazenamento de áudio pelo RH Connect nesta etapa.
            </p>
          </Alert>
        </Card>

        {/* Consentimento obrigatório */}
        <Card className="p-5 sm:p-6">
          <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-4">Autorização obrigatória para participar</p>
          <label className="flex items-start gap-4 cursor-pointer group" onClick={() => setConsentRequired((current) => !current)}>
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-all shrink-0 ${consentRequired ? "bg-primary border-primary" : "border-border group-hover:border-primary/50"}`}>
              {consentRequired && <Check className="w-3 h-3 text-white" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground mb-1">Autorizo o uso das respostas textuais <span className="text-red-500">*</span></p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Autorizo o RH Connect a registrar minhas respostas textuais, associadas ao contexto da vaga de {draft.context?.title ?? "interesse"}, para avaliação conforme a modalidade escolhida. Entendo que esta autorização é necessária para usar a entrevista simulada.
              </p>
            </div>
          </label>
        </Card>

        {/* Consentimento opcional */}
        <Card className="p-5 sm:p-6">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Autorização opcional</p>
          <label className="flex items-start gap-4 cursor-pointer group" onClick={() => setConsentOptional((current) => !current)}>
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-all shrink-0 ${consentOptional ? "bg-primary border-primary" : "border-border group-hover:border-primary/50"}`}>
              {consentOptional && <Check className="w-3 h-3 text-white" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground mb-1">Uso anônimo para pesquisa com Inteligência Artificial</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Autorizo, de forma opcional, o uso anonimizado das minhas respostas e avaliações para desenvolvimento futuro de Inteligência Artificial supervisionada no RH Connect. Essa autorização é separada da anterior, completamente opcional e pode ser revogada nas configurações da conta.
              </p>
              <p className="text-xs text-blue-600 font-medium mt-2">Sua participação contribui para melhorar o sistema para todos os candidatos.</p>
            </div>
          </label>
        </Card>

        <div className="flex gap-3">
          <Btn variant="outline" onClick={() => onNavigate("interview-setup")}>Voltar</Btn>
          <Btn
            variant="primary"
            disabled={!consentRequired}
            onClick={() => onNavigate("evaluation-mode")}
            className="flex-1"
          >
            Concordar e continuar <ArrowRight className="w-4 h-4" />
          </Btn>
        </div>
        {!consentRequired && (
          <p className="text-xs text-center text-muted-foreground">A autorização obrigatória é necessária para prosseguir.</p>
        )}
      </div>
    </AuthLayout>
  );
}

function EvaluationModeScreen({
  onNavigate,
  draft,
  setDraft,
}: {
  onNavigate: (s: Screen) => void;
  draft: InterviewDraft;
  setDraft: Dispatch<SetStateAction<InterviewDraft>>;
}) {
  const evaluationMode = draft.evaluationMode;
  const [savingMode, setSavingMode] = useState(false);
  const savingModeRef = useRef(false);

  if (!draft.context || draft.questions.length === 0 || !draft.interviewId) {
    return <DraftWizardGuard current="evaluation-mode" onNavigate={onNavigate} />;
  }

  const selectEvaluationMode = (mode: EvaluationMode) => {
    setDraft((current) => ({ ...current, evaluationMode: mode }));
  };

  // A escolha só vale depois de gravada no Back (PATCH evaluation-mode); a cópia
  // no React é apenas para a UI. Em erro não avança.
  const handleContinueToPrep = async () => {
    if (!evaluationMode || savingModeRef.current || !draft.interviewId) return;
    savingModeRef.current = true;
    setSavingMode(true);
    try {
      const saved = await saveRealEvaluationMode(draft.interviewId, evaluationMode);
      if (!saved.ok) {
        toast.error(saved.message);
        return;
      }
      onNavigate("prep");
    } finally {
      savingModeRef.current = false;
      setSavingMode(false);
    }
  };

  return (
    <AuthLayout
      current="evaluation-mode"
      onNavigate={onNavigate}
      title="Modalidade de avaliação"
      subtitle="Escolha como sua entrevista será avaliada"
    >
      <div className="w-full max-w-2xl space-y-5">
        <Card className="p-5 sm:p-6">
          <h3 className="font-bold text-foreground mb-2">Como você quer receber a avaliação?</h3>
          <p className="text-sm text-muted-foreground mb-5">
            Escolha uma modalidade antes de iniciar as perguntas. A opção selecionada será usada no envio final.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => selectEvaluationMode("AI")}
              className={`text-left rounded-2xl border p-4 transition-all ${
                evaluationMode === "AI"
                  ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                  : "border-border bg-white hover:border-blue-200 hover:bg-blue-50/40"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${evaluationMode === "AI" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600"}`}>
                  <Zap className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">Avaliação por IA</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                    Receba uma análise automatizada da sua entrevista com pontos fortes, pontos de atenção e recomendações.
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => selectEvaluationMode("HUMAN")}
              className={`text-left rounded-2xl border p-4 transition-all ${
                evaluationMode === "HUMAN"
                  ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                  : "border-border bg-white hover:border-blue-200 hover:bg-blue-50/40"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${evaluationMode === "HUMAN" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600"}`}>
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">Avaliação humana</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                    Sua entrevista será enviada para um avaliador humano autorizado. O resultado ficará disponível em até 72 horas.
                  </p>
                </div>
              </div>
            </button>
          </div>
          {!evaluationMode && (
            <p className="text-xs text-amber-700 mt-3">Escolha uma modalidade para continuar.</p>
          )}
        </Card>

        <div className="flex gap-3">
          <Btn variant="outline" onClick={() => onNavigate("consent")}>Voltar</Btn>
          <Btn
            variant="primary"
            disabled={!evaluationMode || savingMode}
            onClick={() => void handleContinueToPrep()}
            className="flex-1"
          >
            {savingMode ? <><Spinner /> Salvando...</> : <>Continuar para orientações <ArrowRight className="w-4 h-4" /></>}
          </Btn>
        </div>
      </div>
    </AuthLayout>
  );
}

// ─── Fase A: ENT-008 Confirmação de Envio ─────────────────────────────────────

function InterviewConfirmScreen({
  onNavigate,
  draft,
  onDraftCompleted,
  onStaleExit,
}: {
  onNavigate: (s: Screen) => void;
  draft: InterviewDraft;
  session?: MockAuthSession;
  onDraftCompleted?: () => void;
  onStaleExit?: () => void;
}) {
  const routerNavigate = useNavigate();
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  // Outro dispositivo pode ter enviado/encerrado a entrevista (descoberto no foco ou no envio).
  const sessionGuard = useInterviewSessionGuard({ interviewId: draft.interviewId, pollStatus: true });
  const stale = sessionGuard.stale;
  const answeredCount = draft.questions.filter((question) => isValidInterviewAnswer(draft.answers[question.id])).length;
  const allAnswersReady = hasAllRequiredInterviewAnswers(draft);
  const evaluationMode = draft.evaluationMode;

  if (!draft.context || draft.questions.length === 0 || !draft.interviewId) {
    return <DraftWizardGuard current="interview-confirm" onNavigate={onNavigate} />;
  }

  const handleSend = async () => {
    if (sendingRef.current || stale) {
      return;
    }
    if (!allAnswersReady) {
      toast.error("Responda todas as perguntas antes de enviar.");
      return;
    }
    if (!evaluationMode) {
      toast.error("Escolha a modalidade de avaliação antes de enviar.");
      return;
    }
    sendingRef.current = true;
    setSending(true);

    // Envio REAL: POST /interviews/:id/submit. HUMAN => PENDING_ASSIGNMENT (fila do
    // Admin); AI => PENDING_AI_EVALUATION. Nenhuma avaliação por IA é executada aqui
    // (Fase 3 pausada) e nada é gravado em localStorage como entrevista oficial.
    const result = await submitRealInterview(draft.interviewId!, evaluationMode);
    sendingRef.current = false;
    setSending(false);
    if (!result.ok) {
      if (result.reason === "not_in_progress") {
        // Já enviada em outro dispositivo (com outra modalidade): bloqueia, sem voltar à edição.
        sessionGuard.markStale(result.interviewStatus);
        return;
      }
      toast.error(result.message);
      return;
    }
    // Envio concluído aqui OU já enviado antes (idempotente, mesma modalidade): o rascunho
    // local é descartado e nada é recriado.
    onDraftCompleted?.();
    // HUMAN confirmado pelo backend vai direto ao acompanhamento real (sem tela intermediária
    // nem clique em "Acompanhar"). AI mantém a tela de envio existente (Fase 3 pausada).
    routerNavigate(
      resolveSubmitDestination(result.data) === "status"
        ? `/candidate/interviews/${result.data.id}/status`
        : `/candidate/interviews/${result.data.id}/success`,
    );
  };

  return (
    <AuthLayout
      current="interview-confirm"
      onNavigate={onNavigate}
      title="Confirmar Envio"
      subtitle="Revise antes de enviar suas respostas"
    >
      <div className="w-full max-w-2xl space-y-5">
        {stale && <StaleInterviewNotice message={describeStaleInterview(sessionGuard.staleStatus)} status={sessionGuard.staleStatus} onBack={() => onStaleExit?.()} />}
        {/* Aviso */}
        <Alert variant="warning" className="flex items-start gap-3 rounded-2xl p-4">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800 mb-1">Atenção: esta ação não pode ser desfeita</p>
            <p className="text-xs text-amber-700 leading-relaxed">Após o envio, suas respostas serão registradas para avaliação conforme a modalidade escolhida. Você não poderá editar as respostas.</p>
          </div>
        </Alert>

        {!allAnswersReady && (
          <Alert variant="warning" className="flex items-start gap-3 rounded-2xl p-4">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">Responda todas as perguntas antes de enviar a entrevista.</p>
          </Alert>
        )}

        {/* Resumo das respostas */}
        <Card className="p-5 sm:p-6">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" /> Respostas preenchidas
          </h3>
          <div className="space-y-3">
            {draft.questions.map((q, i) => (
              <div key={q.id} className={`flex items-start gap-3 p-3 rounded-xl border ${isValidInterviewAnswer(draft.answers[q.id]) ? "bg-green-50 border-green-100" : "bg-amber-50 border-amber-100"}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isValidInterviewAnswer(draft.answers[q.id]) ? "bg-green-600" : "bg-amber-500"}`}>
                  {isValidInterviewAnswer(draft.answers[q.id]) ? (
                    <Check className="w-3 h-3 text-white" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-white" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground mb-0.5">Pergunta {i + 1}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{q.text}</p>
                  <p className={`text-[11px] font-medium mt-1 ${isValidInterviewAnswer(draft.answers[q.id]) ? "text-green-600" : "text-amber-700"}`}>
                    {isValidInterviewAnswer(draft.answers[q.id]) ? "Resposta preenchida" : "Resposta pendente"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Detalhes */}
        <Card className="p-5 sm:p-6">
          <h3 className="font-bold text-foreground mb-4">Detalhes do envio</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5">Vaga</p>
              <p className="text-sm font-semibold text-foreground">{draft.context?.title ?? "Vaga contextualizada"}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5">Empresa</p>
              <p className="text-sm font-semibold text-foreground">{draft.context?.company ?? "Empresa da vaga"}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground mb-0.5">Respostas</p>
              <p className="text-sm font-semibold text-foreground">{answeredCount} de {draft.questions.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h3 className="font-bold text-foreground mb-4">Modalidade escolhida</h3>
          <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              {evaluationMode === "AI" ? <Zap className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            <div>
              <EvaluationModeBadge mode={evaluationMode} />
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                {evaluationMode === "AI"
                  ? "Receba uma análise automatizada da sua entrevista com pontos fortes, pontos de atenção e recomendações."
                  : "Sua entrevista será enviada para um avaliador humano autorizado. O resultado ficará disponível em até 72 horas."}
              </p>
            </div>
          </div>
        </Card>

        <div className="flex gap-3">
          <Btn variant="outline" onClick={() => onNavigate("review")} disabled={stale}>Revisar novamente</Btn>
          <Btn
            variant="primary"
            onClick={handleSend}
            disabled={sending || !allAnswersReady || !evaluationMode || stale}
            className="flex-1"
          >
            {sending ? (
              <><Spinner /> Enviando...</>
            ) : (
              <><Send className="w-4 h-4" /> Enviar entrevista</>
            )}
          </Btn>
        </div>
      </div>
    </AuthLayout>
  );
}

// ─── Fase A: ENT-009 Entrevista Concluída ────────────────────────────────────

function InterviewDoneScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const routerNavigate = useNavigate();
  const { id } = useParams();
  const [loadState, setLoadState] = useState<{ status: "loading" } | { status: "error"; message: string } | { status: "ready"; interview: RealInterview }>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let cancelled = false;
    if (!id) {
      setLoadState({ status: "error", message: "Entrevista não encontrada." });
      return;
    }
    setLoadState({ status: "loading" });
    void getRealInterview(id).then((result) => {
      if (cancelled) return;
      setLoadState(result.ok ? { status: "ready", interview: result.data } : { status: "error", message: result.message });
    });
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);
  if (loadState.status === "loading") {
    return (
      <AuthLayout current="interview-done" onNavigate={onNavigate} title="Entrevista Concluída">
        <Card className="w-full max-w-xl p-10 text-center">
          <Spinner />
          <p className="text-sm text-muted-foreground mt-3">Carregando os dados do envio...</p>
        </Card>
      </AuthLayout>
    );
  }
  if (loadState.status === "error") {
    return (
      <AuthLayout current="interview-done" onNavigate={onNavigate} title="Entrevista Concluída">
        <EmptyState
          icon={MessageSquare}
          title="Não foi possível carregar o envio"
          description={loadState.message}
          className="w-full max-w-xl p-10"
          action={<Btn variant="primary" onClick={() => setReloadKey((key) => key + 1)}>Tentar novamente</Btn>}
        />
      </AuthLayout>
    );
  }
  const interview = loadState.interview;
  // HUMAN nunca fica nesta tela legada (nem por link/reload): o acompanhamento real a substitui.
  if (resolveSubmitDestination(interview) === "status") {
    return <Navigate to={`/candidate/interviews/${interview.id}/status`} replace />;
  }
  if (interview.status === "IN_PROGRESS") {
    return (
      <AuthLayout current="interview-done" onNavigate={onNavigate} title="Entrevista Concluída">
        <EmptyState
          icon={MessageSquare}
          title="Entrevista não encontrada"
          description="Acesse o histórico de entrevistas para acompanhar o envio das suas respostas."
          className="w-full max-w-xl p-10"
          action={<Btn variant="primary" onClick={() => onNavigate("interview-history")}>Ver histórico</Btn>}
        />
      </AuthLayout>
    );
  }
  const evaluationMode = interview?.evaluationMode ?? "HUMAN";
  const doneMessage = evaluationMode === "AI"
    ? "Suas respostas foram recebidas com sucesso e serão analisadas pela IA Avaliadora do RH Connect."
    : "Suas respostas foram recebidas com sucesso e serão encaminhadas para avaliação por um avaliador humano autorizado. O resultado ficará disponível em até 72 horas.";
  const nextSteps = evaluationMode === "AI"
    ? [
        "A IA Avaliadora analisará suas respostas e o contexto da vaga.",
        "Você receberá pontos fortes, pontos de atenção e recomendações.",
        "Acompanhe o status na seção Histórico de entrevistas.",
      ]
    : [
        "Um avaliador humano autorizado analisará suas respostas.",
        "O resultado ficará disponível em até 72 horas.",
        "Acesse o relatório na seção Histórico de entrevistas",
      ];
  return (
    <AuthLayout
      current="interview-done"
      onNavigate={onNavigate}
      title="Entrevista Concluída"
    >
      <div className="w-full max-w-xl">
        <Card className="p-6 sm:p-10 text-center">
          {/* Ícone de sucesso */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-2">Respostas enviadas!</h2>
          <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
            {doneMessage}
          </p>

          {/* Protocolo */}
          <div className="bg-muted rounded-xl p-4 mb-6 text-left">
            {/* Mobile: uma coluna (nada espremido); a partir de sm volta às duas colunas. */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">Protocolo</p>
                <p className="text-sm font-bold text-foreground break-words">{interview.id}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">Vaga</p>
                <p className="text-sm font-semibold text-foreground break-words">{interview.title}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">Enviado em</p>
                <p className="text-sm font-semibold text-foreground">{interview.submittedAt ? new Date(interview.submittedAt).toLocaleString("pt-BR") : "—"}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">Status</p>
                <StatusBadge tone="warning" className="w-fit max-w-full whitespace-normal">{interview.evaluationMode === "AI" ? "Aguardando avaliação por IA" : "Aguardando avaliação"}</StatusBadge>
              </div>
            </div>
          </div>

          {/* Próximos passos */}
          <div className="text-left bg-blue-50 rounded-xl p-4 mb-6">
            <p className="text-xs font-bold text-blue-700 mb-3">O que acontece agora?</p>
            <div className="space-y-2">
              {nextSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-[10px] text-white font-bold shrink-0 mt-0.5">{i + 1}</div>
                  <p className="text-xs text-muted-foreground">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Btn variant="outline" onClick={() => onNavigate("interview-history")} className="flex-1">
              <History className="w-4 h-4" /> Ver histórico
            </Btn>
            <Btn variant="primary" onClick={() => interview ? routerNavigate(`/candidate/interviews/${interview.id}/status`) : onNavigate("dashboard")} className="flex-1">
              <Home className="w-4 h-4" /> Acompanhar
            </Btn>
          </div>
        </Card>
      </div>
    </AuthLayout>
  );
}

// ─── Fase B: AUT-003 Verificação de E-mail ───────────────────────────────────

function EmailVerifyScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-md">
        <Card className="p-6 sm:p-8 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <Send className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-xl font-extrabold text-foreground mb-2">Verifique seu e-mail</h1>
          <p className="text-sm text-muted-foreground mb-1">Enviamos um link de confirmação para:</p>
          <p className="font-bold text-foreground text-sm mb-6">o e-mail informado no cadastro</p>
          <div className="bg-muted rounded-xl p-4 text-left mb-6">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Abra seu e-mail e clique no link de confirmação. Se não encontrar, verifique a pasta de spam ou lixo eletrônico.
            </p>
          </div>
          <div className="space-y-3">
            <Btn variant="primary" className="w-full" onClick={() => onNavigate("candidate-onboarding")}>
              Já confirmei meu e-mail
            </Btn>
            <Btn variant="outline" className="w-full" onClick={() => toast.info("E-mail reenviado! Verifique sua caixa de entrada.")}>
              <RotateCcw className="w-4 h-4" /> Reenviar e-mail
            </Btn>
          </div>
          <button onClick={() => onNavigate("auth")} className="mt-4 text-xs text-primary font-semibold hover:underline">
            Usar outro e-mail
          </button>
        </Card>
      </div>
    </div>
  );
}

// ─── Fase B: AUT-004 Recuperação de Senha ────────────────────────────────────

function ForgotPasswordScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-md">
        <Card className="overflow-hidden">
          <div className="px-6 py-5 border-b border-border flex items-center gap-3">
            <button onClick={() => onNavigate("auth")} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="font-bold text-foreground text-base">Recuperar senha</h1>
              <p className="text-xs text-muted-foreground">Enviaremos um link de redefinição</p>
            </div>
          </div>
          <div className="p-6">
            {!sent ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Informe o e-mail cadastrado na sua conta. Enviaremos as instruções para criar uma nova senha.
                </p>
                <Field label="E-mail" type="email" placeholder="nome@gmail.com" required />
                <Btn variant="primary" className="w-full !py-3" onClick={() => setSent(true)}>
                  Enviar instruções
                </Btn>
                <p className="text-xs text-center text-muted-foreground">
                  Por segurança, a mensagem exibida é a mesma independentemente de o e-mail estar cadastrado ou não.
                </p>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-7 h-7 text-green-600" />
                </div>
                <p className="font-bold text-foreground mb-2">Instruções enviadas</p>
                <p className="text-sm text-muted-foreground mb-5">Se esse e-mail estiver cadastrado, você receberá as instruções em breve. Verifique também a pasta de spam.</p>
                <Btn variant="primary" className="w-full" onClick={() => onNavigate("auth")}>
                  Voltar ao login
                </Btn>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Fase B: AUT-005 Redefinição de Senha ────────────────────────────────────

function ResetPasswordScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-md">
        <Card className="overflow-hidden">
          <div className="px-6 py-5 border-b border-border">
            <h1 className="font-bold text-foreground text-base">Criar nova senha</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Escolha uma senha segura para sua conta</p>
          </div>
          <div className="p-6 space-y-4">
            <Field label="Nova senha" type="password" placeholder="Mínimo 8 caracteres" hint="Use letras, números e símbolos para maior segurança." required />
            <Field label="Confirmar nova senha" type="password" placeholder="Repita a senha" required />
            {/* Indicador de força */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Força da senha</p>
              <div className="flex gap-1">
                {["Fraca","Média","Forte","Muito forte"].map((l, i) => (
                  <div key={l} className={`h-1.5 flex-1 rounded-full ${i < 2 ? "bg-amber-400" : "bg-muted"}`} />
                ))}
              </div>
              <p className="text-xs text-amber-600 font-medium mt-1">Senha média — adicione símbolos para melhorar.</p>
            </div>
            <Btn variant="primary" className="w-full !py-3" onClick={() => onNavigate("auth")}>
              Redefinir senha
            </Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Fase C: LEG-001 Termos de Uso ───────────────────────────────────────────

function LegalPageLayout({
  current,
  title,
  updatedAt,
  introduction,
  indexItems,
  session,
  onNavigate,
  children,
}: {
  current: LegalDocumentKey;
  title: string;
  updatedAt: string;
  introduction: string;
  indexItems: LegalIndexItem[];
  session: MockAuthSession;
  onNavigate: (s: Screen) => void;
  children: ReactNode;
}) {
  const routerNavigate = useNavigate();
  const location = useLocation();
  const legalOrigin = resolveLegalOrigin((location.state as { from?: string } | null)?.from);

  const sectionIds = indexItems.map((item) => item.id);
  const activeSectionId = useLegalActiveSection(sectionIds);
  useLegalHashScroll(sectionIds);

  const openTerms = () => onNavigate("terms");
  const openPrivacy = () => onNavigate("privacy");
  const isAuthenticated = session.authenticated && Boolean(session.user);

  return (
    <div className="flex min-h-screen flex-col bg-white text-foreground">
      <LegalHeader
        authenticated={isAuthenticated}
        onOpenHome={() => onNavigate("landing")}
        onOpenLogin={() => onNavigate("auth")}
        onOpenRegister={() => onNavigate("register")}
        onOpenArea={() => routerNavigate(getEntryPathForSession(session))}
        backAction={legalOrigin ? { label: legalOrigin.label, onClick: () => routerNavigate(legalOrigin.path) } : undefined}
      />

      <LegalHero title={title} subtitle={introduction} updatedAt={updatedAt} />
      <LegalDocumentSwitch current={current} onOpenTerms={openTerms} onOpenPrivacy={openPrivacy} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-10 sm:px-8 sm:pb-20 sm:pt-14">
        <div className="lg:grid lg:grid-cols-[230px_minmax(0,1fr)] lg:items-start lg:gap-16">
          <aside className="hidden lg:sticky lg:top-24 lg:block lg:[@media(max-height:760px)]:top-20 lg:[@media(max-height:420px)]:static">
            <LegalSidebarIndex items={indexItems} activeId={activeSectionId} />
          </aside>
          <div className="min-w-0 max-w-[780px]">
            <div className="mb-8 lg:hidden">
              <LegalMobileIndex items={indexItems} activeId={activeSectionId} />
            </div>
            {children}
          </div>
        </div>
      </main>

      <LandingFooter
        onNavigate={(screen) => onNavigate(screen)}
        contentMaxWidthClassName="max-w-[68rem]"
      />
      <BackToTop />
    </div>
  );
}

function LegalDocumentScreen({
  current,
  document,
  description,
  onNavigate,
  session,
}: {
  current: LegalDocumentKey;
  document: LegalDocument;
  description: string;
  onNavigate: (s: Screen) => void;
  session: MockAuthSession;
}) {
  return (
    <LegalPageLayout
      current={current}
      title={document.title}
      updatedAt={`Última atualização: ${document.updatedAt}`}
      introduction={description}
      indexItems={getLegalIndexItems(document)}
      session={session}
      onNavigate={onNavigate}
    >
      <LegalDocumentContent document={document} />
    </LegalPageLayout>
  );
}

function TermsScreen({ onNavigate, session }: { onNavigate: (s: Screen) => void; session: MockAuthSession }) {
  return (
    <LegalDocumentScreen
      current="terms"
      document={termsOfUse}
      description="Consulte as condições, responsabilidades e diretrizes para utilização da plataforma RH Connect."
      onNavigate={onNavigate}
      session={session}
    />
  );
}

// ─── Fase C: LEG-002 Política de Privacidade ─────────────────────────────────

function PrivacyScreen({ onNavigate, session }: { onNavigate: (s: Screen) => void; session: MockAuthSession }) {
  return (
    <LegalDocumentScreen
      current="privacy"
      document={privacyPolicy}
      description="Consulte como o RH Connect trata dados pessoais e quais são os direitos relacionados à privacidade."
      onNavigate={onNavigate}
      session={session}
    />
  );
}

// ─── Download icon (não disponível no lucide-react desta versão) ─────────────
const Download = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

// ─── Fase C: CFG-001 Configurações do Candidato (completo) ───────────────────

type SettingsTab = "conta" | "senha" | "notif" | "privacidade" | "consentimentos" | "dados" | "excluir";

function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label?: string }) {
  return <Switch checked={on} onCheckedChange={() => onToggle()} aria-label={label} />;
}

function ConfirmModal({
  title, message, confirmLabel, cancelLabel = "Cancelar", danger = false, showCloseButton = false, showCancel = true, initialFocus, dismissOnBackdrop = false, onConfirm, onCancel, onClose, children,
}: {
  title: string; message: string; confirmLabel: string;
  cancelLabel?: string;
  showCloseButton?: boolean;
  // Informativa: false oculta a ação secundária e deixa só a ação principal.
  showCancel?: boolean;
  /** Ação segura que recebe o foco ao abrir (padrão: a secundária). Nunca use uma ação destrutiva. */
  initialFocus?: ConfirmInitialFocus;
  /** Clique na área escura fora do modal = mesmo dismiss do X/Esc (nunca confirma nem cancela nada). Opt-in. */
  dismissOnBackdrop?: boolean;
  /** @deprecated Sem efeito: as ações sempre têm larguras iguais no desktop. */
  equalActionWidths?: boolean;
  danger?: boolean; onConfirm: () => void; onCancel: () => void;
  onClose?: () => void;
  children?: ReactNode;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  // Esc (e o X) usam o mesmo caminho de fechamento que já existia: onClose ?? onCancel.
  const dismiss = onClose ?? onCancel;
  // Toque: o foco programático inicial não deve parecer "seleção"; teclado (Tab) volta a mostrar o ring.
  const [keyboardUsed, setKeyboardUsed] = useState(false);
  const coarsePointer = typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
  const focusRing = shouldHideInitialFocusRing({ coarsePointer, keyboardUsed }) ? CONFIRM_MODAL_HIDDEN_FOCUS_RING : null;
  // Mobile: empilhadas, w-full. Desktop: as ações dividem a largura igualmente (sm:flex-1).
  const actionClass = "min-h-11 w-full whitespace-normal sm:min-h-10 sm:flex-1";

  return (
    <AlertDialog open onOpenChange={(open) => { if (!open) dismiss(); }}>
      <AlertDialogContent
        className="max-h-[90dvh] overflow-y-auto overscroll-contain sm:max-w-md"
        onOverlayClick={dismissOnBackdrop ? dismiss : undefined}
        onKeyDownCapture={(event) => { if (event.key === "Tab") setKeyboardUsed(true); }}
        onOpenAutoFocus={(event) => {
          // Foco inicial seguro (nunca a ação destrutiva); na informativa, a única ação.
          event.preventDefault();
          const target = resolveInitialFocus({ showCancel, initialFocus }) === "confirm" ? confirmRef : cancelRef;
          // preventScroll: sem isso o navegador rola a página para "revelar" o botão focalizado.
          target.current?.focus({ preventScroll: true });
        }}
      >
        {showCloseButton && (
          <button
            type="button"
            onClick={dismiss}
            className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground outline-none focus-visible:ring-[4px] focus-visible:ring-[rgba(29,78,216,0.24)]"
            aria-label="Fechar"
            title="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <AlertDialogHeader className="items-center sm:text-center">
          <div className={`mb-2 flex h-12 w-12 items-center justify-center rounded-full ${danger ? "bg-red-50" : "bg-amber-50"}`}>
            <AlertCircle className={`h-6 w-6 ${danger ? "text-red-500" : "text-amber-500"}`} />
          </div>
          <AlertDialogTitle className="text-center text-base font-bold text-foreground">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-center text-sm leading-relaxed">{message}</AlertDialogDescription>
        </AlertDialogHeader>
        {children && <div>{children}</div>}
        <AlertDialogFooter className="gap-3">
          {showCancel && (
            <button ref={cancelRef} type="button" onClick={onCancel} className={cn(buttonVariants({ variant: "outline" }), actionClass, CONFIRM_MODAL_FOCUS_RING, focusRing)}>
              {cancelLabel}
            </button>
          )}
          <button ref={confirmRef} type="button" onClick={onConfirm} className={cn(buttonVariants({ variant: danger ? "destructive" : "primary" }), actionClass, danger ? CONFIRM_MODAL_DANGER_FOCUS_RING : CONFIRM_MODAL_FOCUS_RING, focusRing)}>
            {confirmLabel}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SettingsScreen({ onNavigate, session }: { onNavigate: (s: Screen) => void; session: MockAuthSession }) {
  const candidateUser = session.user?.role === "CANDIDATE" ? session.user : null;
  const candidateIdentity = getCandidateIdentity(session);
  const account = getCandidateAccountConfig(candidateUser);
  const [settingsSearchParams, setSettingsSearchParams] = useSearchParams();
  const [tab, setTabState] = useState<SettingsTab>(() => {
    const requestedTab = settingsSearchParams.get("tab");
    return isSettingsTabKey(requestedTab) ? requestedTab : "conta";
  });
  // A aba ativa fica na URL (?tab=) para que o retorno dos documentos legais a restaure.
  const setTab = (nextTab: SettingsTab) => {
    setTabState(nextTab);
    setSettingsSearchParams(nextTab === "conta" ? {} : { tab: nextTab }, { replace: true });
  };
  const [notifs, setNotifs] = useState({ resultado: true, novidades: false, dicas: true, email: true });
  const [consentIA, setConsentIA] = useState(false);
  const [modal, setModal] = useState<null | "senha" | "revogar-ia" | "excluir-dados" | "excluir-conta" | "conta-excluida" | "senha-alterada">(null);
  const [senhaEtapa, setSenhaEtapa] = useState<"form" | "confirmado">("form");

  const TABS: [SettingsTab, string][] = [
    ["conta","Dados da conta"],
    ["senha","Senha e segurança"],
    ["notif","Notificações"],
    ["privacidade","Privacidade"],
    ["consentimentos","Consentimentos"],
    ["dados","Dados e respostas"],
    ["excluir","Excluir conta"],
  ];

  return (
    <AuthLayout
      current="settings"
      onNavigate={onNavigate}
      title="Configurações"
      subtitle="Gerencie suas preferências de conta"
      account={account}
    >
      <div className="w-full flex flex-col lg:flex-row gap-6">
        {/* Sidebar de abas */}
        <div className="lg:w-56 shrink-0">
          <Card className="p-2">
            {TABS.map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                aria-pressed={tab === id}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${tab === id ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                {id === "excluir" && <Trash2 className="w-3.5 h-3.5 shrink-0" />}
                {id === "senha" && <Lock className="w-3.5 h-3.5 shrink-0" />}
                {id === "dados" && <Database className="w-3.5 h-3.5 shrink-0" />}
                {id === "consentimentos" && <Shield className="w-3.5 h-3.5 shrink-0" />}
                {id === "privacidade" && <Eye className="w-3.5 h-3.5 shrink-0" />}
                {id === "notif" && <Bell className="w-3.5 h-3.5 shrink-0" />}
                {id === "conta" && <User className="w-3.5 h-3.5 shrink-0" />}
                <span className="leading-snug">{label}</span>
              </button>
            ))}
          </Card>
        </div>

        {/* Conteúdo da aba */}
        <div className="flex-1 min-w-0">

          {/* ── Conta ── */}
          {tab === "conta" && (
            <Card className="p-5 sm:p-6 space-y-5">
              <div>
                <h3 className="font-bold text-foreground mb-0.5">Dados da conta</h3>
                <p className="text-xs text-muted-foreground">Informações que identificam você na plataforma.</p>
              </div>
              <div className="flex items-center gap-4 pb-4 border-b border-border">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {getInitials(candidateIdentity.name)}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{candidateIdentity.name}</p>
                  <p className="text-xs text-muted-foreground">{candidateIdentity.email}</p>
                </div>
              </div>
              <Field label="Nome completo" defaultValue={candidateIdentity.name} />
              <Field label="E-mail" type="email" defaultValue={candidateIdentity.email} hint="Você receberá um e-mail de verificação para confirmar a alteração." />
              <div className="flex gap-3 pt-2">
                <Btn variant="primary">Salvar alterações</Btn>
                <Btn variant="outline">Cancelar</Btn>
              </div>
            </Card>
          )}

          {/* ── Senha ── */}
          {tab === "senha" && (
            <div className="space-y-4">
              <Card className="p-5 sm:p-6 space-y-5">
                <div>
                  <h3 className="font-bold text-foreground mb-0.5">Alterar senha</h3>
                  <p className="text-xs text-muted-foreground">Use uma senha forte com pelo menos 8 caracteres.</p>
                </div>
                <Field label="Senha atual" type="password" placeholder="Sua senha atual" required />
                <Field label="Nova senha" type="password" placeholder="Mínimo 8 caracteres" required />
                <Field label="Confirmar nova senha" type="password" placeholder="Repita a nova senha" required />
                {/* Indicador de força */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Força da senha</p>
                  <div className="flex gap-1 mb-1">
                    {["Fraca","Média","Forte","Muito forte"].map((l, i) => (
                      <div key={l} className={`h-1.5 flex-1 rounded-full ${i < 2 ? "bg-amber-400" : "bg-muted"}`} />
                    ))}
                  </div>
                  <p className="text-xs text-amber-600 font-medium">Senha média — adicione símbolos para aumentar a segurança.</p>
                </div>
                <Btn variant="primary" onClick={() => setModal("senha")}>Alterar senha</Btn>
              </Card>
              <Card className="p-5 sm:p-6">
                <h3 className="font-bold text-foreground mb-4">Segurança adicional</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4 py-2 border-b border-border">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Sessões ativas</p>
                      <p className="text-xs text-muted-foreground">1 dispositivo ativo · Último acesso há 5 min</p>
                    </div>
                    <Btn variant="outline" size="sm">Encerrar outras sessões</Btn>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Recuperação de senha</p>
                      <p className="text-xs text-muted-foreground">{candidateIdentity.email}</p>
                    </div>
                    <Btn variant="outline" size="sm">Alterar e-mail</Btn>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ── Notificações ── */}
          {tab === "notif" && (
            <Card className="p-5 sm:p-6 space-y-5">
              <div>
                <h3 className="font-bold text-foreground mb-0.5">Notificações</h3>
                <p className="text-xs text-muted-foreground">Escolha quais notificações deseja receber.</p>
              </div>

              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Atividade da conta</p>
                <div className="space-y-1">
                  {[
                    { key: "resultado" as const,  label: "Resultado disponível",    desc: "Notificar quando seu resultado for publicado" },
                    { key: "dicas" as const,      label: "Dicas de preparação",     desc: "Conteúdo selecionado para o seu objetivo" },
                    { key: "novidades" as const,  label: "Novidades da plataforma", desc: "Informações sobre novas funcionalidades" },
                  ].map(n => (
                    <div key={n.key} className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{n.label}</p>
                        <p className="text-xs text-muted-foreground">{n.desc}</p>
                      </div>
                      <Toggle on={notifs[n.key]} onToggle={() => setNotifs(p => ({ ...p, [n.key]: !p[n.key] }))} label={n.label} />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Canal de entrega</p>
                <div className="space-y-1">
                  {[
                    { key: "email" as const, label: "E-mail", desc: candidateIdentity.email },
                  ].map(n => (
                    <div key={n.key} className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{n.label}</p>
                        <p className="text-xs text-muted-foreground">{n.desc}</p>
                      </div>
                      <Toggle on={notifs[n.key]} onToggle={() => setNotifs(p => ({ ...p, [n.key]: !p[n.key] }))} label={n.label} />
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* ── Privacidade ── */}
          {tab === "privacidade" && (
            <div className="space-y-4">
              <Card className="p-5 sm:p-6 space-y-4">
                <div>
                  <h3 className="font-bold text-foreground mb-0.5">Privacidade de dados</h3>
                  <p className="text-xs text-muted-foreground">Entenda como seus dados são usados no RH Connect.</p>
                </div>
                {[
                  { titulo: "Dados do perfil", desc: "Nome e e-mail são usados para identificação na plataforma.", badge: "Necessário" },
                  { titulo: "Respostas de entrevista", desc: "Armazenadas com segurança e acessadas exclusivamente por avaliadores autorizados.", badge: "Necessário" },
                  { titulo: "Histórico de entrevistas", desc: "Mantido na conta para consulta de relatórios e evolução.", badge: "Necessário" },
                  { titulo: "Dados analíticos", desc: "Uso interno para melhoria da plataforma. Não inclui identificação pessoal.", badge: "Opcional" },
                ].map(d => (
                  <div key={d.titulo} className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{d.titulo}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{d.desc}</p>
                    </div>
                    <UIBadge variant={d.badge === "Necessário" ? "primary" : "neutral"}>{d.badge}</UIBadge>
                  </div>
                ))}
              </Card>
              <Card className="p-5 sm:p-6">
                <h3 className="font-bold text-foreground mb-1">Documentos de privacidade</h3>
                <p className="text-xs text-muted-foreground mb-4">Consulte os termos que regem o uso dos seus dados.</p>
                <div className="flex flex-wrap gap-2">
                  <Btn variant="outline" size="sm" onClick={() => onNavigate("privacy")}>
                    <FileText className="w-3.5 h-3.5" /> Política de privacidade
                  </Btn>
                  <Btn variant="outline" size="sm" onClick={() => onNavigate("terms")}>
                    <FileText className="w-3.5 h-3.5" /> Termos de uso
                  </Btn>
                </div>
              </Card>
            </div>
          )}

          {/* ── Consentimentos ── */}
          {tab === "consentimentos" && (
            <div className="space-y-4">
              <Card className="p-5 sm:p-6 space-y-4">
                <div>
                  <h3 className="font-bold text-foreground mb-0.5">Seus consentimentos</h3>
                  <p className="text-xs text-muted-foreground">Gerencie as autorizações que você concedeu ao RH Connect.</p>
                </div>

                {/* Consentimento obrigatório */}
                <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">Uso das respostas textuais para avaliação</p>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Autorização para registrar suas respostas textuais e disponibilizá-las para avaliação conforme a modalidade escolhida. Este consentimento é obrigatório para usar o sistema.</p>
                        <p className="text-xs text-green-600 font-semibold mt-1.5">Autorizado no cadastro</p>
                      </div>
                    </div>
                    <StatusBadge tone="success">Ativo</StatusBadge>
                  </div>
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <p className="text-xs text-muted-foreground">Para revogar este consentimento, é necessário solicitar a exclusão da conta na seção correspondente.</p>
                  </div>
                </div>

                {/* Consentimento opcional de IA */}
                <div className={`p-4 rounded-2xl border ${consentIA ? "bg-purple-50 border-purple-100" : "bg-muted/50 border-border"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${consentIA ? "bg-purple-100" : "bg-muted"}`}>
                        <Zap className={`w-4 h-4 ${consentIA ? "text-purple-600" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">Uso anônimo para pesquisa com Inteligência Artificial</p>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Uso anonimizado das suas avaliações para desenvolvimento futuro de IA supervisionada. Completamente opcional.</p>
                        {consentIA && <p className="text-xs text-purple-600 font-semibold mt-1.5">Autorizado</p>}
                        {!consentIA && <p className="text-xs text-muted-foreground font-medium mt-1.5">Não autorizado</p>}
                      </div>
                    </div>
                    <Badge variant={consentIA ? "purple" : "default"}>{consentIA ? "Ativo" : "Inativo"}</Badge>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border flex gap-2">
                    {consentIA ? (
                      <Btn variant="outline" size="sm" onClick={() => setModal("revogar-ia")}>
                        <X className="w-3.5 h-3.5" /> Revogar autorização
                      </Btn>
                    ) : (
                      <Btn variant="secondary" size="sm" onClick={() => setConsentIA(true)}>
                        <Check className="w-3.5 h-3.5" /> Autorizar uso opcional
                      </Btn>
                    )}
                  </div>
                </div>
              </Card>

              <Alert variant="info" className="flex items-start gap-3 rounded-2xl p-4">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 leading-relaxed">
                  Você pode revogar os consentimentos opcionais a qualquer momento. As revogações entram em vigor de forma imediata e não afetam dados já coletados anteriormente.
                </p>
              </Alert>
            </div>
          )}

          {/* ── Dados e respostas ── */}
          {tab === "dados" && (
            <div className="space-y-4">
              <Card className="p-5 sm:p-6 space-y-4">
                <div>
                  <h3 className="font-bold text-foreground mb-0.5">Seus dados e respostas</h3>
                  <p className="text-xs text-muted-foreground">Veja o que está armazenado e exerça seus direitos.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-muted rounded-xl text-center">
                    <p className="text-lg font-bold text-foreground">3</p>
                    <p className="text-xs text-muted-foreground">Entrevistas enviadas</p>
                  </div>
                  <div className="p-3 bg-muted rounded-xl text-center">
                    <p className="text-lg font-bold text-foreground">15</p>
                    <p className="text-xs text-muted-foreground">Respostas textuais</p>
                  </div>
                  <div className="p-3 bg-muted rounded-xl text-center">
                    <p className="text-lg font-bold text-foreground">3</p>
                    <p className="text-xs text-muted-foreground">Relatórios</p>
                  </div>
                </div>
              </Card>

              <Card className="p-5 sm:p-6 space-y-3">
                <h3 className="font-bold text-foreground">Solicitar cópia dos dados</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Você pode solicitar um arquivo com seus dados cadastrais, contexto das entrevistas, respostas textuais e metadados disponíveis.</p>
                <Btn variant="outline" size="sm" onClick={() => {}}>
                  <Download className="w-3.5 h-3.5" /> Solicitar cópia dos meus dados
                </Btn>
                <p className="text-xs text-muted-foreground">O arquivo será preparado em até 72 horas e enviado para seu e-mail cadastrado.</p>
              </Card>

              <Card className="p-5 sm:p-6 space-y-3">
                <h3 className="font-bold text-foreground">Exclusão de respostas</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Respostas vinculadas a entrevistas podem exigir regras de retenção, histórico e auditoria. Esta política ainda depende de validação jurídica e operacional.</p>
                <Btn variant="outline" size="sm" onClick={() => setModal("excluir-dados")}>
                  <Trash2 className="w-3.5 h-3.5" /> Solicitar exclusão das respostas
                </Btn>
                <p className="text-xs text-amber-600 font-medium">A exclusão de respostas pode afetar histórico e relatórios associados.</p>
              </Card>
            </div>
          )}

          {/* ── Excluir conta ── */}
          {tab === "excluir" && (
            <div className="space-y-4">
              <Alert variant="destructive" className="flex items-start gap-3 rounded-2xl p-4 sm:p-5">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-800 mb-1">Atenção: esta ação é permanente</p>
                  <p className="text-xs text-red-700 leading-relaxed">
                    A exclusão da conta remove permanentemente seus dados cadastrais, histórico de entrevistas e relatórios. Esta ação não pode ser desfeita.
                  </p>
                </div>
              </Alert>

              <Card className="p-5 sm:p-6 space-y-4">
                <h3 className="font-bold text-foreground">O que acontece ao excluir sua conta</h3>
                <div className="space-y-2">
                  {[
                    "Seus dados cadastrais (nome e e-mail) serão removidos permanentemente.",
                    "Seu histórico de entrevistas e relatórios serão excluídos.",
                    "As respostas textuais elegíveis serão removidas conforme política de retenção.",
                    "Todos os consentimentos serão automaticamente revogados.",
                    "Você perderá acesso à plataforma imediatamente.",
                    "Dados retidos por obrigação legal permanecerão pelo prazo mínimo exigido.",
                  ].map((i, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <X className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">{i}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5 sm:p-6 space-y-4">
                <h3 className="font-bold text-foreground">Antes de excluir, considere</h3>
                <div className="space-y-3">
                  <Btn variant="outline" className="w-full sm:w-auto" onClick={() => onNavigate("interview-history")}>
                    <History className="w-4 h-4" /> Consultar meu histórico
                  </Btn>
                  <Btn variant="outline" className="w-full sm:w-auto" onClick={() => setTab("dados")}>
                    <Download className="w-4 h-4" /> Solicitar cópia dos dados
                  </Btn>
                  <Btn variant="outline" className="w-full sm:w-auto" onClick={() => setTab("consentimentos")}>
                    <Shield className="w-4 h-4" /> Revogar apenas o consentimento de IA
                  </Btn>
                </div>
              </Card>

              <Card className="p-5 sm:p-6">
                <h3 className="font-bold text-red-700 mb-3">Excluir minha conta</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Confirme sua senha para iniciar o processo de exclusão. A exclusão será processada em até 30 dias conforme nossa política.
                </p>
                <Field label="Confirme sua senha" type="password" placeholder="Sua senha atual" required />
                <div className="mt-4">
                  <Btn variant="danger" onClick={() => setModal("excluir-conta")}>
                    <Trash2 className="w-4 h-4" /> Excluir minha conta permanentemente
                  </Btn>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* ── Modais de confirmação ── */}
      {modal === "senha" && (
        <ConfirmModal
          title="Confirmar alteração de senha"
          message="Sua senha será alterada e você receberá uma confirmação por e-mail. Todas as outras sessões ativas serão encerradas."
          confirmLabel="Alterar senha"
          onConfirm={() => { setModal("senha-alterada"); }}
          onCancel={() => setModal(null)}
        />
      )}
      {modal === "senha-alterada" && (
        <ConfirmModal
          title="Senha alterada com sucesso"
          message="Sua senha foi atualizada. Use a nova senha no próximo acesso."
          confirmLabel="Entendido"
          showCancel={false}
          danger={false}
          onConfirm={() => setModal(null)}
          onCancel={() => setModal(null)}
        />
      )}
      {modal === "revogar-ia" && (
        <ConfirmModal
          title="Revogar autorização de IA?"
          message="Ao revogar, seus dados não serão mais utilizados em pesquisas futuras. Dados já processados não podem ser removidos retroativamente."
          confirmLabel="Revogar autorização"
          onConfirm={() => { setConsentIA(false); setModal(null); }}
          onCancel={() => setModal(null)}
        />
      )}
      {modal === "excluir-dados" && (
        <ConfirmModal
          title="Solicitar exclusão das respostas?"
          message="As respostas elegíveis serão tratadas conforme política de retenção, histórico e auditoria ainda sujeita à validação jurídica. Esta ação pode afetar relatórios associados."
          confirmLabel="Solicitar exclusão"
          danger
          onConfirm={() => setModal(null)}
          onCancel={() => setModal(null)}
        />
      )}
      {modal === "excluir-conta" && (
        <ConfirmModal
          title="Excluir conta permanentemente?"
          message="Esta ação é irreversível. Todos os seus dados, entrevistas, respostas e relatórios serão excluídos em até 30 dias, conforme política aplicável."
          confirmLabel="Sim, excluir minha conta"
          danger
          onConfirm={() => { setModal("conta-excluida"); }}
          onCancel={() => setModal(null)}
        />
      )}
      {modal === "conta-excluida" && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(15,27,45,0.7)" }}>
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm text-center shadow-2xl">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="font-bold text-foreground text-lg mb-2">Solicitação registrada</h3>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Sua solicitação de exclusão foi registrada e será processada em até 30 dias. Você receberá uma confirmação por e-mail.
            </p>
            <Btn variant="primary" className="w-full" onClick={() => { setModal(null); onNavigate("auth"); }}>
              Sair da plataforma
            </Btn>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}


// ─── CAN-010 Biblioteca de Materiais ─────────────────────────────────────────

type MaterialCardView = SupportMaterial & MaterialUserState;

function materialTypeLabel(type: SupportMaterial["type"]) {
  return type === "READING" ? "Leitura" : type;
}

function materialStatusLabel(status: MaterialStatus) {
  const labels = {
    NOT_STARTED: "Não iniciado",
    IN_PROGRESS: "Em andamento",
    COMPLETED: "Concluído",
  } satisfies Record<MaterialStatus, string>;
  return labels[status];
}

function mergeMaterialsWithUserState(candidateId: string, userStates: MaterialUserState[]): MaterialCardView[] {
  return SUPPORT_MATERIALS.map((material) => {
    const userState = userStates.find((item) => item.materialId === material.id) ?? getMaterialUserState(candidateId, material.id);
    return {
      ...material,
      ...userState,
    };
  });
}

function sortMaterialsByLastAccess(items: MaterialCardView[]) {
  return [...items]
    .filter((item) => Boolean(item.lastAccessedAt))
    .sort((a, b) => {
      const aTime = a.lastAccessedAt ? new Date(a.lastAccessedAt).getTime() : 0;
      const bTime = b.lastAccessedAt ? new Date(b.lastAccessedAt).getTime() : 0;
      return bTime - aTime;
    });
}

// Tamanho de página usado nas requisições de recursos externos (tanto a
// primeira página quanto cada "Ver mais"). Antes da 3E.2 esse número (25)
// só definia o único lote buscado; agora define o tamanho de CADA página
// real da paginação do backend.
const EXTERNAL_PAGE_SIZE = 25;

// Itens + paginação de UMA fonte parceira na aba Todos.
type TodosExternalSourceState = {
  items: ExternalLearningResource[];
  pagination: ExternalResourcesPagination | null;
};
const EMPTY_TODOS_SOURCE_STATE: TodosExternalSourceState = { items: [], pagination: null };

const EXTERNAL_RESOURCE_NO_URL_MESSAGE: Record<ExternalResourceSource, string> = {
  CACHOLA: "Este recurso abre pela plataforma Cachola.",
  ORANGO: "Este recurso abre pela plataforma Orango.",
};

// Abertura de conteúdo externo: nova aba, ou aviso se não houver URL.
function openExternalResource(resource: ExternalLearningResource) {
  if (!resource.url) {
    toast.info(EXTERNAL_RESOURCE_NO_URL_MESSAGE[resource.source]);
    return;
  }

  window.open(resource.url, "_blank", "noopener,noreferrer");
}

function MaterialsScreen({ onNavigate, session }: { onNavigate: (s: Screen) => void; session: MockAuthSession }) {
  const routerNavigate = useNavigate();
  const candidateIdentity = getCandidateIdentity(session);
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("Todas as categorias");
  const [abaFiltro, setAbaFiltro] = useState<"todos" | "recomendados" | "rh" | "cachola" | "orango" | "historico" | "favoritos">("todos");
  const [materialStates, setMaterialStates] = useState<MaterialUserState[]>(() => getMaterialUserStates(candidateIdentity.id));
  const [selectedExternalSource, setSelectedExternalSource] = useState<ExternalResourceSource>("CACHOLA");
  const [externalResources, setExternalResources] = useState<ExternalLearningResource[]>([]);
  const [externalResourcesPagination, setExternalResourcesPagination] = useState<ExternalResourcesPagination | null>(null);
  const [loadingExternalResources, setLoadingExternalResources] = useState(false);
  const [loadingMoreExternalResources, setLoadingMoreExternalResources] = useState(false);
  // Termo enviado ao backend: acompanha `busca` com debounce de 300ms (e é
  // limpo na hora quando `busca` fica vazia). O filtro de RH Connect continua
  // usando `busca` direto, sem atraso.
  const [debouncedBusca, setDebouncedBusca] = useState("");
  const [selectedCacholaArea, setSelectedCacholaArea] = useState("Todos");
  const [selectedOrangoCategory, setSelectedOrangoCategory] = useState("");
  const [orangoCategories, setOrangoCategories] = useState<ExternalResourceCategory[]>([]);
  const [loadingOrangoCategories, setLoadingOrangoCategories] = useState(false);
  const [showOrangoCategories, setShowOrangoCategories] = useState(false);
  const [showCacholaAreas, setShowCacholaAreas] = useState(false);
  const [showCats, setShowCats] = useState(false);
  // Identificador da requisição de recursos externos "em vigor". Incrementado
  // tanto pelo efeito de primeira página (troca de fonte/categoria) quanto
  // pelo handler de "Ver mais": qualquer resposta cujo id não bata mais com
  // o valor corrente é stale e é descartada, sem sobrescrever/acumular no
  // estado atual. Cobre os dois casos pedidos: trocar fonte/categoria
  // enquanto uma página carrega, e um "Ver mais" cuja resposta chega depois
  // de uma troca de fonte/categoria já ter iniciado uma nova busca.
  const externalResourcesRequestIdRef = useRef(0);
  // Aba "Todos": primeira página das duas fontes, com controle de requisição próprio
  // (não interfere no externalResourcesRequestIdRef das abas Cachola / Orango).
  const todosExternalRequestIdRef = useRef(0);
  // Cada fonte mantém a PRÓPRIA paginação (itens + limit/offset/hasMore); a aba
  // Todos apenas coordena as duas.
  const [todosCachola, setTodosCachola] = useState<TodosExternalSourceState>(EMPTY_TODOS_SOURCE_STATE);
  const [todosOrango, setTodosOrango] = useState<TodosExternalSourceState>(EMPTY_TODOS_SOURCE_STATE);
  const [loadingTodosExternal, setLoadingTodosExternal] = useState(false);
  const [loadingMoreTodosExternal, setLoadingMoreTodosExternal] = useState(false);
  // Histórico de acesso e favoritos locais dos conteúdos de parceiros.
  const [externalUserStates, setExternalUserStates] = useState<ExternalResourceUserState[]>(() => getExternalResourceUserStates(candidateIdentity.id));

  const materiais = mergeMaterialsWithUserState(candidateIdentity.id, materialStates);

  useEffect(() => {
    const term = busca.trim();
    if (term === "") {
      setDebouncedBusca("");
      return;
    }
    const timer = window.setTimeout(() => setDebouncedBusca(term), 300);
    return () => window.clearTimeout(timer);
  }, [busca]);

  // Primeira página: dispara sempre que a fonte, a categoria Orango ou o termo
  // de busca (já com debounce) mudam.
  // Sempre busca com offset 0 e SUBSTITUI (nunca acumula) os recursos atuais.
  useEffect(() => {
    const requestId = ++externalResourcesRequestIdRef.current;

    // Qualquer "Ver mais" em andamento é invalidado por este novo requestId
    // (troca de fonte/categoria) e nunca mais vai resolver como atual — seu
    // `finally` fica sem efeito, então sem isso `loadingMoreExternalResources`
    // ficaria travado em `true`. Zera aqui, já que esta é a única entrada de
    // efeito que sempre roda quando a paginação é reiniciada do zero.
    setLoadingExternalResources(true);
    setLoadingMoreExternalResources(false);
    listExternalResources({
      source: selectedExternalSource,
      limit: EXTERNAL_PAGE_SIZE,
      offset: 0,
      // Filtro por categoria é aplicado no backend (via slug) — só faz
      // sentido para ORANGO; "Todas as categorias" (string vazia) omite o
      // parâmetro e preserva o comportamento multi-fonte já existente.
      category: selectedExternalSource === "ORANGO" && selectedOrangoCategory ? selectedOrangoCategory : undefined,
      search: debouncedBusca || undefined,
    })
      .then(({ resources, pagination }) => {
        if (externalResourcesRequestIdRef.current !== requestId) return;
        setExternalResources(resources);
        setExternalResourcesPagination(pagination);
      })
      .catch(() => {
        if (externalResourcesRequestIdRef.current !== requestId) return;
        setExternalResources([]);
        setExternalResourcesPagination(null);
      })
      .finally(() => {
        if (externalResourcesRequestIdRef.current === requestId) {
          setLoadingExternalResources(false);
        }
      });
  }, [selectedExternalSource, selectedOrangoCategory, debouncedBusca]);

  // Lista completa de categorias Orango, carregada do endpoint dedicado
  // (`/external-resources/categories`) — nunca derivada de `externalResources`,
  // que só contém as páginas já carregadas até o momento.
  useEffect(() => {
    if (selectedExternalSource !== "ORANGO") {
      setOrangoCategories([]);
      return;
    }

    let active = true;

    setLoadingOrangoCategories(true);
    listExternalResourceCategories({ source: "ORANGO" })
      .then((categories) => {
        if (active) {
          setOrangoCategories(categories);
        }
      })
      .catch(() => {
        if (active) {
          setOrangoCategories([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoadingOrangoCategories(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedExternalSource]);

  // Aba "Todos": busca a primeira página de cada fonte parceira (mesmo serviço,
  // sem alterar a API) para exibir as três origens no mesmo catálogo. Ao mudar
  // a busca ou a aba, recomeça da primeira página e substitui os resultados.
  // O cleanup invalida qualquer resposta ainda em voo (primeira página ou
  // "Carregar mais") quando a aba/busca muda.
  useEffect(() => {
    if (abaFiltro !== "todos") return;

    const requestId = ++todosExternalRequestIdRef.current;
    setLoadingTodosExternal(true);
    setLoadingMoreTodosExternal(false);
    Promise.all(
      (["CACHOLA", "ORANGO"] as ExternalResourceSource[]).map((source) =>
        listExternalResources({
          source,
          limit: EXTERNAL_PAGE_SIZE,
          search: debouncedBusca || undefined,
        })
          .then(({ resources, pagination }): TodosExternalSourceState => ({ items: resources, pagination: pagination ?? null }))
          .catch((): TodosExternalSourceState => EMPTY_TODOS_SOURCE_STATE),
      ),
    )
      .then(([cachola, orango]) => {
        if (todosExternalRequestIdRef.current !== requestId) return;
        setTodosCachola(cachola);
        setTodosOrango(orango);
      })
      .finally(() => {
        if (todosExternalRequestIdRef.current === requestId) {
          setLoadingTodosExternal(false);
        }
      });

    return () => {
      todosExternalRequestIdRef.current++;
      setLoadingMoreTodosExternal(false);
    };
  }, [abaFiltro, debouncedBusca]);

  // "Carregar mais" da aba Todos: busca a PRÓXIMA página só das fontes que ainda
  // têm `hasMore` e ACUMULA os resultados (sem duplicar). Ignora cliques
  // repetidos enquanto algo está carregando.
  const handleLoadMoreTodos = () => {
    if (loadingTodosExternal || loadingMoreTodosExternal) return;

    const pending = (
      [
        ["CACHOLA", todosCachola, setTodosCachola],
        ["ORANGO", todosOrango, setTodosOrango],
      ] as const
    ).filter(([, state]) => state.pagination?.hasMore === true);
    if (pending.length === 0) return;

    const requestId = ++todosExternalRequestIdRef.current;
    setLoadingMoreTodosExternal(true);
    Promise.all(
      pending.map(([source, state, setState]) => {
        const pagination = state.pagination as ExternalResourcesPagination;
        return listExternalResources({
          source,
          limit: EXTERNAL_PAGE_SIZE,
          offset: pagination.offset + pagination.limit,
          search: debouncedBusca || undefined,
        })
          .then(({ resources, pagination: nextPagination }) => ({ setState, resources, nextPagination }))
          // Falha: mantém o que já foi carregado dessa fonte, sem avançar a página.
          .catch(() => null);
      }),
    )
      .then((results) => {
        if (todosExternalRequestIdRef.current !== requestId) return;
        for (const result of results) {
          if (!result) continue;
          result.setState((current) => {
            const existingIds = new Set(current.items.map((resource) => resource.id));
            return {
              items: [...current.items, ...result.resources.filter((resource) => !existingIds.has(resource.id))],
              pagination: result.nextPagination ?? current.pagination,
            };
          });
        }
      })
      .finally(() => {
        if (todosExternalRequestIdRef.current === requestId) {
          setLoadingMoreTodosExternal(false);
        }
      });
  };

  const handleSelectExternalSource = (source: ExternalResourceSource) => {
    setSelectedExternalSource(source);
    setSelectedCacholaArea("Todos");
    setSelectedOrangoCategory("");
    setShowOrangoCategories(false);
    setShowCacholaAreas(false);
  };

  // "Ver mais": busca a PRÓXIMA página real na API (offset = onde a última
  // página carregada terminou) e ACUMULA no array existente, sem substituir.
  // Ignora cliques repetidos enquanto uma página já está sendo carregada, e
  // não faz nada se o backend já sinalizou que não há mais páginas.
  const handleLoadMoreExternalResources = () => {
    if (loadingExternalResources || loadingMoreExternalResources) return;
    if (!externalResourcesPagination?.hasMore) return;

    const requestId = ++externalResourcesRequestIdRef.current;
    const offset = externalResourcesPagination.offset + externalResourcesPagination.limit;

    setLoadingMoreExternalResources(true);
    listExternalResources({
      source: selectedExternalSource,
      limit: EXTERNAL_PAGE_SIZE,
      offset,
      category: selectedExternalSource === "ORANGO" && selectedOrangoCategory ? selectedOrangoCategory : undefined,
      search: debouncedBusca || undefined,
    })
      .then(({ resources, pagination }) => {
        if (externalResourcesRequestIdRef.current !== requestId) return;

        setExternalResources((current) => {
          // Evita duplicatas por `id` — defensivo contra uma eventual
          // sobreposição entre páginas.
          const existingIds = new Set(current.map((resource) => resource.id));
          const newResources = resources.filter((resource) => !existingIds.has(resource.id));
          return [...current, ...newResources];
        });
        setExternalResourcesPagination(pagination);
      })
      .catch(() => {
        // Falha ao buscar a próxima página: mantém a lista já carregada,
        // só não avança — sem quebrar a tela.
      })
      .finally(() => {
        if (externalResourcesRequestIdRef.current === requestId) {
          setLoadingMoreExternalResources(false);
        }
      });
  };

  const refreshMaterialStates = () => setMaterialStates(getMaterialUserStates(candidateIdentity.id));
  const refreshExternalUserStates = () => setExternalUserStates(getExternalResourceUserStates(candidateIdentity.id));

  // Troca de aba do Explore. Cachola / Orango escolhem a fonte carregada pelo
  // fluxo existente; sair da aba RH Connect limpa a categoria RH para que um
  // filtro "escondido" não afete as outras abas.
  const handleChangeAba = (tab: typeof abaFiltro) => {
    setAbaFiltro(tab);
    setShowCats(false);
    setShowOrangoCategories(false);
    setShowCacholaAreas(false);
    if (tab !== "rh") setCategoria("Todas as categorias");
    if (tab === "cachola" && selectedExternalSource !== "CACHOLA") handleSelectExternalSource("CACHOLA");
    if (tab === "orango" && selectedExternalSource !== "ORANGO") handleSelectExternalSource("ORANGO");
  };

  const getExternalUserState = (resource: ExternalLearningResource) =>
    externalUserStates.find((item) => item.source === resource.source && item.resourceId === resource.id);

  // Registra o acesso local e abre a plataforma externa exatamente como antes.
  const handleOpenExternalResource = (resource: ExternalLearningResource) => {
    recordExternalResourceAccess(candidateIdentity.id, resource);
    refreshExternalUserStates();
    openExternalResource(resource);
  };

  const handleToggleExternalFavorite = (resource: ExternalLearningResource) => {
    toggleExternalResourceFavorite(candidateIdentity.id, resource);
    refreshExternalUserStates();
  };

  const toggleFavorito = (id: string) => {
    toggleMaterialFavorite(candidateIdentity.id, id);
    refreshMaterialStates();
  };

  const handleOpenMaterial = (material: MaterialCardView) => {
    openMaterial(candidateIdentity.id, material.id);
    refreshMaterialStates();
    routerNavigate(`/candidate/materials/${material.slug}`);
  };

  const filtrado = materiais.filter(m => {
    const matchBusca = busca === "" || m.title.toLowerCase().includes(busca.toLowerCase()) || m.description.toLowerCase().includes(busca.toLowerCase());
    const matchCat = categoria === "Todas as categorias" || m.category === categoria;
    const matchAba = abaFiltro === "favoritos" ? m.isFavorite : abaFiltro === "historico" ? Boolean(m.lastAccessedAt) : true;
    return matchBusca && matchCat && matchAba;
  });
  const filtradoOrdenado = abaFiltro === "historico" ? sortMaterialsByLastAccess(filtrado) : filtrado;

  const recomendados = materiais.filter(m => m.recommended).slice(0, 2);
  const emAndamento = sortMaterialsByLastAccess(materiais).filter(m => m.status === "IN_PROGRESS");
  const cacholaAreas = externalResources.reduce<string[]>((areas, resource) => {
    const area = resource.area?.trim();
    return area && !areas.includes(area) ? [...areas, area] : areas;
  }, []);
  // A busca textual agora é feita no backend (parâmetro `search`); aqui resta
  // apenas o filtro de área da Cachola, que continua no cliente.
  const filteredExternalResources = externalResources
    .filter((resource) => selectedCacholaArea === "Todos" || resource.area === selectedCacholaArea);
  // A paginação agora é real (server-side): o que foi carregado até aqui é
  // exibido por inteiro (filtrado só por área, no cliente); não
  // há mais um recorte local adicional por "visibleCount". "Tem mais" passa
  // a refletir exclusivamente `pagination.hasMore` do backend.
  const visibleExternalResources = filteredExternalResources;
  const hasMoreExternalResources = externalResourcesPagination?.hasMore === true;
  // Cards externos exibidos nas abas Cachola / Orango (só a fonte em vista).
  const sourceExternalResources = visibleExternalResources.filter((resource) => resource.source === selectedExternalSource);
  const buscaNormalizada = busca.trim().toLowerCase();
  const matchesBusca = (title: string) => buscaNormalizada === "" || title.toLowerCase().includes(buscaNormalizada);
  // Histórico / Favoritos de parceiros vêm do estado local (snapshot do recurso).
  const externalHistory = externalUserStates
    .filter((item) => item.lastAccessedAt && matchesBusca(item.resource.title))
    .sort((a, b) => new Date(b.lastAccessedAt as string).getTime() - new Date(a.lastAccessedAt as string).getTime());
  const externalFavorites = externalUserStates.filter((item) => item.isFavorite && matchesBusca(item.resource.title));
  // Aba Todos: o botão aparece se QUALQUER fonte ainda tem mais páginas.
  const todosHasMore = todosCachola.pagination?.hasMore === true || todosOrango.pagination?.hasMore === true;
  const favoritosCount = materiais.filter(m => m.isFavorite).length + externalUserStates.filter((item) => item.isFavorite).length;
  const selectedOrangoCategoryLabel = selectedOrangoCategory
    ? orangoCategories.find((category) => category.slug === selectedOrangoCategory)?.name ?? "Todas as categorias"
    : "Todas as categorias";

  return (
    <AuthLayout
      current="materials"
      onNavigate={onNavigate}
      title="Materiais de Apoio"
      subtitle="Conteúdo para você se preparar para entrevistas"
    >
      <div className="w-full space-y-6">
        <MaterialsPageHeader
          search={busca}
          onSearchChange={setBusca}
          onSearchClear={() => setBusca("")}
        />

        {/* Continue aprendendo: RH IN_PROGRESS + parceiros acessados (máx. 3); sem itens, não renderiza */}
        {abaFiltro === "todos" && busca === "" && categoria === "Todas as categorias" && (
          <ContinueLearningSection
            materials={emAndamento}
            onOpen={handleOpenMaterial}
            onFavorite={(m) => toggleFavorito(m.id)}
            externalItems={externalUserStates.filter((item) => Boolean(item.lastAccessedAt))}
            onOpenExternal={handleOpenExternalResource}
          />
        )}

        {/* Explore os materiais: um único catálogo, controlado pelas abas */}
        <ExploreCatalogSection
          id="materials-filters"
          tabs={[
            { id: "todos", label: "Todos" },
            { id: "recomendados", label: "Recomendados" },
            { id: "rh", label: "RH Connect" },
            { id: "cachola", label: "Cachola" },
            { id: "orango", label: "Orango" },
            { id: "historico", label: "Histórico" },
            { id: "favoritos", label: `Favoritos (${favoritosCount})` },
          ]}
          activeTab={abaFiltro}
          onTabChange={(tab) => handleChangeAba(tab as typeof abaFiltro)}
        >
          <ExploreCatalogGroup
            title={
              abaFiltro === "recomendados" ? "Recomendados para você"
              : abaFiltro === "rh" ? "Materiais RH Connect"
              : abaFiltro === "cachola" ? "Conteúdos da Cachola"
              : abaFiltro === "orango" ? "Conteúdos do Orango"
              : abaFiltro === "historico" ? "Histórico"
              : abaFiltro === "favoritos" ? "Seus favoritos"
              : "Todos os conteúdos"
            }
            filters={
              abaFiltro === "rh" ? (
                <div className="relative sm:w-56">
                  <button
                    onClick={() => setShowCats(!showCats)}
                    className="w-full flex items-center justify-between gap-2 px-4 py-2.5 border border-border rounded-xl bg-input-background text-sm text-foreground hover:border-primary/40 transition-all"
                  >
                    <span className="truncate">{categoria === "Todas as categorias" ? "Todas as categorias" : categoria}</span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                  {showCats && (
                    <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-border rounded-xl shadow-lg z-20 overflow-hidden">
                      {SUPPORT_MATERIAL_CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          onClick={() => { setCategoria(cat); setShowCats(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors ${categoria === cat ? "font-semibold text-primary bg-blue-50" : "text-foreground"}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : abaFiltro === "cachola" && !loadingExternalResources && selectedExternalSource === "CACHOLA" ? (
                <div className="space-y-1.5">
                  <div className="relative w-full sm:w-56">
                    <button
                      onClick={() => setShowCacholaAreas(!showCacholaAreas)}
                      className="w-full flex items-center justify-between gap-2 px-4 py-2.5 border border-border rounded-xl bg-input-background text-sm text-foreground hover:border-primary/40 transition-all"
                    >
                      <span className="truncate">{selectedCacholaArea === "Todos" ? "Todas as categorias" : selectedCacholaArea}</span>
                      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>
                    {showCacholaAreas && (
                      <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-border rounded-xl shadow-lg z-20 overflow-hidden max-h-72 overflow-y-auto">
                        {["Todos", ...cacholaAreas].map((area) => (
                          <button
                            key={area}
                            onClick={() => {
                              setSelectedCacholaArea(area);
                              setShowCacholaAreas(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors ${selectedCacholaArea === area ? "font-semibold text-primary bg-blue-50" : "text-foreground"}`}
                          >
                            {area === "Todos" ? "Todas as categorias" : area}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : abaFiltro === "orango" && !loadingExternalResources && selectedExternalSource === "ORANGO" ? (
                <div className="space-y-1.5">
                  <div className="relative w-full sm:w-56">
                    <button
                      onClick={() => setShowOrangoCategories(!showOrangoCategories)}
                      disabled={loadingOrangoCategories}
                      className="w-full flex items-center justify-between gap-2 px-4 py-2.5 border border-border rounded-xl bg-input-background text-sm text-foreground hover:border-primary/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="truncate">{selectedOrangoCategoryLabel}</span>
                      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>
                    {showOrangoCategories && (
                      <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-border rounded-xl shadow-lg z-20 overflow-hidden max-h-72 overflow-y-auto">
                        <button
                          onClick={() => {
                            setSelectedOrangoCategory("");
                            setShowOrangoCategories(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors ${selectedOrangoCategory === "" ? "font-semibold text-primary bg-blue-50" : "text-foreground"}`}
                        >
                          Todas as categorias
                        </button>
                        {orangoCategories.map((category) => (
                          <button
                            key={category.slug}
                            onClick={() => {
                              setSelectedOrangoCategory(category.slug);
                              setShowOrangoCategories(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors ${selectedOrangoCategory === category.slug ? "font-semibold text-primary bg-blue-50" : "text-foreground"}`}
                          >
                            {category.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : undefined
            }
            footer={
              (abaFiltro === "todos" && todosHasMore && !loadingTodosExternal) ||
              ((abaFiltro === "cachola" || abaFiltro === "orango") && hasMoreExternalResources && !loadingExternalResources) ? (
                <Btn
                  variant="primary"
                  onClick={abaFiltro === "todos" ? handleLoadMoreTodos : handleLoadMoreExternalResources}
                  disabled={abaFiltro === "todos" ? loadingMoreTodosExternal : loadingMoreExternalResources}
                  className="px-5 py-2.5 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {(abaFiltro === "todos" ? loadingMoreTodosExternal : loadingMoreExternalResources) ? "Carregando..." : "Carregar mais"}
                  <ChevronDown className="ml-1.5 h-4 w-4" />
                </Btn>
              ) : undefined
            }
          >
            {(() => {
              const rhCard = (m: MaterialCardView) => (
                <EditorialMaterialCard
                  key={`rh-${m.id}`}
                  variant="vertical"
                  data={rhConnectMaterialToEditorialCard(m, {
                    onOpen: () => handleOpenMaterial(m),
                    onFavorite: () => toggleFavorito(m.id),
                  })}
                />
              );
              const externalCard = (resource: ExternalLearningResource) => (
                <EditorialMaterialCard
                  key={`${resource.source}-${resource.id}`}
                  variant="vertical"
                  data={{
                    ...externalResourceToEditorialCard(resource, { onOpen: () => handleOpenExternalResource(resource) }),
                    favorite: {
                      active: getExternalUserState(resource)?.isFavorite === true,
                      onToggle: () => handleToggleExternalFavorite(resource),
                    },
                  }}
                />
              );

              let cards: ReactNode[] = [];
              let loading = false;
              if (abaFiltro === "todos") {
                // Ordem fixa: RH Connect → Cachola → Orango.
                cards = [...filtradoOrdenado.map(rhCard), ...todosCachola.items.map(externalCard), ...todosOrango.items.map(externalCard)];
                loading = loadingTodosExternal && todosCachola.items.length === 0 && todosOrango.items.length === 0;
              } else if (abaFiltro === "recomendados") {
                // Mesmos materiais (`recommended`, no máximo 2) que antes ficavam na seção
                // independente, agora no mesmo card editorial vertical do restante do Explore.
                cards = recomendados
                  .filter((m) => filtrado.some((item) => item.id === m.id))
                  .map(rhCard);
              } else if (abaFiltro === "rh") {
                cards = filtradoOrdenado.map(rhCard);
              } else if (abaFiltro === "cachola" || abaFiltro === "orango") {
                cards = sourceExternalResources.map(externalCard);
                // Enquanto a fonte nova ainda não carregou, evita piscar "vazio".
                loading = loadingExternalResources || externalResources.some((resource) => resource.source !== selectedExternalSource);
              } else {
                // Histórico (mais recente primeiro) e Favoritos: as três origens.
                const rhEntries = filtradoOrdenado.map((m) => ({
                  time: m.lastAccessedAt ? new Date(m.lastAccessedAt).getTime() : 0,
                  node: rhCard(m),
                }));
                const externalEntries = (abaFiltro === "historico" ? externalHistory : externalFavorites).map((item) => ({
                  time: item.lastAccessedAt ? new Date(item.lastAccessedAt).getTime() : 0,
                  node: externalCard(item.resource),
                }));
                cards = abaFiltro === "historico"
                  ? [...rhEntries, ...externalEntries].sort((a, b) => b.time - a.time).map((entry) => entry.node)
                  : [...rhEntries, ...externalEntries].map((entry) => entry.node);
              }

              if (loading) {
                return (
                  <Card className="p-4 text-sm text-muted-foreground">
                    Buscando recomendações complementares...
                  </Card>
                );
              }

              if (cards.length === 0) {
                return (
                  <EmptyState
                    icon={BookOpen}
                    title="Nenhum conteúdo encontrado"
                    description={
                      abaFiltro === "favoritos"
                        ? "Você ainda não salvou nenhum favorito. Clique no ícone de marcador em qualquer conteúdo."
                        : abaFiltro === "historico"
                          ? "Os conteúdos que você abrir aparecerão aqui."
                          : "Tente ajustar os filtros ou a busca."
                    }
                    action={
                      <Btn variant="outline" onClick={() => { setBusca(""); handleChangeAba("todos"); }}>
                        Limpar filtros
                      </Btn>
                    }
                  />
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {cards}
                </div>
              );
            })()}
          </ExploreCatalogGroup>
        </ExploreCatalogSection>
      </div>
      <BackToTop />
    </AuthLayout>
  );
}

function MaterialDetailScreen({ onNavigate, session }: { onNavigate: (s: Screen) => void; session: MockAuthSession }) {
  const routerNavigate = useNavigate();
  const candidateIdentity = getCandidateIdentity(session);
  const { materialId } = useParams();
  const material = materialId ? findSupportMaterialBySlug(materialId) : undefined;
  const [materialState, setMaterialState] = useState<MaterialUserState | null>(() => material ? getMaterialUserState(candidateIdentity.id, material.id) : null);

  useEffect(() => {
    if (!material) return;
    setMaterialState(openMaterial(candidateIdentity.id, material.id));
  }, [material?.id]);

  if (!material) {
    return (
      <AuthLayout
        current="materials"
        onNavigate={onNavigate}
        title="Material não encontrado"
        subtitle="O conteúdo solicitado não está disponível."
      >
        <EmptyState
          icon={BookOpen}
          title="Material não encontrado"
          description="Verifique o link ou volte para a biblioteca de materiais."
          action={<Btn variant="primary" onClick={() => routerNavigate("/candidate/materials")}>Voltar para Materiais</Btn>}
        />
      </AuthLayout>
    );
  }

  const status = materialState?.status ?? "NOT_STARTED";
  const completed = status === "COMPLETED";

  const handleComplete = () => {
    if (completed) return;
    const result = completeMaterial(candidateIdentity.id, material.id);
    setMaterialState(result.state);
    if (result.completedNow) {
      try {
        advanceDevelopmentFromMaterial(candidateIdentity.id, material.id);
      } catch {
        // A conclusão do material é independente da gamificação local.
      }
    }
    toast.success("Material concluído.");
  };

  return (
    <AuthLayout
      current="materials"
      onNavigate={onNavigate}
      title="Materiais de Apoio"
      subtitle="Conteúdo para você se preparar para entrevistas"
    >
      <div className="w-full max-w-4xl mx-auto space-y-5">
        <button
          onClick={() => routerNavigate("/candidate/materials")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          <ChevronLeft className="w-4 h-4" /> Voltar para Materiais
        </button>

        <Card className="p-5 sm:p-7 space-y-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <UIBadge variant="neutral" className="px-2.5 py-1 text-xs font-bold bg-blue-50 text-blue-700">
                {materialTypeLabel(material.type).toUpperCase()}
              </UIBadge>
              <UIBadge variant="primary">{material.category}</UIBadge>
              <Badge variant={completed ? "success" : status === "IN_PROGRESS" ? "info" : "default"}>
                {materialStatusLabel(status)}
              </Badge>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-2">{material.title}</h1>
              <p className="text-muted-foreground leading-relaxed">{material.description}</p>
            </div>

            {material.content.intro && (
              <div className="rounded-xl bg-blue-50/70 border border-blue-100 p-4 text-sm text-blue-950 leading-relaxed">
                {material.content.intro}
              </div>
            )}
          </div>

          <div className="space-y-6">
            {material.content.sections.map((section) => (
              <section key={section.id} className="space-y-3">
                <h2 className="text-lg font-bold text-foreground">{section.title}</h2>
                {section.paragraphs?.map((paragraph, index) => (
                  <p key={index} className="text-sm sm:text-base text-muted-foreground leading-relaxed">{paragraph}</p>
                ))}
                {section.bullets && (
                  <ul className="space-y-2">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-2 text-sm text-muted-foreground leading-relaxed">
                        <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {section.example && (
                  <div className="rounded-xl border border-border bg-muted/40 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Exemplo</p>
                    <p className="text-sm text-foreground leading-relaxed">{section.example}</p>
                  </div>
                )}
                {section.tip && (
                  <div className="flex gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
                    <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-900 leading-relaxed">{section.tip}</p>
                  </div>
                )}
              </section>
            ))}
          </div>

          {material.content.summary && (
            <div className="rounded-xl border border-border bg-accent p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Resumo</p>
              <p className="text-sm text-foreground leading-relaxed">{material.content.summary}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-5 border-t border-border">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Status</p>
              <p className="text-sm font-semibold text-foreground">{materialStatusLabel(status)}</p>
            </div>
            <Btn variant={completed ? "outline" : "primary"} onClick={handleComplete} disabled={completed}>
              <Check className="w-4 h-4" /> {completed ? "Concluído" : "Marcar como concluído"}
            </Btn>
          </div>
        </Card>
      </div>
    </AuthLayout>
  );
}

// ─── CAN-011 Notificações ─────────────────────────────────────────────────────

function NotificationsScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  // V1: não há sistema real de notificações — a tela exibe apenas estado vazio.
  return (
    <AuthLayout
      current="notifications"
      onNavigate={onNavigate}
      title="Notificações"
    >
      <div className="w-full max-w-2xl space-y-3">
        <EmptyState
          icon={Bell}
          title="Você ainda não possui notificações."
          description="Novidades importantes sobre a sua jornada no RH Connect aparecerão aqui."
        />

        {/* Configurar notificações */}
        <Card className="p-4 sm:p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Preferências de notificação</p>
            <p className="text-xs text-muted-foreground">Escolha quais notificações deseja receber.</p>
          </div>
          <Btn variant="outline" size="sm" onClick={() => onNavigate("settings")}>
            <Settings className="w-3.5 h-3.5" /> Configurar
          </Btn>
        </Card>
      </div>
    </AuthLayout>
  );
}

// ─── Screen: Meu Desenvolvimento ─────────────────────────────────────────────

function DevelopmentScreen({ onNavigate, session }: { onNavigate: (s: Screen) => void; session: MockAuthSession }) {
  const candidateIdentity = getCandidateIdentity(session);
  return (
    <AuthLayout current="development" onNavigate={onNavigate}
      title="Meu desenvolvimento"
      subtitle="Acompanhe sua evolução, desenvolva competências e descubra os próximos passos">
      <DevelopmentContent onNavigate={onNavigate} candidateId={candidateIdentity.id} />
    </AuthLayout>
  );
}

// ─── Screen: Agenda de Entrevistas (entrevistas reais/externas) ───────────────

function InterviewAgendaScreen({ onNavigate, session }: { onNavigate: (s: Screen) => void; session: MockAuthSession }) {
  const candidateIdentity = getCandidateIdentity(session);
  return (
    <AuthLayout current="agenda" onNavigate={onNavigate}
      title="Agenda"
      subtitle="Organize suas entrevistas de processos seletivos">
      <InterviewAgendaContent candidateId={candidateIdentity.id} onNavigate={(screen) => onNavigate(screen as Screen)} />
    </AuthLayout>
  );
}

function CandidateDiscTestScreen({ onNavigate, session }: { onNavigate: (s: Screen) => void; session: MockAuthSession }) {
  const candidateIdentity = getCandidateIdentity(session);
  return (
    <AuthLayout current="disc-test" onNavigate={onNavigate}
      title="Teste DISC"
      subtitle="Ferramenta de autoconhecimento e desenvolvimento profissional">
      <DiscTestScreen candidateId={candidateIdentity.id} />
    </AuthLayout>
  );
}


// ─── App (root) ───────────────────────────────────────────────────────────────

function ProtectedRoute({
  session,
  role,
  children,
}: {
  session: MockAuthSession;
  role: MockUserRole;
  children: ReactNode;
}) {
  const location = useLocation();

  if (!session.authenticated || !session.user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (session.user.accountStatus !== "ACTIVE") {
    return <Navigate to="/login" replace />;
  }

  if (session.user.role !== role) {
    return <Navigate to={DASHBOARD_BY_ROLE[session.user.role]} replace />;
  }

  if (!session.user.onboardingCompleted && !isOnboardingPathForRole(location.pathname, role)) {
    return <Navigate to={ONBOARDING_BY_ROLE[role]} replace />;
  }

  if (session.user.onboardingCompleted && isOnboardingPathForRole(location.pathname, role)) {
    return <Navigate to={DASHBOARD_BY_ROLE[role]} replace />;
  }

  return <>{children}</>;
}

function PublicAuthRoute({ session, children }: { session: MockAuthSession; children: ReactNode }) {
  if (session.authenticated && session.user?.accountStatus === "ACTIVE") {
    return <Navigate to={getEntryPathForSession(session)} replace />;
  }

  return <>{children}</>;
}

function AppRoutes({ initialSession }: { initialSession: MockAuthSession }) {
  const routerNavigate = useNavigate();
  const location = useLocation();

  // O rascunho do cadastro só existe enquanto o usuário permanece em cadastro ↔ Termos/Privacidade.
  useEffect(() => {
    if (!["/register", "/terms", "/privacy"].includes(location.pathname)) clearRegisterDraft();
  }, [location.pathname]);
  const [session, setSession] = useState<MockAuthSession>(initialSession);
  const initialDraftSnapshot = useRef(getStoredInterviewDraft(getCandidateIdentity(session).id));
  const [interviewDraft, setInterviewDraft] = useState<InterviewDraft>(() => initialDraftSnapshot.current?.draft ?? createEmptyInterviewDraft());
  const [draftProgress, setDraftProgress] = useState<InterviewDraftProgress>(() => initialDraftSnapshot.current?.progress ?? DEFAULT_INTERVIEW_DRAFT_PROGRESS);
  const [resumeDraftProgress, setResumeDraftProgress] = useState<InterviewDraftProgress | null>(() => initialDraftSnapshot.current?.progress ?? null);
  const [resumePromptDismissed, setResumePromptDismissed] = useState(() => !initialDraftSnapshot.current);
  const [pendingNavigationScreen, setPendingNavigationScreen] = useState<Screen | null>(null);
  const [pendingBrowserNavigation, setPendingBrowserNavigation] = useState(false);
  const [confirmCancelInterview, setConfirmCancelInterview] = useState(false);
  // "Sair e continuar depois": tenta enviar o rascunho pendente ao Back antes de sair.
  const leaveFlushRef = useRef<(() => Promise<void>) | null>(null);
  const registerLeaveFlush = useCallback((flush: (() => Promise<void>) | null) => {
    leaveFlushRef.current = flush;
  }, []);
  // Sessão do wizard já terminal (cancelada/enviada em outro dispositivo): sem proteção de saída.
  const [terminalSession, setTerminalSession] = useState<{ interviewId: string; status: string | null } | null>(null);
  const reportInterviewTerminal = useCallback((interviewId: string, status: string | null) => {
    setTerminalSession((current) => (current?.interviewId === interviewId && current.status === status ? current : { interviewId, status }));
  }, []);
  // Cancelamento REAL (global): estado do pedido ao servidor. Nada local é limpo antes do sucesso.
  const [cancelState, setCancelState] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  const cancelBusyRef = useRef(false);
  const stopActivityRef = useRef<(() => void) | null>(null);
  const registerStopActivity = useCallback((stop: (() => void) | null) => {
    stopActivityRef.current = stop;
  }, []);
  const leavingRef = useRef(false);
  // O usuário desistiu de sair (fechou ou escolheu descartar) enquanto o flush corria.
  const leaveAbortedRef = useRef(false);
  const [leavingSaving, setLeavingSaving] = useState(false);
  const browserNavigationAllowedRef = useRef(false);
  const protectedHistoryUrlRef = useRef("");
  const candidateIdentity = getCandidateIdentity(session);
  const candidateHasSavedDraft = session.user?.role === "CANDIDATE" && hasActiveInterviewDraft(interviewDraft);
  const candidateDraftActive = session.user?.role === "CANDIDATE" && isInterviewDraftInProgress(interviewDraft);
  const currentInterviewDraftScreen = getInterviewDraftScreenFromPath(location.pathname);
  // Etapas do fluxo que voltam ao topo ao serem abertas. "interview-setup" e "interview" ficam de fora:
  // o InterviewScreen já cuida da própria entrada e de cada troca de pergunta.
  const interviewStepScrollKey =
    currentInterviewDraftScreen && currentInterviewDraftScreen !== "interview-setup" && currentInterviewDraftScreen !== "interview"
      ? currentInterviewDraftScreen
      : INTERVIEW_DONE_PATH_PATTERN.test(location.pathname)
        ? "interview-done"
        : null;
  useEffect(() => {
    if (interviewStepScrollKey) scrollPageToTop();
  }, [interviewStepScrollKey]);
  const activeDraftEntry = candidateDraftActive
    ? {
      draft: interviewDraft,
      progress: draftProgress,
      updatedAt: getStoredInterviewDraft(candidateIdentity.id)?.updatedAt ?? new Date().toISOString(),
    }
    : null;
  const shouldShowResumePrompt =
    candidateDraftActive &&
    !resumePromptDismissed &&
    location.pathname === getPathForScreen("interview-setup");
  const terminalStatusForDraft =
    terminalSession && terminalSession.interviewId === interviewDraft.interviewId ? terminalSession.status ?? "TERMINAL" : null;
  const shouldProtectInterviewExit = isExitProtectionActive({
    draftProtected: Boolean(candidateDraftActive && currentInterviewDraftScreen && !shouldShowResumePrompt),
    terminalStatus: terminalStatusForDraft,
  });

  const executeNavigation = (screen: Screen) => {
    // Logout real só deve disparar para uma navegação que É o "Sair"
    // (AccountDropdown chama `onNavigate("auth")`) — não para qualquer
    // navegação comum a "landing" enquanto autenticado (ex.: clicar no logo
    // em /terms ou /privacy), que antes encerrava a sessão sem essa intenção.
    if (screen === "auth" && session.authenticated) {
      // Encerra a sessão real localmente de forma otimista (sem esperar a
      // resposta da rede) e dispara a revogação no Back em paralelo — sem
      // fallback para sessão mock em caso de falha de rede.
      setSession(UNAUTHENTICATED_SESSION);
      routerNavigate("/login");
      void logoutRealSession();
      return;
    }

    const targetPath = getPathForScreen(screen);
    if (screen === "terms" || screen === "privacy") {
      const state = location.state as { from?: string } | null;
      const isCurrentLegalPage = location.pathname === getPathForScreen("terms") || location.pathname === getPathForScreen("privacy");
      const currentPath = `${location.pathname}${location.search}`;
      // A origem é preservada ao alternar entre os documentos e só vale se for uma origem
      // interna conhecida (cadastro ou Configurações). Landing/acesso direto ficam sem origem.
      const origin = resolveLegalOrigin(isCurrentLegalPage ? state?.from : currentPath);
      routerNavigate(targetPath, origin ? { state: { from: origin.path } } : undefined);
      return;
    }

    routerNavigate(targetPath);
  };

  const navigate = (screen: Screen) => {
    const targetPath = getPathForScreen(screen);
    const targetIsInterviewDraftRoute = Boolean(getInterviewDraftScreenFromPath(targetPath));
    if (shouldProtectInterviewExit && !targetIsInterviewDraftRoute) {
      saveStoredInterviewDraft(candidateIdentity.id, interviewDraft, draftProgress);
      setPendingNavigationScreen(screen);
      return;
    }

    executeNavigation(screen);
  };

  const navigateToStoredDraftProgress = (progress: InterviewDraftProgress) => {
    setResumePromptDismissed(true);
    setDraftProgress(progress);
    setResumeDraftProgress(null);
    const targetPath = getPathForScreen(progress.currentScreen);
    if (progress.currentScreen === "interview" && progress.currentQuestionIndex > 0) {
      routerNavigate(`${targetPath}?question=${progress.currentQuestionIndex + 1}`);
      return;
    }
    routerNavigate(targetPath);
  };

  // Retomada pelo Dashboard (continuidade entre dispositivos): o Back é a fonte da
  // verdade. Falhas NUNCA gravam no localStorage nem abrem o wizard.
  const resumeInterviewFromServer = async (interviewId: string): Promise<ResumeInterviewResult> => {
    const interviewResult = await getRealInterview(interviewId);
    if (!interviewResult.ok) {
      const reason = interviewResult.reason === "not_found" ? "not_found" : interviewResult.reason === "not_in_progress" ? "not_in_progress" : "error";
      return { ok: false, reason, message: interviewResult.message };
    }
    if (interviewResult.data.status !== "IN_PROGRESS") {
      return { ok: false, reason: "not_in_progress", message: "Esta entrevista não está mais em andamento." };
    }
    const questionsResult = await getRealQuestionsStateForResume(interviewId);
    if (!questionsResult.ok) {
      const reason = questionsResult.reason === "not_in_progress" ? "not_in_progress" : questionsResult.reason === "not_found" ? "not_found" : "error";
      return { ok: false, reason, message: questionsResult.message };
    }
    const interview = interviewResult.data;
    const plan = buildResumePlan({
      interview: { id: interview.id, status: interview.status, evaluationMode: interview.evaluationMode },
      questions: questionsResult.data.questions,
      questionsInterviewStatus: questionsResult.data.interviewStatus,
    });
    if (!plan.ok) {
      return { ok: false, reason: "not_in_progress", message: "Esta entrevista não está mais em andamento." };
    }
    // Mesma entrevista já aberta neste dispositivo, na etapa de perguntas: preserva a posição local.
    const sameLocalInterview = interviewDraft.interviewId === interviewId && draftProgress.currentScreen === "interview";
    const useLocalPosition = sameLocalInterview && plan.target.screen === "interview";
    const nextProgress: InterviewDraftProgress = useLocalPosition
      ? {
        currentScreen: "interview",
        currentQuestionIndex: Math.min(draftProgress.currentQuestionIndex, plan.questions.length - 1),
        highestQuestionIndex: Math.max(draftProgress.highestQuestionIndex ?? 0, plan.target.highestQuestionIndex),
      }
      : {
        currentScreen: plan.target.screen,
        currentQuestionIndex: plan.target.currentQuestionIndex,
        highestQuestionIndex: plan.target.highestQuestionIndex,
      };
    setInterviewDraft({
      interviewId: plan.interviewId,
      context: interview.context,
      questions: plan.questions.map((question) => ({ id: question.id, type: question.type, text: question.text })),
      answers: plan.answers,
      evaluationMode: plan.evaluationMode,
    });
    setTerminalSession(null);
    navigateToStoredDraftProgress(nextProgress);
    return { ok: true };
  };

  const discardSavedDraft = () => {
    clearAnswerDraftsForInterview(candidateIdentity.id, interviewDraft.interviewId);
    clearStoredInterviewDraft(candidateIdentity.id);
    setInterviewDraft(createEmptyInterviewDraft());
    setDraftProgress(DEFAULT_INTERVIEW_DRAFT_PROGRESS);
    setTerminalSession(null);
    setResumeDraftProgress(null);
    setResumePromptDismissed(true);
  };

  // "Cancelar" na preparação: sem entrevista criada no servidor só há análise local a limpar;
  // com entrevista já criada (IN_PROGRESS) o cancelamento é REAL, pelo mesmo modal.
  const cancelInterviewPreparation = () => {
    if (interviewDraft.interviewId) {
      openCancelInterview();
      return;
    }
    discardSavedDraft();
    routerNavigate(getPathForScreen("dashboard"));
  };

  const openCancelInterview = () => {
    setCancelState({ busy: false, error: null });
    setConfirmCancelInterview(true);
  };

  // CANCELAMENTO REAL: encerra a entrevista no servidor (todos os dispositivos). Só depois
  // do sucesso para autosave/ditado, limpa o estado local e volta ao Dashboard (que relê as
  // IN_PROGRESS). Falha/offline: nada local é apagado e o usuário pode tentar de novo.
  const cancelActiveInterview = async () => {
    if (cancelBusyRef.current) return;
    cancelBusyRef.current = true;
    setCancelState({ busy: true, error: null });
    try {
      const interviewId = interviewDraft.interviewId;
      if (interviewId) {
        const result = await cancelRealInterview(interviewId);
        if (!result.ok) {
          setCancelState({ busy: false, error: result.message });
          return;
        }
      }
      stopActivityRef.current?.();
      discardSavedDraft();
      setPendingNavigationScreen(null);
      setPendingBrowserNavigation(false);
      setConfirmCancelInterview(false);
      setCancelState({ busy: false, error: null });
      routerNavigate(getPathForScreen("dashboard"));
    } finally {
      cancelBusyRef.current = false;
    }
  };

  // Entrevista enviada/encerrada em outro dispositivo: o estado local do wizard não tem mais
  // o que retomar. Só acontece por clique em "Voltar ao Dashboard" (nunca em silêncio).
  const leaveStaleInterview = () => {
    completeCurrentDraft();
    setPendingNavigationScreen(null);
    setPendingBrowserNavigation(false);
    setConfirmCancelInterview(false);
    routerNavigate(getPathForScreen("dashboard"));
  };

  const completeCurrentDraft = () => {
    clearAnswerDraftsForInterview(candidateIdentity.id, interviewDraft.interviewId);
    clearStoredInterviewDraft(candidateIdentity.id);
    setInterviewDraft(createEmptyInterviewDraft());
    setDraftProgress(DEFAULT_INTERVIEW_DRAFT_PROGRESS);
    setResumeDraftProgress(null);
    setTerminalSession(null);
    setResumePromptDismissed(true);
  };

  // Saiu da sessão terminal (CANCELLED/enviada em outro dispositivo) sem usar o botão do aviso:
  // o interviewId e o contexto da entrevista antiga não podem sobreviver a uma nova prática.
  useEffect(() => {
    if (!shouldDiscardTerminalDraft({ terminalStatus: terminalStatusForDraft, screen: currentInterviewDraftScreen })) return;
    completeCurrentDraft();
  }, [terminalStatusForDraft, currentInterviewDraftScreen]);

  useEffect(() => {
    const storedDraft = getStoredInterviewDraft(candidateIdentity.id);
    if (storedDraft) {
      setInterviewDraft(storedDraft.draft);
      setDraftProgress(storedDraft.progress);
      setResumeDraftProgress(storedDraft.progress);
      setResumePromptDismissed(false);
      return;
    }

    setInterviewDraft(createEmptyInterviewDraft());
    setDraftProgress(DEFAULT_INTERVIEW_DRAFT_PROGRESS);
    setResumeDraftProgress(null);
    setResumePromptDismissed(true);
  }, [candidateIdentity.id]);

  useEffect(() => {
    if (shouldShowResumePrompt) return;
    if (!currentInterviewDraftScreen) return;
    setDraftProgress((current) => {
      // Só vale `?question=` ao CHEGAR de outra tela (revisão/retomar). Se o progresso
      // já estava na etapa de respostas (ex.: F5), a pergunta salva é preservada.
      const questionParam = new URLSearchParams(location.search).get("question");
      const currentQuestionIndex = currentInterviewDraftScreen === "interview" && current.currentScreen !== "interview"
        ? getQuestionIndexFromSearchParam(questionParam, interviewDraft.questions.length)
        : current.currentQuestionIndex;
      if (current.currentScreen === currentInterviewDraftScreen && current.currentQuestionIndex === currentQuestionIndex) {
        return current;
      }
      // "Alcançadas" valem para a Interview em andamento: voltam a zero ao reiniciar pela análise da vaga.
      const highestQuestionIndex = currentInterviewDraftScreen === "interview-setup" ? undefined : current.highestQuestionIndex;
      return {
        currentScreen: currentInterviewDraftScreen,
        currentQuestionIndex,
        ...(highestQuestionIndex === undefined ? {} : { highestQuestionIndex }),
      };
    });
  }, [currentInterviewDraftScreen, interviewDraft.questions.length, location.search, shouldShowResumePrompt]);

  useEffect(() => {
    if (shouldShowResumePrompt) return;
    if (!candidateHasSavedDraft) return;
    saveStoredInterviewDraft(candidateIdentity.id, interviewDraft, draftProgress);
  }, [candidateHasSavedDraft, candidateIdentity.id, draftProgress, interviewDraft, shouldShowResumePrompt]);

  useEffect(() => {
    if (!shouldProtectInterviewExit) return;
    // Sessão terminal: shouldProtectInterviewExit vira false e o cleanup abaixo remove o listener.
    return attachExitProtection(window, () => saveStoredInterviewDraft(candidateIdentity.id, interviewDraft, draftProgress));
  }, [candidateIdentity.id, draftProgress, interviewDraft, shouldProtectInterviewExit]);

  useEffect(() => {
    if (!shouldProtectInterviewExit) {
      protectedHistoryUrlRef.current = "";
      setPendingBrowserNavigation(false);
      return;
    }

    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (protectedHistoryUrlRef.current !== currentUrl) {
      const currentState = window.history.state && typeof window.history.state === "object"
        ? window.history.state
        : {};
      window.history.replaceState({ ...currentState, rhConnectInterviewBase: true }, "", currentUrl);
      window.history.pushState({ rhConnectInterviewGuard: true }, "", currentUrl);
      protectedHistoryUrlRef.current = currentUrl;
    }

    const handlePopState = () => {
      if (browserNavigationAllowedRef.current) {
        return;
      }

      saveStoredInterviewDraft(candidateIdentity.id, interviewDraft, draftProgress);
      setPendingBrowserNavigation(true);
      const nextUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.history.pushState({ rhConnectInterviewGuard: true }, "", nextUrl);
      protectedHistoryUrlRef.current = nextUrl;
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [
    candidateIdentity.id,
    draftProgress,
    interviewDraft,
    location.hash,
    location.pathname,
    location.search,
    shouldProtectInterviewExit,
  ]);

  const completeOnboardingAndNavigate = async (screen: Screen) => {
    if (!session.user) {
      return;
    }

    const updatedUser = await completeRealOnboarding(session.user.role);
    if (!updatedUser) {
      // O Back não persistiu a conclusão (erro de rede, 5xx ou payload
      // inválido): não navega para o dashboard. Sem esta guarda, o Front
      // navegava otimistamente e o `ProtectedRoute` imediatamente devolvia
      // o usuário para a tela de onboarding (já que
      // `session.user.onboardingCompleted` continua `false` no estado),
      // mascarando a falha como um redirecionamento confuso em vez de
      // simplesmente permanecer na tela de onboarding.
      return;
    }

    setSession({ version: 1, authenticated: true, user: updatedUser });
    routerNavigate(getPathForScreen(screen));
  };
  const loginWithCredentials = async (email: string, password: string) => {
    const result = await loginRealWithCredentials(email, password);
    if (!result.ok) {
      return result;
    }
    setSession(result.session);
    routerNavigate(getEntryPathForSession(result.session));
    return { ok: true as const };
  };
  const registerCandidate = async (data: { name: string; email: string; password: string; termsAccepted: boolean }) => {
    // Cadastro real do Candidato (Prompt 02): fala direto com a API,
    // sem alimentar o Auth mock. O Login real (Prompt 03) é uma fonte
    // totalmente independente (via /auth/login + cookies httpOnly), sem
    // dual-write entre os dois.
    const result = await registerRealCandidate(data);
    if (!result.ok) {
      return result;
    }
    saveRememberedLoginEmail(result.user.email);
    routerNavigate("/login");
    return { ok: true as const };
  };
  const protect = (role: MockUserRole, children: ReactNode) => (
    <ProtectedRoute session={session} role={role}>{children}</ProtectedRoute>
  );

  return (
    <SessionContext.Provider value={session}>
    <InterviewSessionTerminalContext.Provider value={reportInterviewTerminal}>
    <div className="flex flex-col min-h-screen">
      <Toaster position="top-center" richColors />
      <div className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<LandingScreen onNavigate={navigate} />} />
          <Route path="/login" element={<PublicAuthRoute session={session}><AuthScreen onNavigate={navigate} onLoginWithCredentials={loginWithCredentials} onRegister={registerCandidate} initialTab="login" /></PublicAuthRoute>} />
          <Route path="/register" element={<PublicAuthRoute session={session}><AuthScreen onNavigate={navigate} onLoginWithCredentials={loginWithCredentials} onRegister={registerCandidate} initialTab="register" /></PublicAuthRoute>} />
          <Route path="/terms" element={<TermsScreen onNavigate={navigate} session={session} />} />
          <Route path="/privacy" element={<PrivacyScreen onNavigate={navigate} session={session} />} />
          <Route path="/sugestoes" element={<SuggestionsScreen />} />
          <Route path="/verify-email" element={<EmailVerifyScreen onNavigate={navigate} />} />
          <Route path="/forgot-password" element={<ForgotPasswordScreen onNavigate={navigate} />} />
          <Route path="/reset-password" element={<ResetPasswordScreen onNavigate={navigate} />} />

          <Route path="/candidate/onboarding" element={protect("CANDIDATE", <CandidateOnboardingScreen onNavigate={navigate} onComplete={() => completeOnboardingAndNavigate("dashboard")} />)} />
          <Route path="/candidate/dashboard" element={protect("CANDIDATE", <DashboardScreen onNavigate={navigate} session={session} activeDraftEntry={activeDraftEntry} onContinueDraft={() => navigateToStoredDraftProgress(resumeDraftProgress ?? draftProgress)} onResumeInterview={resumeInterviewFromServer} />)} />
          <Route path="/candidate/profile" element={protect("CANDIDATE", <ProfileScreen onNavigate={navigate} session={session} />)} />
          <Route path="/candidate/settings" element={protect("CANDIDATE", <SettingsScreen onNavigate={navigate} session={session} />)} />
          <Route path="/candidate/materials" element={protect("CANDIDATE", <MaterialsScreen onNavigate={navigate} session={session} />)} />
          <Route path="/candidate/materials/:materialId" element={protect("CANDIDATE", <MaterialDetailScreen onNavigate={navigate} session={session} />)} />
          <Route path="/candidate/notifications" element={protect("CANDIDATE", <NotificationsScreen onNavigate={navigate} />)} />
          <Route path="/candidate/interviews" element={protect("CANDIDATE", <InterviewHistoryScreen onNavigate={navigate} onResumeInterview={resumeInterviewFromServer} />)} />
          <Route path="/candidate/development" element={protect("CANDIDATE", <DevelopmentScreen onNavigate={navigate} session={session} />)} />
          <Route path="/candidate/disc" element={protect("CANDIDATE", <CandidateDiscTestScreen onNavigate={navigate} session={session} />)} />
          <Route path="/candidate/agenda" element={protect("CANDIDATE", <InterviewAgendaScreen onNavigate={navigate} session={session} />)} />
          {/* Todas as etapas da entrevista exigem perfil profissional completo (API). */}
          <Route element={protect("CANDIDATE", <InterviewProfileGuard onNavigate={navigate} />)}>
          <Route path="/candidate/interviews/new" element={protect("CANDIDATE", <InterviewSetupScreen onNavigate={navigate} draft={interviewDraft} setDraft={setInterviewDraft} session={session} onResumeInterview={resumeInterviewFromServer} savedDraftAvailable={shouldShowResumePrompt} onContinueSavedDraft={() => navigateToStoredDraftProgress(resumeDraftProgress ?? draftProgress)} onCancelInterview={openCancelInterview} onCancelPreparation={cancelInterviewPreparation} />)} />
          <Route path="/candidate/interviews/new/consent" element={protect("CANDIDATE", <ConsentScreen onNavigate={navigate} draft={interviewDraft} />)} />
          <Route path="/candidate/interviews/new/evaluation-mode" element={protect("CANDIDATE", <EvaluationModeScreen onNavigate={navigate} draft={interviewDraft} setDraft={setInterviewDraft} />)} />
          <Route path="/candidate/interviews/new/preparation" element={protect("CANDIDATE", <PrepScreen onNavigate={navigate} draft={interviewDraft} />)} />
          <Route path="/candidate/interviews/new/answers" element={protect("CANDIDATE", <InterviewScreen onNavigate={navigate} draft={interviewDraft} setDraft={setInterviewDraft} candidateId={candidateIdentity.id} restoredQuestionIndex={draftProgress.currentScreen === "interview" ? draftProgress.currentQuestionIndex : undefined} restoredHighestIndex={draftProgress.highestQuestionIndex} registerLeaveFlush={registerLeaveFlush} registerStopActivity={registerStopActivity} onStaleExit={leaveStaleInterview} onQuestionIndexChange={(index, highestReached) => setDraftProgress((current) => current.currentQuestionIndex === index && current.highestQuestionIndex === highestReached ? current : { ...current, currentQuestionIndex: index, highestQuestionIndex: highestReached })} />)} />
          <Route path="/candidate/interviews/new/review" element={protect("CANDIDATE", <ReviewScreen onNavigate={navigate} draft={interviewDraft} onStaleExit={leaveStaleInterview} />)} />
          <Route path="/candidate/interviews/new/submit" element={protect("CANDIDATE", <InterviewConfirmScreen onNavigate={navigate} draft={interviewDraft} session={session} onDraftCompleted={completeCurrentDraft} onStaleExit={leaveStaleInterview} />)} />
          </Route>
          <Route path="/candidate/interviews/:id/success" element={protect("CANDIDATE", <InterviewDoneScreen onNavigate={navigate} />)} />
          <Route path="/candidate/interviews/:id/status" element={protect("CANDIDATE", <PendingScreen onNavigate={navigate} onResumeInterview={resumeInterviewFromServer} />)} />
          <Route path="/candidate/reports/:id" element={protect("CANDIDATE", <ReportScreen onNavigate={navigate} />)} />

          <Route path="/evaluator/activate" element={<EvalActivateScreen onNavigate={navigate} />} />
          <Route path="/evaluator/onboarding" element={protect("EVALUATOR", <EvalOnboardingScreen onNavigate={navigate} onComplete={() => completeOnboardingAndNavigate("eval-dashboard")} />)} />
          <Route path="/evaluator/dashboard" element={protect("EVALUATOR", <EvalDashboardScreen onNavigate={navigate} />)} />
          <Route path="/evaluator/evaluations" element={protect("EVALUATOR", <EvalQueueScreen onNavigate={navigate} />)} />
          <Route path="/evaluator/evaluations/active" element={protect("EVALUATOR", <EvalActiveScreen onNavigate={navigate} />)} />
          <Route path="/evaluator/interviews/:id" element={protect("EVALUATOR", <EvalInterviewDetailScreen onNavigate={navigate} />)} />
          <Route path="/evaluator/evaluations/:id" element={protect("EVALUATOR", <EvalDraftEvaluationScreen onNavigate={navigate} />)} />
          <Route path="/evaluator/evaluations/:id/review" element={protect("EVALUATOR", <EvalRealReviewScreen onNavigate={navigate} />)} />
          <Route path="/evaluator/evaluations/:id/success" element={protect("EVALUATOR", <EvalCompletionSuccessScreen onNavigate={navigate} />)} />
          <Route path="/evaluator/history" element={protect("EVALUATOR", <EvalHistoryScreen onNavigate={navigate} />)} />
          <Route path="/evaluator/history/:id" element={protect("EVALUATOR", <EvalHistoryDetailScreen onNavigate={navigate} />)} />
          <Route path="/evaluator/criteria" element={protect("EVALUATOR", <EvalCriteriaScreen onNavigate={navigate} />)} />
          <Route path="/evaluator/settings" element={protect("EVALUATOR", <EvalSettingsScreen onNavigate={navigate} />)} />

          <Route path="/admin/onboarding" element={protect("ADMIN", <AdminOnboardingScreen onNavigate={navigate} onComplete={() => completeOnboardingAndNavigate("admin-dashboard")} />)} />
          <Route path="/admin/dashboard" element={protect("ADMIN", <AdminDashboardScreen onNavigate={navigate} />)} />
          <Route path="/admin/candidates" element={protect("ADMIN", <AdminCandidatesScreen onNavigate={navigate} />)} />
          <Route path="/admin/candidates/:id" element={protect("ADMIN", <AdminCandidateDetailScreen onNavigate={navigate} />)} />
          <Route path="/admin/evaluators" element={protect("ADMIN", <AdminEvaluatorsScreen onNavigate={navigate} />)} />
          <Route path="/admin/evaluators/new" element={protect("ADMIN", <AdminEvaluatorFormScreen onNavigate={navigate} />)} />
          <Route path="/admin/interviews" element={protect("ADMIN", <AdminInterviewsScreen onNavigate={navigate} />)} />
          <Route path="/admin/assignments" element={protect("ADMIN", <AdminAssignScreen onNavigate={navigate} />)} />
          <Route path="/admin/roles" element={protect("ADMIN", <AdminRolesScreen onNavigate={navigate} />)} />
          <Route path="/admin/criteria" element={protect("ADMIN", <AdminCriteriaScreen onNavigate={navigate} />)} />
          <Route path="/admin/consents" element={protect("ADMIN", <AdminConsentScreen onNavigate={navigate} />)} />
          <Route path="/admin/audit" element={protect("ADMIN", <AdminAuditScreen onNavigate={navigate} />)} />
          <Route path="/admin/settings" element={protect("ADMIN", <AdminSettingsScreen onNavigate={navigate} />)} />

          <Route path="/candidate" element={protect("CANDIDATE", <Navigate to="/candidate/dashboard" replace />)} />
          <Route path="/evaluator" element={protect("EVALUATOR", <Navigate to="/evaluator/dashboard" replace />)} />
          <Route path="/admin" element={protect("ADMIN", <Navigate to="/admin/dashboard" replace />)} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {(pendingNavigationScreen || pendingBrowserNavigation || confirmCancelInterview) && (
          <ConfirmModal
            title={confirmCancelInterview ? "Cancelar entrevista?" : "Deseja sair da entrevista?"}
            message={confirmCancelInterview
              ? "Esta entrevista será encerrada e não poderá mais ser continuada em nenhum dispositivo. Você poderá iniciar uma nova entrevista depois."
              : "Você pode sair e continuar depois, neste ou em outro dispositivo, com o progresso salvo. Se preferir, cancele a entrevista."}
            confirmLabel={confirmCancelInterview ? (cancelState.busy ? "Cancelando..." : "Cancelar entrevista") : leavingSaving ? "Salvando..." : "Sair e continuar depois"}
            cancelLabel={confirmCancelInterview ? "Voltar" : "Cancelar entrevista"}
            showCloseButton={!confirmCancelInterview}
            danger={confirmCancelInterview}
            initialFocus={confirmCancelInterview ? "cancel" : "confirm"}
            dismissOnBackdrop={!confirmCancelInterview}
            onConfirm={async () => {
              if (confirmCancelInterview) {
                await cancelActiveInterview();
                return;
              }
              if (leavingRef.current) return;
              leavingRef.current = true;
              leaveAbortedRef.current = false;
              setLeavingSaving(true);
              // Proteção local PRIMEIRO (o texto nunca depende da rede) e, se houver conexão,
              // tenta levar o rascunho pendente ao Back antes de sair. Erro/offline/lentidão
              // não prendem a saída.
              saveStoredInterviewDraft(candidateIdentity.id, interviewDraft, draftProgress);
              try {
                await flushBeforeLeaving(leaveFlushRef.current);
              } finally {
                leavingRef.current = false;
                setLeavingSaving(false);
              }
              if (leaveAbortedRef.current) return;
              if (pendingBrowserNavigation) {
                setResumeDraftProgress(draftProgress);
                setResumePromptDismissed(false);
                setPendingBrowserNavigation(false);
                browserNavigationAllowedRef.current = true;
                protectedHistoryUrlRef.current = "";
                window.history.go(-2);
                window.setTimeout(() => {
                  browserNavigationAllowedRef.current = false;
                }, 500);
                return;
              }
              const target = pendingNavigationScreen;
              if (!target) return;
              setResumeDraftProgress(draftProgress);
              setResumePromptDismissed(false);
              setPendingNavigationScreen(null);
              executeNavigation(target);
            }}
            onCancel={() => {
              leaveAbortedRef.current = true;
              if (confirmCancelInterview) {
                if (cancelBusyRef.current) return;
                setCancelState({ busy: false, error: null });
                setConfirmCancelInterview(false);
                return;
              }
              openCancelInterview();
            }}
            onClose={() => {
              if (cancelBusyRef.current) return;
              leaveAbortedRef.current = true;
              setConfirmCancelInterview(false);
              setPendingNavigationScreen(null);
              setPendingBrowserNavigation(false);
            }}
          >
            {confirmCancelInterview && cancelState.error && (
              <p role="alert" data-testid="cancel-interview-error" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {cancelState.error}
              </p>
            )}
          </ConfirmModal>
        )}
      </div>
    </div>
    </InterviewSessionTerminalContext.Provider>
    </SessionContext.Provider>
  );
}

function AppSessionBoot() {
  // Restaura a sessão real a partir do cookie httpOnly já existente (se
  // houver) antes de montar `AppRoutes` — que assume, na primeira
  // renderização, que `session` já reflete o estado real (ex.: o draft de
  // entrevista é carregado a partir do candidato da sessão inicial). Sem
  // esse gate, a checagem assíncrona de `/auth/me` faria `AppRoutes` montar
  // uma vez como "não autenticado" e só depois atualizar — o que também
  // poderia carregar o draft errado.
  const [initialSession, setInitialSession] = useState<MockAuthSession | null>(null);

  useEffect(() => {
    let cancelled = false;
    restoreRealSession().then((session) => {
      if (!cancelled) {
        setInitialSession(session);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!initialSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner size="md" />
      </div>
    );
  }

  return <AppRoutes initialSession={initialSession} />;
}

export default function App() {
  return (
    <BrowserRouter basename={ROUTER_BASENAME}>
      <AppSessionBoot />
    </BrowserRouter>
  );
}
