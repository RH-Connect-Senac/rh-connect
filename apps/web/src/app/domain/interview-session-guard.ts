/**
 * Sessão do wizard do candidato em MAIS DE UM dispositivo — parte pura (sem React).
 *
 * - `isInterviewEditable`: só IN_PROGRESS aceita edição (um status desconhecido
 *   — Back que não informa — não bloqueia: a escrita no Back é a barreira real).
 * - `attachRevalidation`: revalida ao voltar o foco para a janela e quando a aba
 *   volta de hidden para visible (o InterviewScreen usa o polling leve de `interview-sync-poller.ts`; as demais telas só este gatilho + polling de status). Um throttle simples
 *   e a trava de "uma revalidação por vez" evitam requests duplicadas (focus e
 *   visibilitychange costumam disparar juntos).
 * - `flushBeforeLeaving`: "Sair e continuar depois" tenta enviar o rascunho
 *   pendente ao Back, esperando um tempo razoável. Nunca rejeita e nunca prende a
 *   saída: offline/erro/timeout seguem em frente (o texto já está protegido no
 *   localStorage). Sem sendBeacon nem request síncrona.
 */

export const INTERVIEW_SENT_ELSEWHERE_MESSAGE =
  "Esta entrevista foi enviada em outro dispositivo e não pode mais ser editada.";

export const INTERVIEW_CANCELLED_ELSEWHERE_MESSAGE =
  "Esta entrevista foi cancelada em outro dispositivo e não pode mais ser editada.";

/** Mensagem do bloqueio conforme o status vigente (cancelada ≠ enviada). */
export function describeStaleInterview(status: string | null | undefined): string {
  return status === "CANCELLED"
    ? INTERVIEW_CANCELLED_ELSEWHERE_MESSAGE
    : INTERVIEW_SENT_ELSEWHERE_MESSAGE;
}

export const REVALIDATE_THROTTLE_MS = 5000;
export const LEAVE_FLUSH_TIMEOUT_MS = 4000;

export function isInterviewEditable(status: string | null | undefined): boolean {
  return status === null || status === undefined || status === "IN_PROGRESS";
}

type ListenerTarget = {
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
};

export type RevalidationWindow = ListenerTarget;
export type RevalidationDocument = ListenerTarget & { visibilityState?: string };

export function attachRevalidation(input: {
  win: RevalidationWindow;
  doc: RevalidationDocument;
  revalidate: () => Promise<void> | void;
  throttleMs?: number;
  now?: () => number;
}): () => void {
  const throttleMs = input.throttleMs ?? REVALIDATE_THROTTLE_MS;
  const now = input.now ?? Date.now;
  let lastStart = Number.NEGATIVE_INFINITY;
  let running = false;

  const trigger = () => {
    if (running) return;
    const current = now();
    if (current - lastStart < throttleMs) return;
    lastStart = current;
    running = true;
    void (async () => {
      try {
        await input.revalidate();
      } catch {
        // Falha de rede: sem efeito; a próxima volta de foco tenta de novo.
      } finally {
        running = false;
      }
    })();
  };

  const onFocus = () => trigger();
  const onVisibility = () => {
    if (input.doc.visibilityState === "visible") trigger();
  };

  input.win.addEventListener("focus", onFocus);
  input.doc.addEventListener("visibilitychange", onVisibility);
  return () => {
    input.win.removeEventListener("focus", onFocus);
    input.doc.removeEventListener("visibilitychange", onVisibility);
  };
}

export type LeaveFlushOutcome = "none" | "done" | "timeout" | "error";

export async function flushBeforeLeaving(
  flush: (() => Promise<void>) | null | undefined,
  timeoutMs: number = LEAVE_FLUSH_TIMEOUT_MS,
): Promise<LeaveFlushOutcome> {
  if (!flush) return "none";
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), timeoutMs);
  });
  try {
    const result = await Promise.race([flush().then(() => "done" as const), timeout]);
    return result;
  } catch {
    return "error";
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/**
 * Proteção de saída (beforeunload / "Deseja sair da entrevista?"): só existe
 * enquanto a entrevista está editável e há progresso a proteger. Uma sessão já
 * terminal (CANCELLED ou enviada/encerrada, descoberta pelo wizard) não tem o que
 * proteger: nunca bloqueia fechar a aba, recarregar, usar o menu ou "Voltar ao
 * Dashboard".
 */
export function isExitProtectionActive(input: {
  /** Há rascunho de entrevista em andamento numa etapa do wizard. */
  draftProtected: boolean;
  /** Status não editável descoberto (null/undefined = sessão editável). */
  terminalStatus: string | null | undefined;
}): boolean {
  if (!input.draftProtected) return false;
  return isInterviewEditable(input.terminalStatus);
}

type BeforeUnloadTarget = {
  addEventListener: (type: "beforeunload", listener: (event: BeforeUnloadEvent) => void) => void;
  removeEventListener: (type: "beforeunload", listener: (event: BeforeUnloadEvent) => void) => void;
};

/** Registra o beforeunload; o retorno remove EXATAMENTE o que foi registrado. */
export function attachExitProtection(
  win: BeforeUnloadTarget,
  beforeSave: () => void,
): () => void {
  const handler = (event: BeforeUnloadEvent) => {
    beforeSave();
    event.preventDefault();
    event.returnValue = "";
  };
  win.addEventListener("beforeunload", handler);
  return () => win.removeEventListener("beforeunload", handler);
}

/** Visual do aviso de sessão bloqueada: cancelada é terminal/destrutiva (vermelho). */
export function staleNoticeTone(status: string | null | undefined): "error" | "warning" {
  return status === "CANCELLED" ? "error" : "warning";
}

// Telas do wizard que revalidam a sessão e mostram o aviso terminal (CANCELLED/enviada).
const STALE_AWARE_SCREENS = ["interview", "review", "interview-confirm"];

/**
 * Sessão terminal (ex.: CANCELLED) cujo estado local NÃO pode sobreviver ao usuário sair dela.
 * Enquanto ele ainda está numa tela que mostra o aviso, nada é limpo; ao sair (Praticar,
 * menu, voltar do navegador...), o rascunho/interviewId da entrevista antiga deve ser descartado,
 * senão a mesma vaga reaproveitaria o id cancelado numa nova prática.
 */
export function shouldDiscardTerminalDraft(input: {
  terminalStatus: string | null | undefined;
  screen: string | null | undefined;
}): boolean {
  if (!input.terminalStatus) return false;
  if (isInterviewEditable(input.terminalStatus)) return false;
  return !(input.screen && STALE_AWARE_SCREENS.includes(input.screen));
}
