/** RH Connect — Telas do Avaliador */

import { useState, useEffect } from "react";
import {
  Home, Clock, History, BookOpen, Settings, LogOut,
  ChevronLeft, ChevronRight, Bell, CheckCircle, AlertCircle,
  Star, Award, Target, TrendingUp,
  Filter, Eye, FileText,
  Edit2, Send, Download, BarChart2, Layers, RefreshCw,
  MessageSquare, Info, Users, ArrowRight, Zap, Lock,
} from "lucide-react";
import {
  AccountDropdown, NotificationDropdown,
  EVAL_ACCOUNT, EVAL_NOTIFS,
} from "./header-popovers";
import { RHConnectLogo } from "./brand/rh-connect-logo";
import { Input } from "./ui/input";
import { SearchInput } from "./ui/search-input";
import { PasswordInput } from "./ui/password-input";
import { Textarea } from "./ui/textarea";
import { Button as UIButton } from "./ui/button";
import { Card as UICard } from "./ui/card";
import { Badge as UIBadge } from "./ui/badge";
import { StatusBadge as UIStatusBadge } from "./ui/status-badge";
import { Alert } from "./ui/alert";
import { FilterChip } from "./ui/filter-chip";
import { EmptyState } from "./ui/empty-state";

type NavFn = (s: string) => void;
type ActivationScenario = "valid" | "invalid" | "expired" | "used";

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

function Badge({ variant = "default", children, className = "" }: {
  variant?: "default" | "success" | "warning" | "error" | "info" | "purple";
  children: React.ReactNode;
  className?: string;
}) {
  const vars = {
    default: "bg-slate-100 text-slate-600",
    success: "bg-green-100 text-green-700",
    warning: "bg-amber-100 text-amber-700",
    error:   "bg-red-100 text-red-700",
    info:    "bg-blue-100 text-blue-700",
    purple:  "bg-purple-100 text-purple-700",
  };
  return (
    <UIBadge variant="neutral" className={`font-semibold ${vars[variant]} ${className}`}>
      {children}
    </UIBadge>
  );
}

