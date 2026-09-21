/** RH Connect — Aplicação Front-end */

import { useState, useRef, useEffect, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import {
  ChevronRight, ChevronLeft, Check, CheckCircle, User, Briefcase,
  Clock, Mic, Home, History, Settings, LogOut, Bell,
  Eye, Plus, Edit2, RotateCcw, AlertCircle, ArrowRight,
  Award, TrendingUp, X, Shield, GraduationCap, Zap, BookOpen,
  Star, Monitor, ChevronDown, Lightbulb, Info, MessageSquare,
  Target, Send, Upload, Menu,
  Heart, Bookmark, FileText, Trash2, Lock, Database, Bot,
  ToggleLeft, ToggleRight, ChevronUp, Filter
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { DevelopmentContent } from "./components/development-screen";
import { DiscTestScreen } from "./components/disc-test-screen";
import {
  CANDIDATE_ACCOUNT, CANDIDATE_NOTIFS,
  type AccountConfig,
} from "./components/header-popovers";
import { ProfileShell, type ProfileShellNavItem } from "./components/shared/profile-shell";
import { RHConnectLogo } from "./components/brand/rh-connect-logo";
import { LandingScreen as LandingScreenComponent } from "./components/landing-screen";
import {
  EvalDashboardScreen, EvalQueueScreen, EvalActiveScreen, EvalScreenView,
  EvalReviewScreen, EvalDoneScreen, EvalHistoryScreen, EvalCriteriaScreen, EvalSettingsScreen,
  EvalActivateScreen, EvalOnboardingScreen,
} from "./components/eval-screens";
import {
  AdminDashboardScreen, AdminCandidatesScreen, AdminCandidateDetailScreen,
  AdminEvaluatorsScreen, AdminEvaluatorFormScreen,
  AdminInterviewsScreen, AdminAssignScreen, AdminQuestionsScreen,
  AdminQuestionFormScreen, AdminRolesScreen, AdminCriteriaScreen,
  AdminConsentScreen, AdminAuditScreen, AdminSettingsScreen,
  AdminOnboardingScreen,
} from "./components/admin-screens";
import { CandidateOnboardingScreen } from "./components/onboarding-screens";
import { Input } from "./components/ui/input";
import { SearchInput } from "./components/ui/search-input";
import { NativeSelect } from "./components/ui/native-select";
import { PasswordInput } from "./components/ui/password-input";
import { Textarea } from "./components/ui/textarea";
import { Checkbox } from "./components/ui/checkbox";
import { Button as UIButton } from "./components/ui/button";
import { Card as UICard } from "./components/ui/card";
import { Badge as UIBadge } from "./components/ui/badge";
import { StatusBadge } from "./components/ui/status-badge";
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
  evaluateInterviewWithAi,
  generateInterviewQuestions,
  type InterviewQuestion,
  type JobInterviewContext,
} from "./services/interview-context-service";
import {
  PROFESSIONAL_AREAS,
  type ProfessionalAreaId,
  SENIORITY_LEVEL_OPTIONS,
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
import { advanceDevelopmentFromMaterial } from "./services/development-service";
import { DEFAULT_CANDIDATE } from "./mocks/interviews";
import {
  completeAiEvaluation,
  getAvailableCandidateReports,
  getAverageScore,
  getCandidateInterviews,
  getEvaluationByInterviewId,
  getInterviewById,
  getReportByInterviewId,
  statusLabelFromInterview,
  submitInterview,
} from "./services/interviews-service";
import {
  clearRememberedLoginEmail,
  completeMockOnboarding,
  getRememberedLoginEmail,
  getMockAuthSession,
  loginMockWithCredentials,
  logoutMockUser,
  registerMockCandidate,
  saveRememberedLoginEmail,
  type MockAuthSession,
  type MockAuthUser,
  type MockUserRole,
} from "./services/auth-service";
import {
  getCandidateProfile,
  getCandidateProfileCompleteness,
  isCandidateProfileReadyForInterview,
  saveCandidateProfile,
} from "./services/candidate-profile-service";
import type { EvaluationMode } from "./domain/interviews";
import type {
  CandidateCourse,
  CandidateExperience,
  CandidateFormation,
  CandidateProfile,
  CandidateProfilePatch,
} from "./domain/candidate-profile";

// ─── Types & Constants ────────────────────────────────────────────────────────

const AUTH_SCREENS: Screen[] = [
  "dashboard","profile","settings","materials","notifications",
  "interview-history","development","disc-test",
  "interview-setup","consent","evaluation-mode","prep","interview","review","interview-confirm","interview-done",
  "pending","report",
  "eval-dashboard","eval-queue","eval-active","eval-screen","eval-review","eval-done","eval-history","eval-criteria","eval-settings",
  "admin-dashboard","admin-candidates","admin-candidate-detail","admin-evaluators","admin-evaluator-form",
  "admin-interviews","admin-assign",
  "admin-questions","admin-question-form","admin-roles","admin-criteria","admin-consent","admin-audit","admin-settings",
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

function getCandidateIdentity(session: MockAuthSession) {
  const user = session.user;
  if (session.authenticated && user?.role === "CANDIDATE") {
    return {
      id: user.id === "candidate-demo" ? DEFAULT_CANDIDATE.id : user.id,
      name: user.name,
      email: user.email,
    };
  }

  return DEFAULT_CANDIDATE;
}

function getEvaluatorIdentity(session: MockAuthSession) {
  const user = session.user;
  if (session.authenticated && user?.role === "EVALUATOR") {
    return {
      id: user.id === "evaluator-demo" ? "evaluator-carlos-andrade" : user.id,
      name: user.name,
    };
  }

  return { id: "evaluator-carlos-andrade", name: "Carlos Andrade" };
}

function getEntryPathForSession(session: MockAuthSession) {
  if (!session.authenticated || !session.user) return "/login";
  return session.user.onboardingCompleted ? DASHBOARD_BY_ROLE[session.user.role] : ONBOARDING_BY_ROLE[session.user.role];
}

function isOnboardingPathForRole(pathname: string, role: MockUserRole) {
  return pathname === ONBOARDING_BY_ROLE[role];
}

const CRITERIA = [
  { name: "Clareza",         score: 9 },
  { name: "Coerência",       score: 9 },
  { name: "Objetividade",    score: 8 },
  { name: "Domínio",         score: 7 },
  { name: "Organização",     score: 7 },
  { name: "Aderência",       score: 8 },
  { name: "Exemplos",        score: 7 },
];

type InterviewDraft = {
  interviewId?: string;
  context: JobInterviewContext | null;
  questions: InterviewQuestion[];
  answers: Record<number, string>;
  evaluationMode: EvaluationMode | null;
};

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

function normalizeInterviewAnswer(value: string) {
  return value.replace(/\s*\r?\n+\s*/g, " ");
}

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
      ? draft.answers as Record<number, string>
      : {},
    evaluationMode: draft.evaluationMode === "AI" || draft.evaluationMode === "HUMAN" ? draft.evaluationMode : null,
  };

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
  onerror: (() => void) | null;
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
  variant = "primary", size = "md", children, onClick, disabled = false, className = "",
}: {
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

function Field({ label, type = "text", placeholder, hint, required, ...props }: FieldProps) {
  const isPassword = type === "password";
  return (
    <div>
      <label className="block text-sm font-semibold text-foreground mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {isPassword ? (
        <PasswordInput
          placeholder={placeholder}
          required={required}
          {...props}
        />
      ) : (
        <Input
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
  const activeSession = getMockAuthSession();
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
      notificationViewAllScreen="notifications"
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

function AuthScreen({
  onNavigate,
  onLoginWithCredentials,
  onRegister,
  initialTab = "register",
}: {
  onNavigate: (s: Screen) => void;
  onLoginWithCredentials: (email: string, password: string) => { ok: true } | { ok: false; message: string };
  onRegister: (data: { name: string; email: string; password: string }) => { ok: true } | { ok: false; message: string };
  initialTab?: "login" | "register";
}) {
  const [tab, setTab] = useState<"login" | "register">(initialTab);
  const [loginEmail, setLoginEmail] = useState(() => getRememberedLoginEmail());
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberAccess, setRememberAccess] = useState(() => Boolean(getRememberedLoginEmail()));
  const [loginError, setLoginError] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [registerAcceptedTerms, setRegisterAcceptedTerms] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const authNavigate = useNavigate();

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const selectAuthTab = (nextTab: "login" | "register") => {
    setTab(nextTab);
    setLoginError("");
    setRegisterError("");
    authNavigate(nextTab === "login" ? "/login" : "/register");
  };

  const handleLoginSubmit = () => {
    const result = onLoginWithCredentials(loginEmail, loginPassword);
    if (!result.ok) {
      setLoginError(result.message);
      return;
    }

    if (rememberAccess) {
      saveRememberedLoginEmail(loginEmail);
    } else {
      clearRememberedLoginEmail();
    }
  };

  const handleRegisterSubmit = () => {
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
    const result = onRegister({ name, email, password });
    if (!result.ok) {
      setRegisterError(result.message);
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
                className={`py-4 text-sm font-semibold transition-all ${tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t === "login" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          <div className="p-5 sm:p-7">
            {tab === "login" ? (
              <div className="space-y-4">
                <Field
                  label="E-mail"
                  type="email"
                  placeholder="seuemail@gmail.com"
                  value={loginEmail}
                  onChange={(event) => {
                    setLoginEmail(event.target.value);
                    setLoginError("");
                  }}
                  required
                />
                <Field
                  label="Senha"
                  type="password"
                  placeholder="Sua senha"
                  value={loginPassword}
                  onChange={(event) => {
                    setLoginPassword(event.target.value);
                    setLoginError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleLoginSubmit();
                    }
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
                    <label htmlFor="remember-access" className="text-muted-foreground cursor-pointer">
                      Lembrar acesso
                    </label>
                  </div>
                  <button onClick={() => onNavigate("forgot-password")} className="text-primary font-semibold hover:underline text-sm">Esqueci minha senha</button>
                </div>
                <Btn variant="primary" className="w-full !py-3" onClick={handleLoginSubmit}>
                  Entrar na plataforma
                </Btn>
              </div>
            ) : (
              <div className="space-y-4">
                <Field
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
                <div className="bg-accent rounded-xl p-4">
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
                    <span className="text-xs text-foreground leading-relaxed">
                      Li e aceito os <button onClick={() => onNavigate("terms")} className="text-primary font-semibold hover:underline">Termos de uso</button> e a <button onClick={() => onNavigate("privacy")} className="text-primary font-semibold hover:underline">Política de privacidade</button>. <span className="text-red-500">*</span>
                    </span>
                  </label>
                </div>
                {registerError && (
                  <Alert variant="error" className="rounded-xl p-3 text-xs">
                    {registerError}
                  </Alert>
                )}
                <Btn variant="primary" className="w-full !py-3" onClick={handleRegisterSubmit}>
                  Criar minha conta
                </Btn>
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground mt-5">
              {tab === "login" ? "Não tem uma conta? " : "Já tem uma conta? "}
              <button onClick={() => selectAuthTab(tab === "login" ? "register" : "login")} className="text-primary font-semibold hover:underline">
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

function DashboardScreen({
  onNavigate,
  session,
  activeDraftEntry,
  onContinueDraft,
}: {
  onNavigate: (s: Screen) => void;
  session: MockAuthSession;
  activeDraftEntry?: StoredInterviewDraftEntry | null;
  onContinueDraft?: () => void;
}) {
  const routerNavigate = useNavigate();
  const candidateUser = session.user;
  const isDemoCandidate = candidateUser?.id === "candidate-demo";
  const candidateIdentity = getCandidateIdentity(session);
  const candidateId = candidateIdentity.id;
  const account = getCandidateAccountConfig(candidateUser);
  const firstName = (candidateUser?.name ?? CANDIDATE_ACCOUNT.name).trim().split(/\s+/)[0] ?? "candidato";
  const candidateProfile = getCandidateProfile(candidateId, candidateUser);
  const profileCompleteness = getCandidateProfileCompleteness(candidateProfile);
  const candidateInterviews = getCandidateInterviews(candidateId);
  const availableReports = getAvailableCandidateReports(candidateId);
  const pendingCount = candidateInterviews.filter((item) => item.status !== "EVALUATED").length;
  const bestScore = availableReports
    .map((item) => getAverageScore(item.evaluation?.scores))
    .filter((score): score is number => score !== null)
    .sort((a, b) => b - a)[0];
  const RECENT = [
    { vaga: "Desenvolvedor Full Stack Júnior", empresa: "Tech Labs",        data: "18/07/2026", status: "Resultado disponível", badge: "success" as const, interviewId: undefined as string | undefined },
    { vaga: "Analista de RH",                  empresa: "Grupo Pessoas",    data: "10/07/2026", status: "Aguardando avaliação", badge: "warning" as const, interviewId: undefined as string | undefined },
    { vaga: "Assistente de Secretariado",      empresa: "Escritório Central", data: "02/07/2026", status: "Concluída",            badge: "default" as const, interviewId: undefined as string | undefined },
  ];
  type RecentInterviewItem = {
    vaga: string;
    empresa: string;
    data: string;
    status: string;
    badge: "success" | "warning" | "default" | "info";
    interviewId?: string;
    draft?: boolean;
    evaluationMode?: EvaluationMode | null;
  };
  const activeDraftRecentItem: RecentInterviewItem[] = activeDraftEntry?.draft.context
    ? [{
      vaga: activeDraftEntry.draft.context.title,
      empresa: activeDraftEntry.draft.context.company,
      data: formatInterviewDateTime(activeDraftEntry.updatedAt),
      status: "Em andamento",
      badge: "info",
      draft: true,
      evaluationMode: activeDraftEntry.draft.evaluationMode,
    }]
    : [];
  const recentItems: RecentInterviewItem[] = [
    ...activeDraftRecentItem,
    ...candidateInterviews.slice(0, 3).map((interview) => {
      const report = getReportByInterviewId(interview.id);
      const interviewTimestamp = interview.submittedAt ?? interview.createdAt;
      return {
        vaga: interview.context.title,
        empresa: interview.context.company,
        data: formatInterviewDateTime(interviewTimestamp),
        status: report?.status === "AVAILABLE" ? "Resultado disponível" : statusLabelFromInterview(interview.status),
        badge: report?.status === "AVAILABLE" ? "success" as const : interview.status === "PENDING_EVALUATION" ? "warning" as const : "info" as const,
        interviewId: interview.id,
        evaluationMode: interview.evaluationMode,
      };
    }),
    ...(isDemoCandidate ? RECENT : []),
  ].slice(0, 3);

  return (
    <AuthLayout current="dashboard" onNavigate={onNavigate} title="Dashboard" subtitle={`Bem-vindo de volta, ${firstName}!`} account={account}>
      {/* Profile incomplete banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 sm:p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">Perfil {profileCompleteness}% completo</p>
            <p className="text-xs text-muted-foreground mt-0.5">Complete seu perfil para obter perguntas mais relevantes.</p>
            <div className="mt-2 w-full max-w-xs bg-blue-100 rounded-full h-1.5">
              <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${profileCompleteness}%` }} />
            </div>
          </div>
        </div>
        <Btn variant="secondary" size="sm" onClick={() => onNavigate("profile")} className="self-start sm:self-auto shrink-0">
          Completar perfil
        </Btn>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard value={candidateInterviews.length || (isDemoCandidate ? 3 : 0)} label="Entrevistas realizadas" icon={MessageSquare} color="bg-blue-50 text-blue-600" />
        <StatCard value={pendingCount || (isDemoCandidate ? 1 : 0)} label="Aguardando avaliação"   icon={Clock}       color="bg-amber-50 text-amber-600" />
        <StatCard value={availableReports.length || (isDemoCandidate ? 1 : 0)} label="Resultado disponível"   icon={CheckCircle} color="bg-green-50 text-green-600" />
        <StatCard value={bestScore ? bestScore.toFixed(1).replace(".", ",") : isDemoCandidate ? "7,8" : "—"} label="Melhor pontuação"       icon={Award}       color="bg-purple-50 text-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* CTA principal */}
        <div>
          <div className="rounded-2xl p-5 sm:p-6 text-white h-full flex flex-col justify-between" style={{ background: "linear-gradient(135deg, #1D4ED8, #0F2652)" }}>
            <div>
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center mb-4">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-2">Nova entrevista</h3>
              <p className="text-blue-200 text-sm leading-relaxed mb-4">Cole a URL da vaga e pratique com perguntas contextualizadas.</p>
            </div>
            <Btn size="md" onClick={() => onNavigate("interview-setup")} className="!bg-white !text-blue-700 hover:!bg-blue-50 font-bold w-full">
              Iniciar prática <ArrowRight className="w-4 h-4" />
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
              {recentItems.length ? (
                recentItems.map((item) => (
                  <div key={item.interviewId ?? `${item.vaga}-${item.data}`} className="p-3 sm:p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center border border-border shrink-0 mt-0.5">
                        <Briefcase className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{item.vaga}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.empresa} · {item.data}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <EvaluationModeBadge mode={item.evaluationMode} />
                          <StatusBadge tone={statusToneFromBadge(item.badge)}><span className="truncate max-w-[140px] sm:max-w-none">{item.status}</span></StatusBadge>
                          {item.badge === "success" && (
                            <Btn size="sm" variant="primary" onClick={() => item.interviewId ? routerNavigate(`/candidate/reports/${item.interviewId}`) : onNavigate("report")}>
                              Ver relatório
                            </Btn>
                          )}
                          {item.draft && (
                            <Btn size="sm" variant="primary" onClick={onContinueDraft}>
                              Continuar entrevista
                            </Btn>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={MessageSquare}
                  title="Nenhuma entrevista enviada ainda"
                  description="Quando você concluir uma entrevista, ela aparecerá aqui com o status da avaliação."
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
          { icon: MessageSquare, label: "Nova entrevista", desc: "Use o link da vaga para contextualizar sua prática", screen: "interview-setup" as Screen, color: "text-green-600 bg-green-50" },
          { icon: BookOpen,  label: "Materiais de apoio",  desc: "Dicas e conteúdos de preparação",          screen: "materials" as Screen, color: "text-purple-600 bg-purple-50" },
        ].map(q => (
          <button key={q.label} onClick={() => q.screen && onNavigate(q.screen)} className="text-left w-full">
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

function ProfileScreen({ onNavigate, session }: { onNavigate: (s: Screen) => void; session: MockAuthSession }) {
  const candidateUser = session.user?.role === "CANDIDATE" ? session.user : null;
  const candidateIdentity = getCandidateIdentity(session);
  const account = getCandidateAccountConfig(candidateUser);
  const [profile, setProfile] = useState<CandidateProfile>(() => getCandidateProfile(candidateIdentity.id, candidateUser));
  const [openSection, setOpenSection] = useState<string | null>("objetivo");
  const [selectedAreaId, setSelectedAreaId] = useState<ProfessionalAreaId | "">((profile.areaId as ProfessionalAreaId | "") || "");
  const [selectedSubareaId, setSelectedSubareaId] = useState(profile.subareaId);
  const [newFormation, setNewFormation] = useState<Omit<CandidateFormation, "id">>({
    title: "",
    institution: "",
    level: "",
    status: "",
    startDate: "",
    endDate: "",
  });
  const [newCourse, setNewCourse] = useState<Omit<CandidateCourse, "id">>({
    name: "",
    institution: "",
    workload: "",
    completedAt: "",
  });
  const [newExperience, setNewExperience] = useState<Omit<CandidateExperience, "id">>({
    company: "",
    role: "",
    startDate: "",
    endDate: "",
    current: false,
    description: "",
  });
  const [newTechnicalSkill, setNewTechnicalSkill] = useState("");
  const [newBehavioralSkill, setNewBehavioralSkill] = useState("");
  const availableSubareas = selectedAreaId ? getProfessionalSubareasByArea(selectedAreaId) : [];
  const profileCompleteness = getCandidateProfileCompleteness(profile);

  useEffect(() => {
    const nextProfile = getCandidateProfile(candidateIdentity.id, candidateUser);
    setProfile(nextProfile);
    setSelectedAreaId((nextProfile.areaId as ProfessionalAreaId | "") || "");
    setSelectedSubareaId(nextProfile.subareaId);
  }, [candidateIdentity.id, candidateUser?.id]);

  const updateProfile = (patch: CandidateProfilePatch) => {
    setProfile((current) => ({ ...current, ...patch }));
  };

  const persistProfile = (patch: CandidateProfilePatch, message = "Perfil profissional salvo.") => {
    const saved = saveCandidateProfile(candidateIdentity.id, {
      ...profile,
      ...patch,
    });
    setProfile(saved);
    setSelectedAreaId((saved.areaId as ProfessionalAreaId | "") || "");
    setSelectedSubareaId(saved.subareaId);
    toast.success(message);
    return saved;
  };

  const handleSaveProfile = () => {
    persistProfile({
      ...profile,
      areaId: selectedAreaId,
      subareaId: selectedSubareaId,
    });
  };

  const handleSaveObjective = () => {
    persistProfile({
      areaId: selectedAreaId,
      subareaId: selectedSubareaId,
      desiredRole: profile.desiredRole,
      seniority: profile.seniority,
      contractType: profile.contractType,
      professionalSummary: profile.professionalSummary,
    }, "Objetivo profissional salvo.");
  };

  const hasText = (...values: string[]) => values.some((value) => value.trim().length > 0);

  const updateFormation = (id: string, patch: Partial<CandidateFormation>) => {
    updateProfile({ formations: profile.formations.map((item) => item.id === id ? { ...item, ...patch } : item) });
  };

  const addFormation = () => {
    if (!hasText(newFormation.title, newFormation.institution, newFormation.level, newFormation.startDate, newFormation.endDate, newFormation.status)) {
      toast.error("Preencha pelo menos um dado da formação antes de adicionar.");
      return;
    }
    const formations = [...profile.formations, { ...newFormation, id: `formation-${Date.now()}` }];
    const saved = saveCandidateProfile(candidateIdentity.id, { formations });
    setProfile((current) => ({ ...current, formations: saved.formations, updatedAt: saved.updatedAt }));
    setNewFormation({ title: "", institution: "", level: "", status: "", startDate: "", endDate: "" });
    toast.success("Formação adicionada.");
  };

  const removeFormation = (id: string) => {
    const saved = saveCandidateProfile(candidateIdentity.id, {
      formations: profile.formations.filter((item) => item.id !== id),
    });
    setProfile((current) => ({ ...current, formations: saved.formations, updatedAt: saved.updatedAt }));
    toast.success("Formação removida.");
  };

  const updateCourse = (id: string, patch: Partial<CandidateCourse>) => {
    updateProfile({ courses: profile.courses.map((item) => item.id === id ? { ...item, ...patch } : item) });
  };

  const addCourse = () => {
    if (!hasText(newCourse.name, newCourse.institution, newCourse.workload, newCourse.completedAt)) {
      toast.error("Preencha pelo menos um dado do curso antes de adicionar.");
      return;
    }
    const courses = [...profile.courses, { ...newCourse, id: `course-${Date.now()}` }];
    const saved = saveCandidateProfile(candidateIdentity.id, { courses });
    setProfile((current) => ({ ...current, courses: saved.courses, updatedAt: saved.updatedAt }));
    setNewCourse({ name: "", institution: "", workload: "", completedAt: "" });
    toast.success("Curso adicionado.");
  };

  const removeCourse = (id: string) => {
    const saved = saveCandidateProfile(candidateIdentity.id, {
      courses: profile.courses.filter((item) => item.id !== id),
    });
    setProfile((current) => ({ ...current, courses: saved.courses, updatedAt: saved.updatedAt }));
    toast.success("Curso removido.");
  };

  const updateExperience = (id: string, patch: Partial<CandidateExperience>) => {
    updateProfile({ experiences: profile.experiences.map((item) => item.id === id ? { ...item, ...patch } : item) });
  };

  const addExperience = () => {
    if (!hasText(newExperience.company, newExperience.role, newExperience.startDate, newExperience.endDate, newExperience.description)) {
      toast.error("Preencha pelo menos um dado da experiência antes de adicionar.");
      return;
    }
    const experiences = [...profile.experiences, { ...newExperience, id: `experience-${Date.now()}` }];
    const saved = saveCandidateProfile(candidateIdentity.id, { experiences });
    setProfile((current) => ({ ...current, experiences: saved.experiences, updatedAt: saved.updatedAt }));
    setNewExperience({ company: "", role: "", startDate: "", endDate: "", current: false, description: "" });
    toast.success("Experiência adicionada.");
  };

  const removeExperience = (id: string) => {
    const saved = saveCandidateProfile(candidateIdentity.id, {
      experiences: profile.experiences.filter((item) => item.id !== id),
    });
    setProfile((current) => ({ ...current, experiences: saved.experiences, updatedAt: saved.updatedAt }));
    toast.success("Experiência removida.");
  };

  const addSkill = (kind: "technicalSkills" | "behavioralSkills", value: string) => {
    const skill = value.trim();
    if (!skill) {
      toast.error("Digite uma habilidade antes de adicionar.");
      return;
    }
    const normalized = skill.toLocaleLowerCase("pt-BR");
    if (profile[kind].some((item) => item.trim().toLocaleLowerCase("pt-BR") === normalized)) {
      toast.error("Essa habilidade já foi adicionada.");
      return;
    }
    const patch = kind === "technicalSkills"
      ? { technicalSkills: [...profile.technicalSkills, skill] }
      : { behavioralSkills: [...profile.behavioralSkills, skill] };
    const saved = saveCandidateProfile(candidateIdentity.id, patch);
    setProfile((current) => ({
      ...current,
      technicalSkills: saved.technicalSkills,
      behavioralSkills: saved.behavioralSkills,
      updatedAt: saved.updatedAt,
    }));
    if (kind === "technicalSkills") setNewTechnicalSkill("");
    if (kind === "behavioralSkills") setNewBehavioralSkill("");
    toast.success("Habilidade adicionada.");
  };

  const removeSkill = (kind: "technicalSkills" | "behavioralSkills", value: string) => {
    const patch = kind === "technicalSkills"
      ? { technicalSkills: profile.technicalSkills.filter((item) => item !== value) }
      : { behavioralSkills: profile.behavioralSkills.filter((item) => item !== value) };
    const saved = saveCandidateProfile(candidateIdentity.id, patch);
    setProfile((current) => ({
      ...current,
      technicalSkills: saved.technicalSkills,
      behavioralSkills: saved.behavioralSkills,
      updatedAt: saved.updatedAt,
    }));
    toast.success("Habilidade removida.");
  };

  const sections = [
    {
      id: "objetivo",
      label: "Objetivo profissional",
      icon: Target,
      filled: Boolean(selectedAreaId || selectedSubareaId || profile.desiredRole || profile.seniority || profile.contractType || profile.professionalSummary),
    },
    { id: "formacao",    label: "Formação acadêmica",        icon: GraduationCap,filled: profile.formations.some((item) => hasText(item.title, item.institution, item.level, item.startDate, item.endDate, item.status)) },
    { id: "cursos",      label: "Cursos complementares",     icon: BookOpen,     filled: profile.courses.some((item) => hasText(item.name, item.institution, item.workload, item.completedAt)) },
    { id: "experiencia", label: "Experiência profissional",  icon: Briefcase,    filled: profile.experiences.some((item) => hasText(item.company, item.role, item.startDate, item.endDate, item.description)) },
    {
      id: "habilidades",
      label: "Habilidades e competências",
      icon: Star,
      filled: profile.technicalSkills.some((value) => value.trim().length > 0) || profile.behavioralSkills.some((value) => value.trim().length > 0),
    },
  ];

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
              <p className="text-xs text-muted-foreground mt-1 italic">
                {profile.professionalSummary ? `"${profile.professionalSummary}"` : "Resumo profissional ainda não preenchido."}
              </p>
            </div>
            <Btn variant="outline" size="sm" className="self-start sm:self-auto shrink-0" onClick={handleSaveProfile}>
              <Check className="w-3.5 h-3.5" /> Salvar perfil
            </Btn>
          </div>
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
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-1.5">
                          Área de interesse<span className="text-red-500 ml-0.5">*</span>
                        </label>
                        <div className="relative">
                          <NativeSelect
                            value={selectedAreaId}
                            onChange={event => {
                              setSelectedAreaId(event.target.value as ProfessionalAreaId | "");
                              setSelectedSubareaId("");
                            }}
                            required
                          >
                            <option value="">Selecione...</option>
                            {PROFESSIONAL_AREAS.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}
                          </NativeSelect>
                          <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-1.5">
                          Subárea de interesse<span className="text-red-500 ml-0.5">*</span>
                        </label>
                        <div className="relative">
                          <NativeSelect
                            value={selectedSubareaId}
                            onChange={event => setSelectedSubareaId(event.target.value)}
                            disabled={!selectedAreaId}
                            required
                          >
                            <option value="">Selecione...</option>
                            {availableSubareas.map(subarea => <option key={subarea.id} value={subarea.id}>{subarea.name}</option>)}
                          </NativeSelect>
                          <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        </div>
                      </div>
                      <Field
                        label="Cargo desejado"
                        placeholder="Ex: Desenvolvedor Front-end"
                        value={profile.desiredRole}
                        onChange={(event) => updateProfile({ desiredRole: event.target.value })}
                        required
                      />
                      <FieldSelect
                        label="Senioridade profissional"
                        options={SENIORITY_LEVEL_OPTIONS}
                        value={profile.seniority}
                        onChange={(event) => updateProfile({ seniority: event.target.value })}
                        required
                      />
                      <FieldSelect
                        label="Tipo de contrato"
                        options={["CLT", "Estágio", "PJ", "Temporário"]}
                        value={profile.contractType}
                        onChange={(event) => updateProfile({ contractType: event.target.value })}
                      />
                    </div>
                    <FieldArea
                      label="Resumo profissional"
                      placeholder="Escreva um breve texto sobre sua trajetória, objetivos e diferenciais..."
                      rows={3}
                      value={profile.professionalSummary}
                      onChange={(event) => updateProfile({ professionalSummary: event.target.value })}
                      required
                    />
                  </>
                )}
                {sec.id === "formacao" && (
                  <>
                    {profile.formations.length > 0 ? (
                      profile.formations.map((formation) => (
                        <div key={formation.id} className="bg-muted/50 rounded-xl p-4 border border-border space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                            <Field label="Curso" value={formation.title} onChange={(event) => updateFormation(formation.id, { title: event.target.value })} />
                            <Field label="Instituição" value={formation.institution} onChange={(event) => updateFormation(formation.id, { institution: event.target.value })} />
                            <Field label="Nível/tipo" value={formation.level} onChange={(event) => updateFormation(formation.id, { level: event.target.value })} />
                            <Field label="Início" value={formation.startDate} onChange={(event) => updateFormation(formation.id, { startDate: event.target.value })} />
                            <Field label="Conclusão" value={formation.endDate} onChange={(event) => updateFormation(formation.id, { endDate: event.target.value })} />
                            <FieldSelect
                              label="Situação"
                              options={["Em andamento", "Concluído", "Trancado", "Interrompido"]}
                              value={formation.status}
                              onChange={(event) => updateFormation(formation.id, { status: event.target.value })}
                            />
                          </div>
                          <div className="flex justify-end">
                            <button onClick={() => removeFormation(formation.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors" aria-label="Remover formação">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-muted/40 rounded-xl p-4 border border-border">
                        <p className="text-sm font-semibold text-foreground">Nenhuma formação adicionada</p>
                        <p className="text-xs text-muted-foreground mt-1">Adicione formações quando quiser completar seu perfil profissional.</p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 border-2 border-dashed border-border rounded-xl p-4">
                      <Field label="Curso" value={newFormation.title} onChange={(event) => setNewFormation((current) => ({ ...current, title: event.target.value }))} />
                      <Field label="Instituição" value={newFormation.institution} onChange={(event) => setNewFormation((current) => ({ ...current, institution: event.target.value }))} />
                      <Field label="Nível/tipo" value={newFormation.level} onChange={(event) => setNewFormation((current) => ({ ...current, level: event.target.value }))} />
                      <Field label="Início" value={newFormation.startDate} onChange={(event) => setNewFormation((current) => ({ ...current, startDate: event.target.value }))} />
                      <Field label="Conclusão" value={newFormation.endDate} onChange={(event) => setNewFormation((current) => ({ ...current, endDate: event.target.value }))} />
                      <FieldSelect
                        label="Situação"
                        options={["Em andamento", "Concluído", "Trancado", "Interrompido"]}
                        value={newFormation.status}
                        onChange={(event) => setNewFormation((current) => ({ ...current, status: event.target.value }))}
                      />
                    </div>
                    <button onClick={addFormation} className="w-full border-2 border-dashed border-border rounded-xl py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2">
                      <Plus className="w-4 h-4" /> Adicionar formação
                    </button>
                  </>
                )}
                {sec.id === "cursos" && (
                  <>
                    {profile.courses.length > 0 ? (
                      profile.courses.map((course) => (
                        <div key={course.id} className="bg-muted/50 rounded-xl p-4 border border-border space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                            <Field label="Curso" value={course.name} onChange={(event) => updateCourse(course.id, { name: event.target.value })} />
                            <Field label="Instituição/plataforma" value={course.institution} onChange={(event) => updateCourse(course.id, { institution: event.target.value })} />
                            <Field label="Carga horária" value={course.workload} onChange={(event) => updateCourse(course.id, { workload: event.target.value })} />
                            <Field label="Conclusão" value={course.completedAt} onChange={(event) => updateCourse(course.id, { completedAt: event.target.value })} />
                          </div>
                          <div className="flex justify-end">
                            <button onClick={() => removeCourse(course.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors" aria-label="Remover curso">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-muted/40 rounded-xl p-4 border border-border">
                        <p className="text-sm font-semibold text-foreground">Nenhum curso complementar adicionado</p>
                        <p className="text-xs text-muted-foreground mt-1">Adicione cursos quando quiser enriquecer seu perfil profissional.</p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 border-2 border-dashed border-border rounded-xl p-4">
                      <Field label="Curso" value={newCourse.name} onChange={(event) => setNewCourse((current) => ({ ...current, name: event.target.value }))} />
                      <Field label="Instituição/plataforma" value={newCourse.institution} onChange={(event) => setNewCourse((current) => ({ ...current, institution: event.target.value }))} />
                      <Field label="Carga horária" value={newCourse.workload} onChange={(event) => setNewCourse((current) => ({ ...current, workload: event.target.value }))} />
                      <Field label="Conclusão" value={newCourse.completedAt} onChange={(event) => setNewCourse((current) => ({ ...current, completedAt: event.target.value }))} />
                    </div>
                    <button onClick={addCourse} className="w-full border-2 border-dashed border-border rounded-xl py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2">
                      <Plus className="w-4 h-4" /> Adicionar curso
                    </button>
                  </>
                )}
                {sec.id === "experiencia" && (
                  <>
                    {profile.experiences.length > 0 ? (
                      profile.experiences.map((experience) => (
                        <div key={experience.id} className="bg-muted/50 rounded-xl p-4 border border-border space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                            <Field label="Empresa" value={experience.company} onChange={(event) => updateExperience(experience.id, { company: event.target.value })} />
                            <Field label="Cargo" value={experience.role} onChange={(event) => updateExperience(experience.id, { role: event.target.value })} />
                            <Field label="Início" value={experience.startDate} onChange={(event) => updateExperience(experience.id, { startDate: event.target.value })} />
                            <Field label="Fim" value={experience.endDate} disabled={experience.current} onChange={(event) => updateExperience(experience.id, { endDate: event.target.value })} />
                          </div>
                          <label className="flex items-center gap-2 text-sm text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={experience.current}
                              onChange={(event) => updateExperience(experience.id, { current: event.target.checked, endDate: event.target.checked ? "" : experience.endDate })}
                              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                            />
                            Trabalho atualmente nesta experiência
                          </label>
                          <FieldArea label="Descrição/responsabilidades" rows={3} value={experience.description} onChange={(event) => updateExperience(experience.id, { description: event.target.value })} />
                          <div className="flex justify-end">
                            <button onClick={() => removeExperience(experience.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors" aria-label="Remover experiência">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-muted/40 rounded-xl p-4 border border-border">
                        <p className="text-sm font-semibold text-foreground">Nenhuma experiência profissional adicionada</p>
                        <p className="text-xs text-muted-foreground mt-1">Adicione experiências quando quiser completar seu histórico profissional.</p>
                      </div>
                    )}
                    <div className="border-2 border-dashed border-border rounded-xl p-4 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                        <Field label="Empresa" value={newExperience.company} onChange={(event) => setNewExperience((current) => ({ ...current, company: event.target.value }))} />
                        <Field label="Cargo" value={newExperience.role} onChange={(event) => setNewExperience((current) => ({ ...current, role: event.target.value }))} />
                        <Field label="Início" value={newExperience.startDate} onChange={(event) => setNewExperience((current) => ({ ...current, startDate: event.target.value }))} />
                        <Field label="Fim" value={newExperience.endDate} disabled={newExperience.current} onChange={(event) => setNewExperience((current) => ({ ...current, endDate: event.target.value }))} />
                      </div>
                      <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={newExperience.current}
                          onChange={(event) => setNewExperience((current) => ({ ...current, current: event.target.checked, endDate: event.target.checked ? "" : current.endDate }))}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                        Trabalho atualmente nesta experiência
                      </label>
                      <FieldArea label="Descrição/responsabilidades" rows={3} value={newExperience.description} onChange={(event) => setNewExperience((current) => ({ ...current, description: event.target.value }))} />
                    </div>
                    <button onClick={addExperience} className="w-full border-2 border-dashed border-border rounded-xl py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2">
                      <Plus className="w-4 h-4" /> Adicionar experiência
                    </button>
                  </>
                )}
                {sec.id === "habilidades" && (
                  <>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Habilidades técnicas</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.technicalSkills.map(s => (
                          <UIBadge key={s} variant="primary" className="px-3 py-1 font-medium">
                            {s}
                            <button onClick={() => removeSkill("technicalSkills", s)} className="ml-1 text-blue-700/70 hover:text-blue-900" aria-label={`Remover ${s}`}>
                              <X className="w-3 h-3" />
                            </button>
                          </UIBadge>
                        ))}
                        {profile.technicalSkills.length === 0 && (
                          <span className="text-xs text-muted-foreground">Nenhuma habilidade técnica adicionada.</span>
                        )}
                      </div>
                      <div className="mt-3 flex flex-col sm:flex-row gap-2">
                        <Input value={newTechnicalSkill} onChange={(event) => setNewTechnicalSkill(event.target.value)} placeholder="Adicionar habilidade técnica" />
                        <Btn variant="secondary" size="sm" onClick={() => addSkill("technicalSkills", newTechnicalSkill)}>
                          <Plus className="w-3.5 h-3.5" /> Adicionar
                        </Btn>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Competências comportamentais</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.behavioralSkills.map(s => (
                          <UIBadge key={s} variant="neutral" className="border-green-100 bg-green-50 px-3 py-1 font-medium text-green-700">
                            {s}
                            <button onClick={() => removeSkill("behavioralSkills", s)} className="ml-1 text-green-700/70 hover:text-green-900" aria-label={`Remover ${s}`}>
                              <X className="w-3 h-3" />
                            </button>
                          </UIBadge>
                        ))}
                        {profile.behavioralSkills.length === 0 && (
                          <span className="text-xs text-muted-foreground">Nenhuma competência adicionada.</span>
                        )}
                      </div>
                      <div className="mt-3 flex flex-col sm:flex-row gap-2">
                        <Input value={newBehavioralSkill} onChange={(event) => setNewBehavioralSkill(event.target.value)} placeholder="Adicionar competência comportamental" />
                        <Btn variant="secondary" size="sm" onClick={() => addSkill("behavioralSkills", newBehavioralSkill)}>
                          <Plus className="w-3.5 h-3.5" /> Adicionar
                        </Btn>
                      </div>
                    </div>
                  </>
                )}
                {(
                  sec.id === "objetivo"
                  || sec.id === "formacao"
                  || sec.id === "cursos"
                  || sec.id === "experiencia"
                  || sec.id === "habilidades"
                ) && (
                  <div className="flex justify-end pt-2 border-t border-border">
                    <Btn
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        if (sec.id === "objetivo") {
                          handleSaveObjective();
                          return;
                        }
                        persistProfile({
                          formations: profile.formations,
                          courses: profile.courses,
                          experiences: profile.experiences,
                          technicalSkills: profile.technicalSkills,
                          behavioralSkills: profile.behavioralSkills,
                        }, "Alterações salvas.");
                      }}
                    >
                      Salvar alterações
                    </Btn>
                  </div>
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
            <span className="hidden sm:inline">Iniciar perguntas</span>
            <span className="sm:hidden">Perguntas</span>
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

function InterviewScreen({
  onNavigate,
  draft,
  setDraft,
  onQuestionIndexChange,
}: {
  onNavigate: (s: Screen) => void;
  draft: InterviewDraft;
  setDraft: Dispatch<SetStateAction<InterviewDraft>>;
  onQuestionIndexChange?: (index: number) => void;
}) {
  const [searchParams] = useSearchParams();
  const questions = draft.questions;
  const targetQuestionIndex = getQuestionIndexFromSearchParam(searchParams.get("question"), questions.length);
  const [qIdx, setQIdx] = useState(targetQuestionIndex);
  const [speechError, setSpeechError] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const [dictating, setDictating] = useState(false);
  const advancingRef = useRef(false);
  const recognitionRef = useRef<InstanceType<SpeechRecognitionConstructor> | null>(null);
  const question = questions[qIdx];
  const answer = question ? draft.answers[question.id] ?? "" : "";
  const answerLength = answer.length;
  const progress = questions.length ? ((qIdx + 1) / questions.length) * 100 : 0;
  const supportsSpeech = typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    return () => recognitionRef.current?.stop();
  }, []);

  useEffect(() => {
    setQIdx((current) => current === targetQuestionIndex ? current : targetQuestionIndex);
  }, [targetQuestionIndex]);

  useEffect(() => {
    onQuestionIndexChange?.(qIdx);
  }, [onQuestionIndexChange, qIdx]);

  const updateAnswer = (value: string) => {
    if (!question) return;
    const normalizedValue = normalizeInterviewAnswer(value);
    setDraft((current) => ({
      ...current,
      answers: { ...current.answers, [question.id]: normalizedValue },
    }));
    if (isValidInterviewAnswer(normalizedValue)) setValidationMessage("");
  };

  const stopDictation = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setDictating(false);
  };

  const toggleDictation = () => {
    if (!question) return;
    if (!supportsSpeech) {
      setSpeechError("Este navegador não oferece ditado por voz. Você pode responder digitando normalmente.");
      return;
    }
    if (dictating) {
      stopDictation();
      return;
    }

    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (transcript) {
        const availableChars = Math.max(0, ANSWER_MAX_CHARS - answer.length);
        if (availableChars === 0) return;
        const textToAppend = `${answer ? " " : ""}${transcript}`.slice(0, availableChars);
        updateAnswer(`${answer}${textToAppend}`.trim());
      }
    };
    recognition.onerror = () => {
      setSpeechError("Não foi possível usar o ditado por voz agora. Nenhum áudio é armazenado.");
      setDictating(false);
    };
    recognition.onend = () => setDictating(false);
    recognitionRef.current = recognition;
    setSpeechError("");
    setDictating(true);
    recognition.start();
  };

  const goNext = () => {
    if (advancingRef.current) return;
    if (!isValidInterviewAnswer(answer)) {
      setValidationMessage("Responda a pergunta atual antes de avançar.");
      toast.error("Responda a pergunta atual antes de avançar.");
      return;
    }
    advancingRef.current = true;
    stopDictation();
    if (qIdx < questions.length - 1) {
      setQIdx(qIdx + 1);
      setValidationMessage("");
    } else {
      const pendingIndex = getFirstPendingQuestionIndex(draft);
      if (pendingIndex >= 0) {
        setQIdx(pendingIndex);
        setValidationMessage("Responda todas as perguntas antes de revisar.");
        toast.error("Responda todas as perguntas antes de revisar.");
      } else {
        onNavigate("review");
      }
    }
    window.setTimeout(() => {
      advancingRef.current = false;
    }, 250);
  };

  if (!draft.context || !question) {
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

  const structuredRequirementSections = [
    { title: "Obrigatórios", items: draft.context.requiredRequirements ?? [] },
    { title: "Desejáveis", items: draft.context.desirableRequirements ?? [] },
    { title: "Diferenciais", items: draft.context.differentials ?? [] },
  ].filter((section) => section.items.length > 0);
  const requirementSections = structuredRequirementSections.length > 0
    ? structuredRequirementSections
    : [{ title: "Requisitos", items: draft.context.requirements }];

  return (
    <AuthLayout current="interview" onNavigate={onNavigate} title="Responder Perguntas" subtitle={`${draft.context.title} · ${draft.context.company}`}>
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
            <Textarea
              value={answer}
              onChange={(event) => updateAnswer(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (!event.repeat) goNext();
                }
              }}
              maxLength={ANSWER_MAX_CHARS}
              placeholder="Digite sua resposta. Se preferir, use o ditado por voz para preencher este campo."
              className="min-h-56"
            />
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
              <div className={`text-xs ${answerLength >= ANSWER_MAX_CHARS ? "text-amber-700 font-semibold" : "text-muted-foreground"}`}>
                {answerLength} / {ANSWER_MAX_CHARS} caracteres
              </div>
              <Btn variant={dictating ? "secondary" : "outline"} size="sm" onClick={toggleDictation}>
                <Mic className="w-4 h-4" /> {dictating ? "Parar ditado" : "Ditado por voz"}
              </Btn>
            </div>
            {validationMessage && (
              <p className="text-xs text-destructive mt-3 font-medium">{validationMessage}</p>
            )}
            {speechError && (
              <Alert variant="warning" className="mt-4 flex gap-3 rounded-2xl p-4">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">{speechError}</p>
              </Alert>
            )}
            <p className="text-xs text-muted-foreground mt-3">
              O ditado usa o recurso do navegador para inserir texto no campo. O RH Connect não cria, envia ou armazena arquivo de áudio nesta etapa.
            </p>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Contexto da vaga</p>
            <h3 className="font-bold text-foreground">{draft.context.title}</h3>
            <p className="text-sm text-muted-foreground mb-2">{draft.context.company}</p>
            <div className="mb-3">
              <EvaluationModeBadge mode={draft.evaluationMode} />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">{draft.context.summary}</p>
            <div className="space-y-3">
              {requirementSections.map((section) => (
                <div key={section.title} className="space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground">{section.title}</p>
                  {section.items.slice(0, 4).map((requirement) => (
                    <div key={requirement} className="flex items-start gap-2 text-xs text-foreground">
                      <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                      <span>{requirement}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Progresso</p>
            <div className="space-y-2">
              {questions.map((item, index) => {
                const answered = isValidInterviewAnswer(draft.answers[item.id]);
                const canOpenQuestion = index === qIdx || answered;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!canOpenQuestion}
                    onClick={() => {
                      if (!canOpenQuestion) return;
                      stopDictation();
                      setQIdx(index);
                    }}
                    className={`w-full flex items-center gap-2 text-left p-2 rounded-lg transition-colors ${
                      index === qIdx
                        ? "bg-blue-50 text-blue-700"
                        : canOpenQuestion
                          ? "hover:bg-muted"
                          : "cursor-not-allowed opacity-60"
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${answered ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                      {index + 1}
                    </span>
                    <span className="text-xs font-medium truncate">{answered ? "Respondida" : "Pendente"}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          <div className="flex gap-3">
            <Btn variant="outline" onClick={() => { stopDictation(); setQIdx(Math.max(0, qIdx - 1)); }} disabled={qIdx === 0}>
              Anterior
            </Btn>
            <Btn variant="primary" className="flex-1" onClick={goNext}>
              {qIdx < questions.length - 1 ? "Próxima" : "Revisar"} <ArrowRight className="w-4 h-4" />
            </Btn>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}

// ─── Screen 9: Revisão e Envio ────────────────────────────────────────────────

function ReviewScreen({ onNavigate, draft }: { onNavigate: (s: Screen) => void; draft: InterviewDraft }) {
  const routerNavigate = useNavigate();
  const [sending, setSending] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const answeredCount = draft.questions.filter((question) => isValidInterviewAnswer(draft.answers[question.id])).length;
  const allAnswersReady = hasAllRequiredInterviewAnswers(draft);
  const editQuestion = (index: number) => {
    routerNavigate(`${getPathForScreen("interview")}?question=${index + 1}`);
  };

  if (!draft.context || draft.questions.length === 0) {
    return <DraftWizardGuard current="review" onNavigate={onNavigate} />;
  }

  const handleSend = () => {
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
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{draft.answers[q.id] || "Resposta ainda não preenchida."}</p>
                  </div>
                  <Btn variant="outline" size="sm" onClick={() => editQuestion(i)} className="shrink-0">
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
          <Btn variant="outline" onClick={() => editQuestion(0)}>
            <Edit2 className="w-4 h-4" /> Editar respostas
          </Btn>
          <Btn variant="primary" size="lg" disabled={!confirm || sending || !allAnswersReady} onClick={handleSend}>
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

// ─── Screen 10: Avaliação Pendente ────────────────────────────────────────────

function PendingScreen({ onNavigate, session }: { onNavigate: (s: Screen) => void; session: MockAuthSession }) {
  const routerNavigate = useNavigate();
  const { id } = useParams();
  const interview = getInterviewById(id);
  const report = getReportByInterviewId(id);
  const candidateIdentity = getCandidateIdentity(session);
  const isRealPendingRoute = Boolean(id && id !== "interview-demo");
  const canAccessInterview = !isRealPendingRoute || !interview || interview.candidateId === candidateIdentity.id;
  const evaluationMode = interview?.evaluationMode ?? "HUMAN";
  const pendingDescription = evaluationMode === "AI"
    ? "Sua entrevista foi recebida com sucesso e será analisada pela IA Avaliadora do RH Connect."
    : "Sua entrevista foi recebida com sucesso e está sendo analisada por um avaliador humano autorizado. O resultado ficará disponível em até 72 horas.";
  const pendingStatusLabel = evaluationMode === "AI" ? "Aguardando avaliação por IA" : "Aguardando avaliação";
  const evaluationInfo = evaluationMode === "AI"
    ? [
        { q: "Quem avalia?",             a: "A IA Avaliadora do RH Connect analisa suas respostas considerando o contexto da vaga." },
        { q: "Quando sai o resultado?",  a: "O relatório será disponibilizado após o processamento da avaliação." },
        { q: "O que você vai receber?",  a: "Pontos fortes, pontos de atenção e recomendações para evoluir." },
        { q: "Quem vê minhas respostas?", a: "Apenas perfis autorizados envolvidos no funcionamento da plataforma." },
      ]
    : [
        { q: "Quem avalia?",             a: "Um avaliador humano autorizado com critérios padronizados de RH." },
        { q: "Quanto tempo leva?",        a: "O resultado ficará disponível em até 72 horas após o envio." },
        { q: "O que você vai receber?",   a: "Nota por critério, pontos fortes, oportunidades e recomendações." },
        { q: "Quem vê minhas respostas?", a: "Apenas o avaliador atribuído e o administrador da plataforma." },
      ];
  const TIMELINE = [
    { label: "Conta criada",          date: "02/07/2026",      done: true },
    { label: "Entrevista realizada",  date: "18/07/2026",      done: true },
    { label: "Respostas enviadas",    date: "18/07/2026",      done: true },
    { label: "Atribuída ao avaliador",date: "19/07/2026",      done: true },
    { label: "Em avaliação",          date: "20/07/2026",      done: false, active: true },
    { label: "Relatório disponível",  date: "Estimativa: 21/07",done: false },
  ];

  if (!canAccessInterview) {
    return (
      <AuthLayout current="pending" onNavigate={onNavigate} title="Entrevista indisponível" subtitle="Acompanhamento da entrevista">
        <Card className="w-full max-w-2xl p-6 text-center">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h3 className="font-bold text-foreground mb-2">Não encontramos esta entrevista na sua conta</h3>
          <p className="text-sm text-muted-foreground mb-5">Acesse o histórico para acompanhar entrevistas vinculadas ao seu perfil.</p>
          <Btn variant="primary" onClick={() => onNavigate("interview-history")}>Voltar ao histórico</Btn>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout current="pending" onNavigate={onNavigate} title="Acompanhamento da Entrevista" subtitle={`${interview?.context.title ?? "Desenvolvedor Full Stack Júnior"} · ${interview?.context.company ?? "Tech Labs"}`}>
      <div className="w-full">
        {/* Status hero */}
        <Card className="p-6 sm:p-8 mb-6 text-center">
          <div className="w-16 h-16 bg-amber-50 border-2 border-amber-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Entrevista em avaliação</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-5">
            {pendingDescription}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <StatusBadge tone="warning">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse mr-1" />
              {pendingStatusLabel}
            </StatusBadge>
            <span className="text-xs text-muted-foreground">· Protocolo #ENT-2026-0847</span>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {/* Timeline */}
          <Card className="p-5">
            <h3 className="font-bold text-foreground mb-5 text-sm">Histórico da entrevista</h3>
            {TIMELINE.map((step, i) => (
              <div key={step.label} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${step.done ? "bg-green-100 border-2 border-green-500" : (step as any).active ? "bg-amber-100 border-2 border-amber-400" : "bg-muted border-2 border-border"}`}>
                    {step.done
                      ? <Check className="w-3.5 h-3.5 text-green-600" />
                      : (step as any).active
                      ? <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                      : <div className="w-2 h-2 bg-muted-foreground/30 rounded-full" />}
                  </div>
                  {i < TIMELINE.length - 1 && (
                    <div className={`w-px h-7 ${step.done ? "bg-green-300" : "bg-border"}`} />
                  )}
                </div>
                <div className="pb-4">
                  <p className={`text-sm font-semibold ${step.done || (step as any).active ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
                  <p className="text-xs text-muted-foreground">{step.date}</p>
                </div>
              </div>
            ))}
          </Card>

          {/* Info panel */}
          <Card className="p-5">
            <h3 className="font-bold text-foreground mb-4 text-sm flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" /> Sobre a avaliação
            </h3>
            <div className="space-y-3">
              {evaluationInfo.map(({ q, a }) => (
                <div key={q} className="p-3 bg-muted/40 rounded-xl">
                  <p className="text-xs font-bold text-foreground mb-1">{q}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Enquanto aguarda + CTA */}
          <div className="space-y-4 xl:col-start-3">
            <Card className="p-5 bg-blue-50 border-blue-100">
              <p className="text-sm font-bold text-foreground mb-3">Enquanto aguarda...</p>
              <ul className="space-y-2">
                {["Revise materiais de preparação","Complete seu perfil profissional","Analise outra URL de vaga","Pratique uma nova entrevista"].map(s => (
                  <li key={s} className="flex items-center gap-2 text-xs text-foreground">
                    <ChevronRight className="w-3.5 h-3.5 text-blue-600 shrink-0" /> {s}
                  </li>
                ))}
              </ul>
            </Card>
            <Btn
              variant={report?.status === "AVAILABLE" ? "primary" : "outline"}
              className="w-full"
              disabled={report?.status !== "AVAILABLE"}
              onClick={() => id && routerNavigate(`/candidate/reports/${id}`)}
            >
              {report?.status === "AVAILABLE" ? "Ver resultado disponível" : "Resultado ainda indisponível"} <ArrowRight className="w-4 h-4" />
            </Btn>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}

// ─── Screen 11: Resultado e Relatório ─────────────────────────────────────────

function ReportScreen({ onNavigate, session }: { onNavigate: (s: Screen) => void; session: MockAuthSession }) {
  const { id } = useParams();
  const interview = getInterviewById(id);
  const evaluation = getEvaluationByInterviewId(id);
  const report = getReportByInterviewId(id);
  const isRealReportRoute = Boolean(id && id !== "report-demo");
  const candidateIdentity = getCandidateIdentity(session);
  const [resultView, setResultView] = useState<"Atual" | "Anterior" | "Melhor resultado">("Atual");
  const [isReportFading, setIsReportFading] = useState(false);
  const [hoveredCriterion, setHoveredCriterion] = useState<string | null>(null);

  if (isRealReportRoute && interview && interview.candidateId !== candidateIdentity.id) {
    return (
      <AuthLayout current="report" onNavigate={onNavigate} title="Resultado indisponível" subtitle="Relatório da entrevista">
        <Card className="w-full max-w-2xl p-6 text-center">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h3 className="font-bold text-foreground mb-2">Este relatório não pertence à sua conta</h3>
          <p className="text-sm text-muted-foreground mb-5">Acesse o histórico para consultar relatórios vinculados ao seu perfil.</p>
          <Btn variant="primary" onClick={() => onNavigate("interview-history")}>Voltar ao histórico</Btn>
        </Card>
      </AuthLayout>
    );
  }

  if (isRealReportRoute && (!report || report.status !== "AVAILABLE")) {
    const pendingReportMessage = interview?.evaluationMode === "AI"
      ? "O relatório ficará disponível após o processamento da avaliação por IA."
      : "O relatório fica disponível após a conclusão da avaliação humana.";
    return (
      <AuthLayout current="report" onNavigate={onNavigate} title="Resultado indisponível" subtitle={interview?.context.title ?? "Entrevista em avaliação"}>
        <Card className="w-full max-w-2xl p-6 text-center">
          <Clock className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h3 className="font-bold text-foreground mb-2">Relatório ainda não liberado</h3>
          <p className="text-sm text-muted-foreground mb-5">{pendingReportMessage}</p>
          <Btn variant="primary" onClick={() => onNavigate("interview-history")}>Voltar ao histórico</Btn>
        </Card>
      </AuthLayout>
    );
  }

  const normalizeEvaluationCriteria = (scores?: Record<string, number>) =>
    scores
      ? Object.entries(scores).map(([name, score]) => ({
        name: name === "Aderência aos requisitos" ? "Aderência" : name === "Capacidade de exemplificar" ? "Exemplos" : name,
        score,
      }))
      : CRITERIA;
  const resolveEvaluationScore = (candidateEvaluation?: typeof evaluation) =>
    candidateEvaluation?.overallScore ?? getAverageScore(candidateEvaluation?.scores);
  const resolveComparisonTimestamp = (item: {
    report?: { generatedAt?: string; updatedAt: string; createdAt: string };
    interview?: { submittedAt?: string; updatedAt: string; createdAt: string };
    evaluation?: { completedAt?: string; updatedAt: string; createdAt: string };
  }) => {
    const raw =
      item.evaluation?.completedAt ??
      item.report?.generatedAt ??
      item.interview?.submittedAt ??
      item.evaluation?.updatedAt ??
      item.report?.updatedAt ??
      item.interview?.updatedAt ??
      item.evaluation?.createdAt ??
      item.report?.createdAt ??
      item.interview?.createdAt;
    const timestamp = raw ? new Date(raw).getTime() : Number.NaN;
    return Number.isFinite(timestamp) ? timestamp : 0;
  };
  const availableReportEntries = getAvailableCandidateReports(candidateIdentity.id)
    .filter((entry) => entry.evaluation)
    .map((entry) => ({
      ...entry,
      key: entry.evaluation!.id,
      score: resolveEvaluationScore(entry.evaluation),
      timestamp: resolveComparisonTimestamp(entry),
    }))
    .filter((entry) => entry.score != null)
    .sort((a, b) => b.timestamp - a.timestamp);
  const currentEntry = availableReportEntries.find((entry) =>
    entry.interview.id === interview?.id ||
    entry.report.id === report?.id ||
    entry.evaluation?.id === evaluation?.id
  );
  const currentKey = currentEntry?.key ?? evaluation?.id ?? id ?? "current";
  const currentTimestamp = currentEntry?.timestamp ?? resolveComparisonTimestamp({ report: report ?? undefined, interview: interview ?? undefined, evaluation: evaluation ?? undefined });
  const previousEntry = availableReportEntries
    .filter((entry) => entry.key !== currentKey && entry.timestamp < currentTimestamp)
    .sort((a, b) => b.timestamp - a.timestamp)[0];
  const bestAvailableEntry = [...availableReportEntries]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || b.timestamp - a.timestamp)[0];
  const bestEntry = bestAvailableEntry &&
    bestAvailableEntry.key !== currentKey &&
    bestAvailableEntry.key !== previousEntry?.key
      ? bestAvailableEntry
      : undefined;
  type ReportResultOption = "Atual" | "Anterior" | "Melhor resultado";
  type ReportResult = {
    evaluation: typeof evaluation;
    summary: string;
    criteria: { name: string; score: number }[];
    overallScore?: number | null;
    evaluationMode?: EvaluationMode | null;
  };
  const reportResults: Record<ReportResultOption, ReportResult | undefined> = {
    Atual: {
      evaluation,
      summary:
        evaluation?.summary || evaluation?.comment || "Resumo não informado para esta avaliação.",
      criteria: normalizeEvaluationCriteria(evaluation?.scores),
      overallScore: resolveEvaluationScore(evaluation),
      evaluationMode: interview?.evaluationMode,
    },
    Anterior: previousEntry?.evaluation ? {
        evaluation: previousEntry.evaluation,
        summary: previousEntry.evaluation.summary || previousEntry.evaluation.comment || "Resumo não informado para esta avaliação.",
        criteria: normalizeEvaluationCriteria(previousEntry.evaluation.scores),
        overallScore: previousEntry.score,
        evaluationMode: previousEntry.interview.evaluationMode,
      } : undefined,
    "Melhor resultado": bestEntry?.evaluation ? {
        evaluation: bestEntry.evaluation,
        summary: bestEntry.evaluation.summary || bestEntry.evaluation.comment || "Resumo não informado para esta avaliação.",
        criteria: normalizeEvaluationCriteria(bestEntry.evaluation.scores),
        overallScore: bestEntry.score,
        evaluationMode: bestEntry.interview.evaluationMode,
      } : undefined,
  };
  const resultOptions = (["Atual", "Anterior", "Melhor resultado"] as const)
    .filter((option) => Boolean(reportResults[option]));
  const currentReport = reportResults[resultView] ?? reportResults.Atual!;
  const radarData = currentReport.criteria;
  const computedAverageScore = radarData.reduce((sum, item) => sum + item.score, 0) / radarData.length;
  const averageScoreValue = currentReport.overallScore ?? computedAverageScore;
  const averageScore = averageScoreValue.toFixed(1);

  const scoreState = (score: number) => {
    if (score >= 9) return { label: "Excelente", color: "#16A34A", bg: "bg-green-50", text: "text-green-700", border: "border-green-200", badge: "success" as const };
    if (score >= 7) return { label: "Bom", color: "#1D4ED8", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", badge: "info" as const };
    return { label: "Atenção", color: "#D97706", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", badge: "warning" as const };
  };

  const formatScore = (score: number) => score.toFixed(1).replace(".", ",");
  const generalState = scoreState(averageScoreValue);
  const reportStrengths = currentReport.evaluation?.strengths?.filter(Boolean) ?? [];
  const reportImprovements = currentReport.evaluation?.improvements?.filter(Boolean) ?? [];
  const reportRecommendations = currentReport.evaluation?.recommendations?.filter(Boolean) ?? [];

  const selectResultView = (option: typeof resultOptions[number]) => {
    if (option === resultView) return;
    setIsReportFading(true);
    window.setTimeout(() => {
      setResultView(option);
      setIsReportFading(false);
    }, 180);
  };

  const renderRadarTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;
    const state = scoreState(item.score);
    return (
      <div className="rounded-xl border border-border bg-white px-3 py-2 shadow-lg">
        <p className="text-xs font-bold text-foreground">{item.name}</p>
        <p className="text-lg font-extrabold leading-tight" style={{ color: state.color }}>{formatScore(item.score)}</p>
        <p className={`text-[11px] font-semibold ${state.text}`}>{state.label}</p>
      </div>
    );
  };

  return (
    <AuthLayout
      current="report"
      onNavigate={onNavigate}
      title="Resultado e Relatório"
      subtitle={`${interview?.context.title ?? "Desenvolvedor Full Stack Júnior"} · ${interview?.context.company ?? "Tech Labs"}${report?.generatedAt ? ` · ${new Date(report.generatedAt).toLocaleDateString("pt-BR")}` : " · 18/07/2026"}`}
      actions={<Btn variant="outline" size="sm" onClick={() => toast.success("PDF gerado! O download iniciará em instantes.")}><Upload className="w-3.5 h-3.5" /> Exportar PDF</Btn>}
    >
      <div className="w-full">
        {/* Score hero — two-panel */}
        <Card className="mb-6 overflow-hidden">
          <div className="flex flex-col md:grid md:grid-cols-2">
            {/* Left: Desempenho Geral */}
            <div className="p-6 sm:p-8 border-b border-border md:border-b-0 md:border-r" style={{ background: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 60%)" }}>
              <p className="text-[11px] font-bold uppercase tracking-widest text-blue-700 mb-5 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5" /> Desempenho Geral
              </p>
              <div style={{ opacity: isReportFading ? 0 : 1, transition: "opacity 180ms ease" }}>
                <div className="flex items-end gap-2 mb-4">
                  <span className="text-[72px] sm:text-[80px] font-extrabold text-foreground leading-none">{averageScore}</span>
                  <span className="text-2xl font-bold text-muted-foreground mb-3">/ 10</span>
                </div>
                <div className="mb-5">
                  <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 ${generalState.bg} ${generalState.text} text-sm font-bold rounded-full border ${generalState.border}`}>
                    <CheckCircle className="w-3.5 h-3.5" /> {generalState.label}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  {currentReport.summary}
                </p>
              </div>
              <div className="flex items-start gap-3 p-4 bg-white/70 rounded-xl border border-blue-100">
                <Target className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-foreground">Continue evoluindo!</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Cada prática aproxima você da sua oportunidade ideal.</p>
                </div>
              </div>
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
                <div className="flex w-fit max-w-full flex-wrap gap-0.5 rounded-lg border border-blue-100 bg-white/70 p-0.5 shadow-sm sm:flex-nowrap">
                  {resultOptions.map(option => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => selectResultView(option)}
                      className={`min-w-0 rounded-md px-2 py-1 text-[10px] font-bold leading-tight transition-all duration-150 sm:px-3 sm:text-xs ${
                        resultView === option
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-blue-700/60 hover:text-blue-700"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <EvaluationModeBadge mode={currentReport.evaluationMode} />
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
                        <text
                          x={labelX}
                          y={labelY}
                          textAnchor={textAnchor}
                          fontSize={10}
                          fontWeight={600}
                          fill="#0F1B2D"
                          {...rest}
                        >
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
                      const state = scoreState(score);
                      const isHovered = hoveredCriterion === name;
                      return (
                        <g
                          key={key ?? `radar-dot-${name || cx}-${cy}`}
                          onMouseEnter={() => setHoveredCriterion(name)}
                          onMouseLeave={() => setHoveredCriterion(null)}
                          style={{ cursor: "pointer" }}
                        >
                          <g
                            key={`${resultView}-${name}`}
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
              <div
                key={resultView}
                className="mt-3 grid grid-cols-1 gap-x-3 gap-y-1.5 border-t border-border pt-3 sm:grid-cols-2"
                style={{ animation: "reportCriteriaIn 350ms ease-out" }}
              >
                {radarData.map(item => {
                  const state = scoreState(item.score);
                  const isHovered = hoveredCriterion === item.name;
                  return (
                    <div
                      key={item.name}
                      className={`flex items-center justify-between gap-2 rounded-md px-1 py-1 transition-colors ${isHovered ? "bg-blue-50" : ""}`}
                    >
                      <span className="min-w-0 truncate text-xs font-medium text-foreground">{item.name}</span>
                      <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${state.bg} ${state.text}`}>
                        {formatScore(item.score)} · {state.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          {/* Strengths */}
          <Card className="p-5 sm:p-6">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-green-600" /> Pontos fortes
            </h3>
            <div className="space-y-3">
              {reportStrengths.length > 0 ? reportStrengths.map((strength, index) => (
                <div key={`${strength}-${index}`} className="flex gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                  <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">{strength}</p>
                </div>
              )) : (
                <div className="flex gap-3 p-3 bg-muted rounded-xl border border-border">
                  <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Esta avaliação não possui pontos fortes estruturados registrados.
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Improvements */}
          <Card className="p-5 sm:p-6">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-500" /> Oportunidades de melhoria
            </h3>
            <div className="space-y-3">
              {reportImprovements.length > 0 ? reportImprovements.map((improvement, index) => (
                <div key={`${improvement}-${index}`} className="flex gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">{improvement}</p>
                </div>
              )) : (
                <div className="flex gap-3 p-3 bg-muted rounded-xl border border-border">
                  <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Esta avaliação não possui oportunidades de melhoria estruturadas registradas.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Recommendations */}
        <Card className="p-5 sm:p-6 mb-5">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-blue-600" /> Recomendações de desenvolvimento
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {reportRecommendations.length > 0
              ? reportRecommendations.map((recommendation, index) => {
                const RecommendationIcon = [BookOpen, MessageSquare, Target, Lightbulb][index % 4];
                return (
                  <div key={`${recommendation}-${index}`} className="flex gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                      <RecommendationIcon className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground mb-1">{`Recomendação ${index + 1}`}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{recommendation}</p>
                    </div>
                  </div>
                );
              })
              : (
                <div className="flex gap-3 rounded-xl border border-border bg-muted p-3 sm:col-span-2 xl:col-span-4">
                  <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Esta avaliação não possui recomendações estruturadas registradas.
                  </p>
                </div>
              )}
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
  session,
  activeDraftEntry,
  onContinueDraft,
}: {
  onNavigate: (s: Screen) => void;
  session: MockAuthSession;
  activeDraftEntry?: StoredInterviewDraftEntry | null;
  onContinueDraft?: () => void;
}) {
  const routerNavigate = useNavigate();
  const candidateIdentity = getCandidateIdentity(session);
  const isDemoCandidate = session.user?.id === "candidate-demo";
  const candidateInterviews = getCandidateInterviews(candidateIdentity.id);
  type CandidateHistoryItem = {
    id: string;
    vaga: string;
    empresa: string;
    data: string;
    hora?: string;
    perguntas: number;
    status: string;
    nota: string | null;
    badge: "success" | "warning" | "default" | "info";
    realId?: string;
    draft?: boolean;
    evaluationMode?: EvaluationMode | null;
  };
  const HISTORICO: CandidateHistoryItem[] = [
    { id: "E003", vaga: "Desenvolvedor Full Stack Júnior", empresa: "Tech Labs",           data: "18/07/2026", perguntas: 5, status: "Concluída", nota: "7.7", badge: "success" as const, realId: undefined as string | undefined },
    { id: "E002", vaga: "Analista de RH",                  empresa: "Grupo Pessoas",       data: "10/07/2026", perguntas: 5, status: "Aguardando avaliação", nota: null, badge: "warning" as const, realId: undefined as string | undefined },
    { id: "E001", vaga: "Assistente de Secretariado",      empresa: "Escritório Central",  data: "02/07/2026", perguntas: 5, status: "Concluída", nota: "7.2", badge: "default" as const, realId: undefined as string | undefined },
  ];
  const realHistory = candidateInterviews.map((interview) => {
    const report = getReportByInterviewId(interview.id);
    const evaluation = getEvaluationByInterviewId(interview.id);
    const average = getAverageScore(evaluation?.scores);
    const interviewTimestamp = interview.submittedAt ?? interview.createdAt;
    const interviewDate = new Date(interviewTimestamp);
    return {
      id: interview.id,
      vaga: interview.context.title,
      empresa: interview.context.company,
      data: interviewDate.toLocaleDateString("pt-BR"),
      hora: interviewDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      perguntas: interview.answers.length,
      status: report?.status === "AVAILABLE" ? "Concluída" : statusLabelFromInterview(interview.status),
      nota: average ? average.toFixed(1) : null,
      badge: report?.status === "AVAILABLE" ? "success" as const : "warning" as const,
      realId: interview.id,
      evaluationMode: interview.evaluationMode,
    };
  });
  const draftHistoryItem: CandidateHistoryItem[] = activeDraftEntry?.draft.context
    ? [{
      id: "active-interview-draft",
      vaga: activeDraftEntry.draft.context.title,
      empresa: activeDraftEntry.draft.context.company,
      data: new Date(activeDraftEntry.updatedAt).toLocaleDateString("pt-BR"),
      hora: new Date(activeDraftEntry.updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      perguntas: activeDraftEntry.draft.questions.length,
      status: "Em andamento",
      nota: null,
      badge: "info" as const,
      draft: true,
      evaluationMode: activeDraftEntry.draft.evaluationMode,
    }]
    : [];
  const historyItems = [...draftHistoryItem, ...realHistory, ...(isDemoCandidate ? HISTORICO : [])];
  const inProgressCount = historyItems.filter((item) => item.status === "Em andamento").length;

  const [filtro, setFiltro] = useState("Todos");
  const filtered = historyItems.filter(h => {
    if (filtro === "Todos") return true;
    if (filtro === "Concluídas") return h.status === "Concluída";
    if (filtro === "Aguardando") return h.status.includes("Aguardando");
    if (filtro === "Em andamento") return h.status === "Em andamento";
    return true;
  });

  return (
    <AuthLayout
      current="interview-history"
      onNavigate={onNavigate}
      title="Histórico de Entrevistas"
      subtitle="Todas as suas entrevistas simuladas"
    >
      <div className="w-full space-y-4">
        {/* Filtros */}
        <Card className="p-4 sm:p-5">
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-sm font-semibold text-foreground shrink-0">Filtrar por:</span>
            {["Todos", "Concluídas", "Aguardando", "Em andamento"].map(f => (
              <FilterChip key={f} onClick={() => setFiltro(f)} selected={f === filtro}>
                {f === "Em andamento" ? `Em andamento (${inProgressCount})` : f}
              </FilterChip>
            ))}
          </div>
        </Card>

        {/* Lista */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <EmptyState
              className="p-8"
              title={<span className="text-sm font-normal text-muted-foreground">Nenhuma entrevista encontrada para este filtro.</span>}
            />
          )}
          {filtered.map((h) => (
            <Card key={h.id} className="p-4 sm:p-5 hover:shadow-md transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-bold text-foreground text-sm">{h.vaga}</p>
                    <StatusBadge tone={statusToneFromBadge(h.badge)}>{h.status}</StatusBadge>
                    <EvaluationModeBadge mode={h.evaluationMode} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {h.empresa} · {h.perguntas} perguntas · {h.data}{h.hora ? ` · ${h.hora}` : ""}
                  </p>
                  {h.nota && (
                    <p className="text-xs font-semibold text-green-700 mt-1.5">Nota: {h.nota} / 10</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  {h.draft && (
                    <Btn variant="primary" size="sm" onClick={onContinueDraft}>
                      Continuar entrevista
                    </Btn>
                  )}
                  {h.nota && (
                    <Btn variant="primary" size="sm" onClick={() => h.realId ? routerNavigate(`/candidate/reports/${h.realId}`) : onNavigate("report")}>
                      Ver relatório
                    </Btn>
                  )}
                  {h.badge === "warning" && (
                    <Btn variant="outline" size="sm" onClick={() => h.realId ? routerNavigate(`/candidate/interviews/${h.realId}/status`) : onNavigate("pending")}>
                      Acompanhar
                    </Btn>
                  )}
                  {!h.draft && (
                    <Btn variant="secondary" size="sm" onClick={() => onNavigate("interview-setup")}>
                      Praticar novamente
                    </Btn>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AuthLayout>
  );
}

// ─── Fase A: ENT-001 Nova entrevista ─────────────────────────────────────────

function InterviewSetupScreen({
  onNavigate,
  draft,
  setDraft,
  session,
  savedDraftAvailable,
  onContinueSavedDraft,
  onDiscardSavedDraft,
  onCancelInterview,
  onCancelPreparation,
}: {
  onNavigate: (s: Screen) => void;
  draft: InterviewDraft;
  setDraft: Dispatch<SetStateAction<InterviewDraft>>;
  session: MockAuthSession;
  savedDraftAvailable?: boolean;
  onContinueSavedDraft?: () => void;
  onDiscardSavedDraft?: () => void;
  onCancelInterview?: () => void;
  onCancelPreparation?: () => void;
}) {
  const candidateUser = session.user?.role === "CANDIDATE" ? session.user : null;
  const candidateIdentity = getCandidateIdentity(session);
  const candidateProfile = getCandidateProfile(candidateIdentity.id, candidateUser);
  const profileReadyForInterview = isCandidateProfileReadyForInterview(candidateProfile);
  const [url, setUrl] = useState(draft.context?.sourceUrl ?? "");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">(draft.context ? "success" : "idle");
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(Boolean(draft.context));
  const [generating, setGenerating] = useState(false);
  const [confirmDiscardDraft, setConfirmDiscardDraft] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const hadContextRef = useRef(Boolean(draft.context));
  const structuredRequirementSections = draft.context
    ? [
      { title: "Requisitos obrigatórios", items: draft.context.requiredRequirements ?? [] },
      { title: "Desejáveis", items: draft.context.desirableRequirements ?? [] },
      { title: "Diferenciais", items: draft.context.differentials ?? [] },
    ].filter((section) => section.items.length > 0)
    : [];
  const requirementSections = structuredRequirementSections.length > 0
    ? structuredRequirementSections
    : draft.context
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
    setStatus("loading");
    setError("");
    setConfirmed(false);
    setDescriptionExpanded(false);
    try {
      const context = await analyzeJobUrl(url);
      setDraft((current) => ({ ...current, context, questions: [], answers: {}, evaluationMode: null }));
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Não foi possível analisar a URL informada.");
    }
  };

  const handleContinue = async () => {
    if (!draft.context || !confirmed) {
      toast.error("Confirme o contexto da vaga antes de continuar.");
      return;
    }
    setGenerating(true);
    try {
      const questions = await generateInterviewQuestions(draft.context);
      setDraft((current) => ({ ...current, questions, answers: {}, evaluationMode: null }));
      onNavigate("consent");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Não foi possível gerar as perguntas da entrevista. Tente novamente.",
      );
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (hadContextRef.current && !draft.context) {
      setUrl("");
      setStatus("idle");
      setError("");
      setConfirmed(false);
      setDescriptionExpanded(false);
    }
    hadContextRef.current = Boolean(draft.context);
  }, [draft.context]);

  if (!profileReadyForInterview) {
    return (
      <AuthLayout
        current="interview-setup"
        onNavigate={onNavigate}
        title="Nova entrevista"
        subtitle="Complete seu contexto profissional para começar"
      >
        <Card className="w-full max-w-2xl p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-foreground">Complete as informações essenciais do seu perfil</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Precisamos de algumas informações profissionais para contextualizar melhor sua entrevista.
              </p>
              <div className="mt-5">
                <Btn variant="primary" onClick={() => onNavigate("profile")}>
                  Completar perfil
                </Btn>
              </div>
            </div>
          </div>
        </Card>
      </AuthLayout>
    );
  }

  if (savedDraftAvailable && draft.context) {
    return (
      <AuthLayout
        current="interview-setup"
        onNavigate={onNavigate}
        title="Nova entrevista"
        subtitle="Retome ou descarte o progresso salvo"
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
                  Continue de onde parou em {draft.context.title} ou descarte o progresso salvo para iniciar uma nova entrevista.
                </p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Btn variant="primary" onClick={onContinueSavedDraft}>
                    Continuar entrevista
                  </Btn>
                  <Btn variant="outline" onClick={() => setConfirmDiscardDraft(true)}>
                    Descartar e iniciar nova
                  </Btn>
                </div>
              </div>
            </div>
          </Card>
        </div>
        {confirmDiscardDraft && (
          <ConfirmModal
            title="Descartar entrevista em andamento?"
            message="O progresso salvo desta entrevista será removido."
            confirmLabel="Descartar e iniciar nova"
            danger
            onConfirm={() => {
              setConfirmDiscardDraft(false);
              onDiscardSavedDraft?.();
            }}
            onCancel={() => setConfirmDiscardDraft(false)}
          />
        )}
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      current="interview-setup"
      onNavigate={onNavigate}
      title="Nova entrevista"
      subtitle="Cole a URL da vaga para contextualizar as perguntas"
    >
      <div className="w-full max-w-2xl space-y-5">
        <Card className="p-5 sm:p-6">
          <h3 className="font-bold text-foreground mb-1">URL da vaga</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Cole o link da vaga para preparar uma entrevista contextualizada.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://www.empregare.com/pt-br/vaga/..."
              aria-label="URL da vaga"
            />
            <Btn variant="primary" onClick={handleAnalyze} disabled={status === "loading" || !url.trim()}>
              {status === "loading" ? <><Spinner /> Analisando</> : <>Analisar</>}
            </Btn>
          </div>
          {status === "error" && (
            <Alert variant="error" className="mt-4 flex gap-3 rounded-2xl p-4">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </Alert>
          )}
        </Card>

        {draft.context && status === "success" && (
          <>
            <Card className="p-5 sm:p-6 bg-blue-50 border-blue-100">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">Contexto extraído</p>
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] text-muted-foreground mb-0.5">Cargo</p>
                  <p className="text-sm font-semibold text-foreground">{draft.context.title}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-0.5">Empresa</p>
                  <p className="text-sm font-semibold text-foreground">{draft.context.company}</p>
                </div>
                {jobLocation && (
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-0.5">Localização</p>
                    <p className="text-sm font-semibold text-foreground">{jobLocation}</p>
                  </div>
                )}
                {jobContractType && (
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-0.5">Tipo de contrato</p>
                    <p className="text-sm font-semibold text-foreground">{jobContractType}</p>
                  </div>
                )}
                {jobWorkMode && (
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-0.5">Modalidade</p>
                    <p className="text-sm font-semibold text-foreground">{jobWorkMode}</p>
                  </div>
                )}
                <div>
                  <p className="text-[11px] text-muted-foreground mb-0.5">Descrição</p>
                  <p
                    className="text-sm text-foreground leading-relaxed"
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
                </div>
                {requirementSections.map((section) => (
                  <div key={section.title}>
                    <p className="text-[11px] text-muted-foreground mb-2">{section.title}</p>
                    <div className="space-y-2">
                      {section.items.map((requirement) => (
                        <div key={requirement} className="flex items-start gap-2 text-sm text-foreground">
                          <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                          <span>{requirement}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-0.5 rounded shrink-0" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
                <span className="text-sm text-foreground leading-relaxed">
                  Confirmo que este contexto será usado para configurar minha entrevista textual simulada.
                </span>
              </label>
            </Card>
          </>
        )}

        <div className="flex gap-3">
          <Btn variant="outline" onClick={() => isInterviewDraftInProgress(draft) ? onCancelInterview?.() : onCancelPreparation?.()}>Cancelar</Btn>
          <Btn variant="primary" onClick={handleContinue} disabled={!draft.context || !confirmed || generating} className="flex-1">
            {generating ? <><Spinner /> Gerando perguntas</> : <>Continuar <ArrowRight className="w-4 h-4" /></>}
          </Btn>
        </div>
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

  if (!draft.context || draft.questions.length === 0) {
    return <DraftWizardGuard current="evaluation-mode" onNavigate={onNavigate} />;
  }

  const selectEvaluationMode = (mode: EvaluationMode) => {
    setDraft((current) => ({ ...current, evaluationMode: mode }));
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
            disabled={!evaluationMode}
            onClick={() => onNavigate("prep")}
            className="flex-1"
          >
            Continuar para orientações <ArrowRight className="w-4 h-4" />
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
  session,
  onDraftCompleted,
}: {
  onNavigate: (s: Screen) => void;
  draft: InterviewDraft;
  session: MockAuthSession;
  onDraftCompleted?: () => void;
}) {
  const routerNavigate = useNavigate();
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const answeredCount = draft.questions.filter((question) => isValidInterviewAnswer(draft.answers[question.id])).length;
  const allAnswersReady = hasAllRequiredInterviewAnswers(draft);
  const candidateIdentity = getCandidateIdentity(session);
  const evaluationMode = draft.evaluationMode;

  if (!draft.context || draft.questions.length === 0) {
    return <DraftWizardGuard current="interview-confirm" onNavigate={onNavigate} />;
  }

  const handleSend = async () => {
    if (sendingRef.current) {
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
    const answers = draft.questions.map((question) => ({
      questionId: question.id,
      questionText: question.text,
      questionType: question.type,
      answer: draft.answers[question.id]?.trim() ?? "",
    }));

    try {
      const aiEvaluation = evaluationMode === "AI"
        ? await evaluateInterviewWithAi(draft.context!, answers)
        : null;

      const interview = submitInterview({
        candidateId: candidateIdentity.id,
        candidateName: candidateIdentity.name,
        candidateEmail: candidateIdentity.email,
        context: draft.context!,
        evaluationMode,
        answers,
      });

      if (aiEvaluation) {
        completeAiEvaluation(interview.id, aiEvaluation);
      }

      onDraftCompleted?.();
      sendingRef.current = false;
      setSending(false);
      routerNavigate(evaluationMode === "AI"
        ? `/candidate/reports/${interview.id}`
        : `/candidate/interviews/${interview.id}/success`);
    } catch (error) {
      sendingRef.current = false;
      setSending(false);
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a entrevista. Tente novamente.");
    }
  };

  return (
    <AuthLayout
      current="interview-confirm"
      onNavigate={onNavigate}
      title="Confirmar Envio"
      subtitle="Revise antes de enviar suas respostas"
    >
      <div className="w-full max-w-2xl space-y-5">
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
          <Btn variant="outline" onClick={() => onNavigate("review")}>Revisar novamente</Btn>
          <Btn
            variant="primary"
            onClick={handleSend}
            disabled={sending || !allAnswersReady || !evaluationMode}
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
  const interview = getInterviewById(id);
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] text-muted-foreground">Protocolo</p>
                <p className="text-sm font-bold text-foreground">{interview?.id ?? "#ENT-2026-0418"}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Vaga</p>
                <p className="text-sm font-semibold text-foreground">{interview?.context.title ?? "Desenvolvedor Full Stack Júnior"}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Enviado em</p>
                <p className="text-sm font-semibold text-foreground">{interview?.submittedAt ? new Date(interview.submittedAt).toLocaleString("pt-BR") : "18/07/2026 às 14h32"}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Status</p>
                <StatusBadge tone="warning">{interview?.evaluationMode === "AI" ? "Aguardando avaliação por IA" : "Aguardando avaliação"}</StatusBadge>
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
          <p className="font-bold text-foreground text-sm mb-6">jo**@gmail.com</p>
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

type LegalSection = {
  title: string;
  body: ReactNode;
};

function LegalPageLayout({
  title,
  updatedAt,
  introduction,
  session,
  onNavigate,
  children,
  actions,
}: {
  title: string;
  updatedAt: string;
  introduction: string;
  session: MockAuthSession;
  onNavigate: (s: Screen) => void;
  children: ReactNode;
  actions: ReactNode;
}) {
  const routerNavigate = useNavigate();
  const location = useLocation();
  const state = location.state as { from?: string } | null;
  const fallbackBackPath = getPathForScreen("landing");
  const backPath = state?.from || fallbackBackPath;
  const handleBack = () => routerNavigate(backPath);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-background to-blue-50/40 text-foreground">
      <header className="border-b border-border/70 bg-white/85 backdrop-blur">
        <div className="mx-auto grid w-full max-w-[840px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-4 sm:px-6">
          <div className="flex justify-start">
            <Btn variant="outline" size="sm" onClick={handleBack}>
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </Btn>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("landing")}
            className="cursor-pointer rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Ir para a página inicial"
          >
            <RHConnectLogo className="h-9" />
          </button>
          <div />
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto w-full max-w-[840px]">
          <div className="mb-9 space-y-4">
            <Badge variant="info">Documento institucional</Badge>
            <div className="space-y-3">
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl">
                {title}
              </h1>
              <p className="text-sm font-semibold text-muted-foreground">{updatedAt}</p>
              <p className="max-w-3xl text-base leading-7 text-muted-foreground">{introduction}</p>
            </div>
          </div>

          {children}

          <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-border pt-6">
            {actions}
            {!(session.authenticated && Boolean(session.user)) && (
              <Btn variant="primary" onClick={() => onNavigate("register")}>
                Criar conta
              </Btn>
            )}
            <Btn variant="outline" onClick={handleBack}>
              Voltar
            </Btn>
          </div>
        </div>
      </main>
    </div>
  );
}

function LegalSections({ sections }: { sections: LegalSection[] }) {
  return (
    <div className="space-y-4 sm:space-y-5">
      {sections.map((section) => (
        <section key={section.title} className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <h2 className="mb-3 text-lg font-bold leading-snug text-foreground">{section.title}</h2>
          <div className="space-y-3 text-sm leading-7 text-muted-foreground">{section.body}</div>
        </section>
      ))}
    </div>
  );
}

function PendingInstitutionalAlert({ children }: { children: ReactNode }) {
  return (
    <Alert variant="warning" className="mt-4 rounded-2xl">
      <AlertCircle className="h-4 w-4" />
      <div className="text-sm leading-6">{children}</div>
    </Alert>
  );
}

const institutionalContactItems = [
  ["Responsável", "Pendente de definição institucional"],
  ["CNPJ", "Pendente de definição institucional"],
  ["E-mail de contato", "Pendente de definição institucional"],
  ["Endereço", "Pendente de definição institucional"],
  ["Site oficial", "Pendente de definição institucional"],
];

const privacyControllerItems = [
  ["Controlador", "Pendente de definição institucional"],
  ["CNPJ", "Pendente de definição institucional"],
  ["E-mail de privacidade", "Pendente de definição institucional"],
  ["Encarregado/DPO, quando aplicável", "Pendente de definição institucional"],
  ["Endereço", "Pendente de definição institucional"],
];

function LegalInfoList({ items }: { items: string[][] }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-xl bg-muted/50 p-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
          <dd className="mt-1 font-semibold text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function TermsScreen({ onNavigate, session }: { onNavigate: (s: Screen) => void; session: MockAuthSession }) {
  const sections: LegalSection[] = [
    {
      title: "1. Sobre o RH Connect",
      body: (
        <p>
          O RH Connect é uma plataforma voltada ao treinamento de candidatos para entrevistas de emprego. A plataforma
          oferece recursos para organização do perfil profissional, prática de entrevistas, envio de respostas e
          recebimento de relatório após avaliação humana autorizada.
        </p>
      ),
    },
    {
      title: "2. Perfis de acesso",
      body: (
        <p>
          A plataforma possui perfis de Candidato, Avaliador e Administrador. Cada perfil acessa funcionalidades
          compatíveis com sua finalidade, como realização de entrevistas, avaliação humana ou gestão operacional.
        </p>
      ),
    },
    {
      title: "3. Cadastro e conta",
      body: (
        <p>
          O usuário deve fornecer informações corretas no cadastro e manter a confidencialidade de suas credenciais de
          acesso. A conta é pessoal e deve ser utilizada somente pelo próprio usuário autorizado.
        </p>
      ),
    },
    {
      title: "4. Perfil profissional",
      body: (
        <p>
          O candidato pode informar dados profissionais, formação, experiências, habilidades e preferências de atuação.
          Essas informações ajudam a contextualizar a jornada dentro da plataforma e devem refletir dados verdadeiros.
        </p>
      ),
    },
    {
      title: "5. Entrevistas",
      body: (
        <p>
          Na versão atual, as entrevistas são realizadas por respostas textuais. O candidato deve revisar suas respostas
          antes do envio, pois o material enviado será usado para avaliação humana e geração do relatório.
        </p>
      ),
    },
    {
      title: "6. Ditado por voz",
      body: (
        <p>
          Quando disponível no navegador, o ditado por voz pode auxiliar o candidato a transformar fala em texto. Nesta
          versão, o RH Connect não armazena arquivo de áudio decorrente desse recurso.
        </p>
      ),
    },
    {
      title: "7. Avaliação humana",
      body: (
        <p>
          A avaliação final das entrevistas é realizada por avaliador humano autorizado. A pontuação e o relatório
          apresentados ao candidato decorrem dessa análise humana.
        </p>
      ),
    },
    {
      title: "8. Prazo de avaliação",
      body: (
        <p>
          O prazo de avaliação pode variar conforme disponibilidade operacional e volume de entrevistas. Quando houver
          uma estimativa ou status de acompanhamento disponível, ela terá finalidade informativa.
        </p>
      ),
    },
    {
      title: "9. Inteligência Artificial",
      body: (
        <>
          <p>
            O RH Connect prevê a incorporação futura de recursos de Inteligência Artificial como parte da evolução da
            plataforma, incluindo funcionalidades de apoio à geração de perguntas, recomendações, análise de conteúdo e
            desenvolvimento profissional.
          </p>
          <p>
            Também poderá ser realizado futuramente o treinamento, ajuste ou aperfeiçoamento de modelos de Inteligência
            Artificial destinados ao funcionamento e evolução do RH Connect.
          </p>
          <p>
            Quando essas atividades envolverem dados pessoais, o tratamento deverá observar a legislação aplicável, com
            transparência quanto às finalidades, categorias de dados utilizadas, bases legais, medidas de proteção,
            fornecedores envolvidos e direitos dos titulares.
          </p>
          <p>
            A utilização atual da plataforma não representa autorização automática para uso dos dados pessoais do usuário
            no treinamento de modelos de IA.
          </p>
          <p>
            Quando a participação em treinamento ou aperfeiçoamento de modelos envolver dados pessoais de Candidatos,
            essa finalidade deverá ser apresentada de forma específica, destacada e facultativa.
          </p>
          <p>
            A recusa em participar do treinamento de IA não deverá impedir o acesso às funcionalidades essenciais da
            Plataforma que não dependam dessa finalidade.
          </p>
          <p>
            Sempre que tecnicamente adequado, o RH Connect deverá priorizar medidas de minimização, anonimização,
            pseudonimização ou outras medidas destinadas a reduzir a exposição de dados pessoais.
          </p>
        </>
      ),
    },
    {
      title: "10. Uso adequado da plataforma",
      body: (
        <p>
          O usuário deve utilizar o RH Connect de forma ética, respeitosa e compatível com sua finalidade educacional.
          É proibido inserir conteúdo ofensivo, discriminatório, ilegal ou que viole direitos de terceiros.
        </p>
      ),
    },
    {
      title: "11. Disponibilidade e evolução",
      body: (
        <p>
          A plataforma pode receber melhorias, ajustes e manutenções. Funcionalidades podem evoluir conforme decisões de
          produto, requisitos institucionais e necessidades técnicas.
        </p>
      ),
    },
    {
      title: "12. Privacidade e proteção de dados",
      body: (
        <p>
          O tratamento de dados pessoais é descrito na Política de Privacidade do RH Connect. O uso da plataforma deve
          observar a legislação aplicável de proteção de dados e os direitos dos titulares.
        </p>
      ),
    },
    {
      title: "13. Encerramento e suspensão",
      body: (
        <p>
          O acesso poderá ser encerrado ou suspenso em caso de uso inadequado, violação destes Termos, necessidade
          operacional ou solicitação aplicável do próprio usuário, conforme regras da organização responsável.
        </p>
      ),
    },
    {
      title: "14. Ausência de garantia de resultados",
      body: (
        <p>
          O RH Connect é uma ferramenta de preparação e desenvolvimento. A plataforma não atua como agência de emprego,
          não intermedeia contratações e não garante aprovação em processos seletivos.
        </p>
      ),
    },
    {
      title: "15. Atualizações destes Termos",
      body: (
        <p>
          Estes Termos podem ser atualizados para refletir alterações legais, institucionais ou funcionais. A data de
          atualização indica a versão vigente apresentada ao usuário.
        </p>
      ),
    },
    {
      title: "16. Identificação e contato",
      body: (
        <>
          <LegalInfoList items={institutionalContactItems} />
          <PendingInstitutionalAlert>
            Pendência para publicação definitiva: estas informações deverão ser substituídas pelos dados oficiais
            fornecidos pela organização responsável antes da publicação definitiva do RH Connect.
          </PendingInstitutionalAlert>
        </>
      ),
    },
  ];

  return (
    <LegalPageLayout
      title="Termos de Uso do RH Connect"
      updatedAt="Última atualização: 14 de setembro de 2026"
      introduction="Estes Termos estabelecem as condições para utilização do RH Connect. Ao criar uma conta e utilizar a plataforma, o usuário declara ter acesso a estes Termos e à Política de Privacidade."
      session={session}
      onNavigate={onNavigate}
      actions={<Btn variant="outline" onClick={() => onNavigate("privacy")}>Ver Política de Privacidade</Btn>}
    >
      <LegalSections sections={sections} />
    </LegalPageLayout>
  );
}

// ─── Fase C: LEG-002 Política de Privacidade ─────────────────────────────────

function PrivacyScreen({ onNavigate, session }: { onNavigate: (s: Screen) => void; session: MockAuthSession }) {
  const sections: LegalSection[] = [
    {
      title: "1. Responsável pelo tratamento",
      body: (
        <>
          <LegalInfoList items={privacyControllerItems} />
          <PendingInstitutionalAlert>
            Pendência para publicação definitiva: os dados oficiais do controlador e dos canais de privacidade deverão
            substituir estas indicações antes da utilização definitiva da plataforma.
          </PendingInstitutionalAlert>
        </>
      ),
    },
    {
      title: "2. Quais dados podem ser tratados",
      body: (
        <p>
          Podem ser tratados dados de identificação, contato, credenciais de acesso, informações profissionais inseridas
          pelo usuário, respostas textuais das entrevistas, avaliações humanas, relatórios, preferências de uso e dados
          técnicos necessários ao funcionamento da plataforma.
        </p>
      ),
    },
    {
      title: "3. Ditado por voz",
      body: (
        <p>
          O ditado por voz, quando utilizado, depende de recursos disponíveis no navegador do usuário para converter fala
          em texto. Nesta versão, o RH Connect não armazena arquivo de áudio gerado por esse recurso.
        </p>
      ),
    },
    {
      title: "4. O que não faz parte da versão atual",
      body: (
        <p>
          A versão atual não inclui entrevista em vídeo, armazenamento de gravação de vídeo, análise automática final ou
          uso de dados pessoais para treinamento de Inteligência Artificial.
        </p>
      ),
    },
    {
      title: "5. Para que os dados são utilizados",
      body: (
        <p>
          Os dados são utilizados para criar e manter a conta, permitir o preenchimento do perfil profissional, preparar
          entrevistas contextualizadas, registrar respostas, viabilizar avaliação humana e apresentar relatório ao
          candidato.
        </p>
      ),
    },
    {
      title: "6. Bases legais",
      body: (
        <p>
          As bases legais aplicáveis podem incluir execução de contrato ou procedimentos preliminares, consentimento
          quando necessário, cumprimento de obrigação legal ou regulatória e legítimo interesse, conforme a finalidade de
          cada tratamento.
        </p>
      ),
    },
    {
      title: "7. Avaliação humana",
      body: (
        <p>
          A avaliação final é realizada por avaliador humano autorizado. A pontuação e o relatório disponibilizados ao
          candidato derivam dessa análise humana.
        </p>
      ),
    },
    {
      title: "8. Inteligência Artificial no futuro",
      body: (
        <>
          <p>
            O RH Connect prevê a incorporação futura de recursos de Inteligência Artificial como parte da evolução da
            plataforma, incluindo funcionalidades de apoio à geração de perguntas, recomendações, análise de conteúdo e
            desenvolvimento profissional.
          </p>
          <p>
            Esses recursos serão implementados de forma progressiva e deverão observar transparência, finalidade
            específica, minimização de dados e base legal adequada para cada operação de tratamento.
          </p>
          <div className="space-y-3">
            <h3 className="text-base font-bold text-foreground">8.1. Treinamento e aperfeiçoamento de modelos de IA</h3>
            <p>
              O RH Connect poderá futuramente realizar treinamento, ajuste ou aperfeiçoamento de modelos de Inteligência
              Artificial destinados ao funcionamento e evolução da plataforma.
            </p>
            <p>
              Quando essa atividade envolver dados pessoais de Candidatos, a participação dependerá de autorização
              específica, destacada e facultativa, apresentada separadamente das funcionalidades essenciais da Plataforma.
            </p>
            <p>
              A simples utilização do RH Connect não será considerada autorização para utilização dos dados pessoais do
              Candidato no treinamento de modelos de IA.
            </p>
            <p>Antes da autorização, deverão ser apresentadas informações claras sobre:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>categorias de dados que poderão ser utilizadas;</li>
              <li>finalidade do treinamento;</li>
              <li>forma de utilização dos dados;</li>
              <li>período de retenção aplicável;</li>
              <li>fornecedores ou operadores envolvidos, quando houver;</li>
              <li>eventuais transferências internacionais;</li>
              <li>medidas de proteção adotadas;</li>
              <li>possibilidade de revogação da autorização, quando aplicável.</li>
            </ul>
            <p>
              A recusa em autorizar a participação no treinamento de IA não deverá impedir o acesso às funcionalidades
              essenciais do RH Connect que não dependam dessa finalidade.
            </p>
            <p>
              Sempre que tecnicamente adequado, deverão ser adotadas medidas de minimização, anonimização,
              pseudonimização ou outras técnicas destinadas a reduzir a exposição de dados pessoais.
            </p>
          </div>
        </>
      ),
    },
    {
      title: "9. Compartilhamento de dados",
      body: (
        <p>
          Os dados podem ser acessados por usuários autorizados de acordo com seu perfil e finalidade dentro da
          plataforma. Compartilhamentos adicionais dependerão de necessidade operacional, obrigação legal ou autorização
          aplicável.
        </p>
      ),
    },
    {
      title: "10. Armazenamento local e tecnologias semelhantes",
      body: (
        <p>
          A plataforma pode utilizar armazenamento local do navegador e tecnologias semelhantes para manter sessão,
          preferências e dados necessários ao funcionamento da experiência atual.
        </p>
      ),
    },
    {
      title: "11. Retenção e exclusão",
      body: (
        <p>
          Os dados serão mantidos pelo período necessário às finalidades informadas, observadas obrigações legais,
          necessidade operacional e solicitações aplicáveis dos titulares.
        </p>
      ),
    },
    {
      title: "12. Segurança",
      body: (
        <p>
          O RH Connect deve adotar medidas proporcionais para proteger os dados pessoais, considerando a natureza das
          informações tratadas, os riscos envolvidos e a evolução da plataforma.
        </p>
      ),
    },
    {
      title: "13. Incidentes de segurança",
      body: (
        <p>
          Caso ocorra incidente de segurança que possa acarretar risco ou dano relevante aos titulares, a organização
          responsável deverá avaliar as medidas cabíveis e comunicações necessárias.
        </p>
      ),
    },
    {
      title: "14. Direitos dos titulares",
      body: (
        <p>
          Os titulares podem solicitar confirmação de tratamento, acesso, correção, portabilidade, anonimização,
          bloqueio, eliminação, informação sobre compartilhamento e revogação de consentimento, conforme legislação
          aplicável.
        </p>
      ),
    },
    {
      title: "15. Como exercer seus direitos",
      body: (
        <p>
          Os canais oficiais para exercício de direitos serão informados pela organização responsável. Até a publicação
          definitiva, esses dados institucionais permanecem pendentes de definição.
        </p>
      ),
    },
    {
      title: "16. Usuários menores de idade",
      body: (
        <p>
          O uso por menores de idade deverá observar as regras institucionais aplicáveis e a legislação vigente,
          incluindo eventual necessidade de autorização do responsável legal.
        </p>
      ),
    },
    {
      title: "17. Links de vagas e serviços externos",
      body: (
        <p>
          O usuário pode informar links de vagas ou acessar referências externas. O RH Connect não controla políticas,
          conteúdos ou práticas de privacidade de sites e serviços de terceiros.
        </p>
      ),
    },
    {
      title: "18. Atualizações desta Política",
      body: (
        <p>
          Esta Política pode ser atualizada para refletir mudanças legais, institucionais ou funcionais. A data de
          atualização indica a versão apresentada ao usuário.
        </p>
      ),
    },
  ];

  return (
    <LegalPageLayout
      title="Política de Privacidade do RH Connect"
      updatedAt="Última atualização: 14 de setembro de 2026"
      introduction="O RH Connect reconhece a importância da privacidade e da proteção de dados pessoais. Esta Política explica quais informações podem ser tratadas, para quais finalidades e quais direitos estão disponíveis aos titulares."
      session={session}
      onNavigate={onNavigate}
      actions={<Btn variant="outline" onClick={() => onNavigate("terms")}>Ver Termos de Uso</Btn>}
    >
      <Card className="mb-6 border-blue-100 bg-blue-50/70 p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Resumo da versão atual</h2>
            <p className="text-sm text-muted-foreground">Transparência sobre o funcionamento vigente da plataforma.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            "Entrevistas em texto",
            "Avaliação humana",
            "Ditado por voz sem armazenamento de áudio",
            "Sem entrevista em vídeo",
            "Recursos de IA previstos para evolução futura",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2 text-sm font-semibold text-blue-900">
              <CheckCircle className="h-4 w-4 shrink-0 text-blue-600" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </Card>

      <LegalSections sections={sections} />
    </LegalPageLayout>
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

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${on ? "bg-primary" : "bg-slate-200"}`}
    >
      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow ${on ? "right-1" : "left-1"}`} />
    </button>
  );
}

function ConfirmModal({
  title, message, confirmLabel, cancelLabel = "Cancelar", danger = false, showCloseButton = false, equalActionWidths = true, onConfirm, onCancel, onClose, children,
}: {
  title: string; message: string; confirmLabel: string;
  cancelLabel?: string;
  showCloseButton?: boolean;
  equalActionWidths?: boolean;
  danger?: boolean; onConfirm: () => void; onCancel: () => void;
  onClose?: () => void;
  children?: ReactNode;
}) {
  const actionButtonSizeClass = equalActionWidths ? "flex-1" : "px-6 whitespace-nowrap";
  const actionGroupClass = equalActionWidths ? "flex gap-3" : "flex justify-center gap-3";
  const modalWidthClass = equalActionWidths ? "max-w-sm" : "max-w-md";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(15,27,45,0.6)" }}>
      <div className={`relative bg-white rounded-2xl p-6 w-full ${modalWidthClass} shadow-2xl`}>
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose ?? onCancel}
            className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Fechar"
            title="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${danger ? "bg-red-50" : "bg-amber-50"}`}>
          <AlertCircle className={`w-6 h-6 ${danger ? "text-red-500" : "text-amber-500"}`} />
        </div>
        <h3 className="font-bold text-foreground text-center mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground text-center mb-5 leading-relaxed">{message}</p>
        {children && <div className="mb-5">{children}</div>}
        <div className={actionGroupClass}>
          <button onClick={onCancel} className={`${actionButtonSizeClass} py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted transition-colors`}>{cancelLabel}</button>
          <button onClick={onConfirm} className={`${actionButtonSizeClass} py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${danger ? "bg-red-500 hover:bg-red-600" : "bg-primary hover:bg-blue-800"}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function SettingsScreen({ onNavigate, session }: { onNavigate: (s: Screen) => void; session: MockAuthSession }) {
  const candidateUser = session.user?.role === "CANDIDATE" ? session.user : null;
  const candidateIdentity = getCandidateIdentity(session);
  const account = getCandidateAccountConfig(candidateUser);
  const [tab, setTab] = useState<SettingsTab>("conta");
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
                      <Toggle on={notifs[n.key]} onToggle={() => setNotifs(p => ({ ...p, [n.key]: !p[n.key] }))} />
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
                      <Toggle on={notifs[n.key]} onToggle={() => setNotifs(p => ({ ...p, [n.key]: !p[n.key] }))} />
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
                        <p className="text-xs text-green-600 font-semibold mt-1.5">Autorizado em 15/07/2026</p>
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
            <Btn variant="primary" className="w-full" onClick={() => { setModal(null); onNavigate("landing"); }}>
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

function mergeMaterialsWithUserState(userStates: MaterialUserState[]): MaterialCardView[] {
  return SUPPORT_MATERIALS.map((material) => {
    const userState = userStates.find((item) => item.materialId === material.id) ?? getMaterialUserState(material.id);
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

function MaterialCard({
  material, onFavorite, onOpen,
}: {
  material: MaterialCardView;
  onFavorite: () => void;
  onOpen: () => void;
}) {
  return (
    <Card className="p-4 sm:p-5 flex flex-col gap-3 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <UIBadge variant="neutral" className="px-2 py-0.5 text-[11px] font-bold bg-blue-50 text-blue-700">{materialTypeLabel(material.type)}</UIBadge>
            {material.status !== "NOT_STARTED" && (
              <span className="text-[11px] text-muted-foreground">• {materialStatusLabel(material.status)}</span>
            )}
          </div>
          <p className="font-bold text-foreground text-sm leading-snug mb-1">{material.title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{material.description}</p>
        </div>
        <button
          onClick={onFavorite}
          aria-label={material.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          className={`p-1.5 rounded-lg transition-colors shrink-0 ${material.isFavorite ? "text-amber-500 hover:text-amber-600" : "text-muted-foreground hover:text-amber-400"}`}
        >
          <Bookmark className={`w-4 h-4 ${material.isFavorite ? "fill-current" : ""}`} />
        </button>
      </div>
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
        <UIBadge variant="primary">{material.category}</UIBadge>
        <Btn variant="primary" size="sm" onClick={onOpen}>Abrir material</Btn>
      </div>
    </Card>
  );
}

function MaterialsScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const routerNavigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("Todas as categorias");
  const [abaFiltro, setAbaFiltro] = useState<"todos" | "favoritos" | "recentes" | "recomendados">("todos");
  const [materialStates, setMaterialStates] = useState<MaterialUserState[]>(() => getMaterialUserStates());
  const [showCats, setShowCats] = useState(false);

  const materiais = mergeMaterialsWithUserState(materialStates);

  const refreshMaterialStates = () => setMaterialStates(getMaterialUserStates());

  const toggleFavorito = (id: string) => {
    toggleMaterialFavorite(id);
    refreshMaterialStates();
  };

  const handleOpenMaterial = (material: MaterialCardView) => {
    openMaterial(material.id);
    refreshMaterialStates();
    routerNavigate(`/candidate/materials/${material.slug}`);
  };

  const filtrado = materiais.filter(m => {
    const matchBusca = busca === "" || m.title.toLowerCase().includes(busca.toLowerCase()) || m.description.toLowerCase().includes(busca.toLowerCase());
    const matchCat = categoria === "Todas as categorias" || m.category === categoria;
    const matchAba = abaFiltro === "todos" ? true : abaFiltro === "favoritos" ? m.isFavorite : abaFiltro === "recentes" ? Boolean(m.lastAccessedAt) : m.recommended;
    return matchBusca && matchCat && matchAba;
  });
  const filtradoOrdenado = abaFiltro === "recentes" ? sortMaterialsByLastAccess(filtrado) : filtrado;

  const recomendados = materiais.filter(m => m.recommended).slice(0, 3);
  const recentes = sortMaterialsByLastAccess(materiais).slice(0, 3);

  return (
    <AuthLayout
      current="materials"
      onNavigate={onNavigate}
      title="Materiais de Apoio"
      subtitle="Conteúdo para você se preparar para entrevistas"
    >
      <div className="w-full space-y-6">
        {/* Destaques: Recomendados */}
        {abaFiltro === "todos" && busca === "" && categoria === "Todas as categorias" && (
          <section>
            <h2 className="font-bold text-foreground mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" /> Recomendados para você
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {recomendados.map(m => (
                <MaterialCard key={m.id} material={m} onFavorite={() => toggleFavorito(m.id)} onOpen={() => handleOpenMaterial(m)} />
              ))}
            </div>
          </section>
        )}

        {/* Destaques: Recentes */}
        {abaFiltro === "todos" && busca === "" && categoria === "Todas as categorias" && (
          <section>
            <h2 className="font-bold text-foreground mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" /> Acessados recentemente
            </h2>
            {recentes.length === 0 ? (
              <Card className="p-4 text-sm text-muted-foreground">
                Seus materiais acessados aparecerão aqui.
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {recentes.map(m => (
                  <MaterialCard key={m.id} material={m} onFavorite={() => toggleFavorito(m.id)} onOpen={() => handleOpenMaterial(m)} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Barra de busca + filtros */}
        <section>
          <h2 className="font-bold text-foreground mb-3">
            {abaFiltro === "todos" ? "Todos os materiais" : abaFiltro === "favoritos" ? "Favoritos" : abaFiltro === "recentes" ? "Acessados recentemente" : "Recomendados"}
          </h2>

          {/* Filtros de aba */}
          <div className="flex flex-wrap gap-2 mb-4">
            {([["todos","Todos"],["recomendados","Recomendados"],["recentes","Recentes"],["favoritos","Favoritos"]] as const).map(([id, label]) => (
              <FilterChip
                key={id}
                onClick={() => setAbaFiltro(id)}
                selected={abaFiltro === id}
                className="px-3.5"
              >
                {label}
                {id === "favoritos" && ` (${materiais.filter(m => m.isFavorite).length})`}
              </FilterChip>
            ))}
          </div>

          {/* Busca + categoria */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <SearchInput
              containerClassName="flex-1"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              onClear={() => setBusca("")}
              placeholder="Pesquisar materiais..."
              className="bg-white"
            />
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
          </div>

          {/* Lista de resultados */}
          {filtradoOrdenado.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Nenhum material encontrado"
              description={
                abaFiltro === "favoritos"
                  ? "Você ainda não salvou nenhum favorito. Clique no ícone de marcador em qualquer material."
                  : "Tente ajustar os filtros ou a busca."
              }
              action={
                <Btn variant="outline" onClick={() => { setBusca(""); setCategoria("Todas as categorias"); setAbaFiltro("todos"); }}>
                  Limpar filtros
                </Btn>
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filtradoOrdenado.map(m => (
                <MaterialCard key={m.id} material={m} onFavorite={() => toggleFavorito(m.id)} onOpen={() => handleOpenMaterial(m)} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AuthLayout>
  );
}

function MaterialDetailScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const routerNavigate = useNavigate();
  const { materialId } = useParams();
  const material = materialId ? findSupportMaterialBySlug(materialId) : undefined;
  const [materialState, setMaterialState] = useState<MaterialUserState | null>(() => material ? getMaterialUserState(material.id) : null);

  useEffect(() => {
    if (!material) return;
    setMaterialState(openMaterial(material.id));
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
    const result = completeMaterial(material.id);
    setMaterialState(result.state);
    if (result.completedNow) {
      try {
        advanceDevelopmentFromMaterial(material.id);
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
  const NOTIFS = [
    { id: 1, tipo: "resultado",   titulo: "Resultado disponível",       desc: "Seu relatório da entrevista para Desenvolvedor Full Stack Júnior já está disponível.",       data: "Há 5 min",   lida: false, screen: "report" as Screen },
    { id: 2, tipo: "sistema",     titulo: "Bem-vindo ao RH Connect!",   desc: "Sua conta foi criada com sucesso. Complete seu perfil para começar a praticar.",            data: "Há 2 dias",  lida: false, screen: "profile" as Screen },
    { id: 3, tipo: "material",    titulo: "Material recomendado",       desc: "Novo conteúdo disponível: \"O método STAR explicado\" — ideal para sua preparação.",        data: "Há 3 dias",  lida: true,  screen: "materials" as Screen },
    { id: 4, tipo: "entrevista",  titulo: "Entrevista enviada com sucesso",desc: "Suas respostas foram recebidas e encaminhadas para avaliação.",                          data: "Há 6 dias",  lida: true,  screen: "pending" as Screen },
    { id: 5, tipo: "lembrete",    titulo: "Continue praticando!",       desc: "Faz uma semana desde sua última prática. Que tal simular uma nova entrevista hoje?",        data: "Há 7 dias",  lida: true,  screen: "interview-setup" as Screen },
  ];

  const TIPO_META: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
    resultado:  { color: "text-green-600",  bg: "bg-green-50",  icon: CheckCircle },
    sistema:    { color: "text-blue-600",   bg: "bg-blue-50",   icon: Bell },
    material:   { color: "text-amber-600",  bg: "bg-amber-50",  icon: BookOpen },
    entrevista: { color: "text-purple-600", bg: "bg-purple-50", icon: MessageSquare },
    lembrete:   { color: "text-slate-500",  bg: "bg-slate-50",  icon: Clock },
  };

  const [notifs, setNotifs] = useState(NOTIFS);
  const naoLidas = notifs.filter(n => !n.lida).length;

  const markAllRead = () => setNotifs(n => n.map(item => ({ ...item, lida: true })));
  const markRead = (id: number) => setNotifs(n => n.map(item => item.id === id ? { ...item, lida: true } : item));

  return (
    <AuthLayout
      current="notifications"
      onNavigate={onNavigate}
      title="Notificações"
      subtitle={naoLidas > 0 ? `${naoLidas} não lida${naoLidas > 1 ? "s" : ""}` : "Tudo em dia"}
      actions={
        naoLidas > 0 ? (
          <Btn variant="outline" size="sm" onClick={markAllRead}>
            <Check className="w-3.5 h-3.5" /> Marcar todas como lidas
          </Btn>
        ) : undefined
      }
    >
      <div className="w-full max-w-2xl space-y-3">
        {notifs.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Nenhuma notificação"
            description="Você está em dia. As notificações aparecerão aqui."
          />
        ) : (
          notifs.map(n => {
            const meta = TIPO_META[n.tipo] ?? TIPO_META.sistema;
            const Icon = meta.icon;
            return (
              <div
                key={n.id}
                className={`flex items-start gap-4 p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${n.lida ? "bg-card border-border" : "bg-blue-50/50 border-blue-100"}`}
                onClick={() => { markRead(n.id); onNavigate(n.screen); }}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${meta.bg}`}>
                  <Icon className={`w-5 h-5 ${meta.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-bold ${n.lida ? "text-foreground" : "text-foreground"}`}>{n.titulo}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      {!n.lida && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">{n.data}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.desc}</p>
                  {!n.lida && (
                    <button
                      onClick={e => { e.stopPropagation(); markRead(n.id); }}
                      className="mt-2 text-xs text-primary font-semibold hover:underline"
                    >
                      Marcar como lida
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}

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

function DevelopmentScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  return (
    <AuthLayout current="development" onNavigate={onNavigate}
      title="Meu desenvolvimento"
      subtitle="Acompanhe sua evolução, desenvolva competências e descubra os próximos passos">
      <DevelopmentContent onNavigate={onNavigate} />
    </AuthLayout>
  );
}

function CandidateDiscTestScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  return (
    <AuthLayout current="disc-test" onNavigate={onNavigate}
      title="Teste DISC"
      subtitle="Ferramenta de autoconhecimento e desenvolvimento profissional">
      <DiscTestScreen />
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

function AppRoutes() {
  const routerNavigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState(() => getMockAuthSession());
  const initialDraftSnapshot = useRef(getStoredInterviewDraft(getCandidateIdentity(session).id));
  const [interviewDraft, setInterviewDraft] = useState<InterviewDraft>(() => initialDraftSnapshot.current?.draft ?? createEmptyInterviewDraft());
  const [draftProgress, setDraftProgress] = useState<InterviewDraftProgress>(() => initialDraftSnapshot.current?.progress ?? DEFAULT_INTERVIEW_DRAFT_PROGRESS);
  const [resumeDraftProgress, setResumeDraftProgress] = useState<InterviewDraftProgress | null>(() => initialDraftSnapshot.current?.progress ?? null);
  const [resumePromptDismissed, setResumePromptDismissed] = useState(() => !initialDraftSnapshot.current);
  const [pendingNavigationScreen, setPendingNavigationScreen] = useState<Screen | null>(null);
  const [pendingBrowserNavigation, setPendingBrowserNavigation] = useState(false);
  const [confirmCancelInterview, setConfirmCancelInterview] = useState(false);
  const browserNavigationAllowedRef = useRef(false);
  const protectedHistoryUrlRef = useRef("");
  const candidateIdentity = getCandidateIdentity(session);
  const candidateHasSavedDraft = session.user?.role === "CANDIDATE" && hasActiveInterviewDraft(interviewDraft);
  const candidateDraftActive = session.user?.role === "CANDIDATE" && isInterviewDraftInProgress(interviewDraft);
  const currentInterviewDraftScreen = getInterviewDraftScreenFromPath(location.pathname);
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
  const shouldProtectInterviewExit = Boolean(
    candidateDraftActive &&
    currentInterviewDraftScreen &&
    !shouldShowResumePrompt,
  );

  const executeNavigation = (screen: Screen) => {
    if ((screen === "auth" || screen === "landing") && session.authenticated) {
      setSession(logoutMockUser());
      routerNavigate("/login");
      return;
    }

    const targetPath = getPathForScreen(screen);
    if (screen === "terms" || screen === "privacy") {
      const state = location.state as { from?: string } | null;
      const isCurrentLegalPage = location.pathname === getPathForScreen("terms") || location.pathname === getPathForScreen("privacy");
      const currentPath = `${location.pathname}${location.search}`;
      const from = isCurrentLegalPage ? state?.from : currentPath;
      routerNavigate(targetPath, { state: { from: from || getPathForScreen("landing") } });
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

  const discardSavedDraft = () => {
    clearStoredInterviewDraft(candidateIdentity.id);
    setInterviewDraft(createEmptyInterviewDraft());
    setDraftProgress(DEFAULT_INTERVIEW_DRAFT_PROGRESS);
    setResumeDraftProgress(null);
    setResumePromptDismissed(true);
  };

  const cancelInterviewPreparation = () => {
    discardSavedDraft();
    routerNavigate(getPathForScreen("dashboard"));
  };

  const cancelActiveInterviewDraft = () => {
    discardSavedDraft();
    setPendingNavigationScreen(null);
    setPendingBrowserNavigation(false);
    setConfirmCancelInterview(false);
    routerNavigate(getPathForScreen("interview-history"));
  };

  const completeCurrentDraft = () => {
    clearStoredInterviewDraft(candidateIdentity.id);
    setInterviewDraft(createEmptyInterviewDraft());
    setDraftProgress(DEFAULT_INTERVIEW_DRAFT_PROGRESS);
    setResumeDraftProgress(null);
    setResumePromptDismissed(true);
  };

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
      const currentQuestionIndex = currentInterviewDraftScreen === "interview"
        ? getQuestionIndexFromSearchParam(new URLSearchParams(location.search).get("question"), interviewDraft.questions.length)
        : current.currentQuestionIndex;
      if (current.currentScreen === currentInterviewDraftScreen && current.currentQuestionIndex === currentQuestionIndex) {
        return current;
      }
      return { currentScreen: currentInterviewDraftScreen, currentQuestionIndex };
    });
  }, [currentInterviewDraftScreen, interviewDraft.questions.length, location.search, shouldShowResumePrompt]);

  useEffect(() => {
    if (shouldShowResumePrompt) return;
    if (!candidateHasSavedDraft) return;
    saveStoredInterviewDraft(candidateIdentity.id, interviewDraft, draftProgress);
  }, [candidateHasSavedDraft, candidateIdentity.id, draftProgress, interviewDraft, shouldShowResumePrompt]);

  useEffect(() => {
    if (!shouldProtectInterviewExit) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      saveStoredInterviewDraft(candidateIdentity.id, interviewDraft, draftProgress);
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
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

  const completeOnboardingAndNavigate = (screen: Screen) => {
    setSession(completeMockOnboarding());
    routerNavigate(getPathForScreen(screen));
  };
  const loginWithCredentials = (email: string, password: string) => {
    const result = loginMockWithCredentials(email, password);
    if (!result.ok) {
      return result;
    }
    setSession(result.session);
    routerNavigate(getEntryPathForSession(result.session));
    return { ok: true as const };
  };
  const registerCandidate = (data: { name: string; email: string; password: string }) => {
    const result = registerMockCandidate(data);
    if (!result.ok) {
      return result;
    }
    saveRememberedLoginEmail(result.candidate.email);
    routerNavigate("/login");
    return { ok: true as const };
  };
  const protect = (role: MockUserRole, children: ReactNode) => (
    <ProtectedRoute session={session} role={role}>{children}</ProtectedRoute>
  );
  const evaluatorIdentity = getEvaluatorIdentity(session);

  return (
    <div className="flex flex-col min-h-screen">
      <Toaster position="top-center" richColors />
      <div className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<LandingScreen onNavigate={navigate} />} />
          <Route path="/login" element={<PublicAuthRoute session={session}><AuthScreen onNavigate={navigate} onLoginWithCredentials={loginWithCredentials} onRegister={registerCandidate} initialTab="login" /></PublicAuthRoute>} />
          <Route path="/register" element={<PublicAuthRoute session={session}><AuthScreen onNavigate={navigate} onLoginWithCredentials={loginWithCredentials} onRegister={registerCandidate} initialTab="register" /></PublicAuthRoute>} />
          <Route path="/terms" element={<TermsScreen onNavigate={navigate} session={session} />} />
          <Route path="/privacy" element={<PrivacyScreen onNavigate={navigate} session={session} />} />
          <Route path="/verify-email" element={<EmailVerifyScreen onNavigate={navigate} />} />
          <Route path="/forgot-password" element={<ForgotPasswordScreen onNavigate={navigate} />} />
          <Route path="/reset-password" element={<ResetPasswordScreen onNavigate={navigate} />} />

          <Route path="/candidate/onboarding" element={protect("CANDIDATE", <CandidateOnboardingScreen onNavigate={navigate} onComplete={() => completeOnboardingAndNavigate("dashboard")} />)} />
          <Route path="/candidate/dashboard" element={protect("CANDIDATE", <DashboardScreen onNavigate={navigate} session={session} activeDraftEntry={activeDraftEntry} onContinueDraft={() => navigateToStoredDraftProgress(resumeDraftProgress ?? draftProgress)} />)} />
          <Route path="/candidate/profile" element={protect("CANDIDATE", <ProfileScreen onNavigate={navigate} session={session} />)} />
          <Route path="/candidate/settings" element={protect("CANDIDATE", <SettingsScreen onNavigate={navigate} session={session} />)} />
          <Route path="/candidate/materials" element={protect("CANDIDATE", <MaterialsScreen onNavigate={navigate} />)} />
          <Route path="/candidate/materials/:materialId" element={protect("CANDIDATE", <MaterialDetailScreen onNavigate={navigate} />)} />
          <Route path="/candidate/notifications" element={protect("CANDIDATE", <NotificationsScreen onNavigate={navigate} />)} />
          <Route path="/candidate/interviews" element={protect("CANDIDATE", <InterviewHistoryScreen onNavigate={navigate} session={session} activeDraftEntry={activeDraftEntry} onContinueDraft={() => navigateToStoredDraftProgress(resumeDraftProgress ?? draftProgress)} />)} />
          <Route path="/candidate/development" element={protect("CANDIDATE", <DevelopmentScreen onNavigate={navigate} />)} />
          <Route path="/candidate/disc" element={protect("CANDIDATE", <CandidateDiscTestScreen onNavigate={navigate} />)} />
          <Route path="/candidate/interviews/new" element={protect("CANDIDATE", <InterviewSetupScreen onNavigate={navigate} draft={interviewDraft} setDraft={setInterviewDraft} session={session} savedDraftAvailable={shouldShowResumePrompt} onContinueSavedDraft={() => navigateToStoredDraftProgress(resumeDraftProgress ?? draftProgress)} onDiscardSavedDraft={discardSavedDraft} onCancelInterview={() => setConfirmCancelInterview(true)} onCancelPreparation={cancelInterviewPreparation} />)} />
          <Route path="/candidate/interviews/new/consent" element={protect("CANDIDATE", <ConsentScreen onNavigate={navigate} draft={interviewDraft} />)} />
          <Route path="/candidate/interviews/new/evaluation-mode" element={protect("CANDIDATE", <EvaluationModeScreen onNavigate={navigate} draft={interviewDraft} setDraft={setInterviewDraft} />)} />
          <Route path="/candidate/interviews/new/preparation" element={protect("CANDIDATE", <PrepScreen onNavigate={navigate} draft={interviewDraft} />)} />
          <Route path="/candidate/interviews/new/answers" element={protect("CANDIDATE", <InterviewScreen onNavigate={navigate} draft={interviewDraft} setDraft={setInterviewDraft} onQuestionIndexChange={(index) => setDraftProgress((current) => current.currentQuestionIndex === index ? current : { ...current, currentQuestionIndex: index })} />)} />
          <Route path="/candidate/interviews/new/review" element={protect("CANDIDATE", <ReviewScreen onNavigate={navigate} draft={interviewDraft} />)} />
          <Route path="/candidate/interviews/new/submit" element={protect("CANDIDATE", <InterviewConfirmScreen onNavigate={navigate} draft={interviewDraft} session={session} onDraftCompleted={completeCurrentDraft} />)} />
          <Route path="/candidate/interviews/:id/success" element={protect("CANDIDATE", <InterviewDoneScreen onNavigate={navigate} />)} />
          <Route path="/candidate/interviews/:id/status" element={protect("CANDIDATE", <PendingScreen onNavigate={navigate} session={session} />)} />
          <Route path="/candidate/reports/:id" element={protect("CANDIDATE", <ReportScreen onNavigate={navigate} session={session} />)} />

          <Route path="/evaluator/activate" element={<EvalActivateScreen onNavigate={navigate} />} />
          <Route path="/evaluator/onboarding" element={protect("EVALUATOR", <EvalOnboardingScreen onNavigate={navigate} onComplete={() => completeOnboardingAndNavigate("eval-dashboard")} />)} />
          <Route path="/evaluator/dashboard" element={protect("EVALUATOR", <EvalDashboardScreen onNavigate={navigate} evaluatorId={evaluatorIdentity.id} />)} />
          <Route path="/evaluator/evaluations" element={protect("EVALUATOR", <EvalQueueScreen onNavigate={navigate} evaluatorId={evaluatorIdentity.id} />)} />
          <Route path="/evaluator/evaluations/active" element={protect("EVALUATOR", <EvalActiveScreen onNavigate={navigate} evaluatorId={evaluatorIdentity.id} />)} />
          <Route path="/evaluator/evaluations/:id" element={protect("EVALUATOR", <EvalScreenView onNavigate={navigate} evaluatorId={evaluatorIdentity.id} />)} />
          <Route path="/evaluator/evaluations/:id/review" element={protect("EVALUATOR", <EvalReviewScreen onNavigate={navigate} evaluatorId={evaluatorIdentity.id} />)} />
          <Route path="/evaluator/evaluations/:id/success" element={protect("EVALUATOR", <EvalDoneScreen onNavigate={navigate} />)} />
          <Route path="/evaluator/history" element={protect("EVALUATOR", <EvalHistoryScreen onNavigate={navigate} evaluatorId={evaluatorIdentity.id} />)} />
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
          <Route path="/admin/questions" element={protect("ADMIN", <AdminQuestionsScreen onNavigate={navigate} />)} />
          <Route path="/admin/questions/new" element={protect("ADMIN", <AdminQuestionFormScreen onNavigate={navigate} />)} />
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
              ? "O progresso salvo desta entrevista será removido. Esta ação não poderá ser desfeita."
              : "Você pode continuar depois com o progresso salvo ou cancelar esta entrevista e descartar o progresso atual."}
            confirmLabel={confirmCancelInterview ? "Cancelar entrevista" : "Sair e continuar depois"}
            cancelLabel={confirmCancelInterview ? "Voltar" : "Cancelar entrevista"}
            showCloseButton={!confirmCancelInterview}
            equalActionWidths={false}
            danger={confirmCancelInterview}
            onConfirm={() => {
              if (confirmCancelInterview) {
                cancelActiveInterviewDraft();
                return;
              }
              if (pendingBrowserNavigation) {
                saveStoredInterviewDraft(candidateIdentity.id, interviewDraft, draftProgress);
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
              saveStoredInterviewDraft(candidateIdentity.id, interviewDraft, draftProgress);
              setResumeDraftProgress(draftProgress);
              setResumePromptDismissed(false);
              setPendingNavigationScreen(null);
              executeNavigation(target);
            }}
            onCancel={() => {
              if (confirmCancelInterview) {
                setConfirmCancelInterview(false);
                return;
              }
              setConfirmCancelInterview(true);
            }}
            onClose={() => {
              setConfirmCancelInterview(false);
              setPendingNavigationScreen(null);
              setPendingBrowserNavigation(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={ROUTER_BASENAME}>
      <AppRoutes />
    </BrowserRouter>
  );
}
