/**
 * Estado TEMPORÁRIO de UX do wizard de entrevista (apenas navegador).
 *
 * NADA aqui é fonte da verdade da entrevista: Interview, perguntas, respostas
 * confirmadas, modalidade, status e envio vivem no Back/PostgreSQL. Este módulo
 * só guarda:
 *   1. o prefill da URL da vaga ao "Copiar link" (sessionStorage);
 *   2. o texto de resposta AINDA EM EDIÇÃO (localStorage), para sobreviver a
 *      queda de internet/energia/fechamento do navegador antes de clicar em
 *      "Próxima". Nunca é enviado ao Back sozinho: só vira resposta quando o
 *      usuário usa a ação normal do fluxo;
 *   3. a regra pura de qual pergunta reabrir após recarregar a página.
 *
 * Separado de `rhconnect:interview-draft:v1` (progresso do wizard) de propósito.
 */

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function safeStorage(kind: "local" | "session"): StorageLike | null {
  try {
    if (typeof window === "undefined") return null;
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Armazenamento local seguro (null se indisponível/bloqueado). */
export function safeLocalStorage(): StorageLike | null {
  return safeStorage("local");
}

// ─── 1. Prefill da URL da vaga (sessionStorage) ──────────────────────────────

export const INTERVIEW_URL_PREFILL_KEY = "rhconnect:interview-url-prefill:v1";

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Guarda a URL conhecida no clique em "Copiar link". Não lê o clipboard nem faz requisição. */
export function storeInterviewUrlPrefill(
  url: string,
  storage: StorageLike | null = safeStorage("session"),
): void {
  const value = url.trim();
  if (!storage || !isHttpUrl(value)) return;
  try {
    storage.setItem(INTERVIEW_URL_PREFILL_KEY, value);
  } catch {
    // sem armazenamento: o prefill é só conveniência
  }
}

/** Lê sem remover (seguro com renderização dupla); a limpeza é `clearInterviewUrlPrefill`. */
export function peekInterviewUrlPrefill(
  storage: StorageLike | null = safeStorage("session"),
): string | null {
  if (!storage) return null;
  try {
    const value = storage.getItem(INTERVIEW_URL_PREFILL_KEY)?.trim() ?? "";
    return value && isHttpUrl(value) ? value : null;
  } catch {
    return null;
  }
}

export function clearInterviewUrlPrefill(
  storage: StorageLike | null = safeStorage("session"),
): void {
  try {
    storage?.removeItem(INTERVIEW_URL_PREFILL_KEY);
  } catch {
    // ignorado
  }
}

// ─── 2. Rascunho da resposta em edição (localStorage) ────────────────────────

export const ANSWER_DRAFTS_KEY = "rhconnect:interview-answer-drafts:v1";
const ANSWER_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type AnswerDraftScope = {
  // Apenas namespace local: NÃO é autoridade para o Back (o dono vem do JWT).
  candidateId: string;
  interviewId: string;
  questionId: string;
};

export type AnswerDraft = {
  /** Texto digitado e ainda NÃO confirmado pelo Back. */
  text: string;
  /** Resposta confirmada pelo Back quando o rascunho foi iniciado ("" se nenhuma). */
  base: string;
  updatedAt: number;
  /**
   * Versão do rascunho do Back que ESTE dispositivo conhecia quando editou
   * (ausente em rascunhos antigos). Permite saber se outro dispositivo mexeu
   * no rascunho do Back depois disso, sem comparar relógios.
   */
  baseVersion?: number;
};

type AnswerDraftStore = { version: 1; drafts: Record<string, AnswerDraft> };

const interviewPrefix = (candidateId: string, interviewId: string) =>
  `${candidateId}|${interviewId}|`;
const draftKey = (scope: AnswerDraftScope) =>
  `${interviewPrefix(scope.candidateId, scope.interviewId)}${scope.questionId}`;

function readStore(storage: StorageLike, now: number): AnswerDraftStore {
  const empty: AnswerDraftStore = { version: 1, drafts: {} };
  try {
    const raw = storage.getItem(ANSWER_DRAFTS_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<AnswerDraftStore>;
    if (parsed.version !== 1 || !parsed.drafts || typeof parsed.drafts !== "object") return empty;
    const drafts: Record<string, AnswerDraft> = {};
    for (const [key, value] of Object.entries(parsed.drafts)) {
      const item = value as Partial<AnswerDraft> | null;
      if (
        item &&
        typeof item.text === "string" &&
        typeof item.base === "string" &&
        typeof item.updatedAt === "number" &&
        now - item.updatedAt <= ANSWER_DRAFT_TTL_MS // evita crescimento indefinido
      ) {
        drafts[key] = {
          text: item.text,
          base: item.base,
          updatedAt: item.updatedAt,
          ...(typeof item.baseVersion === "number" ? { baseVersion: item.baseVersion } : {}),
        };
      }
    }
    return { version: 1, drafts };
  } catch {
    return empty;
  }
}

function writeStore(storage: StorageLike, store: AnswerDraftStore): void {
  try {
    if (Object.keys(store.drafts).length === 0) storage.removeItem(ANSWER_DRAFTS_KEY);
    else storage.setItem(ANSWER_DRAFTS_KEY, JSON.stringify(store));
  } catch {
    // quota/privado: o rascunho é só proteção extra
  }
}

export function getAnswerDraft(
  scope: AnswerDraftScope,
  storage: StorageLike | null = safeStorage("local"),
  now: number = Date.now(),
): AnswerDraft | null {
  if (!storage) return null;
  return readStore(storage, now).drafts[draftKey(scope)] ?? null;
}

/** Guarda o texto em edição. Se ele já é igual ao confirmado pelo Back, não há o que proteger. */
export function saveAnswerDraft(
  scope: AnswerDraftScope,
  text: string,
  persistedAnswer: string,
  storage: StorageLike | null = safeStorage("local"),
  now: number = Date.now(),
  baseVersion?: number,
): void {
  if (!storage) return;
  if (text.trim() === persistedAnswer.trim()) {
    clearAnswerDraft(scope, storage, now);
    return;
  }
  const store = readStore(storage, now);
  const key = draftKey(scope);
  // Mantém a base original do rascunho: ela marca em que resposta do Back a edição começou.
  const base = store.drafts[key]?.base ?? persistedAnswer.trim();
  store.drafts[key] = {
    text,
    base,
    updatedAt: now,
    ...(typeof baseVersion === "number" ? { baseVersion } : {}),
  };
  writeStore(storage, store);
}

export function clearAnswerDraft(
  scope: AnswerDraftScope,
  storage: StorageLike | null = safeStorage("local"),
  now: number = Date.now(),
): void {
  if (!storage) return;
  const store = readStore(storage, now);
  const key = draftKey(scope);
  if (!(key in store.drafts)) return;
  delete store.drafts[key];
  writeStore(storage, store);
}

/** Remove todos os rascunhos de uma entrevista (envio final, descarte, nova vaga). */
export function clearAnswerDraftsForInterview(
  candidateId: string,
  interviewId: string | undefined,
  storage: StorageLike | null = safeStorage("local"),
  now: number = Date.now(),
): void {
  if (!storage || !interviewId) return;
  const store = readStore(storage, now);
  const prefix = interviewPrefix(candidateId, interviewId);
  let changed = false;
  for (const key of Object.keys(store.drafts)) {
    if (key.startsWith(prefix)) {
      delete store.drafts[key];
      changed = true;
    }
  }
  if (changed) writeStore(storage, store);
}

/**
 * Decide o que mostrar no textarea. O Back sempre vence, exceto quando há
 * evidência de edição local POSTERIOR sobre a MESMA resposta do Back:
 * o rascunho só vale se foi iniciado a partir da resposta atual do servidor
 * (`base`) e difere dela. Se o servidor mudou desde então, o rascunho é velho.
 */
export function resolveAnswerText(
  serverAnswer: string | null,
  draft: AnswerDraft | null,
): { text: string; source: "server" | "draft" } {
  const server = (serverAnswer ?? "").trim();
  if (draft && draft.text.trim() !== server && draft.base === server) {
    return { text: draft.text, source: "draft" };
  }
  return { text: serverAnswer ?? "", source: "server" };
}

/**
 * PRECEDÊNCIA ao abrir uma pergunta (rascunho ≠ resposta):
 *
 *  1. A resposta OFICIAL do Back é o último estado confirmado e é a base.
 *  2. Rascunho LOCAL só vale se (a) difere da oficial, (b) nasceu da MESMA
 *     resposta oficial atual (`base`) e (c) não é mais velho que o rascunho do
 *     Back: `baseVersion` precisa ser igual à versão atual do rascunho remoto
 *     (rascunhos antigos, sem `baseVersion`, só valem se não há rascunho remoto).
 *     Assim uma edição offline mais nova que o que o Back tem é preservada, e
 *     uma edição velha nunca sobrescreve o que outro dispositivo salvou depois.
 *  3. Senão, rascunho do BACK (se difere da oficial) — é o que atravessa dispositivos.
 *  4. Senão, a resposta oficial.
 *
 * Nada aqui marca a pergunta como respondida: isso depende SÓ da oficial.
 */
export type RestoredAnswerSource = "official" | "remote-draft" | "local-draft";

export function resolveRestoredAnswer(input: {
  official: string | null;
  remote: { text: string | null; version: number };
  local: AnswerDraft | null;
}): { text: string; source: RestoredAnswerSource; discardLocal: boolean } {
  const officialText = input.official ?? "";
  const officialTrim = officialText.trim();
  const remoteText = input.remote.text ?? "";
  const remoteUsable = remoteText.trim() !== "" && remoteText.trim() !== officialTrim;
  const local = input.local;

  const localUsable =
    !!local &&
    local.text.trim() !== officialTrim &&
    local.base === officialTrim &&
    (typeof local.baseVersion === "number"
      ? local.baseVersion === input.remote.version
      : !remoteUsable);

  if (localUsable && local) return { text: local.text, source: "local-draft", discardLocal: false };
  if (remoteUsable) return { text: remoteText, source: "remote-draft", discardLocal: !!local };
  return { text: officialText, source: "official", discardLocal: !!local };
}

/**
 * Efeito de "Copiar link" sobre a tela Nova entrevista: a URL copiada SEMPRE
 * vira o valor do campo. Um contexto já extraído só é invalidado se for de OUTRA
 * URL (exige nova análise); a mesma URL mantém o contexto. Função pura: não
 * analisa, não cria Interview e não faz requisição.
 */
export function resolveLinkCopyEffect(
  copiedUrl: string,
  loadedContextUrl: string | null | undefined,
): { nextUrl: string; invalidateContext: boolean } {
  const loaded = (loadedContextUrl ?? "").trim();
  return {
    nextUrl: copiedUrl,
    invalidateContext: loaded !== "" && loaded !== copiedUrl.trim(),
  };
}

// ─── Texto da resposta ───────────────────────────────────────────────────────

/**
 * Normalização SEGURA do texto digitado: só unifica as quebras de linha do
 * navegador (CRLF/CR → LF). Parágrafos e quebras do candidato são preservados;
 * nenhuma quebra vira espaço. O limite de caracteres continua sendo aplicado
 * pelo textarea e pelo Back.
 */
export function normalizeInterviewAnswer(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

// ─── 3. Qual pergunta reabrir ────────────────────────────────────────────────

/**
 * Pergunta inicial do InterviewScreen.
 * - Recarga (progresso salvo já estava na tela de respostas): reabre a pergunta salva.
 * - Chegada de outra tela (revisão "editar", retomar, orientações): vale `?question=`.
 * Sempre limitada ao intervalo válido.
 */
export function resolveInitialQuestionIndex(input: {
  restoredIndex?: number;
  urlIndex: number;
  questionCount: number;
}): number {
  const last = Math.max(0, input.questionCount - 1);
  const candidate =
    typeof input.restoredIndex === "number" && Number.isInteger(input.restoredIndex)
      ? input.restoredIndex
      : input.urlIndex;
  return Math.min(Math.max(0, candidate), last);
}

/**
 * Aviso "Link preenchido" após "Copiar link" de uma vaga sugerida. Só aparece enquanto o
 * campo ainda contém exatamente a URL copiada; editar, limpar ou trocar o texto o oculta.
 * URL digitada/colada nunca coincide com `copiedLinkUrl` (que só é definido pelo clique).
 */
export function shouldShowCopiedLinkNotice(copiedLinkUrl: string | null | undefined, currentUrl: string): boolean {
  if (!copiedLinkUrl) return false;
  return currentUrl === copiedLinkUrl;
}

// ─── 4. Painel "Progresso": estado de navegação x estado da resposta ─────────

/**
 * CURRENT          pergunta aberta agora.
 * ANSWERED         já alcançada e com resposta válida.
 * VISITED_PENDING  já alcançada, hoje sem resposta válida (ex.: resposta apagada). Continua clicável.
 * LOCKED           futura, ainda nunca alcançada (único estado que mostra cadeado).
 */
export type QuestionNavState = "CURRENT" | "ANSWERED" | "VISITED_PENDING" | "LOCKED";

/**
 * Maior índice de pergunta já alcançado (somente UX/navegação). Une o valor guardado
 * localmente, a pergunta aberta e qualquer pergunta com resposta válida (cobre rascunhos
 * antigos sem o valor guardado). Nunca passa do intervalo válido.
 */
export function deriveHighestReachedIndex(input: {
  storedHighest?: number;
  currentIndex: number;
  answeredIndexes: number[];
  /** Perguntas com rascunho (do Back ou local): já foram abertas em algum dispositivo. */
  draftedIndexes?: number[];
  questionCount: number;
}): number {
  const last = Math.max(0, input.questionCount - 1);
  const stored =
    typeof input.storedHighest === "number" && Number.isInteger(input.storedHighest) && input.storedHighest >= 0
      ? input.storedHighest
      : 0;
  const highestAnswered = input.answeredIndexes.reduce((max, index) => Math.max(max, index), 0);
  const highestDrafted = (input.draftedIndexes ?? []).reduce((max, index) => Math.max(max, index), 0);
  // A primeira pergunta SEM resposta oficial é sempre acessível: é o ponto onde o fluxo
  // normal pararia (P1 e P2 oficiais => P3 liberada), mesmo que este dispositivo nunca a
  // tenha aberto (resposta dada em outro dispositivo / estado local antigo).
  const answered = new Set(input.answeredIndexes);
  let firstPending = 0;
  while (firstPending < input.questionCount && answered.has(firstPending)) firstPending += 1;
  // O estado local (`stored`) só SOMA: nunca reduz o que o Back já permite acessar.
  return Math.min(last, Math.max(stored, input.currentIndex, highestAnswered, highestDrafted, firstPending, 0));
}

export function getQuestionNavState(input: {
  index: number;
  currentIndex: number;
  highestReached: number;
  answered: boolean;
}): QuestionNavState {
  if (input.index === input.currentIndex) return "CURRENT";
  if (input.index > input.highestReached) return "LOCKED";
  return input.answered ? "ANSWERED" : "VISITED_PENDING";
}

/** Regra única de clicabilidade (painel desktop e chips mobile): só LOCKED não abre. */
export function isQuestionNavigable(state: QuestionNavState): boolean {
  return state !== "LOCKED";
}
