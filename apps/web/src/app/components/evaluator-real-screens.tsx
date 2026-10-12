/** RH Connect — Telas REAIS do Avaliador: Dashboard, Fila e Detalhe (Fase 5C.1)
 *
 * Fonte única: a API (`evaluator-interviews-service.ts`). A identidade exibida
 * vem SOMENTE da sessão real (`SessionContext`); o avaliador da fila e do
 * detalhe é decidido pelo Back a partir do JWT. Nenhum mock, id fictício,
 * localStorage ou fallback para outro avaliador é usado aqui.
 */

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { Layers } from "lucide-react";
import { SessionContext } from "../session-context";
import {
  completeEvaluation,
  getAssignedInterview,
  getCompletedEvaluation,
  getEvaluationDraft,
  listAssignedInterviews,
  listCompletedEvaluations,
  saveEvaluationDraft,
} from "../services/evaluator-interviews-service";
import {
  emptyForm,
  formFromDraft,
  isDirty,
  validateForm,
  type CriterionKey,
} from "../domain/evaluator-evaluation-form";
import { EvaluationAutosave, type AutosaveSnapshot } from "../domain/evaluator-autosave";
import { EvaluationCompletionFlow, type CompletionSnapshot } from "../domain/evaluator-completion-flow";
import {
  draftReadiness,
  parseCompletionNavState,
  reviewReadiness,
} from "../domain/evaluator-review";
import { SavedNotice, visibleSyncStatus } from "../domain/evaluator-save-notice";
import {
  EvaluatorDetailContent,
  EvaluatorQueueContent,
  formatDateTimePtBr,
  type EvaluatorDetailState,
  type EvaluatorQueueState,
} from "./evaluator-real-content";
import {
  EvaluatorHistoryContent,
  EvaluatorHistoryDetailContent,
  historySubtitle,
  type EvaluatorHistoryDetailState,
  type EvaluatorHistoryState,
} from "./evaluator-history-content";
import {
  EvaluatorEvaluationContent,
  type EvaluationScreenState,
  type SaveFeedback,
} from "./evaluator-evaluation-content";
import {
  EvaluatorReviewContent,
  EvaluatorSuccessContent,
  type ReviewScreenState,
} from "./evaluator-review-content";
import {
  clearLocalDraft,
  getBrowserStorage,
  restoreForm,
} from "../domain/evaluator-local-draft";
import {
  clampQuestionIndex,
  evaluationHeader,
  questionProgressLabel,
} from "../domain/evaluator-evaluation-view";
import { Badge } from "./ui/badge";
import { useIsMobile } from "./ui/use-mobile";
import { EvalLayout } from "./eval-screens";

type NavFn = (s: string) => void;

// Fila e dashboard levam direto à avaliação (EVALUATION_ROUTE) com o
// interviewId (UUID) real. O detalhe somente leitura (`EvalInterviewDetailScreen`,
// rota /evaluator/interviews/:id em App.tsx) segue existindo para consulta
// futura, mas não faz parte do fluxo principal da fila.
const EVALUATION_ROUTE = "/evaluator/evaluations";

