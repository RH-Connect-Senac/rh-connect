/** RH Connect — Conteúdo REAL da fila e do detalhe do Avaliador (Fase 5C.1)
 *
 * Componentes puramente de apresentação: recebem o estado já carregado de
 * `evaluator-interviews-service.ts` (API real) e não importam nenhum mock,
 * identidade de demonstração nem localStorage. O layout (cabeçalho com a
 * identidade da sessão) fica nas telas de `eval-screens.tsx`.
 */

import type { ReactNode } from "react";
import { AlertCircle, ArrowLeft, Clock, Layers, MessageSquare } from "lucide-react";
import { Alert } from "./ui/alert";
import { EmptyState } from "./ui/empty-state";
import { Spinner } from "./ui/spinner";
import { NEW_ITEM_ENTER_CLASS } from "../domain/new-item-tracker";
import type {
  EvaluatorCandidate,
  EvaluatorInterviewDetail,
  EvaluatorQueueItem,
} from "../services/evaluator-interviews-service";

export type EvaluatorQueueState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: EvaluatorQueueItem[] };

export type EvaluatorDetailState =
  | { status: "loading" }
  | { status: "not_found"; message: string }
  | { status: "error"; message: string }
  | { status: "ready"; interview: EvaluatorInterviewDetail };

const WORK_MODE_LABEL: Record<string, string> = {
  REMOTE: "Remoto",
  HYBRID: "Híbrido",
  ONSITE: "Presencial",
};

const QUESTION_TYPE_LABEL: Record<string, string> = {
  TECHNICAL: "Técnica",
  BEHAVIORAL: "Comportamental",
  CAREER: "Carreira",
};

export function formatWorkMode(value: string | null): string | null {
  return value ? (WORK_MODE_LABEL[value] ?? null) : null;
}

export function formatQuestionType(value: string): string {
  return QUESTION_TYPE_LABEL[value] ?? "Pergunta";
}

export function formatDateTimePtBr(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.toLocaleDateString("pt-BR")} às ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

function candidatePlace(candidate: EvaluatorCandidate): string | null {
  const place = [candidate.city, candidate.state].filter(Boolean).join("/");
  return place || null;
}

function joinParts(parts: Array<string | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part)).join(" · ");
}

export const CARD_CLASS =
  "rounded-2xl border border-border bg-card text-card-foreground shadow-[0_1px_2px_rgba(15,27,45,0.06)]";
export const BUTTON_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted";

export function LoadingBlock({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`${CARD_CLASS} flex items-center justify-center gap-3 p-12 text-sm text-muted-foreground`}
    >
      <Spinner size="md" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Alert variant="error" role="alert" className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>{message}</p>
      </div>
      {onRetry && (
        <div>
          <button type="button" className={BUTTON_CLASS} onClick={onRetry}>
            Tentar novamente
          </button>
        </div>
      )}
    </Alert>
  );
}

