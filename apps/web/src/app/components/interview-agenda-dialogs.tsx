/** RH Connect — Diálogos da Agenda de Entrevistas (cadastro, detalhes, feedback e cancelamento). */

import { useState, type ReactNode } from "react";
import { CalendarDays, ChevronDown, Clock, ExternalLink, MapPin, Video } from "lucide-react";
import { Button, buttonVariants } from "./ui/button";
import { Input } from "./ui/input";
import { NativeSelect } from "./ui/native-select";
import { Textarea } from "./ui/textarea";
import { StatusBadge } from "./ui/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { cn } from "./ui/utils";
import {
  FEELING_OPTIONS,
  FIELD_LIMITS,
  MODALITY_LABEL,
  buildInterviewInput,
  createEmptyFormValues,
  formatInterviewDate,
  formatInterviewTime,
  getInterviewPhase,
  toFormValues,
  type ExternalInterview,
  type ExternalInterviewFeeling,
  type ExternalInterviewFormErrors,
  type ExternalInterviewFormValues,
  type ExternalInterviewInput,
  type ExternalInterviewModality,
  type ExternalInterviewPhase,
} from "../domain/interview-agenda";

// ─── Badge de fase ────────────────────────────────────────────────────────────

const PHASE_BADGE: Record<ExternalInterviewPhase, { tone: "info" | "warning" | "success" | "neutral"; label: string }> = {
  UPCOMING: { tone: "info", label: "Agendada" },
  AWAITING_FEEDBACK: { tone: "warning", label: "Aguardando feedback" },
  COMPLETED: { tone: "success", label: "Concluída" },
  CANCELLED: { tone: "neutral", label: "Cancelada" },
};

export function InterviewPhaseBadge({ phase }: { phase: ExternalInterviewPhase }) {
  const badge = PHASE_BADGE[phase];
  return <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>;
}

export function ModalityIcon({ modality, className }: { modality: ExternalInterviewModality; className?: string }) {
  const Icon = modality === "ONLINE" ? Video : MapPin;
  return <Icon className={className} aria-hidden="true" />;
}

// ─── Formulário (cadastro / edição-reagendamento) ────────────────────────────