function StatusBadge({ tone = "neutral", children, className = "" }: {
  tone?: "neutral" | "info" | "success" | "warning" | "danger" | "error";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <UIStatusBadge tone={tone} appearance="soft" className={`font-semibold ${className}`}>
      {children}
    </UIStatusBadge>
  );
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

const EVAL_NAV = [
  { icon: Home,        label: "Dashboard",         screen: "eval-dashboard" },
  { icon: Layers,      label: "Fila de Avaliações", screen: "eval-queue" },
  { icon: Clock,       label: "Em Andamento",       screen: "eval-active" },
  { icon: History,     label: "Histórico",          screen: "eval-history" },
  { icon: BookOpen,    label: "Guia de Critérios",  screen: "eval-criteria" },
  { icon: Settings,    label: "Configurações",      screen: "eval-settings" },
];

function EvalSidebarContent({
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
            <p className="text-white/40 text-[11px]">Avaliador</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {EVAL_NAV.map((item) => {
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
          <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white text-xs font-bold">CA</div>
        ) : (
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">CA</div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">Carlos Andrade</p>
              <p className="text-white/40 text-xs truncate">Avaliador humano</p>
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

function EvalTopBar({ title, subtitle, actions, onNavigate }: {
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
          notifs={EVAL_NOTIFS}
          onNavigate={onNavigate}
        />
        <AccountDropdown
          config={EVAL_ACCOUNT}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
}

function EvalLayout({ current, onNavigate, title, subtitle, actions, children }: {
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
        <EvalSidebarContent current={current} onNavigate={onNavigate} collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <EvalTopBar title={title} subtitle={subtitle} actions={actions} onNavigate={onNavigate} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-background overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

// ─── Shared data ──────────────────────────────────────────────────────────────

const CRITERIA_GUIDE = [
  { name: "Clareza", desc: "Avalie se o candidato se expressa de forma clara e objetiva, sem ambiguidades.", weight: "15%", tip: "Score ≥ 8: linguagem direta e fácil de seguir. Score < 6: respostas vagas ou confusas." },
  { name: "Coerência", desc: "Verifique se as ideias apresentadas têm relação lógica e consistência interna.", weight: "15%", tip: "Score ≥ 8: boa relação entre argumentos. Score < 6: contradições ou incoerências." },
  { name: "Objetividade", desc: "O candidato manteve o foco na pergunta sem se desviar para temas irrelevantes?", weight: "10%", tip: "Score ≥ 8: resposta direta ao ponto. Score < 6: muitas digressões." },
  { name: "Domínio", desc: "Demonstração de conhecimento técnico ou experiência na área da vaga.", weight: "20%", tip: "Score ≥ 8: domínio evidente com exemplos concretos. Score < 6: conhecimento superficial." },
  { name: "Organização", desc: "A resposta teve estrutura bem definida: introdução, desenvolvimento e conclusão?", weight: "15%", tip: "Score ≥ 8: resposta bem estruturada. Score < 6: resposta sem organização aparente." },
  { name: "Aderência aos requisitos", desc: "A resposta dialoga com os requisitos extraídos da vaga e com o contexto profissional apresentado?", weight: "15%", tip: "Score ≥ 8: forte relação com a vaga. Score < 6: pouca conexão com os requisitos." },
  { name: "Capacidade de exemplificar", desc: "O candidato sustentou a resposta com exemplos, evidências ou situações concretas?", weight: "10%", tip: "Score ≥ 8: exemplos específicos e relevantes. Score < 6: ausência de exemplos." },
];

const QUEUE_ITEMS = [
  { id: "#E-0041", candidate: "Fernanda Oliveira", job: "Desenvolvedora Front-end", submitted: "11/08/2026 09:14", priority: "high" as const, questions: 5 },
  { id: "#E-0040", candidate: "Rafael Mendes",     job: "Desenvolvedor Full Stack",      submitted: "11/08/2026 08:52", priority: "normal" as const, questions: 5 },
  { id: "#E-0039", candidate: "Isabela Costa",     job: "Analista de Recrutamento e Seleção", submitted: "10/08/2026 17:30", priority: "normal" as const, questions: 5 },
  { id: "#E-0038", candidate: "Paulo Carvalho",    job: "Designer UX/UI",                submitted: "10/08/2026 16:45", priority: "low" as const, questions: 5 },
  { id: "#E-0037", candidate: "Mariana Souza",     job: "Analista de RH",               submitted: "10/08/2026 14:20", priority: "low" as const, questions: 5 },
];

const HISTORY_ITEMS = [
  { id: "#E-0036", candidate: "Lucas Ferreira",   job: "Analista de TI",               date: "09/08/2026", score: 8.4, time: "22 min", status: "completed" as const },
  { id: "#E-0035", candidate: "Ana Rodrigues",    job: "Analista de Recrutamento e Seleção", date: "08/08/2026", score: 7.1, time: "19 min", status: "completed" as const },
  { id: "#E-0034", candidate: "Diego Santos",     job: "Técnico em Informática",        date: "08/08/2026", score: 6.8, time: "24 min", status: "completed" as const },
  { id: "#E-0033", candidate: "Camila Nunes",     job: "Secretária Executiva",          date: "07/08/2026", score: 9.1, time: "17 min", status: "completed" as const },
  { id: "#E-0032", candidate: "Thiago Barbosa",   job: "Desenvolvedor Full Stack",     date: "07/08/2026", score: 7.9, time: "21 min", status: "completed" as const },
  { id: "#E-0031", candidate: "Juliana Pires",    job: "Assessora Executiva",           date: "06/08/2026", score: 8.6, time: "20 min", status: "completed" as const },
];

// ─── Gráfico Interativo — Esta Semana ────────────────────────────────────────

type WeekDay = { day: string; full: string; count: number };

const WEEK_DATASETS: Record<number, WeekDay[]> = {
  0: [
    { day: "Seg", full: "Segunda-feira", count: 3 },
    { day: "Ter", full: "Terça-feira",   count: 5 },
    { day: "Qua", full: "Quarta-feira",  count: 4 },
    { day: "Qui", full: "Quinta-feira",  count: 7 },
    { day: "Sex", full: "Sexta-feira",   count: 6 },
    { day: "Sáb", full: "Sábado",        count: 2 },
  ],
  [-1]: [
    { day: "Seg", full: "Segunda-feira", count: 5 },
    { day: "Ter", full: "Terça-feira",   count: 4 },
    { day: "Qua", full: "Quarta-feira",  count: 6 },
    { day: "Qui", full: "Quinta-feira",  count: 3 },
    { day: "Sex", full: "Sexta-feira",   count: 8 },
    { day: "Sáb", full: "Sábado",        count: 1 },
  ],
  1: [
    { day: "Seg", full: "Segunda-feira", count: 2 },
    { day: "Ter", full: "Terça-feira",   count: 4 },
    { day: "Qua", full: "Quarta-feira",  count: 3 },
    { day: "Qui", full: "Quinta-feira",  count: 5 },
    { day: "Sex", full: "Sexta-feira",   count: 4 },
    { day: "Sáb", full: "Sábado",        count: 0 },
  ],
};

function EvalWeekChartCard({ onDaySelect }: { onDaySelect?: (day: string | null) => void }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(false);
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, [weekOffset]);

  const data: WeekDay[] = WEEK_DATASETS[weekOffset] ?? WEEK_DATASETS[0];
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const total = data.reduce((s, d) => s + d.count, 0);

  const weekLabel = weekOffset === 0 ? "Esta semana" : weekOffset === -1 ? "Semana anterior" : "Próxima semana";

  const toggle = (day: string) => {
    const next = selected === day ? null : day;
    setSelected(next);
    onDaySelect?.(next);
  };

  const clearSelection = () => { setSelected(null); onDaySelect?.(null); };

  return (
    <Card className="p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-blue-500" />
          {weekLabel}
        </h3>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => { setWeekOffset(o => Math.max(o - 1, -1)); setSelected(null); }}
            disabled={weekOffset <= -1}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Semana anterior"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { setWeekOffset(o => Math.min(o + 1, 1)); setSelected(null); }}
            disabled={weekOffset >= 1}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Próxima semana"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bars */}
      <div className="flex items-end gap-2 h-32" style={{ overflow: "visible" }}>
        {data.map((d, i) => {
          const isHov = hovered === d.day;
          const isSel = selected === d.day;
          const barH = mounted && d.count > 0 ? Math.max((d.count / maxCount) * 80, 4) : 0;

          return (
            <div
              key={d.day}
              className="flex-1 flex flex-col items-center gap-1.5 relative cursor-pointer select-none outline-none"
              onMouseEnter={() => setHovered(d.day)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => toggle(d.day)}
              onTouchStart={() => setHovered(d.day)}
              onTouchEnd={() => { toggle(d.day); setHovered(null); }}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === "Enter" && toggle(d.day)}
              aria-label={`${d.full}: ${d.count} avaliações${isSel ? ", selecionado" : ""}`}
              aria-pressed={isSel}
            >
              {/* Tooltip */}
              {isHov && d.count > 0 && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                  <div className="bg-gray-900 text-white text-[10px] font-semibold px-2 py-1.5 rounded-lg shadow-xl whitespace-nowrap leading-none">
                    {d.full} — {d.count} avaliações
                  </div>
                  <div className="w-0 h-0 mx-auto" style={{
                    borderLeft: "4px solid transparent",
                    borderRight: "4px solid transparent",
                    borderTop: "4px solid #111827",
                  }} />
                </div>
              )}

              {/* Value */}
              <span className={`text-[10px] font-bold leading-none transition-colors ${
                isSel ? "text-blue-600" : isHov ? "text-foreground" : "text-muted-foreground"
              }`}>{d.count > 0 ? d.count : ""}</span>

              {/* Bar */}
              <div
                className={`w-full rounded-t-lg transition-colors ${
                  d.count === 0 ? "bg-muted/40" :
                  isSel ? "bg-blue-600" :
                  isHov ? "bg-blue-500" : "bg-primary/80"
                }`}
                style={{
                  height: `${d.count === 0 ? 3 : barH}px`,
                  boxShadow: isSel ? "0 0 0 2px white, 0 0 0 3px #93c5fd" : undefined,
                  transition: `height 0.42s cubic-bezier(0.4,0,0.2,1) ${i * 40}ms, background-color 0.15s, box-shadow 0.15s`,
                }}
              />

              {/* Day label */}
              <span className={`text-[10px] leading-none transition-colors ${
                isSel ? "text-blue-600 font-semibold" : isHov ? "text-foreground" : "text-muted-foreground"
              }`}>{d.day}</span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-border space-y-2">
        <p className="text-xs text-muted-foreground">
          Total na semana: <span className="font-bold text-foreground">{total}</span> avaliações
        </p>
        {selected && (
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">
              Filtrando por <span className="font-semibold text-blue-600">{data.find(d => d.day === selected)?.full}</span>
            </p>
            <button
              onClick={clearSelection}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors underline"
            >
              Limpar
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Screen: Dashboard do Avaliador ──────────────────────────────────────────

export function EvalDashboardScreen({ onNavigate }: { onNavigate: NavFn }) {
  return (
    <EvalLayout current="eval-dashboard" onNavigate={onNavigate} title="Dashboard" subtitle="Bem-vindo de volta, Carlos. Você tem 8 avaliações pendentes.">
      <div className="w-full space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard value="8"    label="Avaliações pendentes" icon={Layers}    color="bg-amber-50 text-amber-600" />
          <StatCard value="3"    label="Concluídas hoje"      icon={CheckCircle} color="bg-green-50 text-green-600" />
          <StatCard value="7.8"  label="Média geral de score" icon={Star}       color="bg-blue-50 text-blue-600" />
          <StatCard value="19m"  label="Tempo médio de avaliação" icon={Clock}      color="bg-purple-50 text-purple-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Queue preview */}
          <Card className="lg:col-span-2 p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground flex items-center gap-2"><Layers className="w-4 h-4 text-amber-500" /> Próximas na Fila</h3>
              <Btn variant="ghost" size="sm" onClick={() => onNavigate("eval-queue")}>Ver todas <ChevronRight className="w-3.5 h-3.5" /></Btn>
            </div>
            <div className="space-y-2.5">
              {QUEUE_ITEMS.slice(0, 3).map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${item.priority === "high" ? "bg-red-500" : item.priority === "normal" ? "bg-amber-500" : "bg-slate-300"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{item.candidate}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.job} · {item.submitted.split(" ")[0]}</p>
                  </div>
                  <Btn variant="outline" size="sm" onClick={() => onNavigate("eval-screen")}>Avaliar</Btn>
                </div>
              ))}
            </div>
          </Card>

          {/* Weekly chart — interativo */}
          <EvalWeekChartCard />
        </div>

        {/* Recent completed */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-foreground flex items-center gap-2"><History className="w-4 h-4 text-green-500" /> Recém Concluídas</h3>
            <Btn variant="ghost" size="sm" onClick={() => onNavigate("eval-history")}>Histórico completo <ChevronRight className="w-3.5 h-3.5" /></Btn>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left font-semibold text-muted-foreground text-xs py-2 pr-4">Candidato</th>
                  <th className="text-left font-semibold text-muted-foreground text-xs py-2 pr-4 hidden sm:table-cell">Vaga</th>
                  <th className="text-left font-semibold text-muted-foreground text-xs py-2 pr-4">Data</th>
                  <th className="text-left font-semibold text-muted-foreground text-xs py-2">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {HISTORY_ITEMS.slice(0, 4).map(item => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 pr-4 font-medium text-foreground">{item.candidate}</td>
                    <td className="py-3 pr-4 text-muted-foreground hidden sm:table-cell truncate max-w-[180px]">{item.job}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{item.date}</td>
                    <td className="py-3">
                      <Badge variant={item.score >= 8 ? "success" : item.score >= 7 ? "info" : "warning"}>{item.score}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </EvalLayout>
  );
}

// ─── Screen: Fila de Avaliações ───────────────────────────────────────────────

export function EvalQueueScreen({ onNavigate }: { onNavigate: NavFn }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const filtered = QUEUE_ITEMS.filter(i =>
    (filter === "all" || i.priority === filter) &&
    (i.candidate.toLowerCase().includes(search.toLowerCase()) || i.job.toLowerCase().includes(search.toLowerCase()))
  );

  const priorityLabel = { high: "Urgente", normal: "Normal", low: "Baixa" } as const;
  const priorityTone = { high: "danger", normal: "warning", low: "neutral" } as const;

  return (
    <EvalLayout current="eval-queue" onNavigate={onNavigate} title="Fila de Avaliações" subtitle={`${QUEUE_ITEMS.length} entrevistas aguardando revisão`}>
      <div className="w-full space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput
            containerClassName="flex-1"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar candidato ou vaga..."
            className="bg-white"
          />
          <div className="flex gap-2">
            {["all","high","normal","low"].map(f => (
              <FilterChip
                key={f}
                onClick={() => setFilter(f)}
                selected={filter === f}
                className={filter === f ? "py-2" : "bg-white py-2 hover:bg-muted"}
              >
                {f === "all" ? "Todos" : f === "high" ? "Urgente" : f === "normal" ? "Normal" : "Baixa"}
              </FilterChip>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <Card className="p-12 text-center">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <p className="font-bold text-foreground">Fila vazia!</p>
              <p className="text-sm text-muted-foreground mt-1">Todas as avaliações foram concluídas.</p>
            </Card>
          ) : filtered.map(item => (
            <Card key={item.id} className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">{item.id}</span>
                    <StatusBadge tone={priorityTone[item.priority]}>{priorityLabel[item.priority]}</StatusBadge>
                  </div>
                  <p className="font-bold text-foreground">{item.candidate}</p>
                  <p className="text-sm text-muted-foreground">{item.job}</p>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{item.questions} questões</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-xs">{item.submitted}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Btn variant="outline" size="sm" onClick={() => onNavigate("eval-screen")}><Eye className="w-3.5 h-3.5" /> Ver</Btn>
                  <Btn variant="primary" size="sm" onClick={() => onNavigate("eval-screen")}>Avaliar</Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </EvalLayout>
  );
}

// ─── Screen: Em Andamento ─────────────────────────────────────────────────────

export function EvalActiveScreen({ onNavigate }: { onNavigate: NavFn }) {
  const active = [
    { id: "#E-0038", candidate: "Paulo Carvalho", job: "Designer UX/UI", progress: 3, total: 5, started: "11:32", elapsed: "14 min" },
    { id: "#E-0036", candidate: "Lucas Ferreira",  job: "Analista de TI",  progress: 5, total: 5, started: "10:58", elapsed: "22 min" },
  ];
  return (
    <EvalLayout current="eval-active" onNavigate={onNavigate} title="Em Andamento" subtitle="Avaliações que você iniciou e ainda não concluiu">
      <div className="w-full space-y-4">
        {active.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="Nenhuma em andamento"
            description="Inicie uma avaliação da fila para aparecer aqui."
            className="p-12"
            action={<Btn variant="primary" onClick={() => onNavigate("eval-queue")}>Ir para a Fila</Btn>}
          />
        ) : active.map(item => (
          <Card key={item.id} className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-mono text-muted-foreground">{item.id}</span>
                  <StatusBadge tone="info">Em andamento</StatusBadge>
                </div>
                <p className="font-bold text-lg text-foreground">{item.candidate}</p>
                <p className="text-sm text-muted-foreground mb-4">{item.job}</p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progresso das questões</span>
                    <span className="font-semibold text-foreground">{item.progress}/{item.total}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${(item.progress / item.total) * 100}%` }} />
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-3 shrink-0">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Iniciado às {item.started}</p>
                  <p className="text-xs text-muted-foreground">Tempo: <span className="font-semibold text-foreground">{item.elapsed}</span></p>
                </div>
                <div className="flex gap-2">
                  <Btn variant="outline" size="sm"><RefreshCw className="w-3.5 h-3.5" /> Recomeçar</Btn>
                  <Btn variant="primary" size="sm" onClick={() => onNavigate("eval-screen")}>Continuar <ChevronRight className="w-3.5 h-3.5" /></Btn>
                </div>
              </div>
            </div>
          </Card>
        ))}

        <Alert variant="info" className="mt-2 flex items-start gap-3 p-4">
          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">Avaliações em andamento são salvas automaticamente. Você pode retomá-las a qualquer momento.</p>
        </Alert>
      </div>
    </EvalLayout>
  );
}

// ─── Screen: Tela de Avaliação ────────────────────────────────────────────────

export function EvalScreenView({ onNavigate }: { onNavigate: NavFn }) {
  const [scores, setScores] = useState<Record<string, number>>({
    Clareza: 0,
    Coerência: 0,
    Objetividade: 0,
    Domínio: 0,
    Organização: 0,
    "Aderência aos requisitos": 0,
    "Capacidade de exemplificar": 0,
  });
  const [currentQ, setCurrentQ] = useState(0);

  const questions = [
    "Fale sobre você e o que te motivou a se candidatar para esta vaga.",
    "Descreva uma situação em que você precisou lidar com um prazo apertado.",
    "Qual é o seu maior ponto forte e como ele contribuiria para esta posição?",
    "Conte sobre uma experiência em que trabalhou em equipe para resolver um problema.",
    "Onde você se vê profissionalmente daqui a três anos?",
  ];
  const answers = [
    "Candidatei-me porque a vaga combina minha experiência com interfaces web e meu interesse em atuar em times que constroem produtos digitais com foco em qualidade e usabilidade.",
    "Em uma entrega recente, tivemos poucos dias para corrigir fluxos responsivos. Organizei as tarefas por impacto, alinhei prioridades com o time e acompanhei os ajustes até a validação final.",
    "Meu maior ponto forte é transformar requisitos em interfaces claras. Em uma experiência recente, revisei componentes reutilizáveis e reduzi inconsistências visuais entre telas.",
    "Participei de um projeto com produto, design e back-end. Minha contribuição foi organizar as demandas de front, registrar decisões e manter o time alinhado sobre prazos e critérios de aceite.",
    "Quero consolidar minha atuação em desenvolvimento front-end, assumir projetos com mais autonomia e aprofundar qualidade, acessibilidade e testes.",
  ];
  const requirements = [
    "Experiência com desenvolvimento de interfaces web.",
    "Conhecimento em componentes React.",
    "Comunicação objetiva com equipes multidisciplinares.",
    "Organização de prioridades e prazos.",
  ];

  const totalScore = () => {
    const vals = Object.values(scores).filter(v => v > 0);
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "—";
  };

  const scored = Object.values(scores).filter(v => v > 0).length;

  return (
    <EvalLayout current="eval-screen" onNavigate={onNavigate}
      title="Avaliando: Fernanda Oliveira"
      subtitle="Desenvolvedora Front-end · #E-0041"
      actions={<Badge variant="warning">Questão {currentQ + 1} de {questions.length}</Badge>}>
      <div className="w-full grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5">

        {/* Left: context + textual answer */}
        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Contexto da vaga</p>
            <h3 className="font-bold text-foreground">Desenvolvedora Front-end</h3>
            <p className="text-sm text-muted-foreground mb-4">Tech Labs</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {requirements.map((requirement) => (
                <div key={requirement} className="flex items-start gap-2 text-xs text-foreground bg-muted/50 rounded-xl p-3">
                  <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                  <span>{requirement}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Questão {currentQ + 1}</p>
            <p className="text-base font-semibold text-foreground leading-relaxed mb-4">{questions[currentQ]}</p>
            <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 mb-5">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">Resposta textual/transcrita</p>
              <p className="text-sm text-foreground leading-relaxed">{answers[currentQ]}</p>
            </div>
            <div className="flex items-center justify-between">
              <Btn variant="outline" size="sm" disabled={currentQ === 0} onClick={() => setCurrentQ(q => q - 1)}>
                <ChevronLeft className="w-3.5 h-3.5" /> Anterior
              </Btn>
              <div className="flex gap-1.5">
                {questions.map((_, i) => (
                  <button key={i} onClick={() => setCurrentQ(i)}
                    className={`w-6 h-6 rounded-full text-xs font-bold transition-colors ${i === currentQ ? "bg-primary text-white" : scores[Object.keys(scores)[0]] && i < currentQ ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"}`}>
                    {i + 1}
                  </button>
                ))}
              </div>
              <Btn variant="outline" size="sm" disabled={currentQ === questions.length - 1} onClick={() => setCurrentQ(q => q + 1)}>
                Próxima <ChevronRight className="w-3.5 h-3.5" />
              </Btn>
            </div>
          </Card>
        </div>

        {/* Right: scoring panel */}
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">Critérios de Avaliação</h3>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Média</p>
                <p className="text-2xl font-bold text-primary">{totalScore()}</p>
              </div>
            </div>
            <div className="space-y-3">
              {Object.keys(scores).map(crit => (
                <div key={crit}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-foreground">{crit}</span>
                    <span className={`text-sm font-bold ${scores[crit] >= 8 ? "text-green-600" : scores[crit] >= 6 ? "text-blue-600" : scores[crit] > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                      {scores[crit] > 0 ? `${scores[crit]}/10` : "—"}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                      <button key={n} onClick={() => setScores(s => ({ ...s, [crit]: n }))}
                        className={`flex-1 h-6 rounded text-[9px] font-bold transition-colors ${scores[crit] >= n
                          ? scores[crit] >= 8 ? "bg-green-500 text-white" : scores[crit] >= 6 ? "bg-blue-500 text-white" : "bg-amber-500 text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted-foreground/20"}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
              {scored}/{Object.keys(scores).length} critérios avaliados
            </div>
          </Card>

          <div className="flex gap-2">
            <Btn variant="outline" className="flex-1">Salvar rascunho</Btn>
            <Btn variant="primary" className="flex-1" onClick={() => onNavigate("eval-review")}>
              Revisar <ChevronRight className="w-3.5 h-3.5" />
            </Btn>
          </div>
        </div>
      </div>
    </EvalLayout>
  );
}

// ─── Screen: Revisão e Envio ──────────────────────────────────────────────────

export function EvalReviewScreen({ onNavigate }: { onNavigate: NavFn }) {
  const [comment, setComment] = useState("");

  const scores = [
    { name: "Clareza",      score: 9, weight: "15%" },
    { name: "Coerência",    score: 8, weight: "15%" },
    { name: "Objetividade", score: 8, weight: "10%" },
    { name: "Domínio",      score: 7, weight: "20%" },
    { name: "Organização",  score: 8, weight: "15%" },
    { name: "Aderência",    score: 7, weight: "15%" },
    { name: "Exemplos",     score: 6, weight: "10%" },
  ];

  const avg = (scores.reduce((s, c) => s + c.score, 0) / scores.length).toFixed(1);

  return (
    <EvalLayout current="eval-review" onNavigate={onNavigate}
      title="Revisão Final"
      subtitle="Fernanda Oliveira · Desenvolvedora Front-end"
      actions={<Badge variant="warning">Revisar antes de enviar</Badge>}>
      <div className="w-full max-w-3xl space-y-5">
        {/* Score summary */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between mb-5">
            <h3 className="font-bold text-foreground">Resumo dos Scores</h3>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-0.5">Score Final</p>
              <p className="text-4xl font-extrabold text-primary">{avg}</p>
              <p className="text-xs text-muted-foreground">/ 10</p>
            </div>
          </div>
          <div className="space-y-3">
            {scores.map(s => (
              <div key={s.name} className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground w-28 shrink-0">{s.name}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-2 rounded-full ${s.score >= 8 ? "bg-green-500" : s.score >= 6 ? "bg-blue-500" : "bg-amber-500"}`}
                    style={{ width: `${s.score * 10}%` }} />
                </div>
                <span className={`text-sm font-bold w-8 text-right ${s.score >= 8 ? "text-green-600" : s.score >= 6 ? "text-blue-600" : "text-amber-600"}`}>
                  {s.score}
                </span>
                <span className="text-xs text-muted-foreground w-8">{s.weight}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Comment */}
        <Card className="p-5 sm:p-6">
          <h3 className="font-bold text-foreground mb-3">Comentário do Avaliador <span className="text-muted-foreground font-normal text-sm">(opcional)</span></h3>
          <Textarea value={comment} onChange={e => setComment(e.target.value)} rows={4}
            placeholder="Adicione observações sobre o desempenho do candidato, pontos de destaque ou áreas de melhoria..."
            className="bg-white resize-none" />
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Btn variant="outline" onClick={() => onNavigate("eval-screen")}>Voltar</Btn>
          <Btn variant="primary" className="flex-1" onClick={() => onNavigate("eval-done")}>
            <Send className="w-3.5 h-3.5" /> Enviar Avaliação
          </Btn>
        </div>
      </div>
    </EvalLayout>
  );
}

// ─── Screen: Histórico de Avaliações ─────────────────────────────────────────

export function EvalHistoryScreen({ onNavigate }: { onNavigate: NavFn }) {
  const [search, setSearch] = useState("");
  const filtered = HISTORY_ITEMS.filter(i =>
    i.candidate.toLowerCase().includes(search.toLowerCase()) || i.job.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <EvalLayout current="eval-history" onNavigate={onNavigate}
      title="Histórico de Avaliações"
      subtitle={`${HISTORY_ITEMS.length} avaliações concluídas`}
      actions={<Btn variant="outline" size="sm"><Download className="w-3.5 h-3.5" /> Exportar</Btn>}>
      <div className="w-full space-y-4">
        <div className="flex gap-3">
          <SearchInput
            containerClassName="flex-1 max-w-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="bg-white"
          />
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-5">ID</th>
                  <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4">Candidato</th>
                  <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4 hidden md:table-cell">Vaga</th>
                  <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4">Data</th>
                  <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4">Score</th>
                  <th className="text-left font-semibold text-muted-foreground text-xs py-3 px-4 hidden sm:table-cell">Tempo</th>
                  <th className="py-3 px-5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-5 font-mono text-xs text-muted-foreground">{item.id}</td>
                    <td className="py-3.5 px-4 font-semibold text-foreground">{item.candidate}</td>
                    <td className="py-3.5 px-4 text-muted-foreground hidden md:table-cell">{item.job}</td>
                    <td className="py-3.5 px-4 text-muted-foreground">{item.date}</td>
                    <td className="py-3.5 px-4">
                      <Badge variant={item.score >= 8 ? "success" : item.score >= 7 ? "info" : "warning"}>{item.score}</Badge>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground hidden sm:table-cell">{item.time}</td>
                    <td className="py-3.5 px-5">
                      <button onClick={() => onNavigate("eval-done")} className="text-muted-foreground hover:text-primary transition-colors"><Eye className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </EvalLayout>
  );
}

// ─── Screen: Guia de Critérios ────────────────────────────────────────────────

export function EvalCriteriaScreen({ onNavigate }: { onNavigate: NavFn }) {
  return (
    <EvalLayout current="eval-criteria" onNavigate={onNavigate}
      title="Guia de Critérios"
      subtitle="Referência para padronizar a avaliação de entrevistas">
      <div className="w-full space-y-4">
        <Alert variant="info" className="flex items-start gap-3 p-4">
          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">Use este guia para garantir consistência nas avaliações. Cada critério deve ser pontuado de 1 a 10 conforme as descrições abaixo.</p>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CRITERIA_GUIDE.map((c, i) => (
            <Card key={c.name} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">{i + 1}</div>
                  <h3 className="font-bold text-foreground">{c.name}</h3>
                </div>
                <Badge variant="info">Peso {c.weight}</Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">{c.desc}</p>
              <div className="p-3 bg-muted/50 rounded-xl">
                <p className="text-xs font-semibold text-foreground mb-1">Referência de pontuação:</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{c.tip}</p>
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-5 sm:p-6">
          <h3 className="font-bold text-foreground mb-3 flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" /> Escala Geral</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { range: "9–10", label: "Excelente",  color: "bg-green-100 text-green-700 border-green-200" },
              { range: "7–8",  label: "Bom",         color: "bg-blue-100 text-blue-700 border-blue-200" },
              { range: "5–6",  label: "Regular",     color: "bg-amber-100 text-amber-700 border-amber-200" },
              { range: "1–4",  label: "Insuficiente",color: "bg-red-100 text-red-700 border-red-200" },
            ].map(s => (
              <div key={s.range} className={`p-3 rounded-xl border text-center ${s.color}`}>
                <p className="text-lg font-bold">{s.range}</p>
                <p className="text-xs font-semibold">{s.label}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </EvalLayout>
  );
}

// ─── Screen: Configurações do Avaliador ──────────────────────────────────────

export function EvalSettingsScreen({ onNavigate }: { onNavigate: NavFn }) {
  const [notif, setNotif] = useState({ email: true, push: true, daily: false });
  const [saved, setSaved] = useState(false);

  return (
    <EvalLayout current="eval-settings" onNavigate={onNavigate} title="Configurações" subtitle="Preferências da conta de avaliador">
      <div className="w-full max-w-2xl space-y-5">
        {saved && (
          <Alert variant="success" className="flex items-center gap-2.5 p-3.5">
            <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
            <p className="text-sm font-semibold text-green-700">Configurações salvas com sucesso.</p>
          </Alert>
        )}

        {/* Profile */}
        <Card className="p-5 sm:p-6">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2"><Users className="w-4 h-4" /> Perfil do Avaliador</h3>
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white text-xl font-bold">CA</div>
            <div>
              <p className="font-bold text-foreground">Carlos Andrade</p>
              <p className="text-sm text-muted-foreground">carlos.andrade@gmail.com</p>
              <Badge variant="info" className="mt-1">Avaliador humano</Badge>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Nome completo</label>
              <Input defaultValue="Carlos Andrade" className="bg-white" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Especialização</label>
              <Input defaultValue="Recursos Humanos" className="bg-white" />
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card className="p-5 sm:p-6">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2"><Bell className="w-4 h-4" /> Notificações</h3>
          <div className="space-y-4">
            {[
              { key: "email" as const, label: "E-mail para nova avaliação na fila", desc: "Receba um e-mail quando uma nova entrevista for atribuída a você." },
              { key: "push"  as const, label: "Notificação no sistema",             desc: "Receba alertas dentro do RH Connect." },
              { key: "daily" as const, label: "Resumo diário",                      desc: "Relatório diário com suas atividades e pendências." },
            ].map(n => (
              <div key={n.key} className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">{n.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.desc}</p>
                </div>
                <button onClick={() => setNotif(prev => ({ ...prev, [n.key]: !prev[n.key] }))}
                  className={`w-10 h-6 rounded-full transition-colors shrink-0 relative ${notif[n.key] ? "bg-primary" : "bg-muted-foreground/30"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notif[n.key] ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex gap-3 justify-end">
          <Btn variant="outline">Cancelar</Btn>
          <Btn variant="primary" onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 3000); }}>Salvar Alterações</Btn>
        </div>
      </div>
    </EvalLayout>
  );
}

// ─── Screen: Ativar Conta de Avaliador ───────────────────────────────────────

function EvalLogoHeader() {
  return (
    <header className="flex items-center justify-center px-6 py-5 bg-white/80 backdrop-blur border-b border-border">
      <RHConnectLogo className="h-10 w-auto" />
    </header>
  );
}

export function EvalActivateScreen({ onNavigate }: { onNavigate: NavFn }) {
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [ativado, setAtivado] = useState(false);
  const [activationScenario, setActivationScenario] = useState<ActivationScenario>("valid");

  const strength = senha.length === 0 ? 0 : senha.length < 6 ? 1 : senha.length < 10 ? 2 : /[^a-zA-Z0-9]/.test(senha) ? 4 : 3;
  const strengthLabel = ["", "Fraca", "Média", "Forte", "Muito forte"][strength];
  const strengthColor = ["", "bg-red-400", "bg-amber-400", "bg-green-400", "bg-green-500"][strength];
  const tokenScenarios = [
    { label: "Válido", scenario: "valid" },
    { label: "Inválido", scenario: "invalid" },
    { label: "Expirado", scenario: "expired" },
    { label: "Usado", scenario: "used" },
  ] satisfies { label: string; scenario: ActivationScenario }[];

  const scenarioDetails = {
    valid: {
      name: "Patricia Gomes",
      email: "patricia.gomes@gmail.com",
    },
    invalid: null,
    expired: null,
    used: null,
  };

  const handleScenarioChange = (nextScenario: ActivationScenario) => {
    setSenha("");
    setConfirmar("");
    setMostrarSenha(false);
    setMostrarConfirmacao(false);
    setAtivado(false);
    setActivationScenario(nextScenario);
  };

  const handleActivate = () => {
    if (activationScenario === "valid") setAtivado(true);
  };

  const tokenStateContent = {
    invalid: {
      icon: AlertCircle,
      title: "Link de ativação inválido",
      description: "Este link não corresponde a um convite ativo do RH Connect.",
      tone: "bg-red-50 text-red-600",
      border: "border-red-100",
      actionLabel: "Voltar para login",
      action: () => onNavigate("auth"),
    },
    expired: {
      icon: Clock,
      title: "Link de ativação expirado",
      description: "O prazo deste convite terminou. Solicite um novo link ao administrador responsável.",
      tone: "bg-amber-50 text-amber-600",
      border: "border-amber-100",
      actionLabel: "Voltar para login",
      action: () => onNavigate("auth"),
    },
    used: {
      icon: CheckCircle,
      title: "Link já utilizado",
      description: "Esta conta já foi ativada. Acesse a plataforma usando seu e-mail e senha.",
      tone: "bg-blue-50 text-blue-600",
      border: "border-blue-100",
      actionLabel: "Fazer login",
      action: () => onNavigate("auth"),
    },
  } as const;

  if (ativado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 flex flex-col">
        <EvalLogoHeader />
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-md bg-white rounded-2xl border border-border shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Conta ativada com sucesso!</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Sua conta de Avaliador no RH Connect está pronta. Faça login para acessar o seu ambiente.
            </p>
            <Btn variant="primary" className="w-full" onClick={() => onNavigate("auth")}>
              Fazer login <ArrowRight className="w-3.5 h-3.5" />
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  if (activationScenario !== "valid") {
    const content = tokenStateContent[activationScenario];
    const Icon = content.icon;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 flex flex-col">
        <EvalLogoHeader />
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-md space-y-4">
            <div className={`bg-white rounded-2xl border shadow-sm p-6 sm:p-8 text-center ${content.border}`}>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${content.tone}`}>
                <Icon className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">{content.title}</h2>
              <p className="text-sm text-muted-foreground mb-6">{content.description}</p>
              <Btn variant="primary" className="w-full" onClick={content.action}>
                {content.actionLabel} <ArrowRight className="w-3.5 h-3.5" />
              </Btn>
            </div>

            <div className="bg-white/70 border border-dashed border-border rounded-2xl p-4">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 text-center">
                Cenários visuais do protótipo
              </p>
              <div className="grid grid-cols-2 gap-2">
                {tokenScenarios.map((scenario) => (
                  <button
                    key={scenario.label}
                    type="button"
                    onClick={() => handleScenarioChange(scenario.scenario)}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                      activationScenario === scenario.scenario
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {scenario.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 flex flex-col">
      <EvalLogoHeader />
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6 sm:p-8">
            {/* Convite info */}
            <div className="flex items-start gap-3 mb-6 p-4 bg-teal-50 rounded-xl border border-teal-100">
              <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-teal-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Convite recebido</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {scenarioDetails.valid ? (
                    <>Convite enviado para <strong>{scenarioDetails.valid.name}</strong> ({scenarioDetails.valid.email}) pelo <strong>SENAC-DF</strong>.</>
                  ) : (
                    <>Você foi convidado pelo <strong>SENAC-DF</strong> para atuar como <strong>Avaliador</strong> no RH Connect.</>
                  )}
                </p>
              </div>
            </div>

            <h2 className="text-xl font-bold text-foreground mb-1">Ative sua conta de Avaliador</h2>
            <p className="text-sm text-muted-foreground mb-6">Crie uma senha para acessar o sistema.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  <Lock className="inline w-3.5 h-3.5 mr-1" />Criar senha
                </label>
                <PasswordInput
                  visible={mostrarSenha}
                  onVisibleChange={setMostrarSenha}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  toggleClassName="right-3"
                />
                {senha.length > 0 && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? strengthColor : "bg-muted"}`} />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">Força: <span className="font-semibold">{strengthLabel}</span></p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Confirmar senha</label>
                <PasswordInput
                  visible={mostrarConfirmacao}
                  onVisibleChange={setMostrarConfirmacao}
                  value={confirmar}
                  onChange={e => setConfirmar(e.target.value)}
                  placeholder="Repita a senha"
                  showLabel="Mostrar confirmação de senha"
                  hideLabel="Ocultar confirmação de senha"
                  toggleClassName="right-3"
                />
                {confirmar.length > 0 && senha !== confirmar && (
                  <p className="text-xs text-red-500 mt-1">As senhas não coincidem.</p>
                )}
              </div>

              <Btn
                variant="primary"
                className="w-full !py-3"
                disabled={senha.length < 8 || senha !== confirmar}
                onClick={handleActivate}>
                <CheckCircle className="w-4 h-4" /> Ativar minha conta
              </Btn>
            </div>
          </div>

          <div className="mt-4 bg-white/70 border border-dashed border-border rounded-2xl p-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 text-center">
              Cenários visuais do protótipo
            </p>
            <div className="grid grid-cols-2 gap-2">
              {tokenScenarios.map((scenario) => (
                <button
                  key={scenario.label}
                  type="button"
                  onClick={() => handleScenarioChange(scenario.scenario)}
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                    activationScenario === scenario.scenario
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-muted-foreground border-border hover:bg-muted"
                  }`}
                >
                  {scenario.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Screen: Onboarding do Avaliador ─────────────────────────────────────────

const EVAL_ONBOARDING_STEPS = [
  {
    id: 0,
    icon: Users,
    color: "bg-teal-100 text-teal-600",
    title: "Bem-vindo ao ambiente de Avaliador",
    subtitle: "Sua função no RH Connect",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>
          Como <strong className="text-foreground">Avaliador</strong>, você é responsável por analisar as
          entrevistas textuais realizadas pelos candidatos e atribuir scores com base em critérios definidos.
        </p>
        <div className="flex items-start gap-3 p-3 bg-teal-50 rounded-xl border border-teal-100">
          <Zap className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
          <p className="text-xs text-teal-800">Sua avaliação impacta diretamente o processo seletivo do candidato. Seja criterioso e justo.</p>
        </div>
      </div>
    ),
  },
  {
    id: 1,
    icon: Target,
    color: "bg-blue-100 text-blue-600",
    title: "Fila de avaliações e entrevistas",
    subtitle: "Como funciona a atribuição",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>As entrevistas são atribuídas a você pelo Administrador e aparecem na sua <strong className="text-foreground">Fila de Avaliações</strong>.</p>
        <div className="space-y-2">
          {[
            { label: "Fila de avaliações", desc: "Entrevistas aguardando sua análise" },
            { label: "Em andamento",       desc: "Avaliações que você já iniciou" },
            { label: "Histórico",          desc: "Avaliações concluídas e enviadas" },
          ].map(s => (
            <div key={s.label} className="flex items-start gap-2 p-2 bg-muted/40 rounded-lg">
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
    id: 2,
    icon: Star,
    color: "bg-amber-100 text-amber-600",
    title: "Critérios e envio da avaliação",
    subtitle: "Avalie com precisão",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Para cada entrevista, você avalia o candidato com base em <strong className="text-foreground">critérios predefinidos</strong> como clareza, domínio técnico e comunicação.</p>
        <div className="space-y-2">
          {[
            { label: "Salvar rascunho",   desc: "Salve sua avaliação parcial a qualquer momento" },
            { label: "Revisão final",     desc: "Confira os scores antes de enviar" },
            { label: "Enviar avaliação",  desc: "O resultado é registrado e notifica o candidato" },
          ].map(s => (
            <div key={s.label} className="flex items-start gap-2">
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
    id: 3,
    icon: CheckCircle,
    color: "bg-green-100 text-green-600",
    title: "Tudo pronto!",
    subtitle: "Acesse seu dashboard",
    content: (
      <div className="space-y-4 text-sm text-muted-foreground text-center">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-7 h-7 text-green-600" />
        </div>
        <p>Você está pronto para começar a avaliar. Acesse o dashboard para ver suas entrevistas atribuídas.</p>
        <div className="grid grid-cols-2 gap-2 text-xs text-left">
          {[
            { icon: Target,  label: "Ver fila de avaliações" },
            { icon: Star,    label: "Consultar critérios" },
            { icon: History, label: "Acessar histórico" },
            { icon: Settings, label: "Configurar notificações" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <Icon className="w-3.5 h-3.5 text-teal-600" />
              <span className="font-medium text-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

export function EvalOnboardingScreen({ onNavigate }: { onNavigate: NavFn }) {
  const [step, setStep] = useState(0);
  const current = EVAL_ONBOARDING_STEPS[step];
  const Icon = current.icon;
  const isLast = step === EVAL_ONBOARDING_STEPS.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 flex flex-col">
      <EvalLogoHeader />
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {EVAL_ONBOARDING_STEPS.map((s, i) => (
              <div key={s.id} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? "w-8 bg-teal-500" : i < step ? "w-4 bg-teal-300" : "w-4 bg-muted"}`} />
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-border shadow-sm p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-lg font-bold">CA</div>
              <div className={`w-12 h-12 rounded-2xl ${current.color} flex items-center justify-center`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>

            <h2 className="text-xl font-bold text-foreground mb-1">{current.title}</h2>
            <p className="text-sm text-muted-foreground mb-5">{current.subtitle}</p>
            <div className="mb-8">{current.content}</div>

            <div className="flex items-center gap-3">
              {step > 0 && (
                <Btn variant="outline" onClick={() => setStep(s => s - 1)}>
                  Voltar
                </Btn>
              )}
              {isLast ? (
                <Btn variant="primary" className="flex-1" onClick={() => onNavigate("eval-dashboard")}>
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
            Passo {step + 1} de {EVAL_ONBOARDING_STEPS.length}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Screen: Avaliação Concluída ──────────────────────────────────────────────

export function EvalDoneScreen({ onNavigate }: { onNavigate: NavFn }) {
  const scores = [
    { name: "Clareza",      score: 9 },
    { name: "Coerência",    score: 8 },
    { name: "Objetividade", score: 8 },
    { name: "Domínio",      score: 7 },
    { name: "Organização",  score: 8 },
    { name: "Aderência",    score: 7 },
    { name: "Exemplos",     score: 6 },
  ];
  const avg = (scores.reduce((s, c) => s + c.score, 0) / scores.length).toFixed(1);
  const numAvg = parseFloat(avg);
  const verdict = numAvg >= 8 ? { label: "Excelente", color: "text-green-600", bg: "bg-green-100" }
    : numAvg >= 6.5 ? { label: "Bom", color: "text-blue-600", bg: "bg-blue-100" }
    : { label: "Regular", color: "text-amber-600", bg: "bg-amber-100" };

  return (
    <EvalLayout current="eval-history" onNavigate={onNavigate} title="Avaliação Enviada">
      <div className="w-full max-w-2xl mx-auto space-y-6">
        {/* Success card */}
        <Card className="p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Avaliação Enviada!</h2>
          <p className="text-muted-foreground text-sm">
            A avaliação de <strong>Fernanda Oliveira</strong> foi registrada com sucesso no sistema RH Connect.
          </p>
          <div className="inline-flex items-center gap-3 mt-6 px-6 py-4 bg-muted/50 rounded-2xl">
            <div className="text-center">
              <p className="text-4xl font-extrabold text-primary">{avg}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Score final / 10</p>
            </div>
            <div className={`px-3 py-1 ${verdict.bg} rounded-xl`}>
              <p className={`text-sm font-bold ${verdict.color}`}>{verdict.label}</p>
            </div>
          </div>
        </Card>

        {/* Score breakdown */}
        <Card className="p-5">
          <h3 className="font-bold text-foreground mb-4">Scores por Critério</h3>
          <div className="space-y-3">
            {scores.map(s => (
              <div key={s.name} className="flex items-center gap-3">
                <span className="text-sm text-foreground w-28 shrink-0">{s.name}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-2 rounded-full transition-all ${s.score >= 8 ? "bg-green-500" : s.score >= 6 ? "bg-blue-500" : "bg-amber-500"}`}
                    style={{ width: `${s.score * 10}%` }} />
                </div>
                <span className={`text-sm font-bold w-6 text-right ${s.score >= 8 ? "text-green-600" : s.score >= 6 ? "text-blue-600" : "text-amber-600"}`}>
                  {s.score}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Summary info */}
        <Card className="p-5">
          <h3 className="font-bold text-foreground mb-3">Resumo da Avaliação</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-0.5">Candidato</p>
              <p className="font-semibold text-foreground">Fernanda Oliveira</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Vaga</p>
              <p className="font-semibold text-foreground">Desenvolvedora Front-end</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Avaliador</p>
              <p className="font-semibold text-foreground">Carlos Andrade</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Data de Envio</p>
              <p className="font-semibold text-foreground">11/08/2026 às 10:42</p>
            </div>
          </div>
        </Card>

        {/* Next actions */}
        <div className="flex gap-3">
          <Btn variant="outline" className="flex-1" onClick={() => onNavigate("eval-history")}>
            <History className="w-3.5 h-3.5" /> Ver Histórico
          </Btn>
          <Btn variant="primary" className="flex-1" onClick={() => onNavigate("eval-queue")}>
            Próxima Avaliação <ChevronRight className="w-3.5 h-3.5" />
          </Btn>
        </div>
      </div>
    </EvalLayout>
  );
}
