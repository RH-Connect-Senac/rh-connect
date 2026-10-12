import { describe, expect, it } from "vitest";
import {
  FRIENDLY_ERROR_MESSAGES,
  friendlyErrorMessage,
  friendlyMessageForStatus,
  isTechnicalMessage,
  sanitizeServerMessage,
} from "./user-friendly-error";

const FALLBACK = "Não foi possível gerar as perguntas agora. Tente novamente em instantes.";

describe("isTechnicalMessage", () => {
  it("detecta texto técnico/interno", () => {
    for (const text of [
      "Erro Groq 502",
      "Groq API unavailable",
      "Bad Gateway",
      "Fetch failed",
      "Failed to fetch",
      "Request timeout",
      "Internal Server Error",
      "connect ECONNREFUSED 127.0.0.1:5001",
      "PrismaClientKnownRequestError",
      "INTERVIEW_NOT_IN_PROGRESS",
      "HTTP 503",
      "Tempo esgotado ao acessar o serviço de entrevista por IA.",
      "Serviço de entrevista por IA indisponível.",
      "x".repeat(400),
    ]) {
      expect(isTechnicalMessage(text)).toBe(true);
    }
  });

  it("não marca mensagens de domínio nem números comuns", () => {
    for (const text of [
      "Esta entrevista foi cancelada e não aceita mais alterações.",
      "Esta entrevista foi cancelada em outro dispositivo e não pode mais ser editada.",
      "Esta entrevista já foi enviada e não pode mais ser editada.",
      "Você já possui uma entrevista em andamento.",
      "A resposta deve ter no máximo 500 caracteres.",
      "Este rascunho foi alterado em outro dispositivo.",
      "E-mail ou senha inválidos.",
    ]) {
      expect(isTechnicalMessage(text)).toBe(false);
    }
  });
});

describe("friendlyMessageForStatus", () => {
  it("5xx tem copy de produto; 4xx deixa a mensagem de domínio passar", () => {
    expect(friendlyMessageForStatus(503)).toBe(FRIENDLY_ERROR_MESSAGES.unavailable);
    expect(friendlyMessageForStatus(504)).toBe(FRIENDLY_ERROR_MESSAGES.timeout);
    expect(friendlyMessageForStatus(502, FALLBACK)).toBe(FALLBACK);
    expect(friendlyMessageForStatus(500)).toBe(FRIENDLY_ERROR_MESSAGES.generic);
    expect(friendlyMessageForStatus(409)).toBeNull();
  });
});

describe("sanitizeServerMessage", () => {
  it("5xx nunca repassa o texto do servidor", () => {
    const out = sanitizeServerMessage("Erro Groq 502", { status: 502, fallback: FALLBACK });
    expect(out).toBe(FALLBACK);
  });

  it("4xx de domínio é preservada; técnica ou vazia cai no fallback", () => {
    const domain = "Esta entrevista foi cancelada e não aceita mais alterações.";
    expect(sanitizeServerMessage(domain, { status: 409, fallback: FALLBACK })).toBe(domain);
    expect(sanitizeServerMessage("Bad Gateway", { status: 400, fallback: FALLBACK })).toBe(FALLBACK);
    expect(sanitizeServerMessage(null, { status: 400, fallback: FALLBACK })).toBe(FALLBACK);
  });

  it("o detalhe técnico é registrado no console, não na tela", () => {
    const original = console.error;
    const calls: unknown[][] = [];
    console.error = (...args: unknown[]) => void calls.push(args);
    try {
      sanitizeServerMessage("Erro Groq 502", { status: 502, fallback: FALLBACK, scope: "teste" });
    } finally {
      console.error = original;
    }
    expect(calls.length).toBe(1);
    expect(JSON.stringify(calls[0])).toContain("Erro Groq 502");
  });
});

describe("friendlyErrorMessage (erros capturados)", () => {
  it("erro de rede cru vira a cópia de conexão", () => {
    expect(friendlyErrorMessage(new TypeError("Failed to fetch"))).toBe(FRIENDLY_ERROR_MESSAGES.network);
  });
  it("mensagem de domínio é mantida; técnica ou desconhecida usa o fallback", () => {
    expect(friendlyErrorMessage(new Error("Informe uma URL valida da vaga."), FALLBACK)).toBe("Informe uma URL valida da vaga.");
    expect(friendlyErrorMessage(new Error("Request timeout"), FALLBACK)).toBe(FALLBACK);
    expect(friendlyErrorMessage("qualquer coisa", FALLBACK)).toBe(FALLBACK);
  });
});
