/** RH Connect — Histórico REAL de avaliações concluídas do Avaliador (Fase 6A.1)
 *
 * Apresentação pura e SOMENTE LEITURA. Recebe o estado já carregado de
 * `evaluator-interviews-service.ts` (`GET /evaluator/history` e
 * `GET /evaluator/history/:id`). Não conhece autosave, fluxo de conclusão nem
 * diálogo de confirmação: não há nenhum controle que edite ou conclua uma
 * avaliação aqui. Nenhum mock, localStorage ou `location.state`.
 */

import { AlertCircle, ArrowLeft, Eye, History } from "lucide-react";
import { Badge } from "./ui/badge";
import { EmptyState } from "./ui/empty-state";
import { SearchInput } from "./ui/search-input";
import {
  BUTTON_CLASS,
  CARD_CLASS,
  ErrorBlock,
  LoadingBlock,
  Section,
  formatDateTimePtBr,
  formatWorkMode,
} from "./evaluator-real-content";
import { CompactQuestions, ReviewSummarySections } from "./evaluator-review-content";
import { formatScore } from "../domain/evaluator-evaluation-view";
import { reviewAverage, reviewRows } from "../domain/evaluator-review";
import type {
  CompletedEvaluationDetail,
  CompletedEvaluationItem,
} from "../services/evaluator-interviews-service";

export type EvaluatorHistoryState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: CompletedEvaluationItem[] };

export type EvaluatorHistoryDetailState =
  | { status: "loading" }
  | { status: "not_found"; message: string }
  | { status: "error"; message: string }
  | { status: "ready"; detail: CompletedEvaluationDetail };

export const BACK_TO_HISTORY_LABEL = "Voltar ao histórico";
export const FINAL_AVERAGE_LABEL = "Média final";

// Busca no cliente (sem filtros avançados): candidato, vaga ou empresa.
export function filterHistoryItems(
  items: CompletedEvaluationItem[],
  search: string,
): CompletedEvaluationItem[] {
  const term = search.trim().toLowerCase();
  if (!term) return items;
  return items.filter((item) =>
    [item.candidate.name, item.jobTitle, item.company ?? ""].some((text) =>
      text.toLowerCase().includes(term),
    ),
  );
}

export function historySubtitle(state: EvaluatorHistoryState): string {
  if (state.status !== "ready") return "Avaliações que você já concluiu";
  const total = state.items.length;
  return `${total} ${total === 1 ? "avaliação concluída" : "avaliações concluídas"}`;
}

function scoreBadgeVariant(score: number | null) {
  if (score === null) return "info" as const;
  if (score >= 8) return "success" as const;
  if (score >= 7) return "info" as const;
  return "warning" as const;
}