// Carrega a fila real. `reload` refaz a consulta (tentar novamente).
function useAssignedQueue(): [EvaluatorQueueState, () => void] {
  const [state, setState] = useState<EvaluatorQueueState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    listAssignedInterviews().then((result) => {
      if (cancelled) return;
      setState(
        result.ok
          ? { status: "ready", items: result.data }
          : { status: "error", message: result.message },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((current) => current + 1), []);
  return [state, reload];
}

function firstName(name: string | undefined) {
  return name?.trim().split(/\s+/)[0] ?? "";
}

export function EvalDashboardScreen({ onNavigate }: { onNavigate: NavFn }) {
  const routerNavigate = useNavigate();
  const session = useContext(SessionContext);
  const [queue, reload] = useAssignedQueue();
  const name = firstName(session.user?.name);
  const pending = queue.status === "ready" ? queue.items.length : null;

  const greeting = name ? `Bem-vindo de volta, ${name}.` : "Bem-vindo de volta.";
  const subtitle =
    pending === null
      ? greeting
      : `${greeting} Você tem ${pending} ${pending === 1 ? "avaliação pendente" : "avaliações pendentes"}.`;

  return (
    <EvalLayout current="eval-dashboard" onNavigate={onNavigate} title="Dashboard" subtitle={subtitle}>
      <div className="w-full space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-2xl font-bold text-foreground">{pending ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Avaliações pendentes</p>
          </div>
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold text-foreground">
              <Layers className="size-4 text-amber-500" aria-hidden="true" /> Próximas na fila
            </h3>
            <button
              type="button"
              className="text-sm font-semibold text-primary hover:underline"
              onClick={() => onNavigate("eval-queue")}
            >
              Ver todas
            </button>
          </div>
          <EvaluatorQueueContent
            state={queue.status === "ready" ? { status: "ready", items: queue.items.slice(0, 3) } : queue}
            onEvaluate={(id) => routerNavigate(`${EVALUATION_ROUTE}/${id}`)}
            onRetry={reload}
          />
        </section>

        <p className="text-xs text-muted-foreground">
          Estatísticas e histórico de avaliações concluídas serão exibidos em uma próxima etapa.
        </p>
      </div>
    </EvalLayout>
  );
}

export function EvalQueueScreen({ onNavigate }: { onNavigate: NavFn }) {
  const routerNavigate = useNavigate();
  const [queue, reload] = useAssignedQueue();
  const subtitle =
    queue.status === "ready"
      ? `${queue.items.length} ${queue.items.length === 1 ? "entrevista aguardando avaliação" : "entrevistas aguardando avaliação"}`
      : "Entrevistas atribuídas a você";

  return (
    <EvalLayout current="eval-queue" onNavigate={onNavigate} title="Fila de Avaliações" subtitle={subtitle}>
      <div className="w-full">
        <EvaluatorQueueContent
          state={queue}
          onEvaluate={(id) => routerNavigate(`${EVALUATION_ROUTE}/${id}`)}
          onRetry={reload}
        />
      </div>
    </EvalLayout>
  );
}

export function EvalInterviewDetailScreen({ onNavigate }: { onNavigate: NavFn }) {
  const { id } = useParams();
  const routerNavigate = useNavigate();
  const [state, setState] = useState<EvaluatorDetailState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!id) {
      setState({ status: "not_found", message: "Entrevista não encontrada ou indisponível." });
      return;
    }
    setState({ status: "loading" });
    getAssignedInterview(id).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setState({ status: "ready", interview: result.data });
      } else if (result.reason === "not_found") {
        setState({ status: "not_found", message: result.message });
      } else {
        setState({ status: "error", message: result.message });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  const subtitle =
    state.status === "ready"
      ? `${state.interview.candidate.name} · ${formatDateTimePtBr(state.interview.submittedAt)}`
      : "Detalhe da entrevista";

  return (
    <EvalLayout current="eval-screen" onNavigate={onNavigate} title="Entrevista" subtitle={subtitle}>
      <EvaluatorDetailContent
        state={state}
        onBack={() => onNavigate("eval-queue")}
        onRetry={() => setAttempt((current) => current + 1)}
        onEvaluate={(interviewId) => routerNavigate(`${EVALUATION_ROUTE}/${interviewId}`)}
      />
    </EvalLayout>
  );
}

export function EvalDraftEvaluationScreen({ onNavigate }: { onNavigate: NavFn }) {
  const { id } = useParams();
  const [state, setState] = useState<EvaluationScreenState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  // Estado do formulário/sincronização vem do controlador de autosave.
  const [view, setView] = useState<AutosaveSnapshot | null>(null);
  const autosaveRef = useRef<EvaluationAutosave | null>(null);
  // "Rascunho salvo" some sozinho (~2,5s); pendências/falhas não.
  const [savedVisible, setSavedVisible] = useState(false);
  const noticeRef = useRef<SavedNotice | null>(null);
  // Proteção local (NÃO é o rascunho oficial): isolada por usuário + entrevista.
  const session = useContext(SessionContext);
  const userId = session.user?.id ?? "";
  const [restoredFromLocal, setRestoredFromLocal] = useState(false);
  // Pergunta exibida (só navegação de leitura; não salva nem altera notas).
  const [questionIndex, setQuestionIndex] = useState(0);
  const routerNavigate = useNavigate();
  // "Revisar avaliação": salva a versão atual (se houver pendência) e navega.
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const reviewingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    if (!id) {
      setState({ status: "not_found", message: "Entrevista não encontrada ou indisponível." });
      return;
    }
    setState({ status: "loading" });
    reviewingRef.current = false;
    setReviewing(false);
    setReviewError(null);
    setView(null);
    setSavedVisible(false);
    setQuestionIndex(0);
    setRestoredFromLocal(false);
    Promise.all([getAssignedInterview(id), getEvaluationDraft(id)]).then(([interview, draft]) => {
      if (cancelled) return;
      if (interview.ok && draft.ok && draft.data.status === "DRAFT") {
        // Servidor primeiro; depois, por cima, só notas/comentário ainda não
        // confirmados que estavam guardados localmente (se houver).
        const serverForm = formFromDraft(draft.data);
        const storage = getBrowserStorage();
        const restored = restoreForm(storage, userId, id, serverForm);

        autosaveRef.current?.destroy();
        noticeRef.current?.destroy();
        noticeRef.current = new SavedNotice(setSavedVisible);
        const controller: EvaluationAutosave = new EvaluationAutosave({
          userId,
          interviewId: id,
          storage,
          save: saveEvaluationDraft,
          onChange: (snapshot) => {
            if (autosaveRef.current !== controller) return;
            setView(snapshot);
            noticeRef.current?.update(snapshot.status);
            // nota geral indicativa devolvida pelo servidor
            setState((current) =>
              current.status === "ready" && current.draft !== snapshot.draft
                ? { ...current, draft: snapshot.draft }
                : current,
            );
          },
        });
        autosaveRef.current = controller;
        setRestoredFromLocal(restored.restored);
        setState({ status: "ready", interview: interview.data, draft: draft.data });
        // Se a cópia recuperada difere do servidor e é válida, o autosave a envia.
        controller.load(draft.data, restored.form, serverForm);
        return;
      }
      // Avaliação já concluída não é editável: tratada como indisponível e a
      // cópia local (se houver) deixa de ter sentido.
      if (interview.ok && draft.ok && draft.data.status !== "DRAFT") {
        clearLocalDraft(getBrowserStorage(), userId, id);
      }
      const notFound = [interview, draft].find((r) => !r.ok && r.reason === "not_found");
      if (notFound && !notFound.ok) {
        setState({ status: "not_found", message: notFound.message });
        return;
      }
      if (interview.ok && draft.ok) {
        setState({ status: "not_found", message: "Esta avaliação não está disponível para edição." });
        return;
      }
      const failed = [interview, draft].find((r) => !r.ok);
      setState({
        status: "error",
        message: failed && !failed.ok ? failed.message : "Não foi possível carregar a avaliação. Tente novamente.",
      });
    });
    return () => {
      cancelled = true;
      // Sair da tela: cancela o debounce e silencia callbacks (sem setState depois).
      autosaveRef.current?.destroy();
      autosaveRef.current = null;
      noticeRef.current?.destroy();
      noticeRef.current = null;
    };
  }, [id, attempt, userId]);

  const form = view?.form ?? emptyForm();
  const validation = useMemo(
    () => validateForm(form, view?.persisted ?? {}),
    [form, view?.persisted],
  );
  const dirty = view ? isDirty(view.form, view.serverForm) : false;

  // Cada alteração grava a cópia local na hora e reinicia o debounce; o PUT
  // acontece depois de ~2s sem edição (ou em "Salvar rascunho").
  const onScoreChange = (key: CriterionKey, value: string) => {
    const controller = autosaveRef.current;
    if (!controller) return;
    const current = controller.getSnapshot().form;
    controller.edit({ ...current, scores: { ...current.scores, [key]: value } });
  };
  const onSummaryChange = (value: string) => {
    const controller = autosaveRef.current;
    if (!controller) return;
    controller.edit({ ...controller.getSnapshot().form, summary: value });
  };
  const onSave = () => {
    void autosaveRef.current?.flush();
  };
  const canReview = view ? reviewReadiness(form, view.persisted).ready : false;
  const onReview = async () => {
    const controller = autosaveRef.current;
    if (!controller || !id || reviewingRef.current) return;
    if (!reviewReadiness(controller.getSnapshot().form, controller.getSnapshot().persisted).ready) return;
    reviewingRef.current = true;
    setReviewing(true);
    setReviewError(null);
    // Reaproveita o fluxo de autosave: sem PUT paralelo e sem PUT se já sincronizado.
    const result = await controller.syncNow();
    if (autosaveRef.current !== controller) return; // saiu da tela
    reviewingRef.current = false;
    setReviewing(false);
    if (!result.ok) {
      setReviewError(
        result.message ?? "Não foi possível salvar o rascunho antes da revisão. Tente novamente.",
      );
      return;
    }
    routerNavigate(`${EVALUATION_ROUTE}/${id}/review`);
  };

  // Erro do save MANUAL (destaque). O sucesso (manual ou automático) usa só o
  // texto discreto de status: "Rascunho salvo".
  const feedback: SaveFeedback =
    view?.lastSave === "manual" && (view.status === "failed" || view.status === "invalid") && view.message
      ? { kind: "error", message: view.message }
      : null;

  const ready = state.status === "ready" ? state : null;
  const totalQuestions = ready ? ready.interview.questions.length : 0;
  const isMobile = useIsMobile();
  const header = evaluationHeader({
    isMobile,
    candidateName: ready ? ready.interview.candidate.name : null,
    jobTitle: ready ? ready.interview.context.title : null,
    questionIndex,
    totalQuestions,
  });
  const { title, subtitle } = header;

  return (
    <EvalLayout
      current="eval-screen"
      onNavigate={onNavigate}
      title={title}
      subtitle={subtitle}
      actions={
        ready && header.showProgressBadge ? (
          <Badge variant="warning">{questionProgressLabel(questionIndex, totalQuestions)}</Badge>
        ) : undefined
      }
    >
      <EvaluatorEvaluationContent
        state={state}
        ui={{
          form,
          validation,
          dirty,
          saving: view?.saving ?? false,
          feedback,
          syncStatus: visibleSyncStatus(view?.status, savedVisible),
          lastSave: view?.lastSave ?? null,
          restoredFromLocal,
          canReview,
          reviewing,
          reviewError,
          onReview: () => void onReview(),
          onScoreChange,
          onSummaryChange,
          onSave,
        }}
        questionIndex={questionIndex}
        onQuestionChange={(index) => setQuestionIndex(clampQuestionIndex(index, totalQuestions))}
        onBack={() => onNavigate("eval-queue")}
        onRetry={() => setAttempt((current) => current + 1)}
      />
    </EvalLayout>
  );
}

