import { useEffect, useRef, useState } from "react";
import { AlertCircle, Briefcase, ClipboardList, Info, Laptop, MapPin, Users } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { HorizontalScrollHint } from "./ui/horizontal-scroll-hint";
import {
  DEFAULT_SUGGESTED_JOB_AREA,
  SUGGESTED_JOB_AREAS,
  getSuggestedJobsByArea,
  type SuggestedJob,
  type SuggestedJobArea,
} from "../domain/suggested-jobs";
import { copyTextToClipboard } from "../services/clipboard";

// Atalho temporário de apresentação: o fluxo único é escolher a área, escolher
// uma das vagas, copiar o link e colar MANUALMENTE no campo "URL da vaga" acima.
// Esta seção nunca preenche o campo nem toca no fluxo de análise/confirmação/
// continuação da tela.

const FEEDBACK_MS = 5000;

// Ícones decorativos das áreas (herdam a cor do texto do botão).
const AREA_ICONS: Record<SuggestedJobArea, typeof Laptop> = {
  TECNOLOGIA: Laptop,
  RECURSOS_HUMANOS: Users,
  SECRETARIADO: ClipboardList,
};

type CopyFeedback = { jobId: string; status: "copied" | "error" };

export function SuggestedJobsSection({ onLinkCopied }: { onLinkCopied?: () => void }) {
  const [selectedArea, setSelectedArea] = useState<SuggestedJobArea>(DEFAULT_SUGGESTED_JOB_AREA);
  const [feedback, setFeedback] = useState<CopyFeedback | null>(null);
  const timerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const jobs = getSuggestedJobsByArea(selectedArea);
  const failedJob = feedback?.status === "error" ? jobs.find((job) => job.id === feedback.jobId) : undefined;

  // Ao trocar de área, descarta o feedback de cópia/erro da área anterior.
  const handleSelectArea = (area: SuggestedJobArea) => {
    if (area === selectedArea) return;
    setSelectedArea(area);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setFeedback(null);
  };

  const handleCopy = async (job: SuggestedJob) => {
    const copied = await copyTextToClipboard(job.url);
    if (!mountedRef.current) return;
    setFeedback({ jobId: job.id, status: copied ? "copied" : "error" });
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setFeedback(null), FEEDBACK_MS);
    if (copied) onLinkCopied?.();
  };

  return (
    <section aria-labelledby="suggested-jobs-title" className="space-y-5">
      <div role="note" className="flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 sm:px-5 sm:py-3.5">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-blue-900">Vagas sugeridas da Empregare</p>
          <p className="mt-1 text-sm leading-relaxed text-blue-900/80">
            Para facilitar sua escolha, selecionamos algumas vagas da Empregare. Escolha uma opção, copie o link e
            cole no campo acima.
          </p>
        </div>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="mb-5 flex items-start gap-3.5">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100"
          >
            <Briefcase className="h-[1.125rem] w-[1.125rem]" />
          </span>
          <div className="min-w-0">
            <h3 id="suggested-jobs-title" className="font-bold text-foreground mb-0.5">
              Escolha uma vaga sugerida
            </h3>
            <p className="text-sm text-muted-foreground">
              Selecione uma área, copie o link de uma das vagas e cole no campo acima.
            </p>
          </div>
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">1. Escolha a área</p>
        <HorizontalScrollHint
          className="mb-5 rounded-xl bg-muted"
          scrollerClassName="flex gap-1 p-1"
          leftFadeClassName="from-muted via-muted/90"
          rightFadeClassName="from-muted via-muted/90"
          previousLabel="Ver categorias anteriores"
          nextLabel="Ver mais categorias"
          role="group"
          aria-label="Área da vaga"
        >
          {SUGGESTED_JOB_AREAS.map((area) => {
            const active = area.id === selectedArea;
            const AreaIcon = AREA_ICONS[area.id];
            return (
              <button
                key={area.id}
                type="button"
                aria-pressed={active}
                onClick={() => handleSelectArea(area.id)}
                className={`inline-flex min-h-11 flex-1 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-center text-sm font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-[rgba(29,78,216,0.24)] ${
                  active
                    ? "bg-card text-primary shadow-[0_1px_2px_rgba(15,27,45,0.12)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <AreaIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {area.label}
              </button>
            );
          })}
        </HorizontalScrollHint>

        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">2. Escolha a vaga e copie o link</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {jobs.map((job) => {
            const copied = feedback?.jobId === job.id && feedback.status === "copied";
            return (
              <div
                key={job.id}
                className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-4"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-sm font-semibold leading-snug text-foreground break-words">{job.title}</p>
                  {job.company && (
                    <p className="text-xs font-medium text-muted-foreground break-words">{job.company}</p>
                  )}
                  <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 break-words">{job.location}</span>
                  </p>
                  {(job.modality || job.level) && (
                    <div className="flex flex-wrap gap-1.5">
                      {job.modality && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                          {job.modality}
                        </span>
                      )}
                      {job.level && (
                        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                          {job.level}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant={copied ? "secondary" : "primary"}
                  className="min-h-11 w-full"
                  aria-label={copied ? `Link copiado: ${job.title}` : `Copiar link da vaga: ${job.title}`}
                  onClick={() => void handleCopy(job)}
                >
                  {copied ? "✓ Copiado" : "Copiar link"}
                </Button>
              </div>
            );
          })}
        </div>

        <div role="status" aria-live="polite">
          {feedback?.status === "copied" && (
            <p className="mt-4 text-sm font-medium text-blue-700">
              Link copiado. Agora cole no campo acima e toque em Analisar.
            </p>
          )}
          {failedJob && (
            <div className="mt-4 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
              <div className="min-w-0 text-xs text-red-700">
                <p>Não foi possível copiar o link. Selecione e copie manualmente:</p>
                <p className="mt-1 select-all break-all font-mono text-[11px]">{failedJob.url}</p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </section>
  );
}
