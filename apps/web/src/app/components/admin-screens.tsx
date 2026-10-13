/** RH Connect — Telas do Administrador */

import { useState, useEffect, useContext, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import type { InterviewStatus } from "../domain/interviews";
import type { MockAccountStatus } from "../services/auth-service";
import { buildAdminProfileView } from "../domain/admin-profile-view";
import {
  ASSIGNED_COUNT_HINT,
  ASSIGNED_COUNT_LABEL,
  EVALUATORS_EMPTY,
  EVALUATOR_ACTIVE_LABEL,
  evaluatorAreaLine,
  evaluatorInitials,
  evaluatorsSubtitle,
  presentableEvaluators,
} from "../domain/admin-evaluators-view";
import { TransientNotice } from "../domain/transient-notice";
import { useCandidateLiveResource } from "../hooks/use-candidate-live-resource";
import {
  ADMIN_CANDIDATES_SYNC_INTERVAL_MS,
  ADMIN_CANDIDATES_SYNC_MAX_BACKOFF_MS,
  ADMIN_DASHBOARD_SYNC_INTERVAL_MS,
  ADMIN_DASHBOARD_SYNC_MAX_BACKOFF_MS,
  ADMIN_EVALUATORS_SYNC_INTERVAL_MS,
  ADMIN_EVALUATORS_SYNC_MAX_BACKOFF_MS,
  ADMIN_QUEUE_SYNC_INTERVAL_MS,
  ADMIN_QUEUE_SYNC_MAX_BACKOFF_MS,
  combineQueueResults,
  resolveSelection,
  type AdminQueueData,
} from "../domain/admin-live-sync";
import {
  buildChartData,
  describeActivity,
  formatDashboardScore,
  scoreSupportText,
  toDashboardSnapshot,
  type AdminDashboardSnapshot,
  type DashboardActivityIcon,
} from "../domain/admin-dashboard-view";
import type { ProfessionalProfile } from "../domain/professional-profile";
import { getAdminDashboard } from "../services/admin-dashboard-service";
import {
  getAdminCandidate,
  getAdminCandidateProfile,
  listAdminCandidates,
  type AdminCandidate,
  type AdminCandidatesList,
} from "../services/admin-candidates-service";
import {
  assignInterviewToEvaluator,
  listAdminEvaluators,
  listPendingAssignmentInterviews,
  type AdminEvaluator,
  type AdminQueueInterview,
} from "../services/admin-interviews-service";
import {
  getAdminVisibleInterviews,
  getAssignmentByInterviewId,
  getAverageScore,
  getEvaluationByInterviewId,
  formatScore,
  getInterviewById,
  statusLabelFromInterview,
} from "../services/interviews-service";
import {
  ADMIN_ACCOUNT, ADMIN_NOTIFS, resolveAccountConfig,
} from "./header-popovers";
import { ProfileShell, type ProfileShellNavItem } from "./shared/profile-shell";
import { SessionContext } from "../session-context";
import {
  Home, Users, Settings, ChevronRight,
  Bell, CheckCircle, AlertCircle, FileText, Shield,
  Plus, Eye, Edit2, Trash2, X, Check, Filter,
  TrendingUp, Award, Clock, Star, BarChart2, Download,
  MessageSquare, Briefcase, Link2, Lock, Database, ToggleLeft,
  ToggleRight, History, UserCheck, RefreshCw, Send, ArrowRight,
} from "lucide-react";
import { RHConnectLogo } from "./brand/rh-connect-logo";
import { SwitchVisual } from "./ui/switch";
import { Input } from "./ui/input";
import { SearchInput } from "./ui/search-input";
import { NativeSelect } from "./ui/native-select";
import { Button as UIButton } from "./ui/button";
import { Card as UICard } from "./ui/card";
import { Badge as UIBadge } from "./ui/badge";
import { Alert } from "./ui/alert";
import { FilterChip } from "./ui/filter-chip";
import { EmptyState } from "./ui/empty-state";
import { Spinner } from "./ui/spinner";
import {
  PROFESSIONAL_AREAS,
  PROFESSIONAL_AREA_OPTIONS,
  type ProfessionalAreaId,
  getProfessionalSubareasByArea,
} from "../domain/professional-catalog";
import niloOnboarding from "../../assets/nilo/nilo-onboarding.webp";

type NavFn = (s: string) => void;

// ─── Local UI Helpers ─────────────────────────────────────────────────────────

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

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <UICard padding="none" className={className}>{children}</UICard>;
}

function StatCard({ value, label, icon: Icon, color, hint }: {
  value: string | number; label: string; icon: React.ElementType; color: string; hint?: string | null;
}) {
  return (
    <Card className="p-3 sm:p-5 flex items-center gap-2 sm:gap-4">
      <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-4 h-4 sm:w-6 sm:h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-lg sm:text-2xl font-bold text-foreground leading-tight">{value}</p>
        <p className="text-[11px] sm:text-xs text-muted-foreground font-medium mt-0.5 leading-snug line-clamp-2">{label}</p>
        {hint ? <p className="text-[10px] sm:text-[11px] text-muted-foreground/80 mt-0.5 leading-snug">{hint}</p> : null}
      </div>
    </Card>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const ADMIN_NAV: ProfileShellNavItem[] = [
  { icon: Home,        label: "Dashboard",       screen: "admin-dashboard" },
  { icon: Users,       label: "Candidatos",      screen: "admin-candidates" },
  { icon: UserCheck,   label: "Avaliadores",      screen: "admin-evaluators" },
  { icon: MessageSquare, label: "Entrevistas",      screen: "admin-interviews" },
  { icon: Link2,       label: "Atribuições",      screen: "admin-assign" },
  { icon: Briefcase,   label: "Cargos e Áreas",  screen: "admin-roles" },
  { icon: Shield,      label: "Consentimentos",   screen: "admin-consent" },
  { icon: FileText,    label: "Auditoria",        screen: "admin-audit" },
  { icon: Settings,    label: "Configurações",    screen: "admin-settings" },
];

function AdminLayout({ current, onNavigate, title, subtitle, actions, children }: {
  current: string; onNavigate: NavFn;
  title: string; subtitle?: string; actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  // Antes desta correção (Prompt 08), o cabeçalho/AccountDropdown do Admin
  // sempre exibia o nome/e-mail de demonstração (`ADMIN_ACCOUNT`,
  // "Ana Martins"), mesmo com um admin real autenticado — porque este
  // componente não tinha acesso à sessão. Mesmo padrão já usado por
  // `AuthLayout` (Candidato) em App.tsx. Os DADOS de negócio exibidos nas
  // telas Admin (candidatos, avaliadores, entrevistas mock etc.) continuam
  // mock — só a identidade do usuário autenticado no cabeçalho muda aqui.
  const activeSession = useContext(SessionContext);
  const resolvedAccount =
    activeSession.authenticated && activeSession.user?.role === "ADMIN"
      ? resolveAccountConfig(ADMIN_ACCOUNT, activeSession.user)
      : ADMIN_ACCOUNT;

  return (
    <ProfileShell
      current={current}
      navItems={ADMIN_NAV}
      profileLabel="Administrador"
      account={resolvedAccount}
      notifications={ADMIN_NOTIFS}
      title={title}
      subtitle={subtitle}
      actions={actions}
      onNavigate={onNavigate}
    >
      {children}
    </ProfileShell>
  );
}

// ─── Shared mock data ─────────────────────────────────────────────────────────

type AdminCandidateRow = {
  id: string;
  displayId: string;
  name: string;
  email: string;
  accountStatus: MockAccountStatus;
  onboardingLabel: string;
  createdAt?: string;
  onboardingCompletedAt?: string;
  professionalTitle?: string;
};

type AdminInterviewRow = {
  id: string;
  candidateId?: string;
  candidate: string;
  job: string;
  date: string;
  status: string;
  statusCode?: InterviewStatus;
  evaluator: string;
  score: number | null;
  realId?: string;
};

function formatAdminInterviewDateTime(timestamp?: string) {
  if (!timestamp) return "—";
  const date = new Date(timestamp);
  return `${date.toLocaleDateString("pt-BR")} às ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

function formatAdminDate(timestamp?: string) {
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleDateString("pt-BR");
}

function createAdminInterviewDisplayId(index: number) {
  const safeIndex = Math.max(0, index);
  return `#E-${String(42 + safeIndex).padStart(4, "0")}`;
}

// Candidatos do Admin vêm exclusivamente da API (contas reais com role
// CANDIDATE em `app_user`). Não há fallback fictício: sem dados, as telas
// mostram carregando, erro ou o estado vazio real.
function toAdminCandidateRow(candidate: AdminCandidate): AdminCandidateRow {
  return {
    id: candidate.id,
    displayId: `#C-${candidate.id.padStart(3, "0")}`,
    name: candidate.name,
    email: candidate.email,
    accountStatus: candidate.accountStatus,
    onboardingLabel: candidate.onboardingCompleted ? "Concluído" : "Pendente",
    createdAt: candidate.createdAt,
    onboardingCompletedAt: candidate.onboardingCompletedAt ?? undefined,
    professionalTitle: candidate.profile?.professionalTitle?.trim() || undefined,
  };
}

type AdminRemoteState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "not_found" }
  | { status: "success"; data: T };

// `sync: true` (Fase 4.2) liga o refresh silencioso (30 s, pausa hidden/offline, retoma em
// focus/visible/online) SÓ na tela de lista. O Dashboard usa o hook sem `sync`: carrega uma vez.
const CANDIDATES_SYNC = {
  intervalMs: ADMIN_CANDIDATES_SYNC_INTERVAL_MS,
  maxBackoffMs: ADMIN_CANDIDATES_SYNC_MAX_BACKOFF_MS,
};

function useAdminCandidatesList(options: { sync?: boolean } = {}) {
  const live = useCandidateLiveResource<AdminCandidatesList>({
    resourceKey: "admin-candidates",
    fetch: listAdminCandidates,
    sync: options.sync ? CANDIDATES_SYNC : undefined,
  });
  const liveState = live.state;
  const state: AdminRemoteState<AdminCandidatesList> =
    liveState.status === "ready"
      ? { status: "success", data: liveState.value }
      : liveState.status === "error"
        ? { status: "error", message: liveState.message }
        : { status: "loading" };

  return { state, reload: live.reload };
}

function useAdminCandidateDetail(candidateId: string | undefined) {
  const [state, setState] = useState<AdminRemoteState<AdminCandidate>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    if (!candidateId) {
      setState({ status: "not_found" });
      return;
    }

    setState({ status: "loading" });

    getAdminCandidate(candidateId).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setState({ status: "success", data: result.data });
      } else if (result.reason === "not_found") {
        setState({ status: "not_found" });
      } else {
        setState({ status: "error", message: result.message });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [candidateId, attempt]);

  return { state, reload: () => setAttempt((value) => value + 1) };
}

// Perfil Profissional REAL (somente leitura) vindo de
// `GET /admin/candidates/:id/profile`. Sem fallback: carregando, erro ou dado real.
function useAdminCandidateProfile(candidateId: string | undefined) {
  const [state, setState] = useState<AdminRemoteState<ProfessionalProfile>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    if (!candidateId) {
      setState({ status: "not_found" });
      return;
    }

    setState({ status: "loading" });

    getAdminCandidateProfile(candidateId).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setState({ status: "success", data: result.data });
      } else if (result.reason === "not_found") {
        setState({ status: "not_found" });
      } else {
        setState({ status: "error", message: result.message });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [candidateId, attempt]);

  return { state, reload: () => setAttempt((value) => value + 1) };
}

