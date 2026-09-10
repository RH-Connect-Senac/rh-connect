/** RH Connect — Telas do Administrador */

import { useState, useEffect } from "react";
import {
  AccountDropdown, NotificationDropdown,
  ADMIN_ACCOUNT, ADMIN_NOTIFS,
} from "./header-popovers";
import {
  Home, Users, Video, Settings, LogOut, ChevronLeft, ChevronRight,
  Bell, CheckCircle, AlertCircle, Target, FileText, Shield,
  Plus, Eye, Edit2, Trash2, X, Check, Filter,
  TrendingUp, Award, Clock, Star, BarChart2, Download,
  MessageSquare, Briefcase, Link2, Lock, Database, ToggleLeft,
  ToggleRight, History, Info, UserCheck, RefreshCw, Send, ArrowRight, Zap,
} from "lucide-react";
import { RHConnectLogo } from "./brand/rh-connect-logo";
import { Input } from "./ui/input";
import { SearchInput } from "./ui/search-input";
import { NativeSelect } from "./ui/native-select";
import { Textarea } from "./ui/textarea";
import { Button as UIButton } from "./ui/button";
import { Card as UICard } from "./ui/card";
import { Badge as UIBadge } from "./ui/badge";
import { Alert } from "./ui/alert";
import { FilterChip } from "./ui/filter-chip";

type NavFn = (s: string) => void;
type PendingEvaluatorInvite = {
  id: string;
  name: string;
  email: string;
};

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

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const ADMIN_NAV = [
  { icon: Home,        label: "Dashboard",       screen: "admin-dashboard" },
  { icon: Users,       label: "Candidatos",      screen: "admin-candidates" },
  { icon: UserCheck,   label: "Avaliadores",      screen: "admin-evaluators" },
  { icon: Video,       label: "Entrevistas",      screen: "admin-interviews" },
  { icon: Link2,       label: "Atribuições",      screen: "admin-assign" },
  { icon: MessageSquare, label: "Banco de Perguntas", screen: "admin-questions" },
  { icon: Briefcase,   label: "Cargos e Áreas",  screen: "admin-roles" },
  { icon: Target,      label: "Critérios",        screen: "admin-criteria" },
  { icon: Shield,      label: "Consentimentos",   screen: "admin-consent" },
  { icon: FileText,    label: "Auditoria",        screen: "admin-audit" },
  { icon: Settings,    label: "Configurações",    screen: "admin-settings" },
];

