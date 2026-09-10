import { useState } from "react";
import { toast } from "sonner";
import {
  TrendingUp, Star, Video, Award, Monitor, BookOpen,
  Clock, GraduationCap, Check, ArrowRight, ChevronRight, MessageSquare,
} from "lucide-react";
import { Button as UIButton } from "./ui/button";
import { Card as UICard } from "./ui/card";

type NavFn = (s: string) => void;
type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "purple";

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

function Badge({ variant = "default", children }: { variant?: BadgeVariant; children: React.ReactNode }) {
  const vars: Record<BadgeVariant, string> = {
    default: "bg-slate-100 text-slate-600",
    success: "bg-green-100 text-green-700",
    warning: "bg-amber-100 text-amber-700",
    error:   "bg-red-100 text-red-700",
    info:    "bg-blue-100 text-blue-700",
    purple:  "bg-purple-100 text-purple-700",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${vars[variant]}`}>
      {children}
    </span>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <UICard padding="none" className={className}>
      {children}
    </UICard>
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
        <p className="text-lg sm:text-2xl font-bold text-slate-900 leading-tight">{value}</p>
        <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5 leading-snug line-clamp-2">{label}</p>
      </div>
    </Card>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type TalentStatus = "locked" | "available" | "in-development" | "advanced" | "consolidated";

interface TalentNode {
  id: string; name: string; shortName: string; abbrev: string;
  status: TalentStatus; progress: number;
  cx: number; cy: number; category: "tech" | "behavioral";
  description: string; requirements: string[];
  course: string; interview: string;
}

// ─── Static data ──────────────────────────────────────────────────────────────

const NODES: TalentNode[] = [
  { id: "logica",         name: "Lógica de programação",  shortName: "Lógica",       abbrev: "LG",   status: "consolidated",   progress: 100, cx: 200, cy: 65,  category: "tech",       description: "Fundamentos do pensamento lógico e algorítmico aplicados à programação e à resolução estruturada de problemas.", requirements: [],                                    course: "Fundamentos de Programação – SENAC-DF",     interview: "Entrevista: Raciocínio lógico e resolução de problemas" },
  { id: "html",           name: "HTML semântico",          shortName: "HTML",         abbrev: "HTML", status: "consolidated",   progress: 100, cx: 80,  cy: 185, category: "tech",       description: "Estruturação de páginas web com marcação semântica, acessível e bem organizada.",                             requirements: ["Lógica de programação"],             course: "HTML5 e Semântica Web – Alura",             interview: "Entrevista: Desenvolvimento Front-end Básico" },
  { id: "css",            name: "CSS",                     shortName: "CSS",          abbrev: "CSS",  status: "advanced",       progress: 80,  cx: 320, cy: 185, category: "tech",       description: "Estilização e layout de interfaces com CSS moderno, Flexbox e Grid.",                                         requirements: ["Lógica de programação"],             course: "CSS Avançado e Flexbox – DIO",              interview: "Entrevista: Front-end e Estilização" },
  { id: "javascript",     name: "JavaScript básico",       shortName: "JavaScript",   abbrev: "JS",   status: "in-development", progress: 60,  cx: 200, cy: 305, category: "tech",       description: "Programação client-side com JavaScript para criar interatividade em páginas web.",                            requirements: ["HTML semântico", "CSS"],             course: "JavaScript do Zero – Rocketseat",           interview: "Entrevista: Lógica e JavaScript" },
  { id: "git",            name: "Git e GitHub",            shortName: "Git/GitHub",   abbrev: "GIT",  status: "available",      progress: 0,   cx: 80,  cy: 425, category: "tech",       description: "Controle de versão distribuído e colaboração em projetos de software com Git e GitHub.",                     requirements: ["JavaScript básico"],                 course: "Git e GitHub para Iniciantes – Udemy",      interview: "Entrevista: Ferramentas de desenvolvimento" },
  { id: "responsividade", name: "Responsividade",          shortName: "Responsivo",   abbrev: "RWD",  status: "locked",         progress: 0,   cx: 320, cy: 425, category: "tech",       description: "Desenvolvimento de interfaces adaptáveis a diferentes tamanhos de tela e dispositivos.",                     requirements: ["JavaScript básico", "CSS"],          course: "Design Responsivo com CSS Grid – DevMedia", interview: "Entrevista: Front-end Avançado" },
  { id: "comunicacao",    name: "Comunicação eficaz",      shortName: "Comunicação",  abbrev: "COM",  status: "consolidated",   progress: 100, cx: 560, cy: 65,  category: "behavioral", description: "Expressão clara, objetiva e profissional de ideias em contextos de trabalho e entrevistas.",                 requirements: [],                                    course: "Comunicação Profissional – SENAC-DF",       interview: "Entrevista: Soft skills e comunicação" },
  { id: "aprendizagem",   name: "Aprendizagem contínua",   shortName: "Aprendizagem", abbrev: "APR",  status: "advanced",       progress: 85,  cx: 440, cy: 185, category: "behavioral", description: "Capacidade de aprender de forma autônoma e adaptada às mudanças constantes do mercado de trabalho.",         requirements: ["Comunicação eficaz"],                course: "Aprendendo a Aprender – Coursera",          interview: "Entrevista: Desenvolvimento profissional" },
  { id: "resolucao",      name: "Resolução de problemas",  shortName: "Resolução",    abbrev: "RES",  status: "in-development", progress: 45,  cx: 680, cy: 185, category: "behavioral", description: "Identificação, análise e solução estruturada de desafios complexos em ambiente profissional.",               requirements: ["Comunicação eficaz"],                course: "Pensamento Analítico – SENAC-DF",           interview: "Entrevista: Resolução de conflitos" },
  { id: "trabalho",       name: "Trabalho em equipe",      shortName: "Equipe",       abbrev: "EQP",  status: "available",      progress: 0,   cx: 560, cy: 305, category: "behavioral", description: "Colaboração efetiva e contribuição em ambientes de trabalho coletivo e multidisciplinar.",                   requirements: ["Aprendizagem contínua", "Resolução de problemas"], course: "Trabalho em Equipe e Liderança – SENAC-DF", interview: "Entrevista: Dinâmica em equipe" },
];

const EDGES = [
  { from: "logica", to: "html" }, { from: "logica", to: "css" },
  { from: "html", to: "javascript" }, { from: "css", to: "javascript" },
  { from: "javascript", to: "git" }, { from: "javascript", to: "responsividade" },
  { from: "comunicacao", to: "aprendizagem" }, { from: "comunicacao", to: "resolucao" },
  { from: "aprendizagem", to: "trabalho" }, { from: "resolucao", to: "trabalho" },
];

const MISSIONS = [
  { id: 1, title: "Concluir uma entrevista técnica",   desc: "Realize uma entrevista focada em competências técnicas de Front-end.",                       done: true,  progress: 1,   total: 1, icon: Video },
  { id: 2, title: "Melhorar a nota de comunicação",    desc: "Alcance pontuação 8 ou mais no critério Comunicação na próxima entrevista.",                 done: false, progress: 7.5, total: 8, icon: MessageSquare },
  { id: 3, title: "Realizar um curso recomendado",     desc: "Conclua um dos cursos sugeridos na trilha de Desenvolvimento Front-end.",                    done: false, progress: 0,   total: 1, icon: BookOpen },
];

const ACHIEVEMENTS = [
  { id: 1, title: "Primeira entrevista", desc: "Realizou sua primeira entrevista simulada na plataforma.", unlocked: true, icon: Video },
  { id: 2, title: "Primeira evolução",   desc: "Avançou de nível em um talento pela primeira vez.",        unlocked: true, icon: TrendingUp },
  { id: 3, title: "Aprendiz contínuo",   desc: "Concluiu um curso recomendado pela plataforma.",            unlocked: true, icon: BookOpen },
];

const COURSES = [
  { id: 1, title: "JavaScript do Zero",     provider: "Rocketseat", duration: "40h", level: "Iniciante",     tag: "Recomendado",  tagVariant: "info"    as const },
  { id: 2, title: "CSS Avançado e Flexbox", provider: "DIO",        duration: "20h", level: "Intermediário", tag: "Em andamento", tagVariant: "warning" as const },
];

const LEGEND = [
  { color: "#0F2652", border: "#0F2652", label: "Consolidado" },
  { color: "#1D4ED8", border: "#1D4ED8", label: "Avançado" },
  { color: "#fffbeb", border: "#f59e0b", label: "Em desenvolvimento" },
  { color: "#eff6ff", border: "#3b82f6", label: "Disponível" },
  { color: "#f8fafc", border: "#cbd5e1", label: "Bloqueado" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nodeColors(status: TalentStatus) {
  switch (status) {
    case "consolidated":   return { fill: "#0F2652", stroke: "#0F2652", sw: 0,   tf: "#ffffff" };
    case "advanced":       return { fill: "#1D4ED8", stroke: "#1D4ED8", sw: 0,   tf: "#ffffff" };
    case "in-development": return { fill: "#fffbeb", stroke: "#f59e0b", sw: 3,   tf: "#92400e" };
    case "available":      return { fill: "#eff6ff", stroke: "#3b82f6", sw: 2,   tf: "#1D4ED8" };
    case "locked":         return { fill: "#f1f5f9", stroke: "#cbd5e1", sw: 1.5, tf: "#94a3b8" };
  }
}

function edgeColor(fromStatus: TalentStatus, toStatus: TalentStatus) {
  const strong = (s: TalentStatus) => s === "consolidated" || s === "advanced";
  if (strong(fromStatus) && strong(toStatus)) return { stroke: "#1D4ED8", opacity: 0.35, dash: undefined as string | undefined };
  if (strong(fromStatus)) return { stroke: "#94a3b8", opacity: 0.5, dash: undefined as string | undefined };
  return { stroke: "#cbd5e1", opacity: 0.8, dash: "5 4" as string | undefined };
}

function statusLabel(status: TalentStatus) {
  const m: Record<TalentStatus, string> = { locked: "Bloqueado", available: "Disponível", "in-development": "Em desenvolvimento", advanced: "Avançado", consolidated: "Consolidado" };
  return m[status];
}

function statusVariant(status: TalentStatus): BadgeVariant {
  const m: Record<TalentStatus, BadgeVariant> = { locked: "default", available: "info", "in-development": "warning", advanced: "info", consolidated: "success" };
  return m[status];
}

function actionLabel(status: TalentStatus) {
  switch (status) {
    case "locked":         return "Ver pré-requisitos";
    case "available":      return "Iniciar desenvolvimento";
    case "in-development": return "Continuar prática";
    case "advanced":       return "Avançar para consolidado";
    case "consolidated":   return "Revisitar talento";
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DevelopmentContent({ onNavigate }: { onNavigate: NavFn }) {
  const [selectedId, setSelectedId] = useState<string>("javascript");
  const selected = NODES.find(n => n.id === selectedId)!;

  const NODE_R = 30;
  const PROG_R = 38;
  const CIRC = 2 * Math.PI * PROG_R;

  return (
    <>
      {/* ── Trilha header ── */}
      <Card className="p-4 sm:p-5 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#0F2652" }}>
              <Monitor className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Trilha atual</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">Tecnologia · Desenvolvimento Front-end</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:ml-auto sm:shrink-0">
            <Badge variant="info">Trainee</Badge>
            <div className="w-full sm:w-52">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500">Progresso geral</span>
                <span className="text-xs font-bold text-slate-900">62%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: "62%", backgroundColor: "#1D4ED8" }} />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <StatCard value="Trainee" label="Nível atual"              icon={TrendingUp} color="bg-blue-50 text-blue-600" />
        <StatCard value="6"       label="Talentos desenvolvidos"   icon={Star}       color="bg-amber-50 text-amber-600" />
        <StatCard value="3"       label="Entrevistas concluídas"   icon={Video}      color="bg-green-50 text-green-600" />
        <StatCard value="3"       label="Conquistas desbloqueadas" icon={Award}      color="bg-purple-50 text-purple-600" />
      </div>

      {/* ── Árvore de Talentos ── */}
      <Card className="mb-5 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200">
          <h2 className="font-bold text-slate-900">Árvore de Talentos</h2>
          <p className="text-xs text-slate-500 mt-0.5">Clique em um talento para ver detalhes e avançar na sua jornada.</p>
        </div>

        {/* Legend */}
        <div className="px-4 sm:px-5 py-2.5 border-b border-slate-200 bg-slate-50/60 flex flex-wrap gap-3 sm:gap-5">
          {LEGEND.map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full border-2" style={{ backgroundColor: l.color, borderColor: l.border }} />
              <span className="text-[11px] text-slate-500">{l.label}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row">
          {/* Desktop SVG */}
          <div className="flex-1 p-4 sm:p-6 hidden lg:block min-w-0">
            <svg viewBox="0 0 760 490" width="100%" style={{ overflow: "visible" }}>
              <text x={200} y={18} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#1D4ED8" letterSpacing="0.1em" fontFamily="system-ui, sans-serif">COMPETÊNCIAS TÉCNICAS</text>
              <text x={560} y={18} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#1D4ED8" letterSpacing="0.1em" fontFamily="system-ui, sans-serif">COMPETÊNCIAS COMPORTAMENTAIS</text>
              <line x1={380} y1={26} x2={380} y2={480} stroke="#e2e8f0" strokeWidth={1} strokeDasharray="5 4" />

              {EDGES.map(edge => {
                const from = NODES.find(n => n.id === edge.from)!;
                const to   = NODES.find(n => n.id === edge.to)!;
                const ec   = edgeColor(from.status, to.status);
                return (
                  <line key={`${edge.from}-${edge.to}`}
                    x1={from.cx} y1={from.cy} x2={to.cx} y2={to.cy}
                    stroke={ec.stroke} strokeWidth={2} strokeOpacity={ec.opacity}
                    strokeDasharray={ec.dash}
                  />
                );
              })}

              {NODES.map(node => {
                const nc = nodeColors(node.status);
                const isSel = selectedId === node.id;
                return (
                  <g key={node.id} onClick={() => setSelectedId(node.id)} style={{ cursor: "pointer" }}>
                    {isSel && <circle cx={node.cx} cy={node.cy} r={NODE_R + 11} fill="none" stroke="#1D4ED8" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.45} />}
                    {node.status === "advanced" && <circle cx={node.cx} cy={node.cy} r={NODE_R + 5} fill="none" stroke="#3b82f6" strokeWidth={1.5} opacity={0.35} />}
                    {node.status === "in-development" && <circle cx={node.cx} cy={node.cy} r={PROG_R} fill="none" stroke="#fde68a" strokeWidth={3.5} />}
                    {node.status === "in-development" && (
                      <circle cx={node.cx} cy={node.cy} r={PROG_R} fill="none" stroke="#f59e0b" strokeWidth={3.5} strokeLinecap="round"
                        strokeDasharray={`${(node.progress / 100) * CIRC} ${CIRC}`}
                        transform={`rotate(-90 ${node.cx} ${node.cy})`}
                      />
                    )}
                    <circle cx={node.cx} cy={node.cy} r={NODE_R} fill={nc.fill} stroke={nc.stroke} strokeWidth={nc.sw} />
                    <text x={node.cx} y={node.cy + 1} textAnchor="middle" dominantBaseline="middle"
                      fontSize={node.abbrev.length > 3 ? "9" : "10.5"} fontWeight="700"
                      fill={nc.tf} fontFamily="system-ui, sans-serif" opacity={node.status === "locked" ? 0.55 : 1}>
                      {node.abbrev}
                    </text>
                    {node.status === "consolidated" && (
                      <>
                        <circle cx={node.cx + NODE_R - 3} cy={node.cy - NODE_R + 3} r={7.5} fill="#f59e0b" stroke="white" strokeWidth={1.5} />
                        <text x={node.cx + NODE_R - 3} y={node.cy - NODE_R + 3.5} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="white" fontFamily="system-ui">★</text>
                      </>
                    )}
                    {node.status === "locked" && (
                      <>
                        <circle cx={node.cx + NODE_R - 3} cy={node.cy - NODE_R + 3} r={7.5} fill="#94a3b8" stroke="white" strokeWidth={1.5} />
                        <text x={node.cx + NODE_R - 3} y={node.cy - NODE_R + 4} textAnchor="middle" dominantBaseline="middle" fontSize="7" fill="white" fontFamily="system-ui">×</text>
                      </>
                    )}
                    <text x={node.cx} y={node.cy + NODE_R + 16} textAnchor="middle" fontSize="10"
                      fontWeight={isSel ? "700" : "500"} fill={isSel ? "#1D4ED8" : "#475569"} fontFamily="system-ui, sans-serif">
                      {node.shortName}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Mobile list */}
          <div className="lg:hidden p-4">
            {(["tech", "behavioral"] as const).map(cat => (
              <div key={cat} className="mb-5 last:mb-0">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  {cat === "tech" ? "Competências Técnicas" : "Competências Comportamentais"}
                </p>
                <div className="space-y-2">
                  {NODES.filter(n => n.category === cat).map(node => {
                    const nc = nodeColors(node.status);
                    const isSel = selectedId === node.id;
                    return (
                      <button key={node.id} onClick={() => setSelectedId(node.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-all ${isSel ? "border-blue-600 bg-blue-50/60" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold border-2"
                            style={{ backgroundColor: nc.fill, color: nc.tf, borderColor: nc.stroke }}>
                            {node.abbrev}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{node.name}</p>
                            {node.progress > 0 && node.progress < 100 && (
                              <div className="mt-1 h-1 bg-slate-100 rounded-full w-28">
                                <div className="h-full rounded-full" style={{ width: `${node.progress}%`, backgroundColor: "#f59e0b" }} />
                              </div>
                            )}
                          </div>
                          <Badge variant={statusVariant(node.status)}>{statusLabel(node.status)}</Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Detail panel */}
          <div className="lg:w-72 shrink-0 border-t lg:border-t-0 lg:border-l border-slate-200 p-4 sm:p-5 bg-slate-50/60 flex flex-col gap-4">
            <div>
              <Badge variant={statusVariant(selected.status)}>{statusLabel(selected.status)}</Badge>
              <h3 className="font-bold text-slate-900 text-base leading-snug mt-2">{selected.name}</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{selected.description}</p>
            </div>
            {selected.progress > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-900">Progresso</span>
                  <span className="text-xs font-bold" style={{ color: selected.status === "in-development" ? "#d97706" : "#1D4ED8" }}>{selected.progress}%</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${selected.progress}%`, backgroundColor: selected.status === "in-development" ? "#f59e0b" : "#1D4ED8" }} />
                </div>
              </div>
            )}
            {selected.requirements.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-900 mb-2">Pré-requisitos</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.requirements.map(r => (
                    <span key={r} className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-500">{r}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
              <div className="flex items-center gap-1.5 mb-1">
                <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">Curso recomendado</span>
              </div>
              <p className="text-xs text-blue-700 leading-relaxed">{selected.course}</p>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <div className="flex items-center gap-1.5 mb-1">
                <Video className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Entrevista recomendada</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{selected.interview}</p>
            </div>
            <Btn
              variant={selected.status === "locked" ? "outline" : "primary"}
              size="sm"
              onClick={() => { if (selected.status !== "locked") onNavigate("interview-setup"); }}
            >
              {actionLabel(selected.status)} <ArrowRight className="w-3.5 h-3.5" />
            </Btn>
          </div>
        </div>
      </Card>

      {/* ── Missões + Conquistas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <div className="lg:col-span-2">
          <Card className="p-4 sm:p-5 h-full">
            <h2 className="font-bold text-slate-900 mb-4">Missões atuais</h2>
            <div className="space-y-3">
              {MISSIONS.map(m => (
                <div key={m.id} className={`p-4 rounded-xl border ${m.done ? "bg-green-50 border-green-200" : "bg-white border-slate-200"}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${m.done ? "bg-green-100" : "bg-slate-100"}`}>
                      {m.done ? <Check className="w-4 h-4 text-green-600" /> : <m.icon className="w-4 h-4 text-slate-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-semibold leading-snug ${m.done ? "text-green-700 line-through" : "text-slate-900"}`}>{m.title}</p>
                        {m.done && <Badge variant="success">Concluída</Badge>}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{m.desc}</p>
                      {!m.done && (
                        <div className="mt-2">
                          <div className="flex justify-between mb-1">
                            <span className="text-xs text-slate-500">Progresso</span>
                            <span className="text-xs font-semibold text-slate-900">{m.progress}/{m.total}</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(m.progress / m.total) * 100}%`, backgroundColor: "#1D4ED8" }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div>
          <Card className="p-4 sm:p-5 h-full">
            <h2 className="font-bold text-slate-900 mb-4">Conquistas</h2>
            <div className="space-y-3">
              {ACHIEVEMENTS.map(a => (
                <div key={a.id} className={`flex items-start gap-3 p-3 rounded-xl border ${a.unlocked ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-200 opacity-50"}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${a.unlocked ? "bg-amber-100" : "bg-slate-100"}`}>
                    <a.icon className={`w-4 h-4 ${a.unlocked ? "text-amber-600" : "text-slate-400"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold ${a.unlocked ? "text-amber-800" : "text-slate-500"}`}>{a.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{a.desc}</p>
                  </div>
                  {a.unlocked && <Award className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Cursos recomendados ── */}
      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-900">Cursos recomendados</h2>
          <button onClick={() => onNavigate("materials")} className="text-xs text-blue-700 font-semibold hover:underline flex items-center gap-1">
            Ver todos <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {COURSES.map(c => (
            <div key={c.id} className="p-4 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-all flex flex-col">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <p className="text-sm font-bold text-slate-900 leading-snug">{c.title}</p>
                    <Badge variant={c.tagVariant}>{c.tag}</Badge>
                  </div>
                  <p className="text-xs text-slate-500">{c.provider}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1 text-xs text-slate-500"><Clock className="w-3 h-3" />{c.duration}</div>
                    <div className="flex items-center gap-1 text-xs text-slate-500"><GraduationCap className="w-3 h-3" />{c.level}</div>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200">
                <Btn variant="outline" size="sm" className="w-full" onClick={() => toast.info("Abrindo plataforma de curso...")}>
                  Acessar curso <ArrowRight className="w-3.5 h-3.5" />
                </Btn>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