function AdminLoadingCard({ label }: { label: string }) {
  return (
    <Card className="p-10 flex items-center justify-center gap-3 text-sm text-muted-foreground">
      <span role="status" aria-live="polite" className="flex items-center gap-3">
        <Spinner size="md" />
        {label}
      </span>
    </Card>
  );
}

function statusVariantFromAdminStatus(status: string): "default" | "success" | "warning" | "error" | "info" | "purple" {
  if (status === "Aguardando" || status.startsWith("Aguardando avaliação")) return "warning";
  if (status === "Em avaliação" || status === "Atribuída") return "info";
  if (status === "Concluído" || status === "Avaliada") return "success";
  return "default";
}

function createAdminInterviewRows(): AdminInterviewRow[] {
  const realRows = getAdminVisibleInterviews().map((interview, index) => {
    const assignment = getAssignmentByInterviewId(interview.id);
    const evaluation = getEvaluationByInterviewId(interview.id);
    return {
      id: createAdminInterviewDisplayId(index),
      candidateId: interview.candidateId,
      candidate: interview.candidateName,
      job: interview.context.title,
      date: formatAdminInterviewDateTime(interview.submittedAt ?? interview.createdAt),
      status: statusLabelFromInterview(interview.status),
      statusCode: interview.status,
      evaluator: assignment?.evaluatorName ?? "—",
      score: getAverageScore(evaluation?.scores),
      realId: interview.id,
    };
  });

  return realRows;
}

// ─── Screen: Dashboard Administrativo ────────────────────────────────────────

// ─── Gráfico Interativo de Entrevistas por Mês ───────────────────────────────

type DashboardChartPeriod = "6m" | "12m";

/** Gráfico de entrevistas por mês: dados vêm de `interviewsByMonth` do endpoint (`null` = carregando). */
function InterviewsChartCard({ interviewsByMonth }: { interviewsByMonth: AdminDashboardSnapshot["interviewsByMonth"] | null }) {
  const [period, setPeriod] = useState<DashboardChartPeriod>("6m");
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const hasData = interviewsByMonth !== null;

  useEffect(() => {
    setMounted(false);
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, [period, hasData]);

  const data = interviewsByMonth ? buildChartData(interviewsByMonth, period) : [];
  const maxV = Math.max(...data.map(d => d.v), 1);

  const toggle = (key: string) => setSelected(s => s === key ? null : key);

  return (
    <Card className="lg:col-span-2 p-5 sm:p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-blue-500" />
          Entrevistas por Mês
        </h3>
        <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
          {(["6m", "12m"] as const).map(p => (
            <button
              key={p}
              onClick={() => { setPeriod(p); setSelected(null); }}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                period === p ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p === "6m" ? "6 meses" : "12 meses"}
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div className="h-40 rounded-xl bg-muted/60 animate-pulse" role="status" aria-label="Carregando gráfico" />
      ) : (
      <div className="flex items-end gap-1.5 sm:gap-2 h-40" style={{ overflow: "visible" }}>
        {data.map((d, i) => {
          const isHov = hovered === d.key;
          const isSel = selected === d.key;
          const barH = mounted ? Math.max((d.v / maxV) * 128, 4) : 0;
          return (
            <div
              key={d.key}
              className="flex-1 flex flex-col items-center gap-1.5 relative cursor-pointer select-none outline-none"
              onMouseEnter={() => setHovered(d.key)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => toggle(d.key)}
              onTouchStart={() => setHovered(d.key)}
              onTouchEnd={() => { toggle(d.key); setHovered(null); }}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === "Enter" && toggle(d.key)}
              aria-label={`${d.full}: ${d.v} ${d.v === 1 ? "entrevista" : "entrevistas"}${isSel ? ", selecionado" : ""}`}
              aria-pressed={isSel}
            >
              {isHov && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                  <div className="bg-gray-900 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap leading-none">
                    {d.full} — {d.v} {d.v === 1 ? "entrevista" : "entrevistas"}
                  </div>
                  <div className="w-0 h-0 mx-auto" style={{
                    borderLeft: "5px solid transparent",
                    borderRight: "5px solid transparent",
                    borderTop: "5px solid #111827",
                  }} />
                </div>
              )}

              <span className={`text-[11px] font-bold leading-none transition-colors ${
                isSel ? "text-blue-600" : isHov ? "text-foreground" : "text-muted-foreground"
              }`}>{d.v}</span>

              <div
                className={`w-full rounded-t-md transition-colors ${
                  isSel ? "bg-blue-600" : isHov ? "bg-blue-500" : "bg-primary/80"
                }`}
                style={{
                  height: `${barH}px`,
                  boxShadow: isSel ? "0 0 0 2px white, 0 0 0 4px #93c5fd" : undefined,
                  transition: `height 0.45s cubic-bezier(0.4,0,0.2,1) ${i * 35}ms, background-color 0.15s, box-shadow 0.15s`,
                }}
              />

              <span className={`text-[11px] leading-none transition-colors ${
                isSel ? "text-blue-600 font-semibold" : isHov ? "text-foreground" : "text-muted-foreground"
              }`}>{d.m}</span>
            </div>
          );
        })}
      </div>
      )}

      {selected && (
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            Filtrando por <span className="font-semibold text-blue-600">{data.find(d => d.key === selected)?.full}</span>
          </p>
          <button
            onClick={() => setSelected(null)}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors underline"
          >
            Limpar seleção
          </button>
        </div>
      )}
    </Card>
  );
}

// ─── Dashboard Admin REAL (Fase 4.3B) ─────────────────────────────────────────

// Números agregados vêm de UM endpoint (`GET /admin/dashboard`). Sync leve de 30 s pelo motor
// compartilhado (pausa hidden/offline, retoma em focus/visible/online, 401/403 encerram).
const DASHBOARD_SYNC = {
  intervalMs: ADMIN_DASHBOARD_SYNC_INTERVAL_MS,
  maxBackoffMs: ADMIN_DASHBOARD_SYNC_MAX_BACKOFF_MS,
};