export function EvaluatorQueueContent({
  state,
  onEvaluate,
  onRetry,
  newIds,
}: {
  state: EvaluatorQueueState;
  // Única ação da fila: abre a tela de avaliação com o UUID real.
  onEvaluate: (interviewId: string) => void;
  onRetry?: () => void;
  // Ids que acabaram de chegar por sincronização (microanimação de entrada).
  newIds?: ReadonlySet<string>;
}) {
  if (state.status === "loading") {
    return <LoadingBlock label="Carregando entrevistas..." />;
  }
  if (state.status === "error") {
    return <ErrorBlock message={state.message} onRetry={onRetry} />;
  }
  if (state.items.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="Nenhuma entrevista atribuída no momento"
        description="Quando o administrador atribuir uma entrevista a você, ela aparecerá aqui."
        className="p-12"
      />
    );
  }

  return (
    <ul className="space-y-3" aria-label="Entrevistas atribuídas">
      {state.items.map((item) => (
        <li
          key={item.id}
          className={`${CARD_CLASS} p-4 sm:p-5${newIds?.has(item.id) ? ` ${NEW_ITEM_ENTER_CLASS}` : ""}`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="min-w-0 flex-1">
              <p className="font-bold text-foreground">{item.candidate.name}</p>
              {item.candidate.professionalTitle && (
                <p className="text-sm text-muted-foreground">{item.candidate.professionalTitle}</p>
              )}
              <p className="mt-1 text-sm text-foreground">
                {joinParts([item.jobTitle, item.company])}
              </p>
              {joinParts([item.location, formatWorkMode(item.workMode)]) && (
                <p className="text-xs text-muted-foreground">
                  {joinParts([item.location, formatWorkMode(item.workMode)])}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:items-end">
              <span className="inline-flex items-center gap-1.5">
                <MessageSquare className="size-3.5" aria-hidden="true" />
                {item.questionCount} {item.questionCount === 1 ? "pergunta" : "perguntas"}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs">
                <Clock className="size-3.5" aria-hidden="true" />
                Atribuída em {formatDateTimePtBr(item.assignedAt)}
              </span>
              <span className="text-xs">Enviada em {formatDateTimePtBr(item.submittedAt)}</span>
            </div>
            <div className="shrink-0">
              <button type="button" className={BUTTON_CLASS} onClick={() => onEvaluate(item.id)}>
                Avaliar
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={`${CARD_CLASS} p-5 sm:p-6`}>
      <h3 className="mb-3 font-bold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
      {items.map((item, index) => (
        <li key={`${index}-${item}`}>{item}</li>
      ))}
    </ul>
  );
}

// Contexto da entrevista (candidato, vaga, perguntas e respostas), somente
// leitura. Compartilhado entre o detalhe e a tela de avaliação.
export function InterviewSections({ interview }: { interview: EvaluatorInterviewDetail }) {
  const { candidate, context } = interview;
  const facts = [
    { label: "Empresa", value: context.company },
    { label: "Local", value: context.location },
    { label: "Modalidade", value: formatWorkMode(context.workMode) },
    { label: "Contrato", value: context.contractType },
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact.value));

  return (
    <>
      <Section title="Candidato">
        <p className="font-bold text-foreground">{candidate.name}</p>
        {candidate.professionalTitle && (
          <p className="text-sm text-muted-foreground">{candidate.professionalTitle}</p>
        )}
        {candidatePlace(candidate) && (
          <p className="text-sm text-muted-foreground">{candidatePlace(candidate)}</p>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Atribuída em {formatDateTimePtBr(interview.assignedAt)} · Enviada em{" "}
          {formatDateTimePtBr(interview.submittedAt)}
        </p>
      </Section>

      <Section title="Vaga">
        <p className="font-semibold text-foreground">{context.title}</p>
        {facts.length > 0 && (
          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="text-xs font-semibold text-muted-foreground">{fact.label}</dt>
                <dd className="text-foreground">{fact.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {context.summary && (
          <p className="mt-4 whitespace-pre-wrap break-words text-sm text-foreground">
            {context.summary}
          </p>
        )}
        {context.requirements.length > 0 && (
          <div className="mt-4">
            <p className="mb-1 text-xs font-semibold text-muted-foreground">Requisitos</p>
            <BulletList items={context.requirements} />
          </div>
        )}
        {context.activities.length > 0 && (
          <div className="mt-4">
            <p className="mb-1 text-xs font-semibold text-muted-foreground">Atividades</p>
            <BulletList items={context.activities} />
          </div>
        )}
      </Section>

      <Section title={`Perguntas e respostas (${interview.questions.length})`}>
        {interview.questions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma pergunta registrada.</p>
        ) : (
          <ol className="space-y-5">
            {interview.questions.map((question) => (
              <li key={question.id} className="rounded-xl bg-muted/40 p-4">
                <p className="mb-1 text-xs font-semibold text-muted-foreground">
                  Pergunta {question.position} · {formatQuestionType(question.type)}
                </p>
                <p className="mb-3 font-semibold text-foreground">{question.text}</p>
                {question.answer && question.answer.trim() !== "" ? (
                  <p className="whitespace-pre-wrap break-words text-sm text-foreground">
                    {question.answer}
                  </p>
                ) : (
                  <p className="text-sm italic text-muted-foreground">Sem resposta registrada.</p>
                )}
                {question.answeredAt && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Respondida em {formatDateTimePtBr(question.answeredAt)}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </Section>
    </>
  );
}

export function EvaluatorDetailContent({
  state,
  onBack,
  onRetry,
  onEvaluate,
}: {
  state: EvaluatorDetailState;
  onBack: () => void;
  onRetry?: () => void;
  // Abre a tela real de avaliação com o UUID real da entrevista.
  onEvaluate?: (interviewId: string) => void;
}) {
  const backButton = (
    <button type="button" className={BUTTON_CLASS} onClick={onBack}>
      <ArrowLeft className="size-4" aria-hidden="true" />
      Voltar para a fila
    </button>
  );

  if (state.status === "loading") {
    return <LoadingBlock label="Carregando entrevista..." />;
  }
  if (state.status === "not_found") {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Entrevista não encontrada ou indisponível"
        description={state.message}
        className="p-12"
        action={backButton}
      />
    );
  }
  if (state.status === "error") {
    return (
      <div className="space-y-4">
        <ErrorBlock message={state.message} onRetry={onRetry} />
        <div>{backButton}</div>
      </div>
    );
  }

  const { interview } = state;

  return (
    <div className="w-full space-y-5">
      <div>{backButton}</div>

      <InterviewSections interview={interview} />

      <Section title="Avaliação">
        <p className="mb-3 text-sm text-muted-foreground">
          Registre as notas dos 7 critérios e o comentário geral. O rascunho fica salvo no servidor.
        </p>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          onClick={() => onEvaluate?.(interview.id)}
        >
          Avaliar
        </button>
      </Section>
    </div>
  );
}
