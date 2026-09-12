import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle, ArrowRight, CheckCircle, ClipboardCheck, History,
  RefreshCw, ShieldCheck, Target, TrendingUp,
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Alert } from "./ui/alert";
import { DISC_ETHICAL_NOTICE, DISC_FACTOR_MAP, DISC_FACTORS, type DiscFactorId } from "../domain/disc-content";
import {
  calculateDiscMockResult,
  createInitialDiscTestStorage,
  DISC_TEST_BLOCKS,
  DISC_TEST_STORAGE_KEY,
  DISC_TEST_VERSION,
  getDiscPercentFromRawCount,
  type DiscFactorCode,
  type DiscRawCounts,
  type DiscTestStorage,
} from "../mocks/disc-test";

function readDiscStorage(): DiscTestStorage {
  if (typeof window === "undefined") return createInitialDiscTestStorage();

  try {
    const raw = window.localStorage.getItem(DISC_TEST_STORAGE_KEY);
    if (!raw) return createInitialDiscTestStorage();
    const parsed = JSON.parse(raw) as DiscTestStorage;
    if (parsed.version !== DISC_TEST_VERSION) return createInitialDiscTestStorage();

    return {
      ...createInitialDiscTestStorage(),
      ...parsed,
      answers: parsed.answers ?? {},
      version: DISC_TEST_VERSION,
    };
  } catch {
    return createInitialDiscTestStorage();
  }
}

function saveDiscStorage(next: DiscTestStorage) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DISC_TEST_STORAGE_KEY, JSON.stringify(next));
}

