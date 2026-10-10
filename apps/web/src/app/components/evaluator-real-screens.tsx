/** RH Connect — Telas REAIS do Avaliador: Dashboard, Fila e Detalhe (Fase 5C.1)
 *
 * Fonte única: a API (`evaluator-interviews-service.ts`). A identidade exibida
 * vem SOMENTE da sessão real (`SessionContext`); o avaliador da fila e do
 * detalhe é decidido pelo Back a partir do JWT. Nenhum mock, id fictício,
 * localStorage ou fallback para outro avaliador é usado aqui.
 */

import { useCallback, useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Layers } from "lucide-react";
import { SessionContext } from "../session-context";
import {
  getAssignedInterview,
  listAssignedInterviews,
} from "../services/evaluator-interviews-service";
import {
  EvaluatorDetailContent,
  EvaluatorQueueContent,
  formatDateTimePtBr,
  type EvaluatorDetailState,
  type EvaluatorQueueState,
} from "./evaluator-real-content";
import { EvalLayout } from "./eval-screens";

type NavFn = (s: string) => void;

const EVAL_ROUTE = "/evaluator/evaluations";

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
            onOpen={(id) => routerNavigate(`${EVAL_ROUTE}/${id}`)}
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
          onOpen={(id) => routerNavigate(`${EVAL_ROUTE}/${id}`)}
          onRetry={reload}
        />
      </div>
    </EvalLayout>
  );
}

export function EvalInterviewDetailScreen({ onNavigate }: { onNavigate: NavFn }) {
  const { id } = useParams();
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
      />
    </EvalLayout>
  );
}