// Revisão final: lê o detalhe e o rascunho REAIS (sem autosave, sem localStorage
// de edição, sem mocks). Concluir só acontece após a confirmação.
export function EvalRealReviewScreen({ onNavigate }: { onNavigate: NavFn }) {
  const { id } = useParams();
  const routerNavigate = useNavigate();
  const session = useContext(SessionContext);
  const userId = session.user?.id ?? "";
  const [state, setState] = useState<ReviewScreenState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [completion, setCompletion] = useState<CompletionSnapshot>({
    phase: "idle",
    result: null,
    error: null,
  });
  const flowRef = useRef<EvaluationCompletionFlow | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!id) {
      setState({ status: "not_found", message: "Entrevista não encontrada ou indisponível." });
      return;
    }
    setState({ status: "loading" });
    setCompletion({ phase: "idle", result: null, error: null });
    Promise.all([getAssignedInterview(id), getEvaluationDraft(id)]).then(([interview, draft]) => {
      if (cancelled) return;
      if (interview.ok && draft.ok && draft.data.status === "DRAFT") {
        const interviewData = interview.data;
        const flow: EvaluationCompletionFlow = new EvaluationCompletionFlow({
          userId,
          interviewId: id,
          storage: getBrowserStorage(),
          complete: completeEvaluation,
          canComplete: () => draftReadiness(draft.data).ready,
          onChange: (snapshot) => {
            if (flowRef.current !== flow) return;
            setCompletion(snapshot);
            if (snapshot.phase === "done") {
              // As leituras ativas passam a dar 404: o sucesso leva o contexto na navegação.
              routerNavigate(`${EVALUATION_ROUTE}/${id}/success`, {
                replace: true,
                state: {
                  interviewId: id,
                  candidateName: interviewData.candidate.name,
                  jobTitle: interviewData.context.title,
                  overallScore: snapshot.result?.overallScore ?? null,
                  completedAt: snapshot.result?.completedAt ?? null,
                },
              });
            }
          },
        });
        flowRef.current?.destroy();
        flowRef.current = flow;
        setState({ status: "ready", interview: interviewData, draft: draft.data });
        return;
      }
      const notFound = [interview, draft].find((r) => !r.ok && r.reason === "not_found");
      if (notFound && !notFound.ok) {
        setState({ status: "not_found", message: notFound.message });
        return;
      }
      if (interview.ok && draft.ok) {
        setState({ status: "not_found", message: "Esta avaliação não está disponível para revisão." });
        return;
      }
      const failed = [interview, draft].find((r) => !r.ok);
      setState({
        status: "error",
        message: failed && !failed.ok ? failed.message : "Não foi possível carregar a revisão. Tente novamente.",
      });
    });
    return () => {
      cancelled = true;
      flowRef.current?.destroy();
      flowRef.current = null;
    };
  }, [id, attempt, userId, routerNavigate]);

  const ready = state.status === "ready" ? state : null;
  return (
    <EvalLayout
      current="eval-screen"
      onNavigate={onNavigate}
      title="Revisar avaliação"
      subtitle={ready ? `${ready.interview.candidate.name} · ${ready.interview.context.title}` : "Revisão final"}
    >
      <EvaluatorReviewContent
        state={state}
        ui={{
          completion,
          onBackToEdit: () => id && routerNavigate(`${EVALUATION_ROUTE}/${id}`),
          onBackToQueue: () => onNavigate("eval-queue"),
          onRequestConfirm: () => flowRef.current?.requestConfirm(),
          onCancelConfirm: () => flowRef.current?.cancel(),
          onConfirm: () => void flowRef.current?.confirm(),
          onRetry: () => setAttempt((current) => current + 1),
        }}
      />
    </EvalLayout>
  );
}