function AdminSidebarContent({
  current, onNavigate, collapsed, onToggleCollapse,
}: {
  current: string; onNavigate: NavFn; collapsed: boolean; onToggleCollapse: () => void;
}) {
  const [showLogout, setShowLogout] = useState(false);
  return (
    <div className="flex flex-col h-full relative" style={{ backgroundColor: "#021025" }}>
      {showLogout && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(15,38,82,0.92)" }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-[240px] text-center shadow-2xl">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <LogOut className="w-6 h-6 text-red-500" />
            </div>
            <p className="font-bold text-foreground text-sm mb-1">Sair da conta?</p>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">Você precisará fazer login novamente.</p>
            <div className="space-y-2">
              <button onClick={() => { setShowLogout(false); onNavigate("landing"); }}
                className="w-full py-2 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors">Sair</button>
              <button onClick={() => setShowLogout(false)}
                className="w-full py-2 bg-muted text-foreground rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Logo */}
      <div className={`border-b border-white/10 flex items-center ${collapsed ? "px-2 py-4 justify-center" : "px-5 py-4"}`}>
        {collapsed ? (
          <svg viewBox="0 0 57.9158 31.8399" className="h-6 w-auto shrink-0" fill="none">
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
            <p className="text-white/40 text-[11px]">Administrador</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {ADMIN_NAV.map((item) => {
          const active = current === item.screen;
          return (
            <button key={item.label} onClick={() => onNavigate(item.screen)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center rounded-xl text-sm font-medium transition-all text-left
                ${collapsed ? "justify-center p-2.5" : "gap-3 px-3.5 py-2.5"}
                ${active ? "bg-white/15 text-white" : "text-white/55 hover:bg-white/10 hover:text-white/80"}`}>
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="flex-1">{item.label}</span>}
              {active && !collapsed && <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />}
            </button>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-3 border-t border-white/10">
        <button onClick={onToggleCollapse}
          className={`w-full flex items-center rounded-xl py-2 text-white/40 hover:text-white/70 hover:bg-white/10 transition-all duration-[220ms]
            ${collapsed ? "justify-center px-2" : "gap-2 px-3"}`}>
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span className="text-xs">Recolher menu</span></>}
        </button>
      </div>

      {/* User */}
      <div className={`p-3 border-t border-white/10 ${collapsed ? "flex justify-center" : ""}`}>
        {collapsed ? (
          <div className="w-8 h-8 bg-gradient-to-br from-violet-400 to-violet-600 rounded-full flex items-center justify-center text-white text-xs font-bold">AM</div>
        ) : (
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-400 to-violet-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">AM</div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">Ana Machado</p>
              <p className="text-white/40 text-xs truncate">Administradora</p>
            </div>
            <button onClick={() => setShowLogout(true)} className="text-white/30 hover:text-white/60 transition-colors shrink-0" title="Sair">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminTopBar({ title, subtitle, actions, onNavigate }: {
  title: string; subtitle?: string; actions?: React.ReactNode; onNavigate: NavFn;
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
          notifs={ADMIN_NOTIFS}
          onNavigate={onNavigate}
        />
        <AccountDropdown
          config={ADMIN_ACCOUNT}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
}

function AdminLayout({ current, onNavigate, title, subtitle, actions, children }: {
  current: string; onNavigate: NavFn;
  title: string; subtitle?: string; actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(() => sessionStorage.getItem("sb-collapsed") === "1");
  const toggleCollapsed = () => setCollapsed(c => { sessionStorage.setItem("sb-collapsed", c ? "0" : "1"); return !c; });
  return (
    <div className="flex w-full">
      <aside className={`flex flex-col shrink-0 sticky self-start transition-[width] duration-[220ms] ease-in-out ${collapsed ? "w-16" : "w-60"}`}
        style={{ backgroundColor: "#021025", top: 44, height: "calc(100vh - 44px)" }}>
        <AdminSidebarContent current={current} onNavigate={onNavigate} collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <AdminTopBar title={title} subtitle={subtitle} actions={actions} onNavigate={onNavigate} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-background overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

// ─── Shared mock data ─────────────────────────────────────────────────────────

const CANDIDATES = [
  { id: "#C-001", name: "Fernanda Oliveira", email: "fernanda.o@gmail.com", job: "Analista de Marketing", date: "11/08/2026", status: "Aguardando" as const, score: null },
  { id: "#C-002", name: "Rafael Mendes",     email: "rafael.m@gmail.com",   job: "Dev Full Stack",       date: "11/08/2026", status: "Em avaliação" as const, score: null },
  { id: "#C-003", name: "Isabela Costa",     email: "isabela.c@gmail.com",  job: "Gestora de Projetos",  date: "10/08/2026", status: "Concluído" as const, score: 8.4 },
  { id: "#C-004", name: "Paulo Carvalho",    email: "paulo.c@gmail.com",    job: "Designer UX/UI",       date: "10/08/2026", status: "Concluído" as const, score: 7.1 },
  { id: "#C-005", name: "Mariana Souza",     email: "mariana.s@gmail.com",  job: "Analista de RH",       date: "09/08/2026", status: "Concluído" as const, score: 9.0 },
  { id: "#C-006", name: "Lucas Ferreira",    email: "lucas.f@gmail.com",    job: "Analista de TI",       date: "09/08/2026", status: "Concluído" as const, score: 6.8 },
];

const EVALUATORS = [
  { id: "#AV-01", name: "Carlos Andrade",  email: "carlos.andrade@gmail.com", area: "RH Sênior",          pending: 8, done: 47, avg: 7.8, status: "Ativo" as const },
  { id: "#AV-02", name: "Beatriz Lima",   email: "beatriz.lima@gmail.com",    area: "Desenvolvimento",    pending: 3, done: 31, avg: 8.1, status: "Ativo" as const },
  { id: "#AV-03", name: "Eduardo Rocha",  email: "eduardo.rocha@gmail.com",   area: "Gestão de Projetos", pending: 0, done: 22, avg: 7.5, status: "Férias" as const },
  { id: "#AV-04", name: "Camila Dias",    email: "camila.dias@gmail.com",     area: "Design & UX",        pending: 5, done: 15, avg: 8.4, status: "Ativo" as const },
];

const INTERVIEWS = [
  { id: "#E-0041", candidate: "Fernanda Oliveira", job: "Analista de Marketing", date: "11/08/2026", status: "Aguardando" as const, evaluator: "—",              score: null },
  { id: "#E-0040", candidate: "Rafael Mendes",     job: "Dev Full Stack",        date: "11/08/2026", status: "Em avaliação" as const, evaluator: "Carlos A.",     score: null },
  { id: "#E-0039", candidate: "Isabela Costa",     job: "Gestora de Projetos",  date: "10/08/2026", status: "Concluído" as const, evaluator: "Beatriz L.",     score: 8.4 },
  { id: "#E-0038", candidate: "Paulo Carvalho",    job: "Designer UX/UI",        date: "10/08/2026", status: "Concluído" as const, evaluator: "Carlos A.",     score: 7.1 },
  { id: "#E-0037", candidate: "Mariana Souza",     job: "Analista de RH",       date: "09/08/2026", status: "Concluído" as const, evaluator: "Camila D.",     score: 9.0 },
];

const QUESTIONS_DATA = [
  { id: 1, text: "Fale sobre você e o que te motivou a se candidatar para esta vaga.", category: "Perfil", difficulty: "Básica",  uses: 247, active: true },
  { id: 2, text: "Descreva uma situação em que precisou lidar com um prazo apertado.", category: "Comportamental", difficulty: "Intermediária", uses: 231, active: true },
  { id: 3, text: "Qual é o seu maior ponto forte e como ele contribuiria para esta posição?", category: "Perfil", difficulty: "Básica", uses: 218, active: true },
  { id: 4, text: "Conte sobre uma experiência em que trabalhou em equipe para resolver um problema.", category: "Comportamental", difficulty: "Intermediária", uses: 205, active: true },
  { id: 5, text: "Onde você se vê profissionalmente daqui a três anos?", category: "Carreira", difficulty: "Básica", uses: 198, active: true },
  { id: 6, text: "Como você lida com situações de conflito no ambiente de trabalho?", category: "Comportamental", difficulty: "Avançada", uses: 124, active: true },
  { id: 7, text: "Descreva um projeto ou iniciativa do qual você se orgulha.", category: "Experiência", difficulty: "Intermediária", uses: 98, active: false },
];

// ─── Screen: Dashboard Administrativo ────────────────────────────────────────

// ─── Gráfico Interativo de Entrevistas por Mês ───────────────────────────────

function InterviewsChartCard() {
  const data6m = [
    { m: "Mar", v: 28, full: "Março" },
    { m: "Abr", v: 35, full: "Abril" },
    { m: "Mai", v: 42, full: "Maio" },
    { m: "Jun", v: 38, full: "Junho" },
    { m: "Jul", v: 51, full: "Julho" },
    { m: "Ago", v: 34, full: "Agosto" },
  ];
  const data12m = [
    { m: "Set", v: 19, full: "Setembro" },
    { m: "Out", v: 24, full: "Outubro" },
    { m: "Nov", v: 31, full: "Novembro" },
    { m: "Dez", v: 22, full: "Dezembro" },
    { m: "Jan", v: 27, full: "Janeiro" },
    { m: "Fev", v: 33, full: "Fevereiro" },
    ...data6m,
  ];

  const [period, setPeriod] = useState<"6m" | "12m">("6m");
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(false);
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, [period]);

  const data = period === "6m" ? data6m : data12m;
  const maxV = Math.max(...data.map(d => d.v));

  const toggle = (m: string) => setSelected(s => s === m ? null : m);

  return (
    <Card className="lg:col-span-2 p-5 sm:p-6">
      {/* Header */}
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

      {/* Bars */}
      <div className="flex items-end gap-1.5 sm:gap-2 h-40" style={{ overflow: "visible" }}>
        {data.map((d, i) => {
          const isHov = hovered === d.m;
          const isSel = selected === d.m;
          const barH = mounted ? Math.max((d.v / maxV) * 128, 4) : 0;
          return (
            <div
              key={d.m}
              className="flex-1 flex flex-col items-center gap-1.5 relative cursor-pointer select-none outline-none"
              onMouseEnter={() => setHovered(d.m)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => toggle(d.m)}
              onTouchStart={() => setHovered(d.m)}
              onTouchEnd={() => { toggle(d.m); setHovered(null); }}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === "Enter" && toggle(d.m)}
              aria-label={`${d.full}: ${d.v} entrevistas${isSel ? ", selecionado" : ""}`}
              aria-pressed={isSel}
            >
              {/* Tooltip */}
              {isHov && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                  <div className="bg-gray-900 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap leading-none">
                    {d.full} — {d.v} entrevistas
                  </div>
                  <div className="w-0 h-0 mx-auto" style={{
                    borderLeft: "5px solid transparent",
                    borderRight: "5px solid transparent",
                    borderTop: "5px solid #111827",
                  }} />
                </div>
              )}

              {/* Value label */}
              <span className={`text-[11px] font-bold leading-none transition-colors ${
                isSel ? "text-blue-600" : isHov ? "text-foreground" : "text-muted-foreground"
              }`}>{d.v}</span>

              {/* Bar */}
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

              {/* Month label */}
              <span className={`text-[11px] leading-none transition-colors ${
                isSel ? "text-blue-600 font-semibold" : isHov ? "text-foreground" : "text-muted-foreground"
              }`}>{d.m}</span>
            </div>
          );
        })}
      </div>

      {/* Selected state footer */}
      {selected && (
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            Filtrando por <span className="font-semibold text-blue-600">{data.find(d => d.m === selected)?.full}</span>
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

export function AdminDashboardScreen({ onNavigate }: { onNavigate: NavFn }) {
  const monthData = [
    { m: "Mar", v: 28 }, { m: "Abr", v: 35 }, { m: "Mai", v: 42 },
    { m: "Jun", v: 38 }, { m: "Jul", v: 51 }, { m: "Ago", v: 34 },
  ];
  const maxV = Math.max(...monthData.map(d => d.v));

  const activity = [
    { time: "11:42", user: "Carlos A.", action: "Avaliação enviada", detail: "#E-0040 · Score 8.2" },
    { time: "10:15", user: "Sistema",   action: "Nova entrevista recebida", detail: "#E-0041 · Fernanda Oliveira" },
    { time: "09:30", user: "Ana M.",    action: "Avaliador adicionado",  detail: "Beatriz Lima ativada" },
    { time: "08:55", user: "Beatriz L.",action: "Avaliação enviada",   detail: "#E-0039 · Score 8.4" },
  ];

  return (
    <AdminLayout current="admin-dashboard" onNavigate={onNavigate} title="Dashboard Administrativo" subtitle="Visão geral do sistema RH Connect · SENAC-DF">
      <div className="w-full space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard value="247"  label="Candidatos cadastrados" icon={Users}     color="bg-blue-50 text-blue-600" />
          <StatCard value="12"   label="Avaliadores ativos"     icon={UserCheck} color="bg-teal-50 text-teal-600" />
          <StatCard value="34"   label="Avaliações pendentes"   icon={Clock}     color="bg-amber-50 text-amber-600" />
          <StatCard value="7.8"  label="Score médio geral"      icon={Star}      color="bg-green-50 text-green-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Monthly chart — interactive */}
          <InterviewsChartCard />

          {/* Quick links */}
          <Card className="p-5 sm:p-6">
            <h3 className="font-bold text-foreground mb-4">Ações Rápidas</h3>
            <div className="space-y-2">
              {[
                { label: "Atribuir avaliações pendentes", screen: "admin-assign", count: 8 },
                { label: "Gerenciar candidatos",          screen: "admin-candidates", count: 247 },
                { label: "Adicionar pergunta",            screen: "admin-question-form", count: null },
                { label: "Ver logs de auditoria",         screen: "admin-audit", count: null },
              ].map(a => (
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

        {/* Recent activity */}
        <Card className="p-5 sm:p-6">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2"><History className="w-4 h-4" /> Atividade Recente</h3>
          <div className="space-y-3">
            {activity.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-xs text-muted-foreground w-12 shrink-0 pt-0.5">{a.time}</span>
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-foreground"><span className="font-semibold">{a.user}</span> · {a.action}</p>
                  <p className="text-xs text-muted-foreground">{a.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}

// ─── Screen: Gestão de Candidatos ────────────────────────────────────────────

export function AdminCandidatesScreen({ onNavigate }: { onNavigate: NavFn }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const filtered = CANDIDATES.filter(c =>
    (status === "all" || c.status === status) &&
    (c.name.toLowerCase().includes(search.toLowerCase()) || c.job.toLowerCase().includes(search.toLowerCase()))
  );

  const statusVariant = { "Aguardando": "warning", "Em avaliação": "info", "Concluído": "success" } as const;

  return (
    <AdminLayout current="admin-candidates" onNavigate={onNavigate}
      title="Gestão de Candidatos"
      subtitle={`${CANDIDATES.length} candidatos cadastrados`}
      actions={<Btn variant="outline" size="sm"><Download className="w-3.5 h-3.5" /> Exportar</Btn>}>
      <div className="w-full space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput
            containerClassName="flex-1"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar candidato ou vaga..."
            className="bg-white"
          />
          <div className="flex gap-2 flex-wrap">
            {["all","Aguardando","Em avaliação","Concluído"].map(s => (
              <FilterChip
                key={s}
                onClick={() => setStatus(s)}
                selected={status === s}
                className={status === s ? "py-2" : "bg-white py-2 hover:bg-muted"}
              >
                {s === "all" ? "Todos" : s}
              </FilterChip>
            ))}
          </div>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-5">ID</th>
                  <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4">Candidato</th>
                  <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4 hidden md:table-cell">Vaga</th>
                  <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4 hidden sm:table-cell">Data</th>
                  <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4">Status</th>
                  <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4">Score</th>
                  <th className="py-3 px-5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-5 font-mono text-xs text-muted-foreground">{c.id}</td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-foreground">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground hidden md:table-cell">{c.job}</td>
                    <td className="py-3.5 px-4 text-muted-foreground hidden sm:table-cell">{c.date}</td>
                    <td className="py-3.5 px-4"><Badge variant={statusVariant[c.status]}>{c.status}</Badge></td>
                    <td className="py-3.5 px-4">
                      {c.score !== null ? <Badge variant={c.score >= 8 ? "success" : c.score >= 7 ? "info" : "warning"}>{c.score}</Badge> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex gap-1.5">
                        <button onClick={() => onNavigate("admin-candidate-detail")} className="p-1.5 text-muted-foreground hover:text-primary rounded-lg hover:bg-muted transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                        <button className="p-1.5 text-muted-foreground hover:text-blue-600 rounded-lg hover:bg-muted transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
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

// ─── Screen: Gestão de Avaliadores ───────────────────────────────────────────

export function AdminEvaluatorsScreen({ onNavigate }: { onNavigate: NavFn }) {
  const [showAdd, setShowAdd] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteArea, setInviteArea] = useState("");
  const [lastInvite, setLastInvite] = useState<PendingEvaluatorInvite | null>(null);
  const [pendingInvites, setPendingInvites] = useState<PendingEvaluatorInvite[]>([
    {
      id: "pending-invite-001",
      name: "Patricia Gomes",
      email: "patricia.gomes@gmail.com",
    },
  ]);
  const statusVariant = { "Ativo": "success", "Férias": "warning" } as const;
  const canSendInvite = inviteName.trim().length > 0 && /^[^\s@]+@gmail\.com$/i.test(inviteEmail.trim());

  const handleSendInvite = () => {
    if (!canSendInvite) return;

    const invite = {
      id: `pending-invite-${Date.now()}`,
      name: inviteName.trim(),
      email: inviteEmail.trim(),
    };
    setPendingInvites((current) => [invite, ...current]);
    setLastInvite(invite);
    setInviteName("");
    setInviteEmail("");
    setInviteArea("");
    setShowAdd(false);
    setInviteSent(true);
    setTimeout(() => setInviteSent(false), 8000);
  };

  return (
    <AdminLayout current="admin-evaluators" onNavigate={onNavigate}
      title="Gestão de Avaliadores"
      subtitle={`${EVALUATORS.length} avaliadores cadastrados · ${pendingInvites.length} convite(s) pendente(s)`}
      actions={<Btn variant="primary" size="sm" onClick={() => { setShowAdd(true); setInviteSent(false); }}><Plus className="w-3.5 h-3.5" /> Convidar Avaliador</Btn>}>
      <div className="w-full space-y-4">
        {inviteSent && (
          <Alert variant="success" className="flex items-start gap-3 px-5 py-4">
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-green-800">Convite criado!</p>
              <p className="text-xs text-green-700 mt-0.5">
                {lastInvite ? `${lastInvite.name} ficou com status Aguardando ativação. ` : ""}
                O avaliador receberá orientações para ativar a conta.
              </p>
            </div>
            <button
              onClick={() => onNavigate("eval-activate")}
              className="text-xs text-green-700 underline underline-offset-2 hover:text-green-900 shrink-0 font-medium">
              Ver simulação da ativação
            </button>
          </Alert>
        )}

        {showAdd && (
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">Convidar Avaliador</h3>
              <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">O avaliador receberá orientações para definir sua própria senha e ativar a conta.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div><label className="block text-sm font-semibold text-foreground mb-1.5">Nome completo *</label>
                <Input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Ex: João Pereira" className="bg-white" /></div>
              <div><label className="block text-sm font-semibold text-foreground mb-1.5">E-mail *</label>
                <Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="nome@gmail.com" type="email" className="bg-white" /></div>
              <div><label className="block text-sm font-semibold text-foreground mb-1.5">Área de especialização</label>
                <Input value={inviteArea} onChange={e => setInviteArea(e.target.value)} placeholder="Ex: Recursos Humanos" className="bg-white" /></div>
            </div>
            <div className="flex gap-3">
              <Btn variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Btn>
              <Btn variant="primary" onClick={handleSendInvite} disabled={!canSendInvite}><Send className="w-3.5 h-3.5" /> Enviar Convite</Btn>
            </div>
          </Card>
        )}

        {pendingInvites.length > 0 && (
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-foreground text-sm">Convites pendentes</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Avaliador sem senha definida até concluir a ativação.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {pendingInvites.map(ev => (
                <div key={ev.id} className="border border-border rounded-xl p-4 bg-white">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-9 h-9 bg-amber-50 text-amber-700 rounded-xl flex items-center justify-center text-xs font-bold">
                      {ev.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                    </div>
                    <Badge variant="warning">Aguardando ativação</Badge>
                  </div>
                  <p className="font-bold text-foreground text-sm">{ev.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{ev.email}</p>
                  <p className="text-[11px] text-muted-foreground mt-3">Senha ainda não definida</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {EVALUATORS.map(ev => (
            <Card key={ev.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center text-white text-sm font-bold">
                  {ev.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                </div>
                <Badge variant={statusVariant[ev.status]}>{ev.status}</Badge>
              </div>
              <p className="font-bold text-foreground text-sm">{ev.name}</p>
              <p className="text-xs text-muted-foreground mb-1">{ev.area}</p>
              <p className="text-xs text-muted-foreground mb-3">{ev.email}</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-sm font-bold text-foreground">{ev.pending}</p>
                  <p className="text-[10px] text-muted-foreground">Pendentes</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-sm font-bold text-foreground">{ev.done}</p>
                  <p className="text-[10px] text-muted-foreground">Concluídas</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-sm font-bold text-foreground">{ev.avg}</p>
                  <p className="text-[10px] text-muted-foreground">Média</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Btn variant="ghost" size="sm" className="flex-1" onClick={() => onNavigate("admin-evaluator-form")}><Edit2 className="w-3 h-3" /></Btn>
                <Btn variant="ghost" size="sm" className="flex-1 text-red-500 hover:text-red-600"><Trash2 className="w-3 h-3" /></Btn>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}

// ─── Screen: Gestão de Entrevistas ───────────────────────────────────────────

export function AdminInterviewsScreen({ onNavigate }: { onNavigate: NavFn }) {
  const [search, setSearch] = useState("");
  const statusVariant = { "Aguardando": "warning", "Em avaliação": "info", "Concluído": "success" } as const;

  const filtered = INTERVIEWS.filter(i =>
    i.candidate.toLowerCase().includes(search.toLowerCase()) || i.job.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout current="admin-interviews" onNavigate={onNavigate}
      title="Gestão de Entrevistas"
      subtitle={`${INTERVIEWS.length} entrevistas registradas`}
      actions={<Btn variant="outline" size="sm"><Download className="w-3.5 h-3.5" /> Exportar</Btn>}>
      <div className="w-full space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <StatCard value="2"  label="Aguardando avaliação" icon={Clock}        color="bg-amber-50 text-amber-600" />
          <StatCard value="1"  label="Em avaliação"          icon={Video}        color="bg-blue-50 text-blue-600" />
          <StatCard value="15" label="Concluídas este mês"   icon={CheckCircle}  color="bg-green-50 text-green-600" />
        </div>

        <SearchInput
          containerClassName="max-w-sm"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar..."
          className="bg-white"
        />

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-5">ID</th>
                  <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4">Candidato</th>
                  <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4 hidden lg:table-cell">Vaga</th>
                  <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4 hidden sm:table-cell">Data</th>
                  <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4">Status</th>
                  <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4 hidden md:table-cell">Avaliador</th>
                  <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4">Score</th>
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
                    <td className="py-3.5 px-4"><Badge variant={statusVariant[i.status]}>{i.status}</Badge></td>
                    <td className="py-3.5 px-4 text-muted-foreground hidden md:table-cell">{i.evaluator}</td>
                    <td className="py-3.5 px-4">
                      {i.score !== null ? <Badge variant={i.score >= 8 ? "success" : "info"}>{i.score}</Badge> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-3.5 px-5">
                      <button onClick={() => onNavigate("admin-candidate-detail")} className="p-1.5 text-muted-foreground hover:text-primary rounded-lg hover:bg-muted transition-colors"><Eye className="w-3.5 h-3.5" /></button>
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

// ─── Screen: Atribuição de Avaliações ────────────────────────────────────────

export function AdminAssignScreen({ onNavigate }: { onNavigate: NavFn }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [assigned, setAssigned] = useState<Record<string, string>>({});

  const pending = INTERVIEWS.filter(i => i.status === "Aguardando");

  return (
    <AdminLayout current="admin-assign" onNavigate={onNavigate}
      title="Atribuição de Avaliações"
      subtitle="Associe entrevistas pendentes a avaliadores disponíveis">
      <div className="w-full space-y-4">
        <Alert variant="warning" className="flex items-start gap-3 p-4">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">{pending.length} entrevista{pending.length !== 1 ? "s" : ""} aguardando atribuição.</p>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Pending interviews */}
          <div>
            <h3 className="font-bold text-foreground mb-3">Entrevistas Pendentes</h3>
            <div className="space-y-2.5">
              {pending.map(i => (
                <button key={i.id} type="button" onClick={() => setSelected(i.id === selected ? null : i.id)} aria-pressed={selected === i.id}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selected === i.id ? "border-primary bg-blue-50" : "border-border bg-white hover:border-primary/30"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{i.candidate}</p>
                      <p className="text-sm text-muted-foreground">{i.job} · {i.date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {assigned[i.id] && <Badge variant="success">Atribuído</Badge>}
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
            ) : (
              <div className="space-y-2.5">
                {EVALUATORS.filter(e => e.status === "Ativo").map(ev => (
                  <button key={ev.id} onClick={() => { setAssigned(a => ({ ...a, [selected]: ev.name })); setSelected(null); }}
                    className="w-full text-left p-4 rounded-xl border border-border bg-white hover:border-primary hover:bg-blue-50 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center text-white text-xs font-bold">
                        {ev.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground">{ev.name}</p>
                        <p className="text-xs text-muted-foreground">{ev.area} · {ev.pending} pendentes</p>
                      </div>
                      <Badge variant="info">Média {ev.avg}</Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

// ─── Screen: Banco de Perguntas ───────────────────────────────────────────────

export function AdminQuestionsScreen({ onNavigate }: { onNavigate: NavFn }) {
  const [search, setSearch] = useState("");
  const filtered = QUESTIONS_DATA.filter(q =>
    q.text.toLowerCase().includes(search.toLowerCase()) ||
    q.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout current="admin-questions" onNavigate={onNavigate}
      title="Banco de Perguntas"
      subtitle={`${QUESTIONS_DATA.length} perguntas cadastradas`}
      actions={<Btn variant="primary" size="sm" onClick={() => onNavigate("admin-question-form")}><Plus className="w-3.5 h-3.5" /> Nova Pergunta</Btn>}>
      <div className="w-full space-y-4">
        <SearchInput
          containerClassName="max-w-sm"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar pergunta ou categoria..."
          className="bg-white"
        />

        <div className="space-y-3">
          {filtered.map(q => (
            <Card key={q.id} className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">{q.id}</div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-relaxed mb-2 ${!q.active ? "text-muted-foreground line-through" : "text-foreground"}`}>{q.text}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="info">{q.category}</Badge>
                    <Badge variant={q.difficulty === "Básica" ? "success" : q.difficulty === "Intermediária" ? "warning" : "error"}>{q.difficulty}</Badge>
                    <span className="text-xs text-muted-foreground">{q.uses} usos</span>
                    {!q.active && <Badge variant="default">Inativa</Badge>}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => onNavigate("admin-question-form")} className="p-1.5 text-muted-foreground hover:text-blue-600 rounded-lg hover:bg-muted transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button className="p-1.5 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-muted transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}

// ─── Screen: Formulário de Pergunta ──────────────────────────────────────────

export function AdminQuestionFormScreen({ onNavigate }: { onNavigate: NavFn }) {
  const [saved, setSaved] = useState(false);

  if (saved) {
    return (
      <AdminLayout current="admin-questions" onNavigate={onNavigate} title="Pergunta Salva">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Pergunta salva!</h2>
            <p className="text-muted-foreground mb-5 text-sm">A pergunta foi adicionada ao banco com sucesso.</p>
            <div className="flex gap-3 justify-center">
              <Btn variant="outline" onClick={() => setSaved(false)}>Adicionar outra</Btn>
              <Btn variant="primary" onClick={() => onNavigate("admin-questions")}>Ver banco de perguntas</Btn>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout current="admin-questions" onNavigate={onNavigate}
      title="Nova Pergunta"
      subtitle="Adicionar ao banco de perguntas">
      <div className="w-full max-w-2xl space-y-5">
        <Card className="p-5 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Texto da pergunta *</label>
            <Textarea rows={3} placeholder="Digite o enunciado completo da pergunta..."
              className="min-h-0 bg-white resize-none" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Categoria *</label>
              <NativeSelect className="bg-white">
                <option value="">Selecione...</option>
                {["Perfil","Comportamental","Carreira","Experiência","Técnica"].map(c => <option key={c}>{c}</option>)}
              </NativeSelect>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Nível de dificuldade *</label>
              <NativeSelect className="bg-white">
                <option value="">Selecione...</option>
                {["Básica","Intermediária","Avançada"].map(d => <option key={d}>{d}</option>)}
              </NativeSelect>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Orientação ao avaliador <span className="text-muted-foreground font-normal">(opcional)</span></label>
            <Textarea rows={2} placeholder="Dicas de o que observar nesta resposta..."
              className="min-h-0 bg-white resize-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Resposta esperada / exemplos <span className="text-muted-foreground font-normal">(opcional)</span></label>
            <Textarea rows={3} placeholder="Elementos de uma boa resposta..."
              className="min-h-0 bg-white resize-none" />
          </div>
        </Card>

        <div className="flex gap-3">
          <Btn variant="outline" onClick={() => onNavigate("admin-questions")}><ChevronLeft className="w-3.5 h-3.5" /> Cancelar</Btn>
          <Btn variant="primary" className="flex-1" onClick={() => setSaved(true)}>Salvar Pergunta</Btn>
        </div>
      </div>
    </AdminLayout>
  );
}

// ─── Screen: Cargos e Áreas ───────────────────────────────────────────────────

export function AdminRolesScreen({ onNavigate }: { onNavigate: NavFn }) {
  const [showAdd, setShowAdd] = useState(false);
  const roles = [
    { title: "Analista de Marketing Digital", area: "Marketing",     active: 12, status: "Ativo" },
    { title: "Desenvolvedor Full Stack",       area: "Tecnologia",    active: 8,  status: "Ativo" },
    { title: "Gestora de Projetos",            area: "Gestão",        active: 5,  status: "Ativo" },
    { title: "Designer UX/UI",                area: "Design",        active: 4,  status: "Ativo" },
    { title: "Analista de RH",                area: "RH",            active: 7,  status: "Ativo" },
    { title: "Assistente Administrativo",      area: "Administrativo",active: 11, status: "Ativo" },
    { title: "Técnico em Informática",        area: "Tecnologia",    active: 3,  status: "Inativo" },
  ];

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
              <div><label className="block text-sm font-semibold text-foreground mb-1.5">Área / Departamento *</label>
                <Input placeholder="Ex: Tecnologia" className="bg-white" /></div>
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
                    <td className="py-3.5 px-4 text-muted-foreground hidden sm:table-cell">{r.active}</td>
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

// ─── Screen: Critérios de Avaliação ──────────────────────────────────────────

export function AdminCriteriaScreen({ onNavigate }: { onNavigate: NavFn }) {
  const criteria = [
    { name: "Clareza",      weight: "15%", desc: "Expressão clara e objetiva", active: true },
    { name: "Coerência",    weight: "15%", desc: "Lógica e consistência interna", active: true },
    { name: "Objetividade", weight: "10%", desc: "Foco na resposta, sem digressões", active: true },
    { name: "Comunicação",  weight: "20%", desc: "Qualidade verbal e vocabulário", active: true },
    { name: "Domínio",      weight: "25%", desc: "Conhecimento técnico da área", active: true },
    { name: "Organização",  weight: "10%", desc: "Estrutura da resposta", active: true },
    { name: "Segurança",    weight: "5%",  desc: "Confiança e postura", active: true },
  ];

  return (
    <AdminLayout current="admin-criteria" onNavigate={onNavigate}
      title="Critérios de Avaliação"
      subtitle="Configure os critérios e pesos usados nas avaliações">
      <div className="w-full space-y-4">
        <Alert variant="info" className="flex items-start gap-3 p-4">
          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">Os pesos devem somar 100%. Alterações afetam todas as avaliações futuras.</p>
        </Alert>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-5">Critério</th>
                  <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4">Descrição</th>
                  <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4">Peso</th>
                  <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4">Status</th>
                  <th className="py-3 px-5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {criteria.map(c => (
                  <tr key={c.name} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-5 font-semibold text-foreground">{c.name}</td>
                    <td className="py-3.5 px-4 text-muted-foreground">{c.desc}</td>
                    <td className="py-3.5 px-4"><Badge variant="info">{c.weight}</Badge></td>
                    <td className="py-3.5 px-4"><Badge variant="success">Ativo</Badge></td>
                    <td className="py-3.5 px-5">
                      <button className="p-1.5 text-muted-foreground hover:text-blue-600 rounded-lg hover:bg-muted transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-border flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Soma total dos pesos: <span className="font-bold text-foreground">100%</span></p>
            <Btn variant="primary" size="sm">Salvar Alterações</Btn>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}

// ─── Screen: Consentimentos e Privacidade ────────────────────────────────────

export function AdminConsentScreen({ onNavigate }: { onNavigate: NavFn }) {
  const requests = [
    { id: "#C-032", candidate: "Fernanda Oliveira", type: "Exclusão de dados",            date: "11/08/2026", status: "Pendente" as const },
    { id: "#C-018", candidate: "Paulo Carvalho",    type: "Cópia dos dados",              date: "09/08/2026", status: "Em análise" as const },
    { id: "#C-009", candidate: "Ana Rodrigues",     type: "Revogação do consentimento de IA", date: "06/08/2026", status: "Pendente" as const },
  ];

  return (
    <AdminLayout current="admin-consent" onNavigate={onNavigate}
      title="Consentimentos e Privacidade"
      subtitle="Gestão de consentimentos LGPD e solicitações de privacidade">
      <div className="w-full space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard value="124" label="Consentimentos ativos"    icon={CheckCircle} color="bg-green-50 text-green-600" />
          <StatCard value="3"   label="Solicitações pendentes"   icon={AlertCircle} color="bg-red-50 text-red-600" />
          <StatCard value="18"  label="Autorizaram uso em IA"    icon={Shield}      color="bg-purple-50 text-purple-600" />
        </div>

        <Card className="p-5 sm:p-6">
          <h3 className="font-bold text-foreground mb-4">Solicitações Pendentes</h3>
          <div className="space-y-3">
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
              { label: "Exigir consentimento para gravação de vídeo",   on: true },
              { label: "Exigir consentimento para uso em IA/ML",        on: true },
              { label: "Permitir exportação de dados pelo candidato",   on: true },
              { label: "Notificar candidato em caso de incidente",      on: true },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-foreground">{s.label}</p>
                <div className={`w-10 h-6 rounded-full relative ${s.on ? "bg-primary" : "bg-muted-foreground/30"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${s.on ? "translate-x-4" : "translate-x-0.5"}`} />
                </div>
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
  const logs = [
    { time: "11/08 11:42", user: "carlos.andrade", action: "EVALUATION_SUBMITTED", detail: "Avaliação #E-0040 enviada · Score: 8.2", ip: "10.0.0.14" },
    { time: "11/08 10:15", user: "sistema",         action: "INTERVIEW_RECEIVED",  detail: "Entrevista #E-0041 recebida do candidato #C-001", ip: "—" },
    { time: "11/08 09:30", user: "ana.machado",     action: "USER_CREATED",        detail: "Avaliador beatriz.lima ativado no sistema",        ip: "10.0.0.2" },
    { time: "11/08 08:55", user: "beatriz.lima",    action: "EVALUATION_SUBMITTED",detail: "Avaliação #E-0039 enviada · Score: 8.4",           ip: "10.0.0.21" },
    { time: "10/08 17:20", user: "ana.machado",     action: "CRITERIA_UPDATED",    detail: "Peso do critério Domínio alterado: 20% → 25%",     ip: "10.0.0.2" },
    { time: "10/08 16:45", user: "carlos.andrade",  action: "INTERVIEW_ASSIGNED",  detail: "Entrevista #E-0038 atribuída a carlos.andrade",    ip: "10.0.0.14" },
    { time: "10/08 14:00", user: "sistema",         action: "CONSENT_REQUEST",     detail: "Solicitação de exclusão #C-032 recebida",          ip: "—" },
  ].filter(l => search === "" || l.user.includes(search) || l.action.includes(search) || l.detail.toLowerCase().includes(search.toLowerCase()));

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
              <div><label className="block text-sm font-semibold text-foreground mb-1.5">Tempo máximo de vídeo (min)</label>
                <Input defaultValue="3" type="number" className="bg-white" /></div>
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
              { label: "Criptografia de gravações em repouso",    on: true },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-foreground">{s.label}</p>
                <div className={`w-10 h-6 rounded-full relative ${s.on ? "bg-primary" : "bg-muted-foreground/30"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${s.on ? "translate-x-4" : "translate-x-0.5"}`} />
                </div>
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
              { name: "Armazenamento em nuvem",  status: "Conectado",     color: "text-green-600" },
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
                <div className={`w-10 h-6 rounded-full relative ${s.on ? "bg-primary" : "bg-muted-foreground/30"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${s.on ? "translate-x-4" : "translate-x-0.5"}`} />
                </div>
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

// ─── Screen: Detalhe do Candidato ─────────────────────────────────────────────

export function AdminCandidateDetailScreen({ onNavigate }: { onNavigate: NavFn }) {
  const candidate = CANDIDATES[0];
  const interview = INTERVIEWS[0];

  const criteriaScores = [
    { name: "Clareza",      score: 9 },
    { name: "Coerência",    score: 8 },
    { name: "Objetividade", score: 8 },
    { name: "Comunicação",  score: 7 },
    { name: "Domínio",      score: 7 },
    { name: "Organização",  score: 8 },
    { name: "Segurança",    score: 6 },
  ];

  const timeline = [
    { date: "09/08/2026", label: "Candidatura recebida", icon: FileText },
    { date: "10/08/2026", label: "Entrevista realizada",  icon: Video },
    { date: "11/08/2026", label: "Em avaliação",          icon: Clock },
  ];

  return (
    <AdminLayout current="admin-candidates" onNavigate={onNavigate}
      title="Detalhe do Candidato"
      subtitle={`${candidate.name} · ${candidate.job}`}
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
              {candidate.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-xl font-bold text-foreground">{candidate.name}</h2>
                  <p className="text-muted-foreground text-sm">{candidate.email}</p>
                  <p className="text-muted-foreground text-sm mt-0.5">{candidate.job}</p>
                </div>
                <Badge variant={candidate.status === "Concluído" ? "success" : candidate.status === "Em avaliação" ? "info" : "warning"}>
                  {candidate.status}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Timeline */}
          <Card className="p-5 lg:col-span-1">
            <h3 className="font-bold text-foreground mb-4">Linha do Tempo</h3>
            <div className="space-y-4">
              {timeline.map((t, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <t.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Interview info */}
          <Card className="p-5 lg:col-span-2">
            <h3 className="font-bold text-foreground mb-4">Dados da Entrevista</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-0.5">ID da Entrevista</p>
                <p className="font-mono font-semibold text-foreground">{interview.id}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Data</p>
                <p className="font-semibold text-foreground">{interview.date}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Avaliador Responsável</p>
                <p className="font-semibold text-foreground">{interview.evaluator === "—" ? "Não atribuído" : interview.evaluator}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Score Final</p>
                {interview.score !== null
                  ? <Badge variant={interview.score >= 8 ? "success" : interview.score >= 7 ? "info" : "warning"}>{interview.score}</Badge>
                  : <span className="text-muted-foreground">Aguardando avaliação</span>}
              </div>
            </div>

            {/* Score criteria — only if completed */}
            {interview.score !== null && (
              <div className="mt-5 pt-5 border-t border-border">
                <p className="font-semibold text-foreground mb-3 text-sm">Scores por Critério</p>
                <div className="space-y-2.5">
                  {criteriaScores.map(s => (
                    <div key={s.name} className="flex items-center gap-3">
                      <span className="text-xs text-foreground w-24 shrink-0">{s.name}</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-1.5 rounded-full ${s.score >= 8 ? "bg-green-500" : s.score >= 6 ? "bg-blue-500" : "bg-amber-500"}`}
                          style={{ width: `${s.score * 10}%` }} />
                      </div>
                      <span className={`text-xs font-bold w-5 text-right ${s.score >= 8 ? "text-green-600" : s.score >= 6 ? "text-blue-600" : "text-amber-600"}`}>
                        {s.score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Btn variant="outline" onClick={() => onNavigate("admin-candidates")}>
            Voltar à Lista
          </Btn>
          {candidate.status !== "Concluído" && (
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

export function AdminEvaluatorFormScreen({ onNavigate }: { onNavigate: NavFn }) {
  const isEdit = true;
  const defaultData = isEdit ? EVALUATORS[0] : null;

  const [form, setForm] = useState({
    name:   defaultData?.name  ?? "",
    email:  defaultData?.email ?? "",
    area:   defaultData?.area  ?? "",
    status: defaultData?.status ?? "Ativo",
  });
  const [saved, setSaved] = useState(false);

  const field = (key: keyof typeof form, label: string, type = "text", placeholder = "") => (
    <div>
      <label className="block text-sm font-semibold text-foreground mb-1.5">{label} *</label>
      <Input
        type={type}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="bg-white"
      />
    </div>
  );

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => { setSaved(false); onNavigate("admin-evaluators"); }, 1500);
  };

  return (
    <AdminLayout current="admin-evaluators" onNavigate={onNavigate}
      title={isEdit ? "Editar Avaliador" : "Novo Avaliador"}
      subtitle={isEdit ? `Editando: ${defaultData?.name}` : "Preencha os dados do novo avaliador"}
      actions={
        <Btn variant="outline" size="sm" onClick={() => onNavigate("admin-evaluators")}>
          Voltar
        </Btn>
      }>
      <div className="w-full max-w-2xl space-y-4">
        {saved && (
          <Alert variant="success" className="flex items-center gap-3 px-5 py-3.5 text-green-700">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span className="text-sm font-semibold">Avaliador salvo com sucesso! Redirecionando...</span>
          </Alert>
        )}

        <Card className="p-6 space-y-4">
          <h3 className="font-bold text-foreground">Dados Pessoais</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field("name",  "Nome completo",        "text",  "Ex: João Pereira")}
            {field("email", "E-mail", "email", "nome@gmail.com")}
            {field("area",  "Área de especialização", "text", "Ex: Recursos Humanos")}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Status</label>
              <NativeSelect
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="bg-white">
                <option value="Ativo">Ativo</option>
                <option value="Férias">Férias</option>
                <option value="Inativo">Inativo</option>
              </NativeSelect>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-foreground mb-4">Permissões de Avaliação</h3>
          <div className="space-y-3">
            {[
              { label: "Avaliar entrevistas de candidatos",         on: true },
              { label: "Visualizar histórico completo",             on: true },
              { label: "Exportar relatórios individuais",           on: false },
              { label: "Receber atribuições automáticas do sistema", on: true },
            ].map(p => (
              <div key={p.label} className="flex items-center justify-between gap-4 py-2">
                <p className="text-sm text-foreground">{p.label}</p>
                <div className={`w-10 h-6 rounded-full relative cursor-pointer ${p.on ? "bg-primary" : "bg-muted-foreground/30"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${p.on ? "translate-x-4" : "translate-x-0.5"}`} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex gap-3">
          <Btn variant="outline" onClick={() => onNavigate("admin-evaluators")}>Cancelar</Btn>
          <Btn variant="primary" className="flex-1" onClick={handleSave} disabled={saved}>
            <Check className="w-3.5 h-3.5" /> {isEdit ? "Salvar Alterações" : "Cadastrar Avaliador"}
          </Btn>
        </div>
      </div>
    </AdminLayout>
  );
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
            { label: "Avaliadores", desc: "Convide, gerencie e monitore avaliadores" },
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
    icon: Video,
    color: "bg-blue-100 text-blue-600",
    title: "Entrevistas e atribuições",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Controle as <strong className="text-foreground">entrevistas em vídeo</strong> realizadas pelos candidatos e distribua as avaliações para os avaliadores disponíveis.</p>
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
  {
    id: 2,
    icon: Target,
    color: "bg-amber-100 text-amber-600",
    title: "Perguntas e critérios",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Configure o conteúdo avaliativo da plataforma: as <strong className="text-foreground">perguntas</strong> usadas nas entrevistas e os <strong className="text-foreground">critérios</strong> de pontuação dos avaliadores.</p>
        <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
          <Zap className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">Mantenha o banco de perguntas atualizado e os critérios alinhados com os objetivos do processo seletivo.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {["Banco de perguntas", "Critérios de avaliação", "Cargos e áreas", "Consentimentos"].map(label => (
            <div key={label} className="flex items-center gap-1.5 p-2 bg-muted/50 rounded-lg">
              <Check className="w-3 h-3 text-primary shrink-0" />
              <span className="font-medium text-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

export function AdminOnboardingScreen({ onNavigate }: { onNavigate: NavFn }) {
  const [step, setStep] = useState(0);
  const current = ADMIN_ONBOARDING_STEPS[step];
  const Icon = current.icon;
  const isLast = step === ADMIN_ONBOARDING_STEPS.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50 flex flex-col">
      <AdminLogoHeader />
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {ADMIN_ONBOARDING_STEPS.map((s, i) => (
              <div key={s.id} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? "w-8 bg-violet-600" : i < step ? "w-4 bg-violet-300" : "w-4 bg-muted"}`} />
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-border shadow-sm p-6 sm:p-8">
            {/* Avatar + Icon */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white text-lg font-bold">AM</div>
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
                <Btn variant="primary" className="flex-1" onClick={() => onNavigate("admin-dashboard")}>
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
  );
}