function formatDate(value?: string) {
  if (!value) return "Ainda não realizado";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getRadarScores(rawCounts: DiscRawCounts) {
  return DISC_FACTORS.reduce((acc, factor) => {
    acc[factor.id] = getDiscPercentFromRawCount(rawCounts[factor.id] ?? 0);
    return acc;
  }, {} as Record<DiscFactorId, number>);
}

const DISC_RADAR_COLOR = "#1D4ED8";

function DiscRadar({ rawCounts }: { rawCounts: DiscRawCounts }) {
  const data = DISC_FACTORS.map((factor) => ({
    factor: factor.id,
    name: factor.id,
    fullName: factor.name,
    score: getDiscPercentFromRawCount(rawCounts[factor.id] ?? 0),
    count: rawCounts[factor.id] ?? 0,
    color: factor.color,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data} outerRadius="68%" margin={{ top: 14, right: 34, bottom: 14, left: 34 }}>
        <PolarGrid stroke="#E2E8F0" radialLines={false} />
        <PolarAngleAxis
          dataKey="name"
          tick={({ payload, x, y, cx, cy, textAnchor, ...rest }: any) => {
            const dx = x - (cx ?? 0);
            const dy = y - (cy ?? 0);
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const labelOffset = 6;
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
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          name="DISC"
          dataKey="score"
          stroke={DISC_RADAR_COLOR}
          fill={DISC_RADAR_COLOR}
          fillOpacity={0.12}
          strokeWidth={2}
          isAnimationActive
          animationBegin={0}
          animationDuration={700}
          animationEasing="ease-out"
          activeDot={false}
          dot={false}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function DiscTestScreen() {
  const [record, setRecord] = useState<DiscTestStorage>(() => readDiscStorage());
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    saveDiscStorage(record);
  }, [record]);

  const answeredCount = Object.keys(record.answers).length;
  const current = DISC_TEST_BLOCKS[currentQuestion];
  const hasSavedResult = Boolean(record.rawCounts && record.primaryFactor && record.completedAt);
  const primaryFactor = record.primaryFactor ? DISC_FACTOR_MAP[record.primaryFactor] : null;
  const secondaryFactor = record.secondaryFactor ? DISC_FACTOR_MAP[record.secondaryFactor] : null;
  const radarScores = useMemo(
    () => (record.rawCounts ? getRadarScores(record.rawCounts) : null),
    [record.rawCounts],
  );

  const startAttempt = () => {
    const now = new Date().toISOString();
    setCurrentQuestion(0);
    setError("");
    setRecord((prev) => ({
      ...prev,
      status: "IN_PROGRESS",
      startedAt: now,
      updatedAt: now,
      answers: {},
      version: DISC_TEST_VERSION,
    }));
  };

  const updateAnswer = (blockId: string, value: DiscFactorCode) => {
    const now = new Date().toISOString();
    setError("");
    setRecord((prev) => ({
      ...prev,
      status: "IN_PROGRESS",
      updatedAt: now,
      answers: {
        ...prev.answers,
        [blockId]: value,
      },
    }));
  };

  const finishAttempt = () => {
    if (answeredCount < DISC_TEST_BLOCKS.length) {
      setError("Responda todas as etapas antes de concluir.");
      return;
    }

    const now = new Date().toISOString();
    const result = calculateDiscMockResult(record.answers);
    setRecord((prev) => ({
      ...prev,
      status: "COMPLETED",
      updatedAt: now,
      completedAt: now,
      rawCounts: result.rawCounts,
      primaryFactor: result.primaryFactor,
      secondaryFactor: result.secondaryFactor,
      version: DISC_TEST_VERSION,
    }));
    setError("");
  };

  if (record.status === "IN_PROGRESS") {
    const answer = record.answers[current.id];
    const progress = Math.round((answeredCount / DISC_TEST_BLOCKS.length) * 100);

    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Card className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
            <div>
              <Badge variant="primary">Em andamento</Badge>
              <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mt-3">Teste DISC</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Escolha, em cada etapa, a característica que mais se aproxima da sua forma de atuar no contexto profissional.
              </p>
            </div>
            {hasSavedResult && (
              <div className="rounded-xl border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
                Última realização: <span className="font-semibold text-foreground">{formatDate(record.completedAt)}</span>
              </div>
            )}
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-2">
              <span>Escolha {currentQuestion + 1} de {DISC_TEST_BLOCKS.length}</span>
              <span>{progress}% respondido</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background p-5 sm:p-6 mb-5">
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
              Selecione uma característica
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {current.options.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => updateAnswer(current.id, option.code)}
                  className={`rounded-xl border px-4 py-4 text-left text-base font-bold transition-all outline-none focus-visible:border-[#1D4ED8] focus-visible:ring-[4px] focus-visible:ring-[rgba(29,78,216,0.24)] ${
                    answer === option.code
                      ? "border-primary bg-blue-50 text-primary shadow-sm"
                      : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-blue-50/40"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <Alert tone="warning" className="mt-5">
              <AlertCircle className="w-4 h-4" />
              {error}
            </Alert>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestion((idx) => Math.max(0, idx - 1))}
              disabled={currentQuestion === 0}
            >
              Anterior
            </Button>
            {currentQuestion < DISC_TEST_BLOCKS.length - 1 ? (
              <Button
                className="flex-1"
                onClick={() => setCurrentQuestion((idx) => Math.min(DISC_TEST_BLOCKS.length - 1, idx + 1))}
                disabled={!answer}
              >
                Próxima <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button className="flex-1" onClick={finishAttempt} disabled={!answer}>
                Concluir teste <CheckCircle className="w-4 h-4" />
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  if (hasSavedResult && record.rawCounts && primaryFactor && radarScores) {
    const orderedFactors = [...DISC_FACTORS].sort(
      (a, b) => (record.rawCounts?.[b.id] ?? 0) - (record.rawCounts?.[a.id] ?? 0),
    );

    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
            <div>
              <Badge variant="primary">Resultado DISC</Badge>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-3">Perfil predominante: {primaryFactor.name}</h2>
              <p className="text-muted-foreground leading-relaxed mt-2 max-w-2xl">
                Você é uma pessoa de {primaryFactor.name} e por isso é {primaryFactor.resultDescription}
              </p>
              {secondaryFactor && (
                <p className="text-sm text-muted-foreground leading-relaxed mt-2 max-w-2xl">
                  Além disso, você pontuou bem em {secondaryFactor.name} e por isso também é {secondaryFactor.resultDescription}
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
              <div className="rounded-xl border border-border bg-muted px-4 py-3 text-sm">
                <span className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Última realização</span>
                <span className="font-semibold text-foreground">{formatDate(record.completedAt)}</span>
              </div>
              <Button variant="outline" onClick={() => setShowRestartConfirm(true)}>
                <RefreshCw className="w-4 h-4" /> Refazer teste
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-6">
          <Card className="p-5 sm:p-6">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" /> Radar D/I/S/C
            </h3>
            <DiscRadar rawCounts={record.rawCounts} />
            <style>{`
              @keyframes reportRadarDotIn {
                0% { opacity: 0; transform: scale(0.65); }
                100% { opacity: 1; transform: scale(1); }
              }
            `}</style>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-4">
              {DISC_FACTORS.map((factor) => (
                <div key={factor.id} className="flex items-center justify-between gap-3 border-b border-border/70 py-2 text-sm last:border-b-0 sm:last:border-b">
                  <span className="font-semibold text-foreground">{factor.id} - {factor.name}</span>
                  <span className="rounded-full px-2.5 py-1 text-xs font-extrabold" style={{ color: factor.color, backgroundColor: `${factor.color}16` }}>
                    {record.rawCounts?.[factor.id] ?? 0}/40 · {radarScores[factor.id]}%
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className={`p-5 sm:p-6 border ${primaryFactor.softClassName}`}>
            <h3 className={`font-bold mb-2 ${primaryFactor.textClassName}`}>{primaryFactor.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">{primaryFactor.description}</p>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Potenciais</p>
                <ul className="space-y-2">
                  {[primaryFactor.resultPotentialSummary, ...primaryFactor.potentials].map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-foreground">
                      <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Pontos de desenvolvimento</p>
                <ul className="space-y-2">
                  {[primaryFactor.resultDevelopmentSummary, primaryFactor.resultAttentionSummary].map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-foreground">
                      <TrendingUp className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-5 sm:p-6">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-blue-600" /> Recomendações
            </h3>
            <div className="space-y-3">
              {[primaryFactor.commandWord, ...primaryFactor.recommendations].map((item) => (
                <div key={item} className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground">
                  {item}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" /> Leitura dos fatores
            </h3>
            <div className="space-y-3">
              {orderedFactors.map((factor) => (
                <div key={factor.id} className="flex items-start gap-3 rounded-xl border border-border p-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-extrabold" style={{ backgroundColor: factor.color }}>
                    {factor.id}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">{factor.name}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{record.rawCounts?.[factor.id] ?? 0} escolhas · {factor.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Alert tone="info">
          <ShieldCheck className="w-4 h-4" />
          {DISC_ETHICAL_NOTICE}
        </Alert>

        {showRestartConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <h3 className="font-extrabold text-foreground mb-2">Refazer teste?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                Uma nova tentativa será iniciada. Seu último resultado continuará disponível até que você conclua o novo teste.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowRestartConfirm(false)}>
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={() => { setShowRestartConfirm(false); startAttempt(); }}>
                  Iniciar nova tentativa
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Card className="p-6 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.85fr] gap-8 items-center">
          <div>
            <Badge variant="primary">Autoconhecimento e desenvolvimento</Badge>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-4 mb-3">Teste DISC</h2>
            <p className="text-muted-foreground leading-relaxed max-w-2xl">
              Escolha características de autopercepção profissional para refletir sobre tendências relacionadas a Dominância, Influência, Estabilidade e Conformidade.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Button size="lg" onClick={startAttempt}>
                Iniciar teste <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {DISC_FACTORS.map((factor) => (
              <div key={factor.id} className={`rounded-2xl border p-4 ${factor.softClassName}`}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-extrabold mb-3" style={{ backgroundColor: factor.color }}>
                  {factor.id}
                </div>
                <p className="font-bold text-foreground">{factor.name}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{factor.title}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Alert tone="info">
        <ShieldCheck className="w-4 h-4" />
        {DISC_ETHICAL_NOTICE}
      </Alert>
    </div>
  );
}
