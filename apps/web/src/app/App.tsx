/** RH Connect — Exploração Visual | Fluxo Principal do Candidato */

import { useState, useRef, useEffect, useCallback, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { BrowserRouter, Navigate, Route, Routes, matchPath, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import {
  ChevronRight, ChevronLeft, Check, CheckCircle, User, Briefcase,
  Clock, Mic, Home, History, Settings, LogOut, Bell,
  Eye, Plus, Edit2, RotateCcw, AlertCircle, ArrowRight,
  Award, TrendingUp, X, Shield, GraduationCap, Zap, BookOpen,
  Star, Monitor, ChevronDown, Lightbulb, Info, MessageSquare,
  Target, Send, Upload, Menu,
  Heart, Bookmark, FileText, Trash2, Lock, Database,
  ToggleLeft, ToggleRight, ChevronUp, Filter
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { DevelopmentContent } from "./components/development-screen";
import {
  AccountDropdown, NotificationDropdown,
  CANDIDATE_ACCOUNT, CANDIDATE_NOTIFS,
} from "./components/header-popovers";
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
  APP_ROUTES,
  FLOW_STEPS,
  ROUTER_BASENAME,
  getPathForScreen,
  type AppScreen as Screen,
} from "./router/routes";
import {
  analyzeJobUrl,
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

// ─── Types & Constants ────────────────────────────────────────────────────────

const AUTH_SCREENS: Screen[] = [
  "dashboard","profile","settings","materials","notifications",
  "interview-history","development",
  "interview-setup","consent","prep","interview","review","interview-confirm","interview-done",
  "pending","report",
  "eval-dashboard","eval-queue","eval-active","eval-screen","eval-review","eval-done","eval-history","eval-criteria","eval-settings",
  "admin-dashboard","admin-candidates","admin-candidate-detail","admin-evaluators","admin-evaluator-form",
  "admin-interviews","admin-assign",
  "admin-questions","admin-question-form","admin-roles","admin-criteria","admin-consent","admin-audit","admin-settings",
];

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
  context: JobInterviewContext | null;
  questions: InterviewQuestion[];
  answers: Record<number, string>;
};

const createEmptyInterviewDraft = (): InterviewDraft => ({
  context: null,
  questions: [],
  answers: {},
});

const createDemoInterviewDraft = (): InterviewDraft => ({
  context: {
    sourceUrl: "https://empregare.com/vaga-demo-desenvolvedor-full-stack-junior",
    areaId: "information-technology",
    subareaId: "full-stack-development",
    seniorityId: "junior",
    jobTitle: "Desenvolvedor Full Stack Júnior",
    title: "Desenvolvedor Full Stack Júnior",
    company: "Tech Labs",
    summary:
      "Vaga demonstrativa V1 para desenvolvimento de aplicações web, integração entre front-end e back-end e comunicação objetiva com o time.",
    requirements: [
      "Conhecimento em React e TypeScript.",
      "Noções de APIs REST e integração com back-end.",
      "Organização para trabalhar com tarefas, prazos e revisão de código.",
      "Comunicação clara para explicar decisões técnicas.",
    ],
  },
  questions: [
    {
      id: 1,
      type: "Tecnica",
      text: "Quais conhecimentos de React e TypeScript você usaria para atuar nesta vaga?",
    },
    {
      id: 2,
      type: "Tecnica",
      text: "Como você organizaria a integração de uma tela front-end com uma API REST?",
    },
    {
      id: 3,
      type: "Comportamental",
      text: "Conte sobre uma situação em que precisou organizar prioridades para cumprir um prazo.",
    },
    {
      id: 4,
      type: "Comportamental",
      text: "Descreva uma experiência em que explicou uma decisão técnica para outra pessoa do time.",
    },
    {
      id: 5,
      type: "Carreira",
      text: "Por que esta vaga faz sentido para seus objetivos profissionais agora?",
    },
  ],
  answers: {
    1: "Eu usaria componentes reutilizáveis, tipagem para contratos de dados e estados claros de carregamento, erro e sucesso para entregar uma interface mais confiável.",
    2: "Começaria entendendo o contrato da API, depois criaria uma camada de serviço no Front e validaria os estados principais antes de integrar à tela final.",
    3: "Em um projeto acadêmico, organizei tarefas por impacto e prazo, combinei entregas menores com o grupo e acompanhei pendências diariamente até concluir a atividade.",
    4: "Expliquei para o time por que valia separar um formulário em componentes menores, mostrando como isso reduziria repetição e facilitaria manutenção.",
    5: "A vaga combina com meu momento porque quero consolidar minha base em desenvolvimento web e ganhar prática em produtos com fluxo real de usuários.",
  },
});

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

function FieldSelect({ label, options, required }: {
  label: string; options: string[]; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-foreground mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <NativeSelect>
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

// ─── Flow Navigator ───────────────────────────────────────────────────────────

function FlowNav({ current, onNavigate }: { current: Screen; onNavigate: (s: Screen) => void }) {
  const idx = FLOW_STEPS.findIndex(s => s.id === current);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", updateArrows); ro.disconnect(); };
  }, [updateArrows]);

  useEffect(() => {
    const chip = activeRef.current;
    const container = scrollRef.current;
    if (!chip || !container) return;
    const chipLeft = chip.offsetLeft;
    const chipWidth = chip.offsetWidth;
    const containerWidth = container.clientWidth;
    const target = chipLeft - (containerWidth - chipWidth) / 2;
    container.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [current]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  };

  return (
    <div className="sticky top-0 z-[60] bg-slate-900 border-b border-slate-800 shrink-0" style={{ minHeight: 44 }}>
      <div className="flex items-center gap-2 max-w-screen-xl mx-auto px-3 py-2">
        {/* Fixed label */}
        <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase shrink-0 select-none">
          Exploração
        </span>

        {/* Scrollable chips area with arrow controls */}
        <div className="relative flex-1 min-w-0 flex items-center">
          {/* Left arrow + gradient */}
          {canScrollLeft && (
            <>
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-900 to-transparent pointer-events-none z-10" />
              <button
                onClick={() => scroll("left")}
                className="absolute left-0 z-20 p-1 text-slate-400 hover:text-white transition-colors shrink-0"
                aria-label="Rolar para a esquerda"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {/* Chips row */}
          <div
            ref={scrollRef}
            className="flex items-center gap-1.5 overflow-x-auto w-full"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              scrollBehavior: "smooth",
              flexWrap: "nowrap",
            } as React.CSSProperties}
          >
            {/* Left padding when arrow is shown */}
            {canScrollLeft && <span className="shrink-0 w-5" />}

            {FLOW_STEPS.map((step, i) => {
              const done = i < idx;
              const active = i === idx;
              return (
                <button
                  key={step.id}
                  ref={active ? activeRef : undefined}
                  onClick={() => onNavigate(step.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all duration-150
                    ${active
                      ? "bg-blue-600 text-white"
                      : done
                        ? "bg-green-600/25 text-green-400 hover:bg-green-600/35"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
                >
                  {done
                    ? <Check className="w-3 h-3 shrink-0" />
                    : <span className="text-[10px] shrink-0">{i + 1}</span>}
                  {step.label}
                </button>
              );
            })}

            {/* Right padding when arrow is shown */}
            {canScrollRight && <span className="shrink-0 w-5" />}
          </div>

          {/* Right arrow + gradient */}
          {canScrollRight && (
            <>
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-900 to-transparent pointer-events-none z-10" />
              <button
                onClick={() => scroll("right")}
                className="absolute right-0 z-20 p-1 text-slate-400 hover:text-white transition-colors shrink-0"
                aria-label="Rolar para a direita"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Authenticated Layout ─────────────────────────────────────────────────────

const NAV_ITEMS = [
  { icon: Home,      label: "Dashboard",    screen: "dashboard" as Screen },
  { icon: User,      label: "Meu Perfil",   screen: "profile" as Screen },
  { icon: History,   label: "Histórico",       screen: "interview-history" as Screen },
  { icon: TrendingUp,label: "Desenvolvimento", screen: "development" as Screen },
  { icon: BookOpen,  label: "Materiais",       screen: "materials" as Screen },
  { icon: Settings,  label: "Configurações",screen: "settings" as Screen },
];

function SidebarContent({
  current, onNavigate, collapsed, onToggleCollapse, onClose, isMobile = false,
}: {
  current: Screen;
  onNavigate: (s: Screen) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onClose: () => void;
  isMobile?: boolean;
}) {
  const [showLogout, setShowLogout] = useState(false);

  return (
    <div className="flex flex-col h-full relative" style={{ backgroundColor: "#021025" }}>
      {/* Logout confirmation modal */}
      {showLogout && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(15,38,82,0.92)" }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-[240px] text-center shadow-2xl">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <LogOut className="w-6 h-6 text-red-500" />
            </div>
            <p className="font-bold text-foreground text-sm mb-1">Sair da conta?</p>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">Você precisará fazer login novamente para acessar o sistema.</p>
            <div className="space-y-2">
              <button
                onClick={() => { setShowLogout(false); onNavigate("landing"); }}
                className="w-full py-2 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors"
              >
                Sair
              </button>
              <button
                onClick={() => setShowLogout(false)}
                className="w-full py-2 bg-muted text-foreground rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Logo */}
      <div className={`border-b border-white/10 flex items-center ${collapsed ? "px-2 py-4 justify-center" : "px-5 py-4"}`}>
        {collapsed ? (
          /* Símbolo RH completo, proporções originais preservadas, sem corte */
          <svg viewBox="0 0 57.9158 31.8399" className="h-6 w-auto shrink-0" fill="none" style={{ maxWidth: "100%" }}>
            <path d="M1.0034 1.3239C4.19431 1.26744 7.53747 1.31544 10.7388 1.3171L13.8914 1.31592C15.0575 1.3152 16.0381 1.29485 17.1979 1.46852C18.4141 1.65309 19.5909 2.03957 20.6795 2.61198C22.3936 3.51994 23.7867 5.08479 24.4693 6.88707C26.3808 11.9338 24.3617 17.5553 18.9677 19.175C19.1319 19.4606 19.3617 19.7205 19.5774 19.9692C18.8881 20.2148 18.0855 20.5988 17.3944 20.8665C16.373 21.2621 15.2788 21.6839 14.2793 22.1223C14.1998 21.98 14.0812 21.8379 13.9862 21.7017L13.2789 20.704C12.4177 19.5076 11.5368 18.3256 10.6363 17.1584C10.3775 16.8194 9.82044 16.1522 9.62468 15.8325C9.60416 15.536 9.62367 15.1421 9.64111 14.8468L13.0637 14.8484C13.6093 14.85 14.1573 14.8542 14.7028 14.8538C16.6991 14.8523 18.5663 13.9476 19.0304 11.8736C19.1035 11.5127 19.1394 11.1454 19.1377 10.7773C19.1334 9.65289 18.8533 8.72409 18.0428 7.91988C16.471 6.3604 14.2713 6.6455 12.2439 6.64022C10.4186 6.63171 8.5933 6.6333 6.76805 6.645L6.77191 22.7675C5.8437 23.2198 5.29824 23.9889 4.86325 24.9001C4.02954 26.6465 4.92463 29.1508 6.75606 29.93L6.74287 30.5193C4.83248 30.5654 2.82778 30.5185 0.905471 30.5299C0.886613 29.7373 0.900454 28.8871 0.899898 28.0911L0.900929 23.1983L0.901946 5.99575C0.902089 5.59104 0.871983 1.45066 0.920229 1.33522L1.0034 1.3239Z" fill="white" />
            <path d="M50.6285 13.5512C50.6892 13.5585 50.8577 13.7627 50.9153 13.8205C51.848 14.7552 53.056 15.0623 54.3359 14.8798L54.3328 30.5336C53.6704 30.5255 53.0004 30.5308 52.3371 30.5308L48.5672 30.5285L48.5663 19.139L48.568 15.9289C48.5688 15.4009 48.5932 14.6078 48.5504 14.0965C49.0848 13.9134 50.0709 13.6519 50.6285 13.5512Z" fill="#1560FE" />
            <path d="M30.4151 1.32058C32.3018 1.28932 34.2709 1.31786 36.1634 1.32312L36.1609 13.9794C35.6975 14.1455 35.1815 14.2957 34.7078 14.4516C33.5841 14.8691 32.4519 15.263 31.3118 15.6329C31.0093 15.7336 30.7212 15.8682 30.4193 15.9575C30.4338 15.4828 30.4168 14.906 30.4168 14.4224L30.4176 11.1625L30.4151 1.32058Z" fill="#1560FE" />
            <path d="M36.0993 17.8545L36.1281 17.8577C36.193 17.9506 36.1672 19.9964 36.167 20.2632L36.1664 24.5015L36.1647 28.2418C36.1642 28.9951 36.1765 29.7872 36.1505 30.5371L30.4908 30.5318C30.4776 30.5284 30.4528 30.5086 30.4399 30.4997C30.3955 30.3014 30.4156 29.6383 30.417 29.3959L30.4175 27.6969L30.412 19.8174C30.8737 19.6743 31.2684 19.5036 31.7184 19.3454L34.3787 18.4325C34.9849 18.2254 35.4758 18.0381 36.0993 17.8545Z" fill="#1560FE" />
            <path d="M10.8072 24.6718C11.53 24.387 12.2869 24.0327 13.0109 23.7348C15.0809 22.867 17.164 22.0307 19.2594 21.2262L23.4165 19.6475C24.1919 19.3525 25.0403 19.0024 25.8149 18.721L28.9872 17.5691C29.4554 17.404 29.9392 17.2693 30.4037 17.0953C30.4513 17.2569 30.4348 18.4825 30.4345 18.743C28.9003 19.3456 27.3123 19.8391 25.7829 20.4528C24.5529 20.9463 23.2984 21.3842 22.0658 21.8621C20.0068 22.6514 17.9547 23.4584 15.9097 24.2829C14.4274 24.8839 12.9404 25.5146 11.4514 26.0995C11.4358 26.8248 11.2554 27.5673 10.7601 28.1209C9.72883 29.2741 8.01062 29.3171 6.87421 28.2946C6.3777 27.8486 6.08134 27.2219 6.05171 26.5553C5.94771 24.4258 8.25483 22.9148 10.109 24.0925C10.3818 24.2657 10.5706 24.4545 10.8072 24.6718Z" fill="white" />
            <path d="M21.7371 22.941C21.9043 23.0858 22.7947 24.3675 22.9641 24.6095L24.4678 26.7166C25.3639 27.973 26.3832 29.2422 27.2286 30.5261L21.7872 30.5278L20.1057 30.5306C19.8739 30.2731 19.7375 30.0167 19.5418 29.7404C18.5666 28.3641 17.6018 26.9809 16.6268 25.6046C16.4986 25.4237 16.374 25.2546 16.2742 25.0549C16.8003 24.8744 17.3137 24.6801 17.8284 24.4691C19.122 23.9389 20.4466 23.4784 21.7371 22.941Z" fill="white" />
            <path d="M48.6542 1.32713C50.5303 1.29183 52.4535 1.32787 54.336 1.31976L54.3313 6.75147C52.9553 6.67053 52.5013 6.84509 51.3772 7.51585C50.4883 8.10961 50.0073 8.98816 49.7158 9.98612C49.3438 10.1079 48.9404 10.1887 48.5556 10.2583C48.6246 7.44075 48.5315 4.58479 48.5558 1.7646C48.557 1.64786 48.5461 1.45345 48.5838 1.34559L48.6542 1.32713Z" fill="#1560FE" />
            <path d="M30.4035 17.0884C30.797 16.8805 31.5279 16.666 31.9774 16.5087L35.1059 15.4309L41.0946 13.4652C43.5224 12.6933 45.9384 11.9827 48.4075 11.3523C48.8371 11.2426 49.2983 11.1574 49.7195 11.034C49.8073 11.4521 50.0284 12.1341 50.1846 12.5495C48.8726 12.9316 47.5444 13.2742 46.2277 13.6409C45.977 13.7107 45.7198 13.7645 45.4683 13.8354C43.8516 14.3026 42.2436 14.7995 40.6454 15.3259C38.3571 16.0591 36.078 16.8025 33.8031 17.5791C32.6871 17.9601 31.5626 18.4023 30.4342 18.7361C30.4345 18.4756 30.451 17.2501 30.4035 17.0884Z" fill="#1560FE" />
            <path d="M53.2854 7.48461C55.1541 7.22913 56.8761 8.53826 57.1282 10.4075C57.38 12.2771 56.065 13.9951 54.1946 14.2424C52.3304 14.4887 50.6175 13.1811 50.3664 11.3176C50.1153 9.45383 51.4222 7.73945 53.2854 7.48461Z" fill="#1560FE" stroke="white" strokeWidth="1.51237" />
          </svg>
        ) : (
          <div className="flex flex-col gap-0.5 min-w-0">
            <RHConnectLogo variant="inverse" className="h-7 w-auto max-w-[150px]" />
            <p className="text-white/40 text-[11px]">Candidato</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = current === item.screen;
          return (
            <button
              key={item.label}
              onClick={() => { item.screen && onNavigate(item.screen); onClose(); }}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center rounded-xl text-sm font-medium transition-all text-left
                ${collapsed ? "justify-center p-2.5" : "gap-3 px-3.5 py-2.5"}
                ${active ? "bg-white/15 text-white" : "text-white/55 hover:bg-white/10 hover:text-white/80"}`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="flex-1">{item.label}</span>}
              {active && !collapsed && <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />}
            </button>
          );
        })}
      </nav>

      {/* Collapse toggle — desktop/notebook only, hidden in mobile drawer */}
      {!isMobile && (
        <div className="p-3 border-t border-white/10">
          <button
            onClick={onToggleCollapse}
            title={collapsed ? "Expandir menu" : undefined}
            className={`w-full flex items-center rounded-xl py-2 text-white/40 hover:text-white/70 hover:bg-white/10 transition-all duration-[220ms]
              ${collapsed ? "justify-center px-2" : "gap-2 px-3"}`}
          >
            {collapsed
              ? <ChevronRight className="w-4 h-4" />
              : <><ChevronLeft className="w-4 h-4" /><span className="text-xs">Recolher menu</span></>}
          </button>
        </div>
      )}

      {/* User */}
      <div className={`p-3 border-t border-white/10 ${collapsed ? "flex justify-center" : ""}`}>
        {collapsed ? (
          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
            JL
          </div>
        ) : (
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
              JL
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">João Lima</p>
              <p className="text-white/40 text-xs truncate">joao.lima@gmail.com</p>
            </div>
            <button
              onClick={() => setShowLogout(true)}
              className="text-white/30 hover:text-white/60 transition-colors shrink-0"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TopBar({
  title, subtitle, actions, onNavigate,
}: {
  title: string; subtitle?: string; actions?: React.ReactNode;
  onNavigate: (s: Screen) => void;
}) {
  return (
    <div className="bg-white border-b border-border px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between shrink-0 gap-3">
      <div className="min-w-0">
        <h1 className="text-base sm:text-lg font-bold text-foreground truncate">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5 truncate hidden sm:block">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {actions && <div className="hidden sm:flex items-center gap-2">{actions}</div>}
        <NotificationDropdown
          notifs={CANDIDATE_NOTIFS}
          viewAllScreen="notifications"
          onNavigate={onNavigate as (s: string) => void}
        />
        <AccountDropdown
          config={CANDIDATE_ACCOUNT}
          onNavigate={onNavigate as (s: string) => void}
        />
      </div>
    </div>
  );
}

function AuthLayout({
  current, onNavigate, title, subtitle, actions, children,
}: {
  current: Screen; onNavigate: (s: Screen) => void;
  title: string; subtitle?: string; actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(() => sessionStorage.getItem("sb-collapsed") === "1");
  const toggleCollapsed = () => setCollapsed(c => { sessionStorage.setItem("sb-collapsed", c ? "0" : "1"); return !c; });

  return (
    <div className="flex w-full">
      {/* Sidebar fixa — sem overlay, sem drawer, sem bloqueio de cliques */}
      <aside
        className={`flex flex-col shrink-0 sticky self-start transition-[width] duration-[220ms] ease-in-out ${collapsed ? "w-16" : "w-60"}`}
        style={{ backgroundColor: "#021025", top: 44, height: "calc(100vh - 44px)" }}
      >
        <SidebarContent
          current={current}
          onNavigate={onNavigate}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
          onClose={() => {}}
          isMobile={false}
        />
      </aside>

      {/* Conteúdo principal — reajusta horizontalmente conforme a sidebar */}
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          title={title}
          subtitle={subtitle}
          actions={actions}
          onNavigate={onNavigate}
        />
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

// ─── Screen 1: Landing ────────────────────────────────────────────────────────

function LandingScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  return <LandingScreenComponent onNavigate={onNavigate} />;
}

// ─── Screen 2: Auth ───────────────────────────────────────────────────────────

function AuthScreen({
  onNavigate,
  initialTab = "register",
}: {
  onNavigate: (s: Screen) => void;
  initialTab?: "login" | "register";
}) {
  const [tab, setTab] = useState<"login" | "register">(initialTab);
  const authNavigate = useNavigate();

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const selectAuthTab = (nextTab: "login" | "register") => {
    setTab(nextTab);
    authNavigate(nextTab === "login" ? "/login" : "/register");
  };

  return (
    <div className="min-h-[calc(100vh-44px)] bg-background flex items-center justify-center p-4 sm:p-8 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <RHConnectLogo className="h-10 w-auto mx-auto mb-3" />
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
                <Field label="E-mail" type="email" placeholder="seuemail@gmail.com" required />
                <Field label="Senha" type="password" placeholder="Sua senha" required />
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Checkbox id="remember-access" />
                    <label htmlFor="remember-access" className="text-muted-foreground cursor-pointer">
                      Lembrar acesso
                    </label>
                  </div>
                  <button onClick={() => onNavigate("forgot-password")} className="text-primary font-semibold hover:underline text-sm">Esqueci minha senha</button>
                </div>
                <Btn variant="primary" className="w-full !py-3" onClick={() => onNavigate("dashboard")}>
                  Entrar na plataforma
                </Btn>
              </div>
            ) : (
              <div className="space-y-4">
                <Field label="Nome completo" placeholder="João da Silva Lima" required />
                <Field label="E-mail" type="email" placeholder="nome@gmail.com" required />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Senha" type="password" placeholder="Mínimo 8 caracteres" required />
                  <Field label="Confirmar senha" type="password" placeholder="Repita a senha" required />
                </div>
                <div className="bg-accent rounded-xl p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" className="mt-0.5 rounded shrink-0" />
                    <span className="text-xs text-foreground leading-relaxed">
                      Li e aceito os <button onClick={() => onNavigate("terms")} className="text-primary font-semibold hover:underline">Termos de uso</button> e a <button onClick={() => onNavigate("privacy")} className="text-primary font-semibold hover:underline">Política de privacidade</button>. <span className="text-red-500">*</span>
                    </span>
                  </label>
                </div>
                <Btn variant="primary" className="w-full !py-3" onClick={() => onNavigate("email-verify")}>
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

        {/* Demo shortcuts — prototype only, visually separate from real login */}
        {tab === "login" && (
          <div className="w-full max-w-md mx-auto mt-4 border border-dashed border-muted-foreground/30 rounded-2xl p-4 bg-muted/20">
            <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide mb-3 text-center">
              Navegação do protótipo — outros perfis
            </p>
            <p className="text-[10px] text-muted-foreground text-center mb-3 leading-relaxed">
              No produto real, o perfil é identificado automaticamente após o login.<br/>
              Estes atalhos existem apenas para demonstração.
            </p>
            <div className="flex gap-2">
              <button onClick={() => onNavigate("eval-onboarding")}
                className="flex-1 px-3 py-2 rounded-xl border border-teal-200 bg-teal-50 text-teal-700 text-xs font-semibold hover:bg-teal-100 transition-colors">
                Avaliador
              </button>
              <button onClick={() => onNavigate("admin-onboarding")}
                className="flex-1 px-3 py-2 rounded-xl border border-violet-200 bg-violet-50 text-violet-700 text-xs font-semibold hover:bg-violet-100 transition-colors">
                Administrador
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Screen 3: Dashboard ──────────────────────────────────────────────────────

function DashboardScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const RECENT = [
    { vaga: "Desenvolvedor Full Stack Júnior", empresa: "Tech Labs",        data: "18/07/2026", status: "Resultado disponível", badge: "success" as const },
    { vaga: "Analista de RH Pleno",            empresa: "Grupo Pessoas",    data: "10/07/2026", status: "Aguardando avaliação", badge: "warning" as const },
    { vaga: "Assistente de Secretariado",      empresa: "Escritório Central", data: "02/07/2026", status: "Concluída",            badge: "default" as const },
  ];

  return (
    <AuthLayout current="dashboard" onNavigate={onNavigate} title="Dashboard" subtitle="Bem-vindo de volta, João!">
      {/* Profile incomplete banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 sm:p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">Perfil 65% completo</p>
            <p className="text-xs text-muted-foreground mt-0.5">Complete seu perfil para obter perguntas mais relevantes.</p>
            <div className="mt-2 w-full max-w-xs bg-blue-100 rounded-full h-1.5">
              <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: "65%" }} />
            </div>
          </div>
        </div>
        <Btn variant="secondary" size="sm" onClick={() => onNavigate("profile")} className="self-start sm:self-auto shrink-0">
          Completar perfil
        </Btn>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard value="3"   label="Entrevistas realizadas" icon={MessageSquare} color="bg-blue-50 text-blue-600" />
        <StatCard value="1"   label="Aguardando avaliação"   icon={Clock}       color="bg-amber-50 text-amber-600" />
        <StatCard value="1"   label="Resultado disponível"   icon={CheckCircle} color="bg-green-50 text-green-600" />
        <StatCard value="7,8" label="Melhor pontuação"       icon={Award}       color="bg-purple-50 text-purple-600" />
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
              {RECENT.map((item) => (
                <div key={item.vaga} className="p-3 sm:p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center border border-border shrink-0 mt-0.5">
                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{item.vaga}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.empresa} · {item.data}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <StatusBadge tone={statusToneFromBadge(item.badge)}><span className="truncate max-w-[140px] sm:max-w-none">{item.status}</span></StatusBadge>
                        {item.badge === "success" && (
                          <Btn size="sm" variant="primary" onClick={() => onNavigate("report")}>
                            Ver relatório
                          </Btn>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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

function ProfileScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [openSection, setOpenSection] = useState<string | null>("objetivo");
  const [selectedAreaId, setSelectedAreaId] = useState<ProfessionalAreaId | "">("information-technology");
  const [selectedSubareaId, setSelectedSubareaId] = useState("");
  const availableSubareas = selectedAreaId ? getProfessionalSubareasByArea(selectedAreaId) : [];

  const sections = [
    { id: "objetivo",    label: "Objetivo profissional",     icon: Target,       filled: true },
    { id: "formacao",    label: "Formação acadêmica",        icon: GraduationCap,filled: true },
    { id: "cursos",      label: "Cursos complementares",     icon: BookOpen,     filled: false },
    { id: "experiencia", label: "Experiência profissional",  icon: Briefcase,    filled: false },
    { id: "habilidades", label: "Habilidades e competências",icon: Star,         filled: true },
  ];

  return (
    <AuthLayout
      current="profile"
      onNavigate={onNavigate}
      title="Perfil Profissional"
      subtitle="Preencha seu perfil para receber perguntas mais relevantes"
      actions={
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">65% completo</span>
          <div className="w-20 sm:w-24 bg-muted rounded-full h-1.5">
            <div className="bg-primary h-1.5 rounded-full" style={{ width: "65%" }} />
          </div>
        </div>
      }
    >
      <div className="w-full space-y-4">
        {/* Avatar / dados básicos */}
        <Card className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-700 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0">
              JL
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-foreground text-lg">João Lima</h2>
              <p className="text-muted-foreground text-sm">joao.lima@gmail.com · São Paulo, SP</p>
              <p className="text-xs text-muted-foreground mt-1 italic">"Profissional em busca da primeira oportunidade na área de Tecnologia da Informação."</p>
            </div>
            <Btn variant="outline" size="sm" className="self-start sm:self-auto shrink-0">
              <Edit2 className="w-3.5 h-3.5" /> Editar
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
                      <Field label="Cargo desejado" placeholder="Ex: Desenvolvedor Front-end" required />
                      <FieldSelect label="Senioridade profissional" options={SENIORITY_LEVEL_OPTIONS} required />
                      <FieldSelect label="Tipo de contrato" options={["CLT", "Estágio", "PJ", "Temporário"]} />
                    </div>
                    <FieldArea label="Resumo profissional" placeholder="Escreva um breve texto sobre sua trajetória, objetivos e diferenciais..." rows={3} required />
                  </>
                )}
                {sec.id === "formacao" && (
                  <>
                    <div className="bg-muted/50 rounded-xl p-4 border border-border">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground text-sm">Análise e Desenvolvimento de Sistemas</p>
                          <p className="text-xs text-muted-foreground">SENAC-DF · Tecnólogo · Em andamento</p>
                          <p className="text-xs text-muted-foreground">2025 – 2026</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    </div>
                    <button className="w-full border-2 border-dashed border-border rounded-xl py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2">
                      <Plus className="w-4 h-4" /> Adicionar formação
                    </button>
                  </>
                )}
                {sec.id === "habilidades" && (
                  <>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Habilidades técnicas</p>
                      <div className="flex flex-wrap gap-2">
                        {["JavaScript", "React", "Git", "Testes", "SQL", "Comunicação técnica"].map(s => (
                          <UIBadge key={s} variant="primary" className="px-3 py-1 font-medium">{s}</UIBadge>
                        ))}
                        <button className="bg-muted text-muted-foreground text-xs font-medium px-3 py-1 rounded-full border border-border hover:bg-muted/80 flex items-center gap-1">
                          <Plus className="w-3 h-3" /> Adicionar
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Competências comportamentais</p>
                      <div className="flex flex-wrap gap-2">
                        {["Comunicação", "Trabalho em equipe", "Criatividade", "Proatividade"].map(s => (
                          <UIBadge key={s} variant="neutral" className="border-green-100 bg-green-50 px-3 py-1 font-medium text-green-700">{s}</UIBadge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Idiomas</p>
                      <div className="flex flex-wrap gap-2">
                        {["Português (nativo)", "Inglês (básico)"].map(s => (
                          <UIBadge key={s} variant="neutral" className="border-purple-100 bg-purple-50 px-3 py-1 font-medium text-purple-700">{s}</UIBadge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                {(sec.id === "cursos" || sec.id === "experiencia") && (
                  <div className="text-center py-4">
                    <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Plus className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">
                      {sec.id === "cursos" ? "Nenhum curso adicionado" : "Nenhuma experiência adicionada"}
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">Adicione informações para enriquecer seu perfil.</p>
                    <Btn variant="secondary" size="sm">
                      <Plus className="w-3.5 h-3.5" />
                      {sec.id === "cursos" ? "Adicionar curso" : "Adicionar experiência"}
                    </Btn>
                  </div>
                )}
                {sec.filled && (
                  <div className="flex justify-end pt-2 border-t border-border">
                    <Btn variant="primary" size="sm">Salvar alterações</Btn>
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

  return (
    <AuthLayout current="prep" onNavigate={onNavigate} title="Orientações da Entrevista" subtitle="Leia as orientações antes de responder">
      <div className="w-full">
        {/* Context card */}
        <Card className="p-4 sm:p-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Contexto confirmado</p>
              <p className="font-bold text-foreground">{context?.title ?? "Vaga em análise"}</p>
              <p className="text-sm text-muted-foreground">{context?.company ?? "Empresa não informada"}</p>
            </div>
          </div>
        </Card>

        {/* Interview info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-7">
          {[
            { icon: MessageSquare, label: "5 perguntas",    desc: "Contextualizadas pela vaga" },
            { icon: Clock,         label: "~15 minutos",    desc: "Duração estimada" },
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
            <strong>Importante:</strong> a próxima etapa apresenta o consentimento. O texto jurídico ainda está sujeito à validação da equipe.
          </p>
        </Alert>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Btn variant="outline" onClick={() => onNavigate("interview-setup")}>Voltar</Btn>
          <Btn variant="primary" size="lg" onClick={() => onNavigate("consent")}>
            <span className="hidden sm:inline">Continuar para consentimento</span>
            <span className="sm:hidden">Consentimento</span>
            <ChevronRight className="w-5 h-5" />
          </Btn>
        </div>
      </div>
    </AuthLayout>
  );
}

// ─── Screen 8: Entrevista Simulada ────────────────────────────────────────────

function InterviewScreen({
  onNavigate,
  draft,
  setDraft,
}: {
  onNavigate: (s: Screen) => void;
  draft: InterviewDraft;
  setDraft: Dispatch<SetStateAction<InterviewDraft>>;
}) {
  const [qIdx, setQIdx] = useState(0);
  const [speechError, setSpeechError] = useState("");
  const [dictating, setDictating] = useState(false);
  const recognitionRef = useRef<InstanceType<SpeechRecognitionConstructor> | null>(null);
  const questions = draft.questions;
  const question = questions[qIdx];
  const answer = question ? draft.answers[question.id] ?? "" : "";
  const progress = questions.length ? ((qIdx + 1) / questions.length) * 100 : 0;
  const supportsSpeech = typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    return () => recognitionRef.current?.stop();
  }, []);

  const updateAnswer = (value: string) => {
    if (!question) return;
    setDraft((current) => ({
      ...current,
      answers: { ...current.answers, [question.id]: value },
    }));
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
        updateAnswer(`${answer}${answer ? " " : ""}${transcript}`.trim());
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
    if (!answer.trim()) {
      toast.error("Responda a pergunta atual antes de avançar.");
      return;
    }
    stopDictation();
    if (qIdx < questions.length - 1) setQIdx(qIdx + 1);
    else onNavigate("review");
  };

  if (!draft.context || !question) {
    return <DraftWizardGuard current="interview" onNavigate={onNavigate} />;
  }

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
              placeholder="Digite sua resposta. Se preferir, use o ditado por voz para preencher este campo."
              className="min-h-56"
            />
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
              <div className="text-xs text-muted-foreground">
                {answer.trim().split(/\s+/).filter(Boolean).length} palavras
              </div>
              <Btn variant={dictating ? "secondary" : "outline"} size="sm" onClick={toggleDictation}>
                <Mic className="w-4 h-4" /> {dictating ? "Parar ditado" : "Ditado por voz"}
              </Btn>
            </div>
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
            <p className="text-sm text-muted-foreground mb-3">{draft.context.company}</p>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">{draft.context.summary}</p>
            <div className="space-y-2">
              {draft.context.requirements.slice(0, 4).map((requirement) => (
                <div key={requirement} className="flex items-start gap-2 text-xs text-foreground">
                  <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                  <span>{requirement}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Progresso</p>
            <div className="space-y-2">
              {questions.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { stopDictation(); setQIdx(index); }}
                  className={`w-full flex items-center gap-2 text-left p-2 rounded-lg transition-colors ${index === qIdx ? "bg-blue-50 text-blue-700" : "hover:bg-muted"}`}
                >
                  <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${draft.answers[item.id]?.trim() ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                    {index + 1}
                  </span>
                  <span className="text-xs font-medium truncate">{draft.answers[item.id]?.trim() ? "Respondida" : "Pendente"}</span>
                </button>
              ))}
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
  const [sending, setSending] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const answeredCount = draft.questions.filter((question) => draft.answers[question.id]?.trim()).length;

  if (!draft.context || draft.questions.length === 0) {
    return <DraftWizardGuard current="review" onNavigate={onNavigate} />;
  }

  const handleSend = () => {
    setSending(true);
    setTimeout(() => { setSending(false); onNavigate("interview-confirm"); }, 1800);
  };

  return (
    <AuthLayout current="review" onNavigate={onNavigate} title="Revisão das Respostas" subtitle="Confira perguntas e respostas antes de enviar para avaliação humana">
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
            <p className="text-lg sm:text-2xl font-bold text-blue-600 leading-tight">OK</p>
            <p className="text-[11px] sm:text-xs text-muted-foreground leading-snug mt-0.5">pronto p/<br className="sm:hidden" /> envio</p>
          </Card>
        </div>

        <Card className="mb-6">
          <div className="p-4 sm:p-5 border-b border-border">
            <h3 className="font-bold text-foreground">Suas respostas</h3>
          </div>
          <div className="divide-y divide-border">
            {draft.questions.map((q, i) => (
              <div key={q.id} className="p-4 sm:p-5 flex items-start sm:items-center gap-3 sm:gap-4">
                <div className="w-7 h-7 bg-green-50 border border-green-200 rounded-full flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                  <Check className="w-3.5 h-3.5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Pergunta {i + 1}</p>
                  <p className="text-sm text-foreground line-clamp-2 sm:truncate">{q.text}</p>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-3">{draft.answers[q.id] || "Resposta ainda não preenchida."}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Consent */}
        <Card className="p-4 sm:p-5 mb-6 bg-blue-50 border-blue-100">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" className="mt-0.5 rounded shrink-0" checked={confirm} onChange={e => setConfirm(e.target.checked)} />
            <span className="text-sm text-foreground leading-relaxed">
              Confirmo que revisei minhas respostas textuais e concordo com o envio para avaliação por um avaliador humano autorizado. Entendo que o envio é uma ação de difícil reversão.
            </span>
          </label>
        </Card>

        <Alert variant="warning" className="mb-7 flex gap-3 rounded-2xl p-4">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Após o envio, suas respostas serão encaminhadas para avaliação humana. Prazo estimado de retorno: até <strong>3 dias úteis</strong>.
          </p>
        </Alert>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Btn variant="outline" onClick={() => onNavigate("interview")}>
            <Edit2 className="w-4 h-4" /> Editar respostas
          </Btn>
          <Btn variant="primary" size="lg" disabled={!confirm || sending} onClick={handleSend}>
            {sending ? (
              <><Spinner />Enviando...</>
            ) : (
              <><Send className="w-4 h-4" /> Enviar entrevista</>
            )}
          </Btn>
        </div>
      </div>
    </AuthLayout>
  );
}

// ─── Screen 10: Avaliação Pendente ────────────────────────────────────────────

function PendingScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const TIMELINE = [
    { label: "Conta criada",          date: "02/07/2026",      done: true },
    { label: "Entrevista realizada",  date: "18/07/2026",      done: true },
    { label: "Respostas enviadas",    date: "18/07/2026",      done: true },
    { label: "Atribuída ao avaliador",date: "19/07/2026",      done: true },
    { label: "Em avaliação",          date: "20/07/2026",      done: false, active: true },
    { label: "Relatório disponível",  date: "Estimativa: 21/07",done: false },
  ];

  return (
    <AuthLayout current="pending" onNavigate={onNavigate} title="Acompanhamento da Entrevista" subtitle="Desenvolvedor Full Stack Júnior · Tech Labs">
      <div className="w-full">
        {/* Status hero */}
        <Card className="p-6 sm:p-8 mb-6 text-center">
          <div className="w-16 h-16 bg-amber-50 border-2 border-amber-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Entrevista em avaliação</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-5">
            Sua entrevista foi recebida com sucesso e está sendo analisada por um avaliador humano treinado.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <StatusBadge tone="warning">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse mr-1" />
              Em avaliação
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
              {[
                { q: "Quem avalia?",             a: "Um avaliador treinado com critérios padronizados de RH." },
                { q: "Quanto tempo leva?",        a: "Em geral, de 1 a 3 dias úteis após o envio." },
                { q: "O que você vai receber?",   a: "Nota por critério, pontos fortes, oportunidades e recomendações." },
                { q: "Quem vê minhas respostas?", a: "Apenas o avaliador atribuído e o administrador da plataforma." },
              ].map(({ q, a }) => (
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
            <Btn variant="primary" className="w-full" onClick={() => onNavigate("report")}>
              Ver resultado disponível <ArrowRight className="w-4 h-4" />
            </Btn>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}

// ─── Screen 11: Resultado e Relatório ─────────────────────────────────────────

function ReportScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const radarData = CRITERIA.map(c => ({ name: c.name, score: c.score }));

  const scoreColor = (s: number) => s >= 9 ? "#16A34A" : s >= 7 ? "#1D4ED8" : "#D97706";

  return (
    <AuthLayout
      current="report"
      onNavigate={onNavigate}
      title="Resultado e Relatório"
      subtitle="Desenvolvedor Full Stack Júnior · Tech Labs · 18/07/2026"
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
              <div className="flex items-end gap-2 mb-4">
                <span className="text-[72px] sm:text-[80px] font-extrabold text-foreground leading-none">7.7</span>
                <span className="text-2xl font-bold text-muted-foreground mb-3">/ 10</span>
              </div>
              <div className="mb-5">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-green-100 text-green-700 text-sm font-bold rounded-full border border-green-200">
                  <CheckCircle className="w-3.5 h-3.5" /> Bom desempenho
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Você demonstrou uma comunicação clara e objetiva, com boa coerência nas ideias e domínio adequado do assunto. Continue aprimorando exemplos práticos e organizando ainda mais suas respostas para alcançar excelência.
              </p>
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
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2">
                <p className="text-sm font-bold text-foreground">Desempenho por critério</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: "#16A34A" }} /><span className="text-[11px] text-muted-foreground">Excelente (≥ 9)</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: "#1D4ED8" }} /><span className="text-[11px] text-muted-foreground">Bom (7–8)</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: "#D97706" }} /><span className="text-[11px] text-muted-foreground">Atenção (&lt; 7)</span></div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData} margin={{ top: 16, right: 36, bottom: 16, left: 36 }}>
                  <PolarGrid stroke="#E2E8F0" />
                  <PolarAngleAxis
                    dataKey="name"
                    tick={({ payload, x, y, textAnchor, ...rest }) => (
                      <text
                        x={x} y={y}
                        textAnchor={textAnchor}
                        fontSize={10}
                        fontWeight={600}
                        fill="#0F1B2D"
                        {...rest}
                      >
                        {payload.value}
                      </text>
                    )}
                  />
                  <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                  <Radar
                    name="Desempenho"
                    dataKey="score"
                    stroke="#1D4ED8"
                    fill="#1D4ED8"
                    fillOpacity={0.12}
                    strokeWidth={2}
                    isAnimationActive={false}
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      const col = scoreColor(payload.score);
                      return (
                        <g>
                          <circle cx={cx} cy={cy} r={15} fill={col} fillOpacity={0.18} />
                          <circle cx={cx} cy={cy} r={11} fill={col} />
                          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight="bold" fill="white">
                            {payload.score}
                          </text>
                        </g>
                      );
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
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
              {[
                { crit: "Clareza",      nota: 9, obs: "Suas respostas foram diretas e fáceis de acompanhar. A mensagem chegou de forma organizada." },
                { crit: "Coerência",    nota: 9, obs: "Houve boa relação lógica entre as perguntas e os exemplos que você utilizou." },
                { crit: "Objetividade", nota: 8, obs: "Você soube responder sem desviar do tema principal. Ótima capacidade de síntese." },
              ].map(p => (
                <div key={p.crit} className="flex gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                  <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-foreground">{p.crit}</p>
                      <Badge variant="success">{p.nota}/10</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{p.obs}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Improvements */}
          <Card className="p-5 sm:p-6">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-500" /> Oportunidades de melhoria
            </h3>
            <div className="space-y-3">
              {[
                { crit: "Organização", nota: 7, obs: "Em algumas respostas o raciocínio perdeu o fio condutor. Use o método STAR como guia." },
                { crit: "Domínio",     nota: 7, obs: "Traga exemplos mais específicos e dados concretos para demonstrar sua experiência." },
                { crit: "Exemplos",    nota: 6, obs: "Inclua situações concretas, resultados e evidências para sustentar melhor suas respostas." },
              ].map(p => (
                <div key={p.crit} className="flex gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-foreground">{p.crit}</p>
                      <Badge variant="warning">{p.nota}/10</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{p.obs}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Recommendations */}
        <Card className="p-5 sm:p-6 mb-5">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-blue-600" /> Recomendações do avaliador
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { icon: BookOpen,      title: "Estude sobre a empresa",     desc: "Antes de uma entrevista real, pesquise a missão, valores e projetos recentes da organização." },
              { icon: MessageSquare, title: "Pratique por escrito",       desc: "Releia suas respostas para identificar pontos vagos, excesso de texto e exemplos que podem ficar mais concretos." },
              { icon: MessageSquare, title: "Aprofunde os exemplos",      desc: "Use números e resultados concretos: 'aumentei o engajamento em 30%' é mais forte que 'melhorei o engajamento'." },
              { icon: Target,        title: "Foque nos critérios mais baixos", desc: "Organização, domínio e exemplos são as maiores oportunidades. Use o método STAR." },
            ].map(r => (
              <div key={r.title} className="flex gap-3">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                  <r.icon className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground mb-1">{r.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{r.desc}</p>
                </div>
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
    </AuthLayout>
  );
}

// ─── Fase A: CAN-007 Histórico de Entrevistas ─────────────────────────────────

function InterviewHistoryScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const HISTORICO = [
    { id: "E003", vaga: "Desenvolvedor Full Stack Júnior", empresa: "Tech Labs",           data: "18/07/2026", perguntas: 5, status: "Concluída", nota: "7.7", badge: "success" as const },
    { id: "E002", vaga: "Analista de RH Pleno",            empresa: "Grupo Pessoas",       data: "10/07/2026", perguntas: 5, status: "Aguardando avaliação", nota: null, badge: "warning" as const },
    { id: "E001", vaga: "Assistente de Secretariado",      empresa: "Escritório Central",  data: "02/07/2026", perguntas: 5, status: "Concluída", nota: "7.2", badge: "default" as const },
  ];

  const [filtro, setFiltro] = useState("Todos");
  const filtered = HISTORICO.filter(h => {
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
                {f}
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
                  </div>
                  <p className="text-xs text-muted-foreground">{h.empresa} · {h.perguntas} perguntas · {h.data}</p>
                  {h.nota && (
                    <p className="text-xs font-semibold text-green-700 mt-1.5">Nota: {h.nota} / 10</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  {h.nota && (
                    <Btn variant="primary" size="sm" onClick={() => onNavigate("report")}>
                      Ver relatório
                    </Btn>
                  )}
                  {h.badge === "warning" && (
                    <Btn variant="outline" size="sm" onClick={() => onNavigate("pending")}>
                      Acompanhar
                    </Btn>
                  )}
                  <Btn variant="secondary" size="sm" onClick={() => onNavigate("interview-setup")}>
                    Praticar novamente
                  </Btn>
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
}: {
  onNavigate: (s: Screen) => void;
  draft: InterviewDraft;
  setDraft: Dispatch<SetStateAction<InterviewDraft>>;
}) {
  const [url, setUrl] = useState(draft.context?.sourceUrl ?? "");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">(draft.context ? "success" : "idle");
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(Boolean(draft.context));
  const [generating, setGenerating] = useState(false);

  const handleAnalyze = async () => {
    setStatus("loading");
    setError("");
    setConfirmed(false);
    try {
      const context = await analyzeJobUrl(url);
      setDraft((current) => ({ ...current, context, questions: [], answers: {} }));
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
      setDraft((current) => ({ ...current, questions, answers: {} }));
      onNavigate("prep");
    } finally {
      setGenerating(false);
    }
  };

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
            A integração Python/Flask ainda não está conectada. Nesta etapa, a análise abaixo é um mock explícito usando o contrato temporário do Front.
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
                <div>
                  <p className="text-[11px] text-muted-foreground mb-0.5">Descrição resumida</p>
                  <p className="text-sm text-foreground leading-relaxed">{draft.context.summary}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-2">Requisitos</p>
                  <div className="space-y-2">
                    {draft.context.requirements.map((requirement) => (
                      <div key={requirement} className="flex items-start gap-2 text-sm text-foreground">
                        <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                        <span>{requirement}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-0.5 rounded shrink-0" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
                <span className="text-sm text-foreground leading-relaxed">
                  Confirmo que este contexto será usado para configurar minha entrevista textual simulada. As 5 perguntas estão mockadas nesta etapa e serão substituídas pela chamada Python/Groq quando o contrato final for conectado.
                </span>
              </label>
            </Card>
          </>
        )}

        <div className="flex gap-3">
          <Btn variant="outline" onClick={() => onNavigate("dashboard")}>Cancelar</Btn>
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
                Para realizar a entrevista simulada, usaremos suas respostas textuais e o contexto da vaga para avaliação por um avaliador humano autorizado.
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
          <label className="flex items-start gap-4 cursor-pointer group">
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-all shrink-0 ${consentRequired ? "bg-primary border-primary" : "border-border group-hover:border-primary/50"}`} onClick={() => setConsentRequired(!consentRequired)}>
              {consentRequired && <Check className="w-3 h-3 text-white" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground mb-1">Autorizo o uso das respostas textuais <span className="text-red-500">*</span></p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Autorizo o RH Connect a registrar minhas respostas textuais, associadas ao contexto da vaga de {draft.context?.title ?? "interesse"}, para avaliação por avaliador humano autorizado. Entendo que esta autorização é necessária para usar a entrevista simulada.
              </p>
            </div>
          </label>
        </Card>

        {/* Consentimento opcional */}
        <Card className="p-5 sm:p-6">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Autorização opcional</p>
          <label className="flex items-start gap-4 cursor-pointer group">
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-all shrink-0 ${consentOptional ? "bg-primary border-primary" : "border-border group-hover:border-primary/50"}`} onClick={() => setConsentOptional(!consentOptional)}>
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
            onClick={() => onNavigate("interview")}
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

// ─── Fase A: ENT-008 Confirmação de Envio ─────────────────────────────────────

function InterviewConfirmScreen({ onNavigate, draft }: { onNavigate: (s: Screen) => void; draft: InterviewDraft }) {
  const [sending, setSending] = useState(false);
  const answeredCount = draft.questions.filter((question) => draft.answers[question.id]?.trim()).length;

  if (!draft.context || draft.questions.length === 0) {
    return <DraftWizardGuard current="interview-confirm" onNavigate={onNavigate} />;
  }

  const handleSend = () => {
    setSending(true);
    setTimeout(() => {
      setSending(false);
      onNavigate("interview-done");
    }, 1800);
  };

  return (
    <AuthLayout
      current="interview-confirm"
      onNavigate={onNavigate}
      title="Confirmar Envio"
      subtitle="Revise antes de enviar suas respostas para avaliação"
    >
      <div className="w-full max-w-2xl space-y-5">
        {/* Aviso */}
        <Alert variant="warning" className="flex items-start gap-3 rounded-2xl p-4">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800 mb-1">Atenção: esta ação não pode ser desfeita</p>
            <p className="text-xs text-amber-700 leading-relaxed">Após o envio, suas respostas serão encaminhadas para avaliação humana. Você não poderá editar as respostas.</p>
          </div>
        </Alert>

        {/* Resumo das respostas */}
        <Card className="p-5 sm:p-6">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" /> Respostas preenchidas
          </h3>
          <div className="space-y-3">
            {draft.questions.map((q, i) => (
              <div key={q.id} className="flex items-start gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground mb-0.5">Pergunta {i + 1}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{q.text}</p>
                  <p className="text-[11px] text-green-600 font-medium mt-1">Resposta textual pronta</p>
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

        <div className="flex gap-3">
          <Btn variant="outline" onClick={() => onNavigate("review")}>Revisar novamente</Btn>
          <Btn
            variant="primary"
            onClick={handleSend}
            disabled={sending}
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
            Suas respostas foram recebidas com sucesso e serão encaminhadas para avaliação por um avaliador humano autorizado.
          </p>

          {/* Protocolo */}
          <div className="bg-muted rounded-xl p-4 mb-6 text-left">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] text-muted-foreground">Protocolo</p>
                <p className="text-sm font-bold text-foreground">#ENT-2026-0418</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Vaga</p>
                <p className="text-sm font-semibold text-foreground">Desenvolvedor Full Stack Júnior</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Enviado em</p>
                <p className="text-sm font-semibold text-foreground">18/07/2026 às 14h32</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Status</p>
                <StatusBadge tone="warning">Aguardando avaliação</StatusBadge>
              </div>
            </div>
          </div>

          {/* Próximos passos */}
          <div className="text-left bg-blue-50 rounded-xl p-4 mb-6">
            <p className="text-xs font-bold text-blue-700 mb-3">O que acontece agora?</p>
            <div className="space-y-2">
              {[
                "Um avaliador humano autorizado assistirá às suas respostas",
                "Você receberá uma notificação quando o resultado estiver disponível",
                "Acesse o relatório na seção Histórico de entrevistas",
              ].map((step, i) => (
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
            <Btn variant="primary" onClick={() => onNavigate("dashboard")} className="flex-1">
              <Home className="w-4 h-4" /> Ir ao Dashboard
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
    <div className="min-h-[calc(100vh-44px)] bg-background flex items-center justify-center p-4 py-8">
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
    <div className="min-h-[calc(100vh-44px)] bg-background flex items-center justify-center p-4 py-8">
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
    <div className="min-h-[calc(100vh-44px)] bg-background flex items-center justify-center p-4 py-8">
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

function TermsScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
        <button onClick={() => onNavigate("landing")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          Voltar à página inicial
        </button>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">Termos de Uso</h1>
        <p className="text-sm text-muted-foreground mb-8">RH Connect · Versão 1.0 · Última atualização: julho de 2026</p>
        <div className="space-y-6 text-sm text-foreground leading-relaxed">
          {[
            { titulo: "1. Finalidade", texto: "O RH Connect é uma plataforma educacional de treinamento para entrevistas de emprego. O sistema não garante aprovação em processos seletivos reais e não substitui orientação profissional especializada." },
            { titulo: "2. Responsabilidades do usuário", texto: "O usuário deve fornecer informações verdadeiras, utilizar a plataforma de forma ética e respeitar as regras de conduta estabelecidas. É proibido compartilhar conteúdo impróprio, ofensivo ou que viole direitos de terceiros." },
            { titulo: "3. Respostas textuais e ditado", texto: "As entrevistas simuladas usam respostas textuais. Quando disponível, o microfone pode ser usado pontualmente pelo navegador para transcrever fala em texto, sem armazenamento de áudio pelo RH Connect nesta etapa." },
            { titulo: "4. Envio das respostas", texto: "As respostas enviadas são acessadas por avaliadores autorizados para fins de avaliação humana e geração do relatório de desempenho." },
            { titulo: "5. Limitações do serviço", texto: "O RH Connect é disponibilizado sem garantia de disponibilidade contínua. O sistema pode passar por manutenções programadas ou não programadas." },
            { titulo: "6. Propriedade intelectual", texto: "Todo o conteúdo da plataforma, incluindo perguntas, critérios de avaliação e materiais de apoio, pertence ao RH Connect e não pode ser reproduzido sem autorização." },
            { titulo: "7. Alteração dos termos", texto: "Estes termos podem ser atualizados a qualquer momento. Os usuários serão notificados sobre mudanças relevantes e poderão revisar os novos termos antes de continuar utilizando a plataforma." },
            { titulo: "8. Contato", texto: "Para dúvidas sobre estes termos, entre em contato pelo e-mail: contato@rhconnect.com.br" },
          ].map(s => (
            <section key={s.titulo}>
              <h2 className="font-bold text-base mb-2">{s.titulo}</h2>
              <p className="text-muted-foreground">{s.texto}</p>
            </section>
          ))}
        </div>
        <div className="mt-10 pt-6 border-t border-border flex flex-wrap gap-3">
          <Btn variant="primary" onClick={() => onNavigate("auth")}>Criar conta</Btn>
          <Btn variant="outline" onClick={() => onNavigate("privacy")}>Ver Política de Privacidade</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Fase C: LEG-002 Política de Privacidade ─────────────────────────────────

function PrivacyScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
        <button onClick={() => onNavigate("landing")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          Voltar à página inicial
        </button>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground mb-8">RH Connect · Versão 1.0 · Última atualização: julho de 2026</p>
        <div className="space-y-6 text-sm text-foreground leading-relaxed">
          {[
            { titulo: "1. Dados coletados", texto: "Coletamos nome, e-mail, dados profissionais fornecidos pelo usuário, contexto da vaga, respostas textuais das entrevistas simuladas e informações técnicas de uso da plataforma." },
            { titulo: "2. Finalidade do uso", texto: "Os dados são utilizados exclusivamente para personalizar as perguntas de entrevista, realizar a avaliação humana das respostas e gerar o relatório de desempenho do candidato." },
            { titulo: "3. Quem acessa", texto: "Apenas avaliadores humanos autorizados têm acesso às respostas das entrevistas. O acesso é registrado e auditado. Dados pessoais não são compartilhados com terceiros sem consentimento." },
            { titulo: "4. Armazenamento e retenção", texto: "Os dados são armazenados em servidores seguros. O prazo de retenção será definido pela equipe responsável e comunicado ao usuário. O usuário pode solicitar a exclusão a qualquer momento." },
            { titulo: "5. Consentimento para IA", texto: "A autorização para avaliação humana NÃO representa automaticamente autorização para uso dos dados no treinamento de Inteligência Artificial. Esse consentimento é separado, opcional e pode ser revogado." },
            { titulo: "6. Direitos do usuário", texto: "O usuário tem direito a acessar seus dados, corrigir informações, solicitar cópia, revogar consentimentos e solicitar exclusão da conta e dos dados associados." },
            { titulo: "7. Contato", texto: "Para exercer seus direitos ou tirar dúvidas sobre privacidade: privacidade@rhconnect.com.br" },
          ].map(s => (
            <section key={s.titulo}>
              <h2 className="font-bold text-base mb-2">{s.titulo}</h2>
              <p className="text-muted-foreground">{s.texto}</p>
            </section>
          ))}
        </div>
        <div className="mt-10 pt-6 border-t border-border flex flex-wrap gap-3">
          <Btn variant="primary" onClick={() => onNavigate("auth")}>Criar conta</Btn>
          <Btn variant="outline" onClick={() => onNavigate("terms")}>Ver Termos de Uso</Btn>
        </div>
      </div>
    </div>
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
  title, message, confirmLabel, danger = false, onConfirm, onCancel, children,
}: {
  title: string; message: string; confirmLabel: string;
  danger?: boolean; onConfirm: () => void; onCancel: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(15,27,45,0.6)" }}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${danger ? "bg-red-50" : "bg-amber-50"}`}>
          <AlertCircle className={`w-6 h-6 ${danger ? "text-red-500" : "text-amber-500"}`} />
        </div>
        <h3 className="font-bold text-foreground text-center mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground text-center mb-5 leading-relaxed">{message}</p>
        {children && <div className="mb-5">{children}</div>}
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted transition-colors">Cancelar</button>
          <button onClick={onConfirm} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${danger ? "bg-red-500 hover:bg-red-600" : "bg-primary hover:bg-blue-800"}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function SettingsScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [tab, setTab] = useState<SettingsTab>("conta");
  const [notifs, setNotifs] = useState({ resultado: true, novidades: false, dicas: true, email: true, sms: false });
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
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0">JL</div>
                <div>
                  <p className="font-semibold text-foreground text-sm">João Lima</p>
                  <p className="text-xs text-muted-foreground">joao.lima@gmail.com</p>
                </div>
              </div>
              <Field label="Nome completo" placeholder="João da Silva Lima" />
              <Field label="E-mail" type="email" placeholder="nome@gmail.com" hint="Você receberá um e-mail de verificação para confirmar a alteração." />
              <Field label="Telefone" placeholder="(61) 99999-9999" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Cidade" placeholder="Brasília" />
                <FieldSelect label="Estado" options={["DF","SP","RJ","MG","RS","BA","PR","SC","GO","CE","PE","AM"]} />
              </div>
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
                      <p className="text-xs text-muted-foreground">joao.lima@gmail.com</p>
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
                    { key: "email" as const, label: "E-mail", desc: "joao.lima@gmail.com" },
                    { key: "sms" as const,   label: "SMS",    desc: "(61) 99999-9999 — opcional" },
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
                  { titulo: "Dados do perfil", desc: "Nome, e-mail e telefone são usados para identificação na plataforma.", badge: "Necessário" },
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
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Autorização para registrar suas respostas textuais e disponibilizá-las para avaliação humana autorizada. Este consentimento é obrigatório para usar o sistema.</p>
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
                    "Seus dados cadastrais (nome, e-mail, telefone) serão removidos permanentemente.",
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

const MATERIAIS_DATA = [
  // Apresentação pessoal
  { id: 1,  titulo: "Como se apresentar em entrevistas",       categoria: "Apresentação pessoal",      tempo: "8 min",  tipo: "Leitura",  favorito: true,  recente: true,  recomendado: true,  desc: "Aprenda a estruturar uma apresentação pessoal clara, objetiva e impactante." },
  { id: 2,  titulo: "Elevator pitch para entrevistas",         categoria: "Apresentação pessoal",      tempo: "5 min",  tipo: "Vídeo",    favorito: false, recente: false, recomendado: true,  desc: "Como resumir seu perfil profissional em 60 segundos de forma convincente." },
  { id: 3,  titulo: "Comunicação verbal e não verbal",          categoria: "Comunicação",               tempo: "12 min", tipo: "Leitura",  favorito: true,  recente: false, recomendado: false, desc: "Entenda como sua postura, tom de voz e gestos impactam a percepção do avaliador." },
  { id: 4,  titulo: "Como articular ideias com clareza",       categoria: "Comunicação",               tempo: "6 min",  tipo: "Leitura",  favorito: false, recente: true,  recomendado: false, desc: "Técnicas para organizar e transmitir suas ideias de forma coerente e direta." },
  { id: 5,  titulo: "Postura e linguagem corporal",            categoria: "Postura",                   tempo: "7 min",  tipo: "Vídeo",    favorito: false, recente: false, recomendado: true,  desc: "Dicas práticas para transmitir confiança e profissionalismo pela linguagem corporal." },
  { id: 6,  titulo: "O método STAR explicado",                 categoria: "Método STAR",               tempo: "10 min", tipo: "Leitura",  favorito: true,  recente: true,  recomendado: true,  desc: "Aprenda a usar o método STAR (Situação, Tarefa, Ação, Resultado) para responder perguntas comportamentais." },
  { id: 7,  titulo: "STAR na prática: exemplos reais",         categoria: "Método STAR",               tempo: "15 min", tipo: "Exercício",favorito: false, recente: false, recomendado: false, desc: "Exercícios práticos para aplicar o método STAR com exemplos de diferentes áreas." },
  { id: 8,  titulo: "Perguntas comportamentais mais comuns",   categoria: "Perguntas comportamentais", tempo: "9 min",  tipo: "Leitura",  favorito: false, recente: true,  recomendado: true,  desc: "Lista das perguntas comportamentais mais frequentes e como abordá-las com segurança." },
  { id: 9,  titulo: "Como responder 'fale sobre você'",        categoria: "Perguntas comportamentais", tempo: "6 min",  tipo: "Leitura",  favorito: true,  recente: false, recomendado: false, desc: "Uma das perguntas mais temidas em entrevistas. Veja como estruturar uma resposta poderosa." },
  { id: 10, titulo: "Primeiro emprego: como se preparar",      categoria: "Primeiro emprego",          tempo: "11 min", tipo: "Leitura",  favorito: false, recente: false, recomendado: true,  desc: "Guia completo para quem está buscando a primeira experiência profissional." },
  { id: 11, titulo: "Jovem Aprendiz: direitos e oportunidades",categoria: "Jovem Aprendiz",            tempo: "8 min",  tipo: "Leitura",  favorito: false, recente: false, recomendado: false, desc: "Entenda o programa Jovem Aprendiz e como se destacar no processo seletivo." },
  { id: 12, titulo: "Como conquistar uma vaga de estágio",     categoria: "Estágio",                   tempo: "9 min",  tipo: "Leitura",  favorito: false, recente: true,  recomendado: false, desc: "Dicas específicas para candidatos que buscam oportunidades de estágio." },
  { id: 13, titulo: "Recolocação profissional: por onde começar",categoria: "Recolocação profissional",tempo: "14 min", tipo: "Leitura",  favorito: false, recente: false, recomendado: false, desc: "Estratégias para quem está em transição de carreira ou voltando ao mercado." },
  { id: 14, titulo: "Perguntas técnicas: como se preparar",    categoria: "Perguntas técnicas",        tempo: "10 min", tipo: "Leitura",  favorito: false, recente: false, recomendado: false, desc: "Como estudar e responder perguntas técnicas específicas da sua área de atuação." },
];

const CATEGORIAS_MATERIAIS = [
  "Todas as categorias",
  "Apresentação pessoal",
  "Comunicação",
  "Postura",
  "Perguntas comportamentais",
  "Perguntas técnicas",
  "Método STAR",
  "Primeiro emprego",
  "Estágio",
  "Jovem Aprendiz",
  "Recolocação profissional",
];

function MaterialCard({
  material, onFavorite,
}: {
  material: typeof MATERIAIS_DATA[0];
  onFavorite: () => void;
}) {
  const TIPO_COLOR: Record<string, string> = {
    "Leitura":   "bg-blue-50 text-blue-700",
    "Vídeo":     "bg-red-50 text-red-700",
    "Exercício": "bg-green-50 text-green-700",
  };
  return (
    <Card className="p-4 sm:p-5 flex flex-col gap-3 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <UIBadge variant="neutral" className={`px-2 py-0.5 text-[11px] font-bold ${TIPO_COLOR[material.tipo] ?? "bg-muted text-muted-foreground"}`}>{material.tipo}</UIBadge>
            <span className="text-[11px] text-muted-foreground">{material.tempo}</span>
          </div>
          <p className="font-bold text-foreground text-sm leading-snug mb-1">{material.titulo}</p>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{material.desc}</p>
        </div>
        <button onClick={onFavorite} className={`p-1.5 rounded-lg transition-colors shrink-0 ${material.favorito ? "text-amber-500 hover:text-amber-600" : "text-muted-foreground hover:text-amber-400"}`}>
          <Bookmark className={`w-4 h-4 ${material.favorito ? "fill-current" : ""}`} />
        </button>
      </div>
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
        <UIBadge variant="primary">{material.categoria}</UIBadge>
        <Btn variant="primary" size="sm" onClick={() => toast.info("Abrindo material...")}>Abrir material</Btn>
      </div>
    </Card>
  );
}

function MaterialsScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("Todas as categorias");
  const [abaFiltro, setAbaFiltro] = useState<"todos" | "favoritos" | "recentes" | "recomendados">("todos");
  const [materiais, setMateriais] = useState(MATERIAIS_DATA);
  const [showCats, setShowCats] = useState(false);

  const toggleFavorito = (id: number) => {
    setMateriais(m => m.map(item => item.id === id ? { ...item, favorito: !item.favorito } : item));
  };

  const filtrado = materiais.filter(m => {
    const matchBusca = busca === "" || m.titulo.toLowerCase().includes(busca.toLowerCase()) || m.desc.toLowerCase().includes(busca.toLowerCase());
    const matchCat = categoria === "Todas as categorias" || m.categoria === categoria;
    const matchAba = abaFiltro === "todos" ? true : abaFiltro === "favoritos" ? m.favorito : abaFiltro === "recentes" ? m.recente : m.recomendado;
    return matchBusca && matchCat && matchAba;
  });

  const recomendados = materiais.filter(m => m.recomendado).slice(0, 3);
  const recentes = materiais.filter(m => m.recente).slice(0, 3);

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
                <MaterialCard key={m.id} material={m} onFavorite={() => toggleFavorito(m.id)} />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {recentes.map(m => (
                <MaterialCard key={m.id} material={m} onFavorite={() => toggleFavorito(m.id)} />
              ))}
            </div>
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
                {id === "favoritos" && ` (${materiais.filter(m => m.favorito).length})`}
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
                  {CATEGORIAS_MATERIAIS.map(cat => (
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
          {filtrado.length === 0 ? (
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
              {filtrado.map(m => (
                <MaterialCard key={m.id} material={m} onFavorite={() => toggleFavorito(m.id)} />
              ))}
            </div>
          )}
        </section>
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


// ─── App (root) ───────────────────────────────────────────────────────────────

function getCurrentScreen(pathname: string): Screen {
  const route = APP_ROUTES.find((item) => matchPath({ path: item.path, end: true }, pathname));
  return route?.screen ?? "landing";
}

function AppRoutes() {
  const routerNavigate = useNavigate();
  const location = useLocation();
  const [interviewDraft, setInterviewDraft] = useState(createEmptyInterviewDraft);
  const currentScreen = getCurrentScreen(location.pathname);
  const navigate = (screen: Screen) => routerNavigate(getPathForScreen(screen));
  const navigateFromFlowNav = (screen: Screen) => {
    if (["prep", "consent", "interview", "review", "interview-confirm"].includes(screen)) {
      setInterviewDraft(createDemoInterviewDraft());
    }
    navigate(screen);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Toaster position="top-center" richColors />
      <FlowNav current={currentScreen} onNavigate={navigateFromFlowNav} />
      <div className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<LandingScreen onNavigate={navigate} />} />
          <Route path="/login" element={<AuthScreen onNavigate={navigate} initialTab="login" />} />
          <Route path="/register" element={<AuthScreen onNavigate={navigate} initialTab="register" />} />
          <Route path="/terms" element={<TermsScreen onNavigate={navigate} />} />
          <Route path="/privacy" element={<PrivacyScreen onNavigate={navigate} />} />
          <Route path="/verify-email" element={<EmailVerifyScreen onNavigate={navigate} />} />
          <Route path="/forgot-password" element={<ForgotPasswordScreen onNavigate={navigate} />} />
          <Route path="/reset-password" element={<ResetPasswordScreen onNavigate={navigate} />} />

          <Route path="/candidate/onboarding" element={<CandidateOnboardingScreen onNavigate={navigate} />} />
          <Route path="/candidate/dashboard" element={<DashboardScreen onNavigate={navigate} />} />
          <Route path="/candidate/profile" element={<ProfileScreen onNavigate={navigate} />} />
          <Route path="/candidate/settings" element={<SettingsScreen onNavigate={navigate} />} />
          <Route path="/candidate/materials" element={<MaterialsScreen onNavigate={navigate} />} />
          <Route path="/candidate/notifications" element={<NotificationsScreen onNavigate={navigate} />} />
          <Route path="/candidate/interviews" element={<InterviewHistoryScreen onNavigate={navigate} />} />
          <Route path="/candidate/development" element={<DevelopmentScreen onNavigate={navigate} />} />
          <Route path="/candidate/interviews/new" element={<InterviewSetupScreen onNavigate={navigate} draft={interviewDraft} setDraft={setInterviewDraft} />} />
          <Route path="/candidate/interviews/new/consent" element={<ConsentScreen onNavigate={navigate} draft={interviewDraft} />} />
          <Route path="/candidate/interviews/new/preparation" element={<PrepScreen onNavigate={navigate} draft={interviewDraft} />} />
          <Route path="/candidate/interviews/new/answers" element={<InterviewScreen onNavigate={navigate} draft={interviewDraft} setDraft={setInterviewDraft} />} />
          <Route path="/candidate/interviews/new/review" element={<ReviewScreen onNavigate={navigate} draft={interviewDraft} />} />
          <Route path="/candidate/interviews/new/submit" element={<InterviewConfirmScreen onNavigate={navigate} draft={interviewDraft} />} />
          <Route path="/candidate/interviews/:id/success" element={<InterviewDoneScreen onNavigate={navigate} />} />
          <Route path="/candidate/interviews/:id/status" element={<PendingScreen onNavigate={navigate} />} />
          <Route path="/candidate/reports/:id" element={<ReportScreen onNavigate={navigate} />} />

          <Route path="/evaluator/activate" element={<EvalActivateScreen onNavigate={navigate} />} />
          <Route path="/evaluator/onboarding" element={<EvalOnboardingScreen onNavigate={navigate} />} />
          <Route path="/evaluator/dashboard" element={<EvalDashboardScreen onNavigate={navigate} />} />
          <Route path="/evaluator/evaluations" element={<EvalQueueScreen onNavigate={navigate} />} />
          <Route path="/evaluator/evaluations/active" element={<EvalActiveScreen onNavigate={navigate} />} />
          <Route path="/evaluator/evaluations/:id" element={<EvalScreenView onNavigate={navigate} />} />
          <Route path="/evaluator/evaluations/:id/review" element={<EvalReviewScreen onNavigate={navigate} />} />
          <Route path="/evaluator/evaluations/:id/success" element={<EvalDoneScreen onNavigate={navigate} />} />
          <Route path="/evaluator/history" element={<EvalHistoryScreen onNavigate={navigate} />} />
          <Route path="/evaluator/criteria" element={<EvalCriteriaScreen onNavigate={navigate} />} />
          <Route path="/evaluator/settings" element={<EvalSettingsScreen onNavigate={navigate} />} />

          <Route path="/admin/onboarding" element={<AdminOnboardingScreen onNavigate={navigate} />} />
          <Route path="/admin/dashboard" element={<AdminDashboardScreen onNavigate={navigate} />} />
          <Route path="/admin/candidates" element={<AdminCandidatesScreen onNavigate={navigate} />} />
          <Route path="/admin/candidates/:id" element={<AdminCandidateDetailScreen onNavigate={navigate} />} />
          <Route path="/admin/evaluators" element={<AdminEvaluatorsScreen onNavigate={navigate} />} />
          <Route path="/admin/evaluators/new" element={<AdminEvaluatorFormScreen onNavigate={navigate} />} />
          <Route path="/admin/interviews" element={<AdminInterviewsScreen onNavigate={navigate} />} />
          <Route path="/admin/assignments" element={<AdminAssignScreen onNavigate={navigate} />} />
          <Route path="/admin/questions" element={<AdminQuestionsScreen onNavigate={navigate} />} />
          <Route path="/admin/questions/new" element={<AdminQuestionFormScreen onNavigate={navigate} />} />
          <Route path="/admin/roles" element={<AdminRolesScreen onNavigate={navigate} />} />
          <Route path="/admin/criteria" element={<AdminCriteriaScreen onNavigate={navigate} />} />
          <Route path="/admin/consents" element={<AdminConsentScreen onNavigate={navigate} />} />
          <Route path="/admin/audit" element={<AdminAuditScreen onNavigate={navigate} />} />
          <Route path="/admin/settings" element={<AdminSettingsScreen onNavigate={navigate} />} />

          <Route path="/candidate" element={<Navigate to="/candidate/dashboard" replace />} />
          <Route path="/evaluator" element={<Navigate to="/evaluator/dashboard" replace />} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
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