// Sucesso: usa só o contexto vindo da conclusão; nenhum GET ativo é refeito.
export function EvalCompletionSuccessScreen({ onNavigate }: { onNavigate: NavFn }) {
  const { id } = useParams();
  const location = useLocation();
  const info = parseCompletionNavState(location.state, id);
  return (
    <EvalLayout current="eval-queue" onNavigate={onNavigate} title="Avaliação concluída" subtitle="Resultado da avaliação">
      <EvaluatorSuccessContent info={info} onBackToQueue={() => onNavigate("eval-queue")} />
    </EvalLayout>
  );
}

// ─── Histórico real de avaliações concluídas (Fase 6A.1) ─────────────────────
// Somente leitura: só GET. Nenhum autosave, fluxo de conclusão, localStorage ou
// `location.state`: o detalhe recarrega do Back (funciona com F5).
const HISTORY_ROUTE = "/evaluator/history";

export function EvalHistoryScreen({ onNavigate }: { onNavigate: NavFn }) {
  const routerNavigate = useNavigate();
  const [state, setState] = useState<EvaluatorHistoryState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    listCompletedEvaluations().then((result) => {
      if (cancelled) return;
      setState(
        result.ok
          ? { status: "ready", items: result.data }
          : { status: "error", message: result.message },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return (
    <EvalLayout
      current="eval-history"
      onNavigate={onNavigate}
      title="Histórico de Avaliações"
      subtitle={historySubtitle(state)}
    >
      <EvaluatorHistoryContent
        state={state}
        search={search}
        onSearchChange={setSearch}
        onView={(id) => routerNavigate(`${HISTORY_ROUTE}/${id}`)}
        onRetry={() => setAttempt((current) => current + 1)}
      />
    </EvalLayout>
  );
}

export function EvalHistoryDetailScreen({ onNavigate }: { onNavigate: NavFn }) {
  const { id } = useParams();
  const [state, setState] = useState<EvaluatorHistoryDetailState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!id) {
      setState({ status: "not_found", message: "Avaliação não encontrada ou indisponível." });
      return;
    }
    setState({ status: "loading" });
    getCompletedEvaluation(id).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setState({ status: "ready", detail: result.data });
      } else if (result.reason === "not_found") {
        setState({ status: "not_found", message: result.message });
      } else {
        setState({ status: "error", message: result.message });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  return (
    <EvalLayout
      current="eval-history"
      onNavigate={onNavigate}
      title="Avaliação concluída"
      subtitle="Consulta somente leitura"
    >
      <EvaluatorHistoryDetailContent
        state={state}
        ui={{
          onBack: () => onNavigate("eval-history"),
          onRetry: () => setAttempt((current) => current + 1),
        }}
      />
    </EvalLayout>
  );
}
