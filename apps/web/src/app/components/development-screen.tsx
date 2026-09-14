import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle,
  Circle,
  Compass,
  GraduationCap,
  Leaf,
  Lock,
  MessageSquare,
  Route,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { Button as UIButton } from "./ui/button";
import { Card as UICard } from "./ui/card";
import { Progress } from "./ui/progress";
import {
  getDevelopmentDerivedState,
  getDevelopmentState,
} from "../services/development-service";
import niloGamificacaoImage from "../../assets/nilo/nilo-gamificacao.webp";
import type {
  CompetencyStatus,
  DevelopmentCompetency,
  DevelopmentMission,
  EvidenceType,
  MissionStatus,
} from "../domain/development";

type NavFn = (screen: string) => void;

function Btn({
  variant = "primary",
  size = "md",
  children,
  onClick,
  disabled = false,
  className = "",
}: {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const buttonVariant = variant === "danger" ? "destructive" : variant;

  return (
    <UIButton
      variant={buttonVariant}
      size={size}
      className={`${size === "sm" ? "text-xs" : ""} font-semibold cursor-pointer ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </UIButton>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <UICard padding="none" className={className}>
      {children}
    </UICard>
  );
}

function statusLabel(status: CompetencyStatus | MissionStatus) {
  const labels: Record<CompetencyStatus | MissionStatus, string> = {
    LOCKED: "Bloqueado",
    AVAILABLE: "Disponível",
    IN_PROGRESS: "Em desenvolvimento",
    ADVANCED: "Avançado",
    CONSOLIDATED: "Consolidado",
    COMPLETED: "Concluído",
  };
  return labels[status];
}

function statusStyles(status: CompetencyStatus) {
  const styles: Record<CompetencyStatus, { badge: string; dot: string; border: string; icon: React.ElementType }> = {
    LOCKED: {
      badge: "bg-slate-100 text-slate-500",
      dot: "bg-slate-300 text-slate-600",
      border: "border-slate-200 bg-slate-50",
      icon: Lock,
    },
    AVAILABLE: {
      badge: "bg-blue-50 text-blue-700",
      dot: "bg-blue-50 text-blue-700",
      border: "border-blue-100 bg-white",
      icon: Circle,
    },
    IN_PROGRESS: {
      badge: "bg-amber-50 text-amber-700",
      dot: "bg-amber-50 text-amber-700",
      border: "border-amber-100 bg-amber-50/30",
      icon: TrendingUp,
    },
    ADVANCED: {
      badge: "bg-blue-100 text-blue-800",
      dot: "bg-blue-100 text-blue-800",
      border: "border-blue-200 bg-blue-50/40",
      icon: Sparkles,
    },
    CONSOLIDATED: {
      badge: "bg-green-50 text-green-700",
      dot: "bg-green-50 text-green-700",
      border: "border-green-100 bg-green-50/40",
      icon: CheckCircle,
    },
  };
  return styles[status];
}

function sourceTypeLabel(sourceType: EvidenceType) {
  const labels: Record<EvidenceType, string> = {
    INTERVIEW: "Entrevista",
    MATERIAL: "Material",
    MISSION: "Missão",
    SYSTEM_MILESTONE: "Marco da jornada",
  };
  return labels[sourceType];
}

function getMissionAction(mission: DevelopmentMission | null, onNavigate: NavFn) {
  if (!mission) {
    return {
      label: "Explorar materiais",
      onClick: () => onNavigate("materials"),
      disabled: false,
    };
  }

  if (mission.sourceType === "MATERIAL") {
    return {
      label: "Ir para Materiais",
      onClick: () => onNavigate("materials"),
      disabled: false,
    };
  }

  if (mission.sourceType === "INTERVIEW") {
    return {
      label: "Iniciar entrevista",
      onClick: () => onNavigate("interview-setup"),
      disabled: false,
    };
  }

  return {
    label: "Acompanhar missão",
    onClick: undefined,
    disabled: true,
  };
}

function getLevelProgress(xp: number, level: { minXp: number; nextLevelXp: number | null }) {
  if (level.nextLevelXp === null) return 100;
  const span = level.nextLevelXp - level.minXp;
  if (span <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round(((xp - level.minXp) / span) * 100)));
}

function CompetencyCard({
  competency,
  selected,
  current,
  onSelect,
}: {
  competency: DevelopmentCompetency;
  selected: boolean;
  current: boolean;
  onSelect: () => void;
}) {
  const styles = statusStyles(competency.status);
  const Icon = styles.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-xl border p-3 transition-all hover:border-primary/40 hover:bg-blue-50/30 ${selected ? "border-primary bg-blue-50/60 shadow-sm" : styles.border
        } ${current ? "ring-1 ring-primary/30" : ""}`}
      aria-pressed={selected}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${styles.dot}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="break-words text-sm font-bold text-foreground">{competency.name}</p>
            {current && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                Missão atual
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${styles.badge}`}>
              {statusLabel(competency.status)}
            </span>
            <span className="text-xs font-bold text-muted-foreground">{competency.progress}%</span>
          </div>
          <Progress value={competency.progress} className="mt-2 h-1.5 bg-slate-100" />
        </div>
      </div>
    </button>
  );
}

function TalentTreePlaceholder({
  treeStage,
  overallProgress,
}: {
  treeStage: number;
  overallProgress: number;
}) {
  return (
    <div className="relative flex min-h-[300px] items-center justify-center overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50 via-white to-green-50 p-6">
      <div className="absolute left-4 top-4 rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-blue-800 shadow-sm">
        Estágio {treeStage}/10
      </div>
      <div className="absolute bottom-4 right-4 text-xs font-semibold text-muted-foreground">
        {overallProgress}% da jornada
      </div>

      <div className="relative h-56 w-56">
        <div className="absolute left-1/2 top-20 h-28 w-8 -translate-x-1/2 rounded-b-3xl rounded-t-xl bg-[#8b5e3c]" />
        <div className="absolute left-1/2 top-6 h-32 w-32 -translate-x-1/2 rounded-full bg-green-100 ring-8 ring-green-50" />
        <div className="absolute left-8 top-16 h-24 w-24 rounded-full bg-blue-100/80" />
        <div className="absolute right-8 top-16 h-24 w-24 rounded-full bg-green-200/80" />
        <div className="absolute bottom-5 left-1/2 h-8 w-36 -translate-x-1/2 rounded-full bg-green-100" />
        <div className="absolute left-1/2 top-24 -translate-x-1/2 rounded-full bg-white px-3 py-2 text-center shadow-sm">
          <Leaf className="mx-auto h-5 w-5 text-green-600" />
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-blue-900">Frame futuro</p>
        </div>
      </div>
    </div>
  );
}

export function DevelopmentContent({ onNavigate }: { onNavigate: NavFn }) {
  const [state] = useState(() => getDevelopmentState());
  const derived = useMemo(() => getDevelopmentDerivedState(state), [state]);
  const currentMission = derived.currentMission;
  const currentCompetency = currentMission
    ? state.competencies.find((competency) => competency.id === currentMission.competencyId) ?? null
    : null;
  const [selectedCompetencyId, setSelectedCompetencyId] = useState(
    currentCompetency?.id ?? state.competencies[0]?.id ?? "",
  );
  const selectedCompetency =
    state.competencies.find((competency) => competency.id === selectedCompetencyId) ??
    currentCompetency ??
    state.competencies[0] ??
    null;
  const levelProgress = getLevelProgress(state.xp, derived.level);
  const missionProgress = currentMission
    ? Math.min(100, Math.round((currentMission.progress / currentMission.target) * 100))
    : 0;
  const action = getMissionAction(currentMission, onNavigate);
  const transversalCompetencies = state.competencies.filter((competency) => competency.type === "TRANSVERSAL");
  const specificCompetencies = state.competencies.filter((competency) => competency.type === "SPECIFIC");

  return (
    <div className="min-w-0 space-y-5 overflow-x-hidden">
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(360px,0.4fr)_minmax(0,0.6fr)]">
        <Card className="overflow-hidden">
          <div className="grid h-full min-h-[320px] min-w-0 overflow-hidden bg-gradient-to-br from-blue-50 via-white to-green-50 2xl:min-h-[380px] 2xl:grid-cols-[minmax(220px,0.46fr)_minmax(0,0.54fr)]">
            <div className="order-2 flex h-full min-h-[220px] items-end justify-center overflow-hidden px-3 pt-2 2xl:order-1 2xl:min-h-full 2xl:px-2 2xl:pt-0">
              <img
                src={niloGamificacaoImage}
                alt="Nilo, guia de carreira do RH Connect"
                className="pointer-events-none h-auto w-auto max-w-[180px] select-none sm:max-w-[220px] lg:max-w-[240px] 2xl:max-w-full 2xl:max-h-[460px]"
                draggable={false}
              />
            </div>

            <div className="order-1 flex min-w-0 flex-col justify-center gap-5 p-5 sm:p-6 2xl:order-2 2xl:pl-2">
              <div className="min-w-0">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/75 text-primary shadow-sm">
                  <Compass className="h-7 w-7" />
                </div>

                <p className="mt-5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground sm:text-xs sm:tracking-[0.16em] break-normal">
                  Meu desenvolvimento
                </p>

                <h2 className="mt-2 max-w-md text-xl font-bold leading-tight text-foreground sm:text-2xl break-normal">
                  Olá! Vamos acompanhar sua jornada.
                </h2>

                <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground break-normal">
                  O Nilo acompanhará sua evolução, destacando próximos passos e dando contexto para a jornada.
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="min-w-0 p-4 sm:p-6">
            <div className="mb-5 min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Contexto da jornada</p>
              <h2 className="mt-1 max-w-2xl break-words text-2xl font-bold leading-tight text-foreground">
                Sua trilha de talentos no RH Connect
              </h2>
              <p className="mt-2 max-w-2xl break-words text-sm leading-relaxed text-muted-foreground">
                Acompanhe a trilha atual, seu nível e o progresso acumulado sem perder de vista a próxima ação.
              </p>
            </div>

            <div className="grid min-w-0 gap-3 md:grid-cols-3">
              <div className="min-w-0 rounded-xl border border-border bg-white p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <Route className="h-3.5 w-3.5" /> Trilha atual
                </div>
                <p className="mt-3 text-sm font-bold text-foreground">{state.area}</p>
                <p className="break-words text-sm text-muted-foreground">{state.track}</p>
              </div>

              <div className="min-w-0 rounded-xl border border-border bg-white p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <GraduationCap className="h-3.5 w-3.5" /> Nível atual
                </div>
                <p className="mt-3 text-2xl font-bold text-foreground">{derived.level.level}</p>
                <p className="break-words text-sm font-semibold text-muted-foreground">{derived.level.name}</p>
              </div>

              <div className="min-w-0 rounded-xl border border-border bg-white p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" /> XP
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-lg font-bold text-foreground">{state.xp} XP</span>
                  <span className="font-semibold text-muted-foreground">
                    {derived.nextLevelXp === null ? "Nível máximo" : `Próximo: ${derived.nextLevelXp} XP`}
                  </span>
                </div>
                <Progress value={levelProgress} className="mt-3 h-2 bg-slate-100" />
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-border bg-slate-50/70 p-4">
              <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <Target className="h-3.5 w-3.5" /> Missão atual
              </div>
              {currentMission ? (
                <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(180px,0.8fr)_minmax(160px,auto)] lg:items-center">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                        {sourceTypeLabel(currentMission.sourceType)}
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 ring-1 ring-border">
                        {statusLabel(currentMission.status)}
                      </span>
                    </div>
                    <h3 className="break-words text-base font-bold text-foreground">{currentMission.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{currentMission.description}</p>
                  </div>

                  <div className="min-w-0">
                    {currentCompetency && (
                      <p className="text-xs font-semibold text-muted-foreground">
                        Competência relacionada: <span className="text-foreground">{currentCompetency.name}</span>
                      </p>
                    )}
                    <div className="mt-3">
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="font-semibold text-muted-foreground">Progresso</span>
                        <span className="font-bold text-foreground">
                          {currentMission.progress}/{currentMission.target}
                        </span>
                      </div>
                      <Progress value={missionProgress} className="h-2 bg-slate-200" />
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-col gap-3">
                    <div className="rounded-xl bg-blue-50/80 p-3 text-xs font-semibold text-blue-800">
                      Recompensa ao concluir: +{currentMission.rewardXp} XP
                    </div>
                    <Btn size="sm" className="w-full" variant={action.disabled ? "outline" : "primary"} disabled={action.disabled} onClick={action.onClick}>
                      {action.label} <ArrowRight className="h-3.5 w-3.5" />
                    </Btn>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-white p-4">
                  <p className="text-sm font-bold text-foreground">Nenhuma missão ativa no momento</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Explore os materiais da sua trilha enquanto novas etapas são preparadas.
                  </p>
                  <Btn size="sm" className="mt-4" onClick={() => onNavigate("materials")}>
                    Ir para Materiais <ArrowRight className="h-3.5 w-3.5" />
                  </Btn>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      <div className="min-w-0">
        <Card className="overflow-hidden">
          <div className="border-b border-border p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Árvore de Talentos</p>
                <h2 className="mt-1 text-xl font-bold text-foreground">Jornada de competências</h2>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Visualize a árvore provisória e acompanhe as competências reais da sua trilha.
                </p>
              </div>
              <div className="min-w-[180px]">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">Progresso da jornada</span>
                  <span className="font-bold text-foreground">{derived.overallProgress}%</span>
                </div>
                <Progress value={derived.overallProgress} className="h-2 bg-slate-100" />
              </div>
            </div>
          </div>

          <div className="grid min-w-0 gap-5 p-5 sm:p-6 2xl:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.1fr)]">
            <TalentTreePlaceholder treeStage={derived.treeStage} overallProgress={derived.overallProgress} />

            <div className="min-w-0 space-y-5">
              <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-foreground">Competências transversais</h3>
                  <span className="text-xs font-semibold text-muted-foreground">{transversalCompetencies.length} competências</span>
                </div>
                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                  {transversalCompetencies.map((competency) => (
                    <CompetencyCard
                      key={competency.id}
                      competency={competency}
                      selected={selectedCompetency?.id === competency.id}
                      current={currentCompetency?.id === competency.id}
                      onSelect={() => setSelectedCompetencyId(competency.id)}
                    />
                  ))}
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-foreground">Competências específicas</h3>
                  <span className="text-xs font-semibold text-muted-foreground">{specificCompetencies.length} competências</span>
                </div>
                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                  {specificCompetencies.map((competency) => (
                    <CompetencyCard
                      key={competency.id}
                      competency={competency}
                      selected={selectedCompetency?.id === competency.id}
                      current={currentCompetency?.id === competency.id}
                      onSelect={() => setSelectedCompetencyId(competency.id)}
                    />
                  ))}
                </div>
              </section>
            </div>
          </div>

          {selectedCompetency && (
            <div className="border-t border-border bg-slate-50/70 p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Competência selecionada</p>
                  <h3 className="mt-1 text-base font-bold text-foreground">{selectedCompetency.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {statusLabel(selectedCompetency.status)} na jornada RH Connect, com {selectedCompetency.progress}% de progresso.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedCompetency.evidenceTypes.map((evidenceType) => (
                    <span key={evidenceType} className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-muted-foreground ring-1 ring-border">
                      {evidenceType === "MATERIAL" ? <BookOpen className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                      {sourceTypeLabel(evidenceType)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}