export function EvaluatorHistoryContent({
  state,
  search,
  onSearchChange,
  onView,
  onRetry,
}: {
  state: EvaluatorHistoryState;
  search: string;
  onSearchChange: (value: string) => void;
  // Abre o detalhe somente leitura com o UUID real da entrevista.
  onView: (interviewId: string) => void;
  onRetry?: () => void;
}) {
  if (state.status === "loading") {
    return <LoadingBlock label="Carregando histórico..." />;
  }
  if (state.status === "error") {
    return <ErrorBlock message={state.message} onRetry={onRetry} />;
  }
  if (state.items.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Nenhuma avaliação concluída"
        description="As avaliações que você concluir aparecerão aqui."
        className="p-12"
      />
    );
  }

  const filtered = filterHistoryItems(state.items, search);

  return (
    <div className="w-full space-y-4">
      <SearchInput
        containerClassName="max-w-sm"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        onClear={() => onSearchChange("")}
        placeholder="Buscar por candidato ou vaga..."
        aria-label="Buscar no histórico"
        className="bg-white"
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={History}
          title="Nenhuma avaliação encontrada"
          description="Ajuste a busca para ver outras avaliações."
          className="p-12"
        />
      ) : (
        <div className={`${CARD_CLASS} overflow-x-auto`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">
                  Candidato
                </th>
                <th scope="col" className="hidden px-4 py-3 text-left text-xs font-semibold text-muted-foreground md:table-cell">
                  Vaga
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                  Concluída em
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                  Média final
                </th>
                <th scope="col" className="px-5 py-3">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-muted/30" data-history-row={item.id}>
                  <td className="px-5 py-3.5 font-semibold text-foreground">{item.candidate.name}</td>
                  <td className="hidden px-4 py-3.5 text-muted-foreground md:table-cell">
                    {item.jobTitle}
                    {item.company ? ` · ${item.company}` : ""}
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">{formatDateTimePtBr(item.completedAt)}</td>
                  <td className="px-4 py-3.5">
                    <Badge variant={scoreBadgeVariant(item.overallScore)}>{formatScore(item.overallScore)}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      onClick={() => onView(item.id)}
                      aria-label={`Ver avaliação de ${item.candidate.name}`}
                    >
                      <Eye className="size-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function EvaluatorHistoryDetailContent({
  state,
  ui,
}: {
  state: EvaluatorHistoryDetailState;
  ui: { onBack: () => void; onRetry?: () => void };
}) {
  const backButton = (
    <button type="button" data-action="back-to-history" className={BUTTON_CLASS} onClick={ui.onBack}>
      <ArrowLeft className="size-4" aria-hidden="true" />
      {BACK_TO_HISTORY_LABEL}
    </button>
  );

  if (state.status === "loading") {
    return <LoadingBlock label="Carregando avaliação..." />;
  }
  if (state.status === "not_found") {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Avaliação não encontrada ou indisponível"
        description={state.message}
        className="p-12"
        action={
          <button type="button" data-action="back-to-history" className={BUTTON_CLASS} onClick={ui.onBack}>
            {BACK_TO_HISTORY_LABEL}
          </button>
        }
      />
    );
  }
  if (state.status === "error") {
    return (
      <div className="space-y-4">
        <ErrorBlock message={state.message} onRetry={ui.onRetry} />
        <div>{backButton}</div>
      </div>
    );
  }

  const { detail } = state;
  const { evaluation, context, candidate } = detail;
  const rows = reviewRows(evaluation.criteriaScores);
  // A nota final é a persistida pelo servidor; só na falta dela usa a conferência.
  const average = evaluation.overallScore ?? reviewAverage(evaluation.criteriaScores);
  const facts = [
    { label: "Empresa", value: context.company },
    { label: "Local", value: context.location },
    { label: "Modalidade", value: formatWorkMode(context.workMode) },
    { label: "Contrato", value: context.contractType },
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact.value));
  const place = [candidate.city, candidate.state].filter(Boolean).join("/");

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5" data-readonly="true">
      <header className="space-y-1">
        <h2 className="text-2xl font-bold text-foreground">Avaliação concluída</h2>
        <p className="text-sm font-medium text-foreground" data-testid="history-subtitle">
          {candidate.name} · {context.title}
        </p>
        {context.company && <p className="text-xs text-muted-foreground">{context.company}</p>}
        <p className="text-xs text-muted-foreground" data-testid="history-completed-at">
          Concluída em {formatDateTimePtBr(evaluation.completedAt)}
        </p>
      </header>

      <Section title="Candidato e vaga">
        <p className="font-bold text-foreground">{candidate.name}</p>
        {candidate.professionalTitle && (
          <p className="text-sm text-muted-foreground">{candidate.professionalTitle}</p>
        )}
        {place && <p className="text-sm text-muted-foreground">{place}</p>}
        <p className="mt-3 font-semibold text-foreground">{context.title}</p>
        {facts.length > 0 && (
          <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="text-xs font-semibold text-muted-foreground">{fact.label}</dt>
                <dd className="text-foreground">{fact.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </Section>

      <ReviewSummarySections
        rows={rows}
        average={average}
        summary={evaluation.summary}
        averageLabel={FINAL_AVERAGE_LABEL}
        note={null}
      />

      <CompactQuestions interview={detail} />

      <div>{backButton}</div>
    </div>
  );
}
