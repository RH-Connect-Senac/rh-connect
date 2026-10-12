// Mensagens de erro/aviso exibidas ao usuário. Detalhes técnicos (provider de IA, status HTTP,
// nome de biblioteca, erro de fetch cru, códigos internos) NÃO vão para a UI: continuam no
// console (diagnóstico) e na resposta HTTP/log do servidor. Mensagens de domínio úteis
// ("entrevista cancelada", "você já possui uma entrevista em andamento"...) passam intactas.

export const FRIENDLY_ERROR_MESSAGES = {
  network: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
  unavailable: "O serviço está temporariamente indisponível. Tente novamente em alguns instantes.",
  timeout: "A operação está demorando mais que o esperado. Tente novamente.",
  generic: "Não conseguimos concluir esta ação no momento. Tente novamente.",
} as const;

// Sinais de texto técnico/interno. Números soltos (ex.: "500 caracteres") NÃO contam: só
// "status 502", "erro 503", "HTTP 500" ou "502 Bad Gateway".
const TECHNICAL_PATTERNS: RegExp[] = [
  /prisma|typeorm/i,
  /\b(groq|openai|anthropic|gemini|llama|mistral|claude|llm|provider|nestjs?|typeorm|axios|undici|express|postgres(ql)?|python|uvicorn|fastapi)\b/i,
  /bad gateway|gateway time-?out|service unavailable|internal server error|request time-?out/i,
  /failed to fetch|fetch failed|networkerror|load failed|network request failed|aborterror|the user aborted/i,
  /\b(econn\w*|enotfound|etimedout|eai_again|epipe|socket hang up)\b/i,
  /\b(time-?out|timed out)\b/i,
  /\b(http|status|erro|error|code|c[oó]digo)\s*:?\s*[45]\d{2}\b/i,
  /\b[45]\d{2}\s+(bad|internal|service|gateway|not found|unauthorized|forbidden)\b/i,
  /\bundefined\b|\[object |unexpected token|is not a function|cannot read propert/i,
  /\bat\s+\S+\s*\(|\bstack\b|traceback|exception/i,
  /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$/,
  /tempo esgotado ao acessar|servi[cç]o de (entrevista por )?ia|erro no servi[cç]o/i,
];

export function isTechnicalMessage(message: string | null | undefined): boolean {
  if (typeof message !== "string") return false;
  const text = message.trim();
  if (!text) return false;
  if (text.length > 300) return true;
  return TECHNICAL_PATTERNS.some((pattern) => pattern.test(text));
}

/** Mensagem de produto para um status HTTP de falha de servidor; null para 4xx (mensagem de domínio). */
export function friendlyMessageForStatus(status: number, fallback: string = FRIENDLY_ERROR_MESSAGES.generic): string | null {
  if (status === 408 || status === 504) return FRIENDLY_ERROR_MESSAGES.timeout;
  if (status === 503) return FRIENDLY_ERROR_MESSAGES.unavailable;
  if (status >= 500) return fallback;
  return null;
}

/**
 * Mensagem que a UI pode mostrar para uma resposta de erro da API.
 * - 5xx: nunca repassa o texto do servidor (mensagem por status ou o `fallback` da operação);
 * - 4xx com `code` de domínio já mapeado pelo chamador: não passa por aqui;
 * - 4xx com texto de negócio em português: preservado; texto técnico/desconhecido: `fallback`.
 * O texto original é registrado no console para diagnóstico.
 */
export function sanitizeServerMessage(
  message: string | null | undefined,
  options: { status: number; fallback: string; scope?: string },
): string {
  const byStatus = friendlyMessageForStatus(options.status, options.fallback);
  if (byStatus) {
    reportTechnicalError(options.scope, options.status, message);
    return byStatus;
  }
  const text = typeof message === "string" ? message.trim() : "";
  if (!text) return options.fallback;
  if (isTechnicalMessage(text)) {
    reportTechnicalError(options.scope, options.status, text);
    return options.fallback;
  }
  return text;
}

/** Erro capturado (throw/catch) → mensagem de produto. Erro de rede cru vira a cópia de conexão. */
export function friendlyErrorMessage(error: unknown, fallback: string = FRIENDLY_ERROR_MESSAGES.generic): string {
  if (error instanceof TypeError) {
    reportTechnicalError("catch", undefined, error.message);
    return FRIENDLY_ERROR_MESSAGES.network;
  }
  if (error instanceof Error && error.message.trim()) {
    if (!isTechnicalMessage(error.message)) return error.message;
    reportTechnicalError("catch", undefined, error.message);
  }
  return fallback;
}

/** Diagnóstico para quem desenvolve; nunca vai para a tela. */
export function reportTechnicalError(scope: string | undefined, status: number | undefined, detail: unknown) {
  if (typeof console === "undefined") return;
  console.error(`[rh-connect] ${scope ?? "erro"}`, { status, detail });
}