// `generatedAt` muda a cada resposta; o snapshot o descarta para o refresh só re-renderizar
// quando algum número realmente mudou.
async function fetchAdminDashboardSnapshot() {
  const result = await getAdminDashboard();
  return result.ok ? { ok: true as const, data: toDashboardSnapshot(result.data) } : result;
}

function useAdminDashboard() {
  return useCandidateLiveResource<AdminDashboardSnapshot>({
    resourceKey: "admin-dashboard",
    fetch: fetchAdminDashboardSnapshot,
    sync: DASHBOARD_SYNC,
  });
}

const ACTIVITY_ICONS: Record<DashboardActivityIcon, React.ElementType> = {
  candidate: Users,
  interview: FileText,
  assigned: UserCheck,
  evaluation: CheckCircle,
};

export function AdminDashboardScreen({ onNavigate }: { onNavigate: NavFn }) {
  const { state, reload } = useAdminDashboard();
  const dashboard = state.status === "ready" ? state.value : null;
  const summary = dashboard?.summary ?? null;
  const activity = dashboard ? dashboard.recentActivity.map(describeActivity) : [];

  const quickActions = [
    { label: "Atribuir entrevistas",          screen: "admin-assign", count: summary ? summary.pendingAssignmentCount : null },
    { label: "Gerenciar candidatos",          screen: "admin-candidates", count: summary ? summary.candidateCount : null },
    { label: "Gerenciar avaliadores",         screen: "admin-evaluators", count: summary ? summary.activeEvaluatorCount : null },
  ];

  return (
    <AdminLayout current="admin-dashboard" onNavigate={onNavigate} title="Dashboard Administrativo" subtitle="Visão geral do sistema RH Connect · SENAC-DF">
      <div className="w-full space-y-5">
        {state.status === "error" ? (
          <EmptyState
            icon={AlertCircle}
            title="Não foi possível carregar o dashboard"
            description={state.message}
            action={<Btn variant="outline" onClick={reload}>Tentar novamente</Btn>}
          />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard value={summary ? summary.candidateCount : "—"} label="Candidatos cadastrados" icon={Users} color="bg-blue-50 text-blue-600" />
              <StatCard value={summary ? summary.activeEvaluatorCount : "—"} label="Avaliadores ativos" icon={UserCheck} color="bg-teal-50 text-teal-600" />
              <StatCard value={summary ? summary.pendingAssignmentCount : "—"} label="Aguardando atribuição" icon={Clock} color="bg-amber-50 text-amber-600" />
              <StatCard
                value={summary ? formatDashboardScore(summary.averageScore) : "—"}
                label="Pontuação média"
                hint={summary ? (scoreSupportText(summary.averageScoreSample) ?? "Avaliações humanas concluídas") : "Avaliações humanas concluídas"}
                icon={Star}
                color="bg-green-50 text-green-600"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <InterviewsChartCard interviewsByMonth={dashboard ? dashboard.interviewsByMonth : null} />

              <Card className="p-5 sm:p-6">
                <h3 className="font-bold text-foreground mb-4">Ações Rápidas</h3>
                <div className="space-y-2">
                  {quickActions.map(a => (
                    <button key={a.label} onClick={() => onNavigate(a.screen)}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted transition-colors text-left">
                      <span className="text-sm font-medium text-foreground">{a.label}</span>
                      <div className="flex items-center gap-2">
                        {a.count !== null && <Badge variant="info">{a.count}</Badge>}
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              </Card>
            </div>

            <Card className="p-5 sm:p-6">
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2"><History className="w-4 h-4" /> Atividade Recente</h3>
              {!dashboard ? (
                <div className="space-y-3" role="status" aria-label="Carregando atividade recente">
                  {[0, 1, 2].map(i => <div key={i} className="h-9 rounded-lg bg-muted/60 animate-pulse" />)}
                </div>
              ) : activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma atividade recente.</p>
              ) : (
                <div className="space-y-3">
                  {activity.map(a => {
                    const Icon = ACTIVITY_ICONS[a.icon];
                    return (
                      <div key={a.id} className="flex items-start gap-3">
                        <span className="text-xs text-muted-foreground w-20 shrink-0 pt-0.5">{a.time}</span>
                        <Icon className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm text-foreground">{a.title}</p>
                          {a.detail ? <p className="text-xs text-muted-foreground">{a.detail}</p> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

// ─── Screen: Gestão de Candidatos ────────────────────────────────────────────

export function AdminCandidatesScreen({ onNavigate }: { onNavigate: NavFn }) {
  const routerNavigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const { state: candidatesState, reload: reloadCandidates } = useAdminCandidatesList({ sync: true });
  const candidateRows = candidatesState.status === "success" ? candidatesState.data.candidates.map(toAdminCandidateRow) : [];
  const filtered = candidateRows.filter(c =>
    (status === "all" || c.accountStatus === status) &&
    (c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()))
  );

  const statusVariant = {
    ACTIVE: "success",
    PENDING_VERIFICATION: "info",
    INVITED: "warning",
    BLOCKED: "error",
    INACTIVE: "default",
  } satisfies Record<MockAccountStatus, "default" | "success" | "warning" | "error" | "info" | "purple">;
  const statusLabel = {
    ACTIVE: "Ativa",
    PENDING_VERIFICATION: "Aguardando verificação",
    INVITED: "Convidada",
    BLOCKED: "Bloqueada",
    INACTIVE: "Inativa",
  } satisfies Record<MockAccountStatus, string>;

  return (
    <AdminLayout current="admin-candidates" onNavigate={onNavigate}
      title="Gestão de Candidatos"
      subtitle={
        candidatesState.status === "success"
          ? `${candidatesState.data.total} ${candidatesState.data.total === 1 ? "candidato cadastrado" : "candidatos cadastrados"}`
          : "Candidatos cadastrados"
      }
      actions={<Btn variant="outline" size="sm"><Download className="w-3.5 h-3.5" /> Exportar</Btn>}>
      <div className="w-full space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput
            containerClassName="flex-1"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar candidato ou e-mail..."
            className="bg-white"
          />
          <div className="flex gap-2 flex-wrap">
            {["all","ACTIVE","PENDING_VERIFICATION","INVITED","BLOCKED","INACTIVE"].map(s => (
              <FilterChip
                key={s}
                onClick={() => setStatus(s)}
                selected={status === s}
                className={status === s ? "py-2" : "bg-white py-2 hover:bg-muted"}
              >
                {s === "all" ? "Todos" : statusLabel[s as MockAccountStatus]}
              </FilterChip>
            ))}
          </div>
        </div>

        {candidatesState.status === "loading" ? (
          <AdminLoadingCard label="Carregando candidatos..." />
        ) : candidatesState.status === "error" ? (
          <EmptyState
            icon={AlertCircle}
            title="Não foi possível carregar os candidatos"
            description={candidatesState.message}
            action={<Btn variant="outline" onClick={reloadCandidates}>Tentar novamente</Btn>}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={candidateRows.length === 0 ? "Nenhum candidato cadastrado" : "Nenhum candidato encontrado"}
            description={
              candidateRows.length === 0
                ? "Os candidatos aparecerão aqui assim que criarem uma conta no RH Connect."
                : "Ajuste a busca ou o filtro de status para ver outros candidatos."
            }
          />
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-5">ID</th>
                    <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4">Candidato</th>
                    <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4 hidden md:table-cell">E-mail</th>
                    <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4">Status da conta</th>
                    <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4 hidden sm:table-cell">Onboarding / Perfil</th>
                    <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4 hidden lg:table-cell">Cadastro</th>
                    <th className="py-3 px-5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(c => (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-5 font-mono text-xs text-muted-foreground">{c.displayId}</td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-foreground">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.email}</p>
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground hidden md:table-cell">{c.email}</td>
                      <td className="py-3.5 px-4"><Badge variant={statusVariant[c.accountStatus]}>{statusLabel[c.accountStatus]}</Badge></td>
                      <td className="py-3.5 px-4 text-muted-foreground hidden sm:table-cell">{c.onboardingLabel}</td>
                      <td className="py-3.5 px-4 text-muted-foreground hidden lg:table-cell">{formatAdminDate(c.createdAt)}</td>
                      <td className="py-3.5 px-5">
                        <div className="flex gap-1.5">
                          <button onClick={() => routerNavigate(`/admin/candidates/${encodeURIComponent(c.id)}`)} className="p-1.5 text-muted-foreground hover:text-primary rounded-lg hover:bg-muted transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                          <button className="p-1.5 text-muted-foreground hover:text-blue-600 rounded-lg hover:bg-muted transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}

// ─── Screen: Gestão de Avaliadores ───────────────────────────────────────────

// ─── Avaliadores REAIS (Fase 4.1) ────────────────────────────────────────────
// Lista: GET /admin/evaluators, exibindo só avaliadores ativos e elegíveis. Sem mock, sem
// localStorage, sem métricas inventadas (a API só informa `assignedCount`). Sync leve na 4.2.
// O fluxo de convite/ativação foi adiado e NÃO é exposto aqui.

type AdminEvaluatorsState =
  | { status: "loading" }
  | { status: "error"; message: string; canRetry: boolean }
  | { status: "success"; evaluators: AdminEvaluator[] };

const EVALUATORS_SYNC = {
  intervalMs: ADMIN_EVALUATORS_SYNC_INTERVAL_MS,
  maxBackoffMs: ADMIN_EVALUATORS_SYNC_MAX_BACKOFF_MS,
};

// 4.2: carga inicial com loading + refresh silencioso (30 s). Falha temporária mantém a lista; 401/403
// (já após a renovação de sessão do service) encerra o polling e preserva o que está na tela.
function useAdminEvaluatorsList() {
  const live = useCandidateLiveResource<AdminEvaluator[]>({
    resourceKey: "admin-evaluators",
    fetch: listAdminEvaluators,
    sync: EVALUATORS_SYNC,
  });
  const liveState = live.state;
  const state: AdminEvaluatorsState =
    liveState.status === "ready"
      ? { status: "success", evaluators: liveState.value }
      : liveState.status === "error"
        ? { status: "error", message: liveState.message, canRetry: liveState.reason !== "unauthorized" && liveState.reason !== "forbidden" }
        : { status: "loading" };

  return { state, reload: live.reload };
}

function EvaluatorCard({ evaluator }: { evaluator: AdminEvaluator }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center text-white text-sm font-bold">
          {evaluatorInitials(evaluator.name)}
        </div>
        <Badge variant="success">{EVALUATOR_ACTIVE_LABEL}</Badge>
      </div>
      <p className="font-bold text-foreground text-sm">{evaluator.name}</p>
      <p className="text-xs text-muted-foreground mb-1">{evaluatorAreaLine(evaluator)}</p>
      <p className="text-xs text-muted-foreground mb-3 break-all">{evaluator.email}</p>
      <div className="bg-muted/50 rounded-lg p-2 text-center" title={ASSIGNED_COUNT_HINT}>
        <p className="text-sm font-bold text-foreground">{evaluator.assignedCount}</p>
        <p className="text-[10px] text-muted-foreground">{ASSIGNED_COUNT_LABEL}</p>
      </div>
    </Card>
  );
}

export function AdminEvaluatorsScreen({ onNavigate }: { onNavigate: NavFn }) {
  const list = useAdminEvaluatorsList();
  const evaluators = list.state.status === "success" ? list.state.evaluators : null;
  const visible = evaluators ? presentableEvaluators(evaluators) : [];

  return (
    <AdminLayout current="admin-evaluators" onNavigate={onNavigate}
      title="Gestão de Avaliadores"
      subtitle={evaluatorsSubtitle(evaluators)}>
      <div className="w-full space-y-4">
        {list.state.status === "loading" && <AdminLoadingCard label="Carregando avaliadores..." />}

        {list.state.status === "error" && (
          <Alert variant="error" className="flex items-start gap-3 p-4">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm">{list.state.message}</p>
              {list.state.canRetry && (
                <Btn variant="outline" size="sm" className="mt-3" onClick={list.reload}>
                  <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
                </Btn>
              )}
            </div>
          </Alert>
        )}

        {evaluators && visible.length === 0 && (
          <EmptyState icon={UserCheck} title={EVALUATORS_EMPTY.title} description={EVALUATORS_EMPTY.description} />
        )}

        {visible.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {visible.map(ev => <EvaluatorCard key={ev.id} evaluator={ev} />)}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

// ─── Screen: Gestão de Entrevistas ───────────────────────────────────────────

export function AdminInterviewsScreen({ onNavigate }: { onNavigate: NavFn }) {
  const routerNavigate = useNavigate();
  const [search, setSearch] = useState("");
  const interviewRows = createAdminInterviewRows();
  const pendingCount = interviewRows.filter((item) => item.status === "Aguardando avaliação" || item.status === "Aguardando").length;
  const evaluatingCount = interviewRows.filter((item) => item.status === "Em avaliação").length;
  const completedCount = interviewRows.filter((item) => item.status === "Avaliada" || item.status === "Concluído").length;

  const filtered = interviewRows.filter(i =>
    i.candidate.toLowerCase().includes(search.toLowerCase()) || i.job.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout current="admin-interviews" onNavigate={onNavigate}
      title="Gestão de Entrevistas"
      subtitle={`${interviewRows.length} entrevistas registradas`}
      actions={<Btn variant="outline" size="sm"><Download className="w-3.5 h-3.5" /> Exportar</Btn>}>
      <div className="w-full space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <StatCard value={pendingCount}  label="Aguardando avaliação" icon={Clock}        color="bg-amber-50 text-amber-600" />
          <StatCard value={evaluatingCount}  label="Em avaliação"          icon={MessageSquare} color="bg-blue-50 text-blue-600" />
          <StatCard value={completedCount} label="Concluídas este mês"   icon={CheckCircle}  color="bg-green-50 text-green-600" />
        </div>

        <SearchInput
          containerClassName="max-w-sm"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar..."
          className="bg-white"
        />

        {filtered.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="Nenhuma entrevista registrada"
            description="As entrevistas enviadas pelos candidatos aparecerão aqui."
          />
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-5">ID</th>
                    <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4">Candidato</th>
                    <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4 hidden lg:table-cell">Vaga</th>
                    <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4 hidden sm:table-cell">Data/hora</th>
                    <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4">Status</th>
                    <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4 hidden md:table-cell">Avaliador</th>
                    <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4">Pontuação</th>
                    <th className="py-3 px-5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(i => (
                    <tr key={i.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-5 font-mono text-xs text-muted-foreground">{i.id}</td>
                      <td className="py-3.5 px-4 font-semibold text-foreground">{i.candidate}</td>
                      <td className="py-3.5 px-4 text-muted-foreground hidden lg:table-cell">{i.job}</td>
                      <td className="py-3.5 px-4 text-muted-foreground hidden sm:table-cell">{i.date}</td>
                      <td className="py-3.5 px-4"><Badge variant={statusVariantFromAdminStatus(i.status)}>{i.status}</Badge></td>
                      <td className="py-3.5 px-4 text-muted-foreground hidden md:table-cell">{i.evaluator}</td>
                      <td className="py-3.5 px-4">
                        {i.score !== null ? <Badge variant={i.score >= 8 ? "success" : "info"}>{formatScore(i.score)}</Badge> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-3.5 px-5">
                        <button
                          onClick={() => {
                            if (i.realId && i.candidateId) {
                              routerNavigate(`/admin/candidates/${encodeURIComponent(i.candidateId)}?interviewId=${encodeURIComponent(i.realId)}`);
                              return;
                            }
                            if (i.candidateId) {
                              routerNavigate(`/admin/candidates/${encodeURIComponent(i.candidateId)}`);
                              return;
                            }
                            onNavigate("admin-candidate-detail");
                          }}
                          className="p-1.5 text-muted-foreground hover:text-primary rounded-lg hover:bg-muted transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}

// ─── Screen: Atribuição de Avaliações ────────────────────────────────────────

const ASSIGN_SYNC = {
  intervalMs: ADMIN_QUEUE_SYNC_INTERVAL_MS,
  maxBackoffMs: ADMIN_QUEUE_SYNC_MAX_BACKOFF_MS,
};

export function AdminAssignScreen({ onNavigate }: { onNavigate: NavFn }) {
  // Fila e avaliadores vêm exclusivamente da API (entrevistas HUMAN em
  // PENDING_ASSIGNMENT e avaliadores reais em `evaluator_profile`). Nada vem do
  // armazenamento local nem de mock. Sem fallback: carregando, erro ou dado real.
  const [selectedRaw, setSelected] = useState<string | null>(null);
  // Fase 4.2: fila + avaliadores são UM recurso com refresh silencioso (15 s). Depois de atribuir
  // (ou de um conflito) a tela lê de novo em silêncio, sem spinner e sem esvaziar a fila.
  const live = useCandidateLiveResource<AdminQueueData>({
    resourceKey: "admin-assign-queue",
    fetch: async () => {
      const [queueResult, evaluatorsResult] = await Promise.all([listPendingAssignmentInterviews(), listAdminEvaluators()]);
      return combineQueueResults(queueResult, evaluatorsResult);
    },
    sync: ASSIGN_SYNC,
  });
  const remote: AdminRemoteState<AdminQueueData> =
    live.state.status === "ready"
      ? { status: "success", data: live.state.value }
      : live.state.status === "error"
        ? { status: "error", message: live.state.message }
        : { status: "loading" };
  const [assigningEvaluatorId, setAssigningEvaluatorId] = useState<number | null>(null);
  const [assignError, setAssignError] = useState("");
  const [assignNotice, setAssignNotice] = useState("");
  // Sucesso da atribuição é transitório (~4s); novo sucesso reinicia o timer e
  // a desmontagem cancela o timer pendente. Erro continua persistente.
  const noticeRef = useRef<TransientNotice | null>(null);
  useEffect(() => {
    const notice = new TransientNotice(setAssignNotice);
    noticeRef.current = notice;
    return () => {
      notice.destroy();
      noticeRef.current = null;
    };
  }, []);
  const assigningRef = useRef(false);

  const reload = live.reload;

  const pending =
    remote.status === "success"
      ? remote.data.interviews.map((interview) => ({
          id: interview.id,
          candidate: interview.candidate.name,
          job: interview.jobTitle,
          date: formatAdminInterviewDateTime(interview.submittedAt ?? interview.createdAt),
        }))
      : [];
  // Somente avaliadores com conta ACTIVE podem receber entrevistas (INVITED,
  // ex.: convite pendente, não aparece como opção de atribuição).
  const eligibleEvaluators =
    remote.status === "success"
      ? remote.data.evaluators.filter((evaluator) => evaluator.eligible)
      : [];

  // Se outro Admin atribuiu a entrevista selecionada, ela some da fila e a seleção é descartada.
  const selected = resolveSelection(selectedRaw, remote.status === "success" ? remote.data.interviews : []);

  const handleAssign = async (evaluator: AdminEvaluator) => {
    if (!selected || assigningRef.current) return;
    assigningRef.current = true;
    setAssigningEvaluatorId(evaluator.id);
    setAssignError("");
    noticeRef.current?.clear();

    const result = await assignInterviewToEvaluator(selected, evaluator.id);

    assigningRef.current = false;
    setAssigningEvaluatorId(null);

    if (result.ok) {
      noticeRef.current?.show(`Entrevista atribuída a ${evaluator.name}.`);
    } else {
      setAssignError(result.message);
    }

    // Em sucesso ou conflito (ex.: outro Admin atribuiu antes) a fila é relida da API em
    // silêncio (sem spinner); a tela nunca "adivinha" o novo estado localmente.
    setSelected(null);
    void live.refresh({ supersede: true });
  };

  return (
    <AdminLayout current="admin-assign" onNavigate={onNavigate}
      title="Atribuição de Avaliações"
      subtitle="Associe entrevistas pendentes a avaliadores disponíveis">
      <div className="w-full space-y-4">
        {remote.status === "loading" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <Spinner size="md" /> Carregando fila de atribuição...
          </div>
        )}

        {remote.status === "error" && (
          <Alert variant="error" className="flex items-start gap-3 p-4">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm">{remote.message}</p>
              <Btn variant="outline" size="sm" className="mt-3" onClick={reload}>
                <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
              </Btn>
            </div>
          </Alert>
        )}

        {assignNotice && (
          <Alert variant="success" className="flex items-start gap-3 p-4" role="status">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-sm">{assignNotice}</p>
          </Alert>
        )}

        {assignError && (
          <Alert variant="error" className="flex items-start gap-3 p-4" role="alert">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-sm">{assignError}</p>
          </Alert>
        )}

        {remote.status === "success" && (
          <>
            <Alert variant="warning" className="flex items-start gap-3 p-4">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">{pending.length} entrevista{pending.length !== 1 ? "s" : ""} aguardando atribuição.</p>
            </Alert>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Pending interviews */}
              <div>
                <h3 className="font-bold text-foreground mb-3">Entrevistas Pendentes</h3>
                <div className="space-y-2.5">
                  {pending.length === 0 && (
                    <EmptyState
                      icon={CheckCircle}
                      title="Nenhuma entrevista pendente"
                      description="Quando um candidato enviar uma entrevista, ela aparecerá aqui para atribuição."
                    />
                  )}
                  {pending.map(i => (
                    <button key={i.id} type="button" onClick={() => setSelected(i.id === selected ? null : i.id)} aria-pressed={selected === i.id}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selected === i.id ? "border-primary bg-blue-50" : "border-border bg-white hover:border-primary/30"}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-foreground">{i.candidate}</p>
                          <p className="text-sm text-muted-foreground">{i.job} · {i.date}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {selected === i.id ? <Check className="w-4 h-4 text-primary" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Evaluators */}
              <div>
                <h3 className="font-bold text-foreground mb-3">Avaliadores Disponíveis</h3>
                {!selected ? (
                  <div className="p-8 border-2 border-dashed border-border rounded-xl text-center text-muted-foreground">
                    <p className="text-sm">Selecione uma entrevista à esquerda para atribuir</p>
                  </div>
                ) : eligibleEvaluators.length === 0 ? (
                  <EmptyState
                    icon={UserCheck}
                    title="Nenhum avaliador ativo"
                    description="Somente avaliadores com conta ativa podem receber entrevistas."
                  />
                ) : (
                  <div className="space-y-2.5">
                    {eligibleEvaluators.map(ev => (
                      <button key={ev.id} type="button" onClick={() => handleAssign(ev)}
                        disabled={assigningEvaluatorId !== null}
                        className="w-full text-left p-4 rounded-xl border border-border bg-white hover:border-primary hover:bg-blue-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center text-white text-xs font-bold">
                            {ev.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground">{ev.name}</p>
                            <p className="text-xs text-muted-foreground">{ev.area ?? "Área não informada"} · {ev.assignedCount} pendente{ev.assignedCount !== 1 ? "s" : ""}</p>
                          </div>
                          {assigningEvaluatorId === ev.id && <Spinner />}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

// ─── Screen: Cargos e Áreas ───────────────────────────────────────────────────

export function AdminRolesScreen({ onNavigate }: { onNavigate: NavFn }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newRoleAreaId, setNewRoleAreaId] = useState<ProfessionalAreaId | "">("information-technology");
  const [newRoleSubareaId, setNewRoleSubareaId] = useState("");
  const newRoleSubareas = newRoleAreaId ? getProfessionalSubareasByArea(newRoleAreaId) : [];
  // Catálogo ADMINISTRATIVO de cargos (configuração estrutural, ainda não
  // persistida). Não carrega métricas operacionais: as entrevistas não têm
  // vínculo com um cargo cadastrado (o título vem da vaga analisada), então
  // "Entrevistas ativas" não possui fonte real por cargo e exibe 0.
  const roles = [
    { title: "Desenvolvedor Full Stack", area: "Tecnologia da Informação", subarea: "Desenvolvimento Full Stack", status: "Ativo" },
    { title: "Designer UX/UI",           area: "Tecnologia da Informação", subarea: "UX/UI Design", status: "Ativo" },
    { title: "Analista de RH",           area: "Gestão de RH", subarea: "Gestão de Pessoas", status: "Ativo" },
    { title: "Tech Recruiter",           area: "Gestão de RH", subarea: "Recrutamento e Seleção", status: "Ativo" },
    { title: "Secretária Executiva",     area: "Secretariado", subarea: "Secretariado Executivo", status: "Ativo" },
    { title: "Assessor Executivo",       area: "Secretariado", subarea: "Assessoria Executiva", status: "Inativo" },
  ];
  const ACTIVE_INTERVIEWS_PER_ROLE = 0;

  return (
    <AdminLayout current="admin-roles" onNavigate={onNavigate}
      title="Cargos e Áreas"
      subtitle={`${roles.length} cargos cadastrados`}
      actions={<Btn variant="primary" size="sm" onClick={() => setShowAdd(true)}><Plus className="w-3.5 h-3.5" /> Novo Cargo</Btn>}>
      <div className="w-full space-y-4">
        {showAdd && (
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">Novo Cargo</h3>
              <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div><label className="block text-sm font-semibold text-foreground mb-1.5">Título do cargo *</label>
                <Input placeholder="Ex: Analista de Dados" className="bg-white" /></div>
              <div><label className="block text-sm font-semibold text-foreground mb-1.5">Área *</label>
                <NativeSelect
                  value={newRoleAreaId}
                  onChange={event => {
                    setNewRoleAreaId(event.target.value as ProfessionalAreaId | "");
                    setNewRoleSubareaId("");
                  }}
                  className="bg-white"
                >
                  <option value="">Selecione...</option>
                  {PROFESSIONAL_AREAS.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}
                </NativeSelect></div>
              <div><label className="block text-sm font-semibold text-foreground mb-1.5">Subárea *</label>
                <NativeSelect
                  value={newRoleSubareaId}
                  onChange={event => setNewRoleSubareaId(event.target.value)}
                  disabled={!newRoleAreaId}
                  className="bg-white"
                >
                  <option value="">Selecione...</option>
                  {newRoleSubareas.map(subarea => <option key={subarea.id} value={subarea.id}>{subarea.name}</option>)}
                </NativeSelect></div>
            </div>
            <div className="flex gap-3">
              <Btn variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Btn>
              <Btn variant="primary" onClick={() => setShowAdd(false)}>Salvar</Btn>
            </div>
          </Card>
        )}

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-5">Cargo</th>
                  <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4">Área</th>
                  <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4 hidden md:table-cell">Subárea</th>
                  <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4 hidden sm:table-cell">Entrevistas ativas</th>
                  <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4">Status</th>
                  <th className="py-3 px-5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {roles.map(r => (
                  <tr key={r.title} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-5 font-semibold text-foreground">{r.title}</td>
                    <td className="py-3.5 px-4 text-muted-foreground">{r.area}</td>
                    <td className="py-3.5 px-4 text-muted-foreground hidden md:table-cell">{r.subarea}</td>
                    <td className="py-3.5 px-4 text-muted-foreground hidden sm:table-cell">{ACTIVE_INTERVIEWS_PER_ROLE}</td>
                    <td className="py-3.5 px-4"><Badge variant={r.status === "Ativo" ? "success" : "default"}>{r.status}</Badge></td>
                    <td className="py-3.5 px-5">
                      <div className="flex gap-1.5">
                        <button className="p-1.5 text-muted-foreground hover:text-blue-600 rounded-lg hover:bg-muted transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button className="p-1.5 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-muted transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}

// ─── Screen: Consentimentos e Privacidade ────────────────────────────────────

export function AdminConsentScreen({ onNavigate }: { onNavigate: NavFn }) {
  // Sem solicitações mockadas: as solicitações de privacidade devem vir de
  // candidatos reais (ainda sem backend). Até lá, a lista é vazia.
  const requests: { id: string; candidate: string; type: string; date: string; status: "Pendente" | "Em análise" }[] = [];

  return (
    <AdminLayout current="admin-consent" onNavigate={onNavigate}
      title="Consentimentos e Privacidade"
      subtitle="Gestão de consentimentos LGPD e solicitações de privacidade">
      <div className="w-full space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard value="—" label="Consentimentos ativos"    icon={CheckCircle} color="bg-green-50 text-green-600" />
          <StatCard value={requests.length} label="Solicitações pendentes"   icon={AlertCircle} color="bg-red-50 text-red-600" />
          <StatCard value="—"  label="Autorizaram uso em IA"    icon={Shield}      color="bg-purple-50 text-purple-600" />
        </div>

        <Card className="p-5 sm:p-6">
          <h3 className="font-bold text-foreground mb-4">Solicitações Pendentes</h3>
          <div className="space-y-3">
            {requests.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma solicitação de privacidade pendente.</p>
            )}
            {requests.map(r => (
              <div key={r.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-muted/40 rounded-xl">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-mono text-muted-foreground">{r.id}</span>
                    <Badge variant={r.status === "Em análise" ? "info" : "warning"}>{r.status}</Badge>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{r.type} — {r.candidate}</p>
                  <p className="text-xs text-muted-foreground">Solicitado em {r.date}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Btn variant="outline" size="sm">Visualizar</Btn>
                  <Btn variant="primary" size="sm">Atender</Btn>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h3 className="font-bold text-foreground mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-purple-500" /> Configurações de Consentimento</h3>
          <div className="space-y-4">
            {[
              { label: "Exigir consentimento para uso de respostas textuais", on: true },
              { label: "Exigir consentimento para uso em IA/ML",        on: true },
              { label: "Permitir exportação de dados pelo candidato",   on: true },
              { label: "Notificar candidato em caso de incidente",      on: true },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-foreground">{s.label}</p>
                <SwitchVisual checked={s.on} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}

// ─── Screen: Logs de Auditoria ────────────────────────────────────────────────

export function AdminAuditScreen({ onNavigate }: { onNavigate: NavFn }) {
  const [search, setSearch] = useState("");
  // Sem logs mockados: o registro de auditoria real ainda não tem backend.
  const allLogs: { time: string; user: string; action: string; detail: string; ip: string }[] = [];
  const logs = allLogs.filter(l => search === "" || l.user.includes(search) || l.action.includes(search) || l.detail.toLowerCase().includes(search.toLowerCase()));

  const actionColor = (a: string) => {
    if (a.includes("SUBMITTED")) return "bg-green-100 text-green-700";
    if (a.includes("CREATED") || a.includes("ASSIGNED")) return "bg-blue-100 text-blue-700";
    if (a.includes("UPDATED")) return "bg-amber-100 text-amber-700";
    if (a.includes("CONSENT")) return "bg-red-100 text-red-700";
    return "bg-slate-100 text-slate-600";
  };

  return (
    <AdminLayout current="admin-audit" onNavigate={onNavigate}
      title="Logs de Auditoria"
      subtitle="Registro completo de ações do sistema"
      actions={<Btn variant="outline" size="sm"><Download className="w-3.5 h-3.5" /> Exportar</Btn>}>
      <div className="w-full space-y-4">
        <SearchInput
          containerClassName="max-w-sm"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filtrar por usuário, ação..."
          className="bg-white"
        />

        {logs.length === 0 ? (
          <EmptyState
            icon={History}
            title="Nenhum registro de auditoria"
            description="As ações do sistema aparecerão aqui quando o registro de auditoria estiver disponível."
            className="p-12"
          />
        ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-5">Data/Hora</th>
                  <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4">Usuário</th>
                  <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4">Ação</th>
                  <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4 hidden md:table-cell">Detalhe</th>
                  <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-5 hidden lg:table-cell">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((l, i) => (
                  <tr key={i} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-5 font-mono text-xs text-muted-foreground whitespace-nowrap">{l.time}</td>
                    <td className="py-3.5 px-4 font-medium text-foreground">{l.user}</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${actionColor(l.action)}`}>{l.action}</span>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground text-xs hidden md:table-cell max-w-[220px] truncate">{l.detail}</td>
                    <td className="py-3.5 px-5 font-mono text-xs text-muted-foreground hidden lg:table-cell">{l.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        )}
      </div>
    </AdminLayout>
  );
}

// ─── Screen: Configurações Gerais ────────────────────────────────────────────

export function AdminSettingsScreen({ onNavigate }: { onNavigate: NavFn }) {
  const [tab, setTab] = useState<"geral" | "seguranca" | "integracoes" | "notificacoes">("geral");
  const [saved, setSaved] = useState(false);

  const tabs = [
    { id: "geral" as const,         label: "Geral" },
    { id: "seguranca" as const,     label: "Segurança" },
    { id: "integracoes" as const,   label: "Integrações" },
    { id: "notificacoes" as const,  label: "Notificações" },
  ];

  return (
    <AdminLayout current="admin-settings" onNavigate={onNavigate} title="Configurações Gerais" subtitle="Administração do sistema RH Connect">
      <div className="w-full max-w-2xl space-y-5">
        {saved && (
          <Alert variant="success" className="flex items-center gap-2.5 p-3.5">
            <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
            <p className="text-sm font-semibold text-green-700">Configurações salvas com sucesso.</p>
          </Alert>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${tab === t.id ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "geral" && (
          <Card className="p-5 sm:p-6 space-y-4">
            <h3 className="font-bold text-foreground">Informações da Instituição</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-sm font-semibold text-foreground mb-1.5">Nome da instituição</label>
                <Input defaultValue="SENAC-DF" className="bg-white" /></div>
              <div><label className="block text-sm font-semibold text-foreground mb-1.5">Responsável RH</label>
                <Input defaultValue="Ana Machado" className="bg-white" /></div>
              <div><label className="block text-sm font-semibold text-foreground mb-1.5">Limite de entrevistas/mês</label>
                <Input defaultValue="200" type="number" className="bg-white" /></div>
              <div><label className="block text-sm font-semibold text-foreground mb-1.5">Tempo estimado da entrevista (min)</label>
                <Input defaultValue="20" type="number" className="bg-white" /></div>
            </div>
          </Card>
        )}

        {tab === "seguranca" && (
          <Card className="p-5 sm:p-6 space-y-4">
            <h3 className="font-bold text-foreground flex items-center gap-2"><Lock className="w-4 h-4" /> Segurança</h3>
            {[
              { label: "Autenticação em dois fatores (2FA)",      on: true },
              { label: "Bloqueio após 5 tentativas de login",     on: true },
              { label: "Sessão expira após 8 horas de inatividade", on: false },
              { label: "Proteção de respostas em repouso",        on: true },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-foreground">{s.label}</p>
                <SwitchVisual checked={s.on} />
              </div>
            ))}
          </Card>
        )}

        {tab === "integracoes" && (
          <Card className="p-5 sm:p-6 space-y-5">
            <h3 className="font-bold text-foreground flex items-center gap-2"><Database className="w-4 h-4" /> Integrações</h3>
            {[
              { name: "Sistema Acadêmico SENAC", status: "Conectado",     color: "text-green-600" },
              { name: "Serviço de e-mail",       status: "Conectado",     color: "text-green-600" },
              { name: "API Python/Flask de extração e perguntas", status: "Pendente", color: "text-amber-600" },
              { name: "API de IA/Transcrição",   status: "Não configurado", color: "text-amber-600" },
            ].map(i => (
              <div key={i.name} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">{i.name}</p>
                  <p className={`text-xs font-medium ${i.color}`}>{i.status}</p>
                </div>
                <Btn variant="outline" size="sm">Configurar</Btn>
              </div>
            ))}
          </Card>
        )}

        {tab === "notificacoes" && (
          <Card className="p-5 sm:p-6 space-y-4">
            <h3 className="font-bold text-foreground flex items-center gap-2"><Bell className="w-4 h-4" /> Notificações do Sistema</h3>
            {[
              { label: "Notificar candidatos ao receber resultado", on: true },
              { label: "Alertar avaliadores sobre novas avaliações", on: true },
              { label: "Resumo semanal para administradores",       on: false },
              { label: "Alertas de prazo vencido (SLA > 48h)",      on: true },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-foreground">{s.label}</p>
                <SwitchVisual checked={s.on} />
              </div>
            ))}
          </Card>
        )}

        <div className="flex gap-3 justify-end">
          <Btn variant="outline">Cancelar</Btn>
          <Btn variant="primary" onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 3000); }}>Salvar Alterações</Btn>
        </div>
      </div>
    </AdminLayout>
  );
}

function AdminProfessionalProfileCard({
  profile,
}: {
  profile: ReturnType<typeof useAdminCandidateProfile>;
}) {
  const { state, reload } = profile;
  const view = state.status === "success" ? buildAdminProfileView(state.data) : null;

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div>
          <h3 className="font-bold text-foreground">Perfil Profissional</h3>
          <p className="text-xs text-muted-foreground">Dados do perfil preenchido pelo candidato (somente leitura).</p>
        </div>
        {view && (
          <Badge variant={view.isComplete ? "success" : "warning"}>
            {view.isComplete ? "Perfil completo" : "Perfil incompleto"}
          </Badge>
        )}
      </div>

      {state.status === "loading" && (
        <span role="status" aria-live="polite" className="flex items-center gap-3 text-sm text-muted-foreground">
          <Spinner size="md" />
          Carregando perfil profissional...
        </span>
      )}

      {state.status === "not_found" && (
        <p className="text-sm text-muted-foreground">Perfil profissional não encontrado para este candidato.</p>
      )}

      {state.status === "error" && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-red-600" role="alert">{state.message}</p>
          <Btn variant="outline" size="sm" onClick={reload}>Tentar novamente</Btn>
        </div>
      )}

      {view && (
        <>
          {!view.isComplete && view.missingSectionLabels.length > 0 && (
            <p className="text-xs text-muted-foreground mb-4">
              Pendências: {view.missingSectionLabels.join(", ")}.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 text-sm">
            {view.objective.map((item) => (
              <div key={item.label} className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground mb-0.5">{item.label}</p>
                <p className="font-semibold text-foreground">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-5 border-t border-border">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Resumo profissional</p>
            <p className="text-sm text-foreground leading-relaxed">{view.summary}</p>
          </div>

          <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Formação acadêmica</p>
              {view.educations.length ? (
                <div className="space-y-3">
                  {view.educations.map((item) => (
                    <div key={item.key}>
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                      <p className="text-xs text-muted-foreground">{item.period}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{view.educationsEmptyMessage}</p>
              )}
            </div>

            <div className="rounded-xl border border-border p-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Cursos complementares</p>
              {view.courses.length ? (
                <div className="space-y-3">
                  {view.courses.map((item) => (
                    <div key={item.key}>
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                      <p className="text-xs text-muted-foreground">{item.period}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{view.coursesEmptyMessage}</p>
              )}
            </div>

            <div className="rounded-xl border border-border p-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Experiência profissional</p>
              {view.experiences.length ? (
                <div className="space-y-3">
                  {view.experiences.map((item) => (
                    <div key={item.key}>
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.period}</p>
                      {item.description && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.description}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{view.experiencesEmptyMessage}</p>
              )}
            </div>

            <div className="rounded-xl border border-border p-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Habilidades e competências</p>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Técnicas</p>
                  {view.technicalSkills.length ? (
                    <div className="flex flex-wrap gap-2">
                      {view.technicalSkills.map((skill) => <Badge key={skill.key} variant="info">{skill.name}</Badge>)}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{view.technicalSkillsEmptyMessage}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Comportamentais</p>
                  {view.behavioralSkills.length ? (
                    <div className="flex flex-wrap gap-2">
                      {view.behavioralSkills.map((skill) => <Badge key={skill.key} variant="success">{skill.name}</Badge>)}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{view.behavioralSkillsEmptyMessage}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

// ─── Screen: Detalhe do Candidato ─────────────────────────────────────────────

export function AdminCandidateDetailScreen({ onNavigate }: { onNavigate: NavFn }) {
  const { id: candidateIdParam } = useParams();
  const [searchParams] = useSearchParams();
  const interviewIdParam = searchParams.get("interviewId") ?? undefined;
  const adminVisibleInterviews = getAdminVisibleInterviews();
  const candidateDetail = useAdminCandidateDetail(candidateIdParam);
  const candidateProfileState = useAdminCandidateProfile(candidateIdParam);
  const relatedInterviews = adminVisibleInterviews.filter((item) => item.candidateId === candidateIdParam);
  const realInterview =
    getInterviewById(interviewIdParam) ??
    relatedInterviews[0] ??
    null;
  const realInterviewDisplayIndex = realInterview
    ? adminVisibleInterviews.findIndex((item) => item.id === realInterview.id)
    : -1;
  const assignment = getAssignmentByInterviewId(realInterview?.id);
  const evaluation = getEvaluationByInterviewId(realInterview?.id);
  const averageScore = getAverageScore(evaluation?.scores);

  if (candidateDetail.state.status !== "success") {
    const detailState = candidateDetail.state;
    return (
      <AdminLayout current="admin-candidates" onNavigate={onNavigate}
        title="Detalhe do Candidato"
        subtitle={detailState.status === "loading" ? "Carregando..." : undefined}
        actions={<Btn variant="outline" size="sm" onClick={() => onNavigate("admin-candidates")}>Voltar</Btn>}>
        <div className="w-full">
          {detailState.status === "loading" && <AdminLoadingCard label="Carregando dados do candidato..." />}
          {detailState.status === "not_found" && (
            <EmptyState
              icon={Users}
              title="Candidato não encontrado"
              description="Esta conta não existe ou não pertence a um candidato."
              action={<Btn variant="outline" onClick={() => onNavigate("admin-candidates")}>Voltar à lista</Btn>}
            />
          )}
          {detailState.status === "error" && (
            <EmptyState
              icon={AlertCircle}
              title="Não foi possível carregar o candidato"
              description={detailState.message}
              action={<Btn variant="outline" onClick={candidateDetail.reload}>Tentar novamente</Btn>}
            />
          )}
        </div>
      </AdminLayout>
    );
  }

  const candidateAccount = toAdminCandidateRow(candidateDetail.state.data);
  const candidateDisplay = {
    id: candidateAccount.id,
    name: candidateAccount.name,
    email: candidateAccount.email,
    job: realInterview ? realInterview.context.title : "Conta de candidato",
    status: realInterview ? statusLabelFromInterview(realInterview.status) : candidateAccount.onboardingLabel,
  };

  const interview = realInterview
    ? {
        id: createAdminInterviewDisplayId(realInterviewDisplayIndex),
        date: formatAdminInterviewDateTime(realInterview.submittedAt ?? realInterview.createdAt),
        evaluator: assignment?.evaluatorName ?? "—",
        score: averageScore,
      }
    : null;

  const criteriaScores = evaluation?.scores
    ? Object.entries(evaluation.scores).map(([name, score]) => ({ name, score }))
    : [];

  const timeline = [
    ...(candidateAccount.createdAt ? [{ date: formatAdminDate(candidateAccount.createdAt), label: "Cadastro criado", icon: FileText }] : []),
    ...(candidateAccount.onboardingCompletedAt ? [{ date: formatAdminDate(candidateAccount.onboardingCompletedAt), label: "Onboarding concluído", icon: CheckCircle }] : []),
    ...(realInterview
      ? [
          { date: formatAdminInterviewDateTime(realInterview.createdAt), label: "Entrevista criada", icon: FileText },
          ...(realInterview.submittedAt ? [{ date: formatAdminInterviewDateTime(realInterview.submittedAt), label: "Entrevista enviada", icon: MessageSquare }] : []),
          ...(assignment ? [{ date: formatAdminInterviewDateTime(assignment.assignedAt), label: "Avaliador atribuído", icon: Clock }] : []),
          ...(evaluation?.completedAt ? [{ date: formatAdminInterviewDateTime(evaluation.completedAt), label: "Avaliação concluída", icon: CheckCircle }] : []),
        ]
      : []),
  ];

  return (
    <AdminLayout current="admin-candidates" onNavigate={onNavigate}
      title="Detalhe do Candidato"
      subtitle={`${candidateDisplay.name} · ${candidateDisplay.email}`}
      actions={
        <div className="flex gap-2">
          <Btn variant="outline" size="sm" onClick={() => onNavigate("admin-candidates")}>
            Voltar
          </Btn>
          <Btn variant="primary" size="sm" onClick={() => onNavigate("admin-assign")}>
            <Link2 className="w-3.5 h-3.5" /> Atribuir Avaliador
          </Btn>
        </div>
      }>
      <div className="w-full space-y-4">
        {/* Profile card */}
        <Card className="p-6">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xl font-bold shrink-0">
              {candidateDisplay.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-xl font-bold text-foreground">{candidateDisplay.name}</h2>
                  <p className="text-muted-foreground text-sm">{candidateDisplay.email}</p>
                  <p className="text-muted-foreground text-sm mt-0.5">{candidateDisplay.job}</p>
                </div>
                <Badge variant={realInterview ? statusVariantFromAdminStatus(candidateDisplay.status) : "info"}>
                  {candidateDisplay.status}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        <AdminProfessionalProfileCard profile={candidateProfileState} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Timeline */}
          <Card className="p-5 lg:col-span-1">
            <h3 className="font-bold text-foreground mb-4">Linha do Tempo</h3>
            <div className="space-y-4">
              {timeline.length > 0 ? timeline.map((t, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <t.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.date}</p>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">Sem movimentações registradas.</p>
              )}
            </div>
          </Card>

          {/* Interview info */}
          {interview ? (
            <Card className="p-5 lg:col-span-2">
              <h3 className="font-bold text-foreground mb-4">Dados da Entrevista</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-0.5">ID da Entrevista</p>
                  <p className="font-mono font-semibold text-foreground">{interview.id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">Data/hora de envio</p>
                  <p className="font-semibold text-foreground">{interview.date}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">Avaliador Responsável</p>
                  <p className="font-semibold text-foreground">{interview.evaluator === "—" ? "Não atribuído" : interview.evaluator}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">Pontuação Final</p>
                  {interview.score !== null
                    ? <Badge variant={interview.score >= 8 ? "success" : interview.score >= 7 ? "info" : "warning"}>{formatScore(interview.score)}</Badge>
                    : <span className="text-muted-foreground">Aguardando avaliação</span>}
                </div>
              </div>

              {/* Score criteria — only if completed */}
              {interview.score !== null && (
                <div className="mt-5 pt-5 border-t border-border">
                  <p className="font-semibold text-foreground mb-3 text-sm">Pontuações por Critério</p>
                  <div className="space-y-2.5">
                    {criteriaScores.map(s => (
                      <div key={s.name} className="flex items-center gap-3">
                        <span className="text-xs text-foreground w-24 shrink-0">{s.name}</span>
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-1.5 rounded-full ${s.score >= 8 ? "bg-green-500" : s.score >= 6 ? "bg-blue-500" : "bg-amber-500"}`}
                            style={{ width: `${s.score * 10}%` }} />
                        </div>
                        <span className={`text-xs font-bold w-5 text-right ${s.score >= 8 ? "text-green-600" : s.score >= 6 ? "text-blue-600" : "text-amber-600"}`}>
                          {formatScore(s.score)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <Card className="p-5 lg:col-span-2">
              <h3 className="font-bold text-foreground mb-2">Histórico de entrevistas</h3>
              <p className="text-sm text-muted-foreground">Este candidato ainda não possui entrevistas enviadas.</p>
            </Card>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Btn variant="outline" onClick={() => onNavigate("admin-candidates")}>
            Voltar à Lista
          </Btn>
          {realInterview && candidateDisplay.status !== "Concluído" && candidateDisplay.status !== "Avaliada" && (
            <Btn variant="primary" onClick={() => onNavigate("admin-assign")}>
              <UserCheck className="w-3.5 h-3.5" /> Atribuir Avaliador
            </Btn>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

// ─── Screen: Formulário de Avaliador ─────────────────────────────────────────

// O cadastro/convite de avaliadores foi adiado. A rota antiga não expõe formulário: volta para a lista.
export function AdminEvaluatorFormScreen({ onNavigate: _onNavigate }: { onNavigate: NavFn }) {
  const routerNavigate = useNavigate();
  useEffect(() => {
    routerNavigate("/admin/evaluators", { replace: true });
  }, [routerNavigate]);
  return null;
}

// ─── Screen: Onboarding do Administrador ─────────────────────────────────────

function AdminLogoHeader() {
  return (
    <header className="flex items-center justify-center px-6 py-5 bg-white/80 backdrop-blur border-b border-border">
      <RHConnectLogo className="h-10 w-auto" />
    </header>
  );
}

const ADMIN_ONBOARDING_STEPS = [
  {
    id: 0,
    icon: Users,
    color: "bg-violet-100 text-violet-600",
    title: "Gestão de usuários e avaliadores",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>No RH Connect, você gerencia os <strong className="text-foreground">candidatos</strong> cadastrados na plataforma e os <strong className="text-foreground">avaliadores</strong> responsáveis pelas análises.</p>
        <div className="space-y-2">
          {[
            { label: "Candidatos",  desc: "Acompanhe candidaturas, status e resultados" },
            { label: "Avaliadores", desc: "Acompanhe os avaliadores ativos" },
          ].map(s => (
            <div key={s.label} className="flex items-start gap-2 p-2.5 bg-muted/40 rounded-lg">
              <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground text-xs">{s.label}</p>
                <p className="text-xs">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 1,
    icon: MessageSquare,
    color: "bg-blue-100 text-blue-600",
    title: "Entrevistas e atribuições",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Controle as <strong className="text-foreground">entrevistas textuais</strong> realizadas pelos candidatos e distribua as avaliações para os avaliadores disponíveis.</p>
        <div className="space-y-2">
          {[
            { label: "Gestão de entrevistas", desc: "Veja todas as entrevistas e seus status" },
            { label: "Atribuição de avaliações", desc: "Defina qual avaliador analisa cada entrevista" },
          ].map(s => (
            <div key={s.label} className="flex items-start gap-2 p-2.5 bg-muted/40 rounded-lg">
              <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground text-xs">{s.label}</p>
                <p className="text-xs">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

export function AdminOnboardingScreen({ onNavigate, onComplete }: { onNavigate: NavFn; onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const current = ADMIN_ONBOARDING_STEPS[step];
  const Icon = current.icon;
  const isLast = step === ADMIN_ONBOARDING_STEPS.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50 flex flex-col">
      <AdminLogoHeader />
      <div className="flex-1 flex items-center justify-center px-4 py-6 sm:py-8">
        <div className="relative flex w-full max-w-6xl flex-col items-center gap-6 lg:min-h-[640px] lg:justify-center">
          <div className="flex justify-center lg:absolute lg:bottom-0 lg:left-0 lg:z-0">
            <img
              src={niloOnboarding}
              alt="Nilo, guia visual do RH Connect"
              className="h-[260px] w-auto object-contain drop-shadow-2xl sm:h-[300px] lg:h-[clamp(520px,58vh,600px)]"
              draggable={false}
            />
          </div>

          <div className="relative z-10 w-full max-w-md">
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {ADMIN_ONBOARDING_STEPS.map((s, i) => (
                <div key={s.id} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? "w-8 bg-violet-600" : i < step ? "w-4 bg-violet-300" : "w-4 bg-muted"}`} />
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-border shadow-sm p-6 sm:p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 rounded-2xl ${current.color} flex items-center justify-center`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>

              <h2 className="text-xl font-bold text-foreground mb-5">{current.title}</h2>
              <div className="mb-8">{current.content}</div>

              <div className="flex items-center gap-3">
                {step > 0 && (
                  <Btn variant="outline" onClick={() => setStep(s => s - 1)}>
                    Voltar
                  </Btn>
                )}
                {isLast ? (
                  <Btn variant="primary" className="flex-1" onClick={onComplete}>
                    Ir para o Dashboard <ArrowRight className="w-3.5 h-3.5" />
                  </Btn>
                ) : (
                  <Btn variant="primary" className="flex-1" onClick={() => setStep(s => s + 1)}>
                    Próximo <ChevronRight className="w-3.5 h-3.5" />
                  </Btn>
                )}
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground mt-4">
              Passo {step + 1} de {ADMIN_ONBOARDING_STEPS.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
