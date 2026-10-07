/**
 * Mensagens e regras do "Ditado por voz" (Web Speech API) da entrevista.
 * Funções puras, sem expor mensagens técnicas ao usuário. O fallback por texto
 * está sempre disponível: todas as mensagens apontam para responder digitando.
 */

export const SPEECH_UNSUPPORTED_MESSAGE =
  "Este navegador não oferece ditado por voz. Você pode responder digitando normalmente.";

export const SPEECH_INSECURE_CONTEXT_MESSAGE =
  "O ditado por voz só funciona em uma conexão segura (HTTPS). Você pode responder digitando normalmente.";

export const SPEECH_GENERIC_ERROR_MESSAGE =
  "Não foi possível usar o ditado por voz agora. Nenhum áudio é armazenado. Você pode responder digitando normalmente.";

const SPEECH_ERROR_MESSAGES: Record<string, string> = {
  "not-allowed":
    "Permita o uso do microfone nas configurações do navegador para usar o ditado por voz. Você pode responder digitando normalmente.",
  "service-not-allowed":
    "O ditado por voz não está disponível neste navegador ou dispositivo. Verifique se o reconhecimento de voz está ativado ou responda digitando normalmente.",
  "audio-capture":
    "Não encontramos um microfone disponível. Verifique o dispositivo ou responda digitando normalmente.",
  "no-speech":
    "Não detectamos nenhuma fala. Tente novamente ou responda digitando normalmente.",
  network:
    "Não foi possível usar o ditado por voz por falha de conexão. Tente novamente ou responda digitando normalmente.",
};

/**
 * Mensagem amigável para o código de erro do SpeechRecognition.
 * `aborted` (parada pelo próprio app/usuário) não gera mensagem (null).
 * Códigos desconhecidos ou ausentes usam a mensagem genérica.
 */
export function getSpeechErrorMessage(code: string | null | undefined): string | null {
  if (code === "aborted") return null;
  return (code && SPEECH_ERROR_MESSAGES[code]) || SPEECH_GENERIC_ERROR_MESSAGE;
}

/**
 * `window.isSecureContext` só bloqueia quando é explicitamente `false`
 * (navegadores antigos sem a propriedade não são tratados como inseguros).
 */
export function isSpeechContextSecure(isSecureContext: boolean | undefined): boolean {
  return isSecureContext !== false;
}

type SpeechResultLike = { 0?: { transcript?: string } };

/**
 * Transcrição apenas dos resultados NOVOS. Em modo contínuo, `event.results`
 * é cumulativo (traz tudo desde o `start()`); `processed` é quantos resultados
 * já foram acrescentados nesta sessão de ditado.
 */
export function getNewTranscript(
  results: ArrayLike<SpeechResultLike>,
  processed: number,
): { transcript: string; processed: number } {
  const start = Math.min(Math.max(0, processed), results.length);
  const parts: string[] = [];
  for (let index = start; index < results.length; index += 1) {
    parts.push(results[index]?.[0]?.transcript ?? "");
  }
  return { transcript: parts.join(" ").trim(), processed: results.length };
}

/**
 * Acrescenta o trecho ditado ao valor ATUAL da resposta (nunca a um valor
 * antigo), respeitando o limite de caracteres. Sem espaço sobrando, ou sem
 * texto ditado, devolve a resposta como está.
 */
export function appendDictation(current: string, transcript: string, maxChars: number): string {
  const text = transcript.trim();
  if (!text) return current;
  const available = Math.max(0, maxChars - current.length);
  if (available === 0) return current;
  const toAppend = `${current ? " " : ""}${text}`.slice(0, available);
  return `${current}${toAppend}`.trim();
}