function FormField({
  id,
  label,
  required,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-foreground mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

export function InterviewFormDialog({
  interview,
  onClose,
  onSubmit,
}: {
  /** Entrevista em edição; ausente = cadastro novo. */
  interview?: ExternalInterview | null;
  onClose: () => void;
  onSubmit: (input: ExternalInterviewInput) => Promise<void>;
}) {
  const isEdit = Boolean(interview);
  const [values, setValues] = useState<ExternalInterviewFormValues>(() =>
    interview ? toFormValues(interview) : createEmptyFormValues(),
  );
  const [errors, setErrors] = useState<ExternalInterviewFormErrors>({});
  const [saving, setSaving] = useState(false);

  const setField = <K extends keyof ExternalInterviewFormValues>(key: K, value: ExternalInterviewFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const locationLabel =
    values.modality === "ONLINE" ? "Link da reunião" : values.modality === "IN_PERSON" ? "Endereço" : "Local ou link";
  const locationPlaceholder =
    values.modality === "ONLINE" ? "https://..." : values.modality === "IN_PERSON" ? "Endereço ou sala" : "";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;

    const result = buildInterviewInput(values, new Date());
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setSaving(true);
    try {
      await onSubmit(result.input);
    } finally {
      setSaving(false);
    }
  };

  const invalid = (key: keyof ExternalInterviewFormValues) => (errors[key] ? true : undefined);
  const describedBy = (key: keyof ExternalInterviewFormValues) => (errors[key] ? `agenda-${key}-error` : undefined);

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar entrevista" : "Adicionar entrevista"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Alterar a data ou o horário reagenda a entrevista."
              : "Registre uma entrevista de processo seletivo que acontecerá fora do RH Connect."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <FormField id="agenda-company" label="Empresa" required error={errors.company}>
            <Input
              id="agenda-company"
              value={values.company}
              maxLength={FIELD_LIMITS.company}
              onChange={(event) => setField("company", event.target.value)}
              aria-invalid={invalid("company")}
              aria-describedby={describedBy("company")}
              autoComplete="organization"
            />
          </FormField>

          <FormField id="agenda-position" label="Vaga / cargo" required error={errors.position}>
            <Input
              id="agenda-position"
              value={values.position}
              maxLength={FIELD_LIMITS.position}
              onChange={(event) => setField("position", event.target.value)}
              aria-invalid={invalid("position")}
              aria-describedby={describedBy("position")}
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField id="agenda-date" label="Data" required error={errors.date}>
              <Input
                id="agenda-date"
                type="date"
                value={values.date}
                onChange={(event) => setField("date", event.target.value)}
                aria-invalid={invalid("date")}
                aria-describedby={describedBy("date")}
              />
            </FormField>
            <FormField id="agenda-time" label="Horário" required error={errors.time}>
              <Input
                id="agenda-time"
                type="time"
                value={values.time}
                onChange={(event) => setField("time", event.target.value)}
                aria-invalid={invalid("time")}
                aria-describedby={describedBy("time")}
              />
            </FormField>
          </div>

          <FormField id="agenda-modality" label="Modalidade" required error={errors.modality}>
            <div className="relative">
              <NativeSelect
                id="agenda-modality"
                value={values.modality}
                onChange={(event) => setField("modality", event.target.value as ExternalInterviewModality | "")}
                aria-invalid={invalid("modality")}
                aria-describedby={describedBy("modality")}
              >
                <option value="">Selecione...</option>
                <option value="ONLINE">{MODALITY_LABEL.ONLINE}</option>
                <option value="IN_PERSON">{MODALITY_LABEL.IN_PERSON}</option>
              </NativeSelect>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </FormField>

          <FormField id="agenda-location" label={locationLabel} error={errors.locationOrLink}>
            <Input
              id="agenda-location"
              value={values.locationOrLink}
              maxLength={FIELD_LIMITS.locationOrLink}
              placeholder={locationPlaceholder}
              onChange={(event) => setField("locationOrLink", event.target.value)}
              aria-invalid={invalid("locationOrLink")}
              aria-describedby={describedBy("locationOrLink")}
            />
          </FormField>

          <FormField id="agenda-notes" label="Observações" error={errors.notes}>
            <Textarea
              id="agenda-notes"
              rows={3}
              value={values.notes}
              maxLength={FIELD_LIMITS.notes}
              onChange={(event) => setField("notes", event.target.value)}
              aria-invalid={invalid("notes")}
              aria-describedby={describedBy("notes")}
            />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="min-h-11 sm:min-h-0">
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="min-h-11 sm:min-h-0">
              {saving ? "Salvando..." : isEdit ? "Salvar alterações" : "Adicionar à agenda"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Detalhes ─────────────────────────────────────────────────────────────────

function isHttpLink(value: string) {
  return /^https?:\/\//i.test(value);
}

export function InterviewDetailDialog({
  interview,
  now,
  onClose,
  onEdit,
  onCancel,
  onGiveFeedback,
}: {
  interview: ExternalInterview;
  now: Date;
  onClose: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onGiveFeedback: () => void;
}) {
  const phase = getInterviewPhase(interview, now);
  const feeling = interview.feedback
    ? FEELING_OPTIONS.find((option) => option.value === interview.feedback?.feeling)
    : null;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2 pr-6">
            <InterviewPhaseBadge phase={phase} />
          </div>
          <DialogTitle className="leading-snug">{interview.position}</DialogTitle>
          <DialogDescription>{interview.company}</DialogDescription>
        </DialogHeader>

        <dl className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <CalendarDays className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" aria-hidden="true" />
            <div>
              <dt className="sr-only">Data</dt>
              <dd className="font-semibold text-foreground">{formatInterviewDate(interview.scheduledAt)}</dd>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" aria-hidden="true" />
            <div>
              <dt className="sr-only">Horário</dt>
              <dd className="font-semibold text-foreground">{formatInterviewTime(interview.scheduledAt)}</dd>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <ModalityIcon modality={interview.modality} className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <dt className="sr-only">Modalidade</dt>
              <dd className="font-semibold text-foreground">{MODALITY_LABEL[interview.modality]}</dd>
              {interview.locationOrLink && (
                <dd className="text-muted-foreground break-words">
                  {isHttpLink(interview.locationOrLink) ? (
                    <a
                      href={interview.locationOrLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary font-semibold hover:underline"
                    >
                      Abrir link <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>
                  ) : (
                    interview.locationOrLink
                  )}
                </dd>
              )}
            </div>
          </div>
        </dl>

        {interview.notes && (
          <div className="rounded-xl bg-muted/50 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Observações</p>
            <p className="text-sm text-foreground whitespace-pre-wrap break-words">{interview.notes}</p>
          </div>
        )}

        {interview.feedback && feeling && (
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Como você se sentiu</p>
            <p className="text-sm font-semibold text-foreground">
              <span aria-hidden="true">{feeling.emoji}</span> {feeling.label}
            </p>
            {interview.feedback.comment && (
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap break-words">
                {interview.feedback.comment}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          {phase === "AWAITING_FEEDBACK" && (
            <Button onClick={onGiveFeedback} className="min-h-11 sm:min-h-0">
              Contar como foi
            </Button>
          )}
          {phase === "UPCOMING" && (
            <>
              <Button variant="outline" onClick={onEdit} className="min-h-11 sm:min-h-0">
                Editar / reagendar
              </Button>
              <Button variant="outline" onClick={onCancel} className="min-h-11 sm:min-h-0 text-red-600 hover:text-red-700">
                Cancelar entrevista
              </Button>
            </>
          )}
          {phase !== "UPCOMING" && (
            <Button variant="outline" onClick={onClose} className="min-h-11 sm:min-h-0">
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Cancelamento ─────────────────────────────────────────────────────────────

export function CancelInterviewAlert({
  interview,
  onClose,
  onConfirm,
}: {
  interview: ExternalInterview;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <AlertDialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar esta entrevista?</AlertDialogTitle>
          <AlertDialogDescription>
            {interview.position} · {interview.company}. A entrevista continuará no seu histórico, marcada como
            cancelada.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11 sm:min-h-0">Manter entrevista</AlertDialogCancel>
          <AlertDialogAction
            className={cn(buttonVariants({ variant: "destructive" }), "min-h-11 sm:min-h-0")}
            onClick={() => void onConfirm()}
          >
            Cancelar entrevista
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Pós-entrevista (feedback) ────────────────────────────────────────────────

export function InterviewFeedbackDialog({
  interview,
  onClose,
  onSubmit,
  onPracticeAgain,
}: {
  interview: ExternalInterview;
  onClose: () => void;
  onSubmit: (input: { feeling: ExternalInterviewFeeling; comment?: string }) => Promise<void>;
  onPracticeAgain: () => void;
}) {
  const [feeling, setFeeling] = useState<ExternalInterviewFeeling | null>(null);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showError, setShowError] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (!feeling) {
      setShowError(true);
      return;
    }

    setSaving(true);
    setSubmitFailed(false);
    try {
      await onSubmit({ feeling, comment: comment.trim() || undefined });
      setSubmitted(true);
    } catch {
      setSubmitFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        {submitted ? (
          <>
            <DialogHeader className="items-center text-center sm:text-center">
              <DialogTitle>Obrigado por compartilhar! 💙</DialogTitle>
              <DialogDescription>Cada entrevista é uma oportunidade de aprender e evoluir.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={onClose} className="min-h-11 sm:min-h-0">
                Voltar para a agenda
              </Button>
              <Button onClick={onPracticeAgain} className="min-h-11 sm:min-h-0">
                Praticar novamente
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <DialogHeader>
              <DialogTitle>E aí, como foi sua entrevista?</DialogTitle>
              <DialogDescription>
                {interview.position} · {interview.company}
              </DialogDescription>
            </DialogHeader>

            <div>
              <p id="agenda-feeling-label" className="text-sm font-semibold text-foreground mb-2">
                Como você se sentiu durante a entrevista?
              </p>
              <div
                role="radiogroup"
                aria-labelledby="agenda-feeling-label"
                className="grid grid-cols-2 sm:grid-cols-4 gap-2"
              >
                {FEELING_OPTIONS.map((option) => {
                  const selected = feeling === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        setFeeling(option.value);
                        setShowError(false);
                      }}
                      className={cn(
                        "flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 text-sm font-semibold transition-colors outline-none focus-visible:ring-[4px] focus-visible:ring-[rgba(29,78,216,0.24)]",
                        selected
                          ? "border-primary bg-accent text-accent-foreground"
                          : "border-border bg-card text-foreground hover:bg-muted",
                      )}
                    >
                      <span className="text-2xl leading-none" aria-hidden="true">{option.emoji}</span>
                      {option.label}
                    </button>
                  );
                })}
              </div>
              {showError && (
                <p className="mt-2 text-xs text-red-600" role="alert">
                  Selecione como você se sentiu para continuar.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="agenda-feedback-comment" className="block text-sm font-semibold text-foreground mb-1.5">
                Quer contar um pouco mais? <span className="font-normal text-muted-foreground">(opcional)</span>
              </label>
              <Textarea
                id="agenda-feedback-comment"
                rows={3}
                value={comment}
                maxLength={FIELD_LIMITS.feedbackComment}
                onChange={(event) => setComment(event.target.value)}
              />
            </div>

            {submitFailed && (
              <p className="text-xs text-red-600" role="alert">
                Não foi possível enviar agora. Tente novamente.
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="min-h-11 sm:min-h-0">
                Agora não
              </Button>
              <Button type="submit" disabled={saving} className="min-h-11 sm:min-h-0">
                {saving ? "Enviando..." : "Enviar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
