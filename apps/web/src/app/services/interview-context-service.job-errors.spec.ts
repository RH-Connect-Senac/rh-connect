import { afterEach, describe, expect, it } from "vitest";
import { analyzeJobUrl } from "./interview-context-service";

// Propagação das falhas de POST /interviews/ai/job-context (Python -> NestJS -> tela).
// As respostas abaixo reproduzem o formato do Nest: { statusCode, message, error }.
const EXTERNAL_URL = "https://www.empregare.com/pt-br/vaga-qualquer-outra_999999";
const FALLBACK = "Não foi possível analisar a vaga. Verifique o link e tente novamente.";
const FORBIDDEN = /groq|llama|bad gateway|fetch|econn|traceback|\b50[0-9]\b|\d+\.\d+\.\d+\.\d+|https?:\/\//i;

describe("analyzeJobUrl: erros explícitos do /job-context", () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const failWith = (status: number, message: string, error: string) => {
    globalThis.fetch = (async () =>
      ({ ok: false, status, json: async () => ({ statusCode: status, message, error }) }) as unknown as Response) as typeof fetch;
  };
  const messageOf = async () => {
    const error = await analyzeJobUrl(EXTERNAL_URL).catch((e: Error) => e);
    expect(error).toBeInstanceOf(Error);
    return (error as Error).message;
  };

  it("422 link não permitido: a mensagem específica chega à tela", async () => {
    failWith(422, "Link da vaga não permitido.", "Unprocessable Entity");
    expect(await messageOf()).toBe("Link da vaga não permitido.");
  });

  it("422 vaga sem informações suficientes: a mensagem específica chega à tela", async () => {
    failWith(422, "A vaga não possui informações suficientes.", "Unprocessable Entity");
    expect(await messageOf()).toBe("A vaga não possui informações suficientes.");
  });

  it("404 vaga não encontrada: a mensagem específica chega à tela", async () => {
    failWith(404, "Vaga não encontrada. Verifique se o link ainda está ativo.", "Not Found");
    expect(await messageOf()).toBe("Vaga não encontrada. Verifique se o link ainda está ativo.");
  });

  it("502 (destino bloqueado, DNS, 403 da Empregare...) usa a mensagem amigável, sem detalhe técnico", async () => {
    failWith(502, "Não foi possível acessar a vaga. Tente novamente em instantes.", "Bad Gateway");
    const message = await messageOf();
    expect(message).toBe(FALLBACK);
    expect(FORBIDDEN.test(message)).toBe(false);
  });

  it("504 (tempo esgotado ao acessar a vaga) usa a cópia de demora", async () => {
    failWith(504, "Tempo esgotado ao acessar a vaga. Tente novamente.", "Gateway Timeout");
    expect(await messageOf()).toBe("A operação está demorando mais que o esperado. Tente novamente.");
  });

  it("nenhum erro de vaga externa vira sucesso com contexto vazio", async () => {
    for (const [status, message] of [
      [422, "Link da vaga não permitido."],
      [404, "Vaga não encontrada. Verifique se o link ainda está ativo."],
      [502, "Não foi possível acessar a vaga. Tente novamente em instantes."],
      [504, "Tempo esgotado ao acessar a vaga. Tente novamente."],
    ] as const) {
      failWith(status, message, "x");
      await expect(analyzeJobUrl(EXTERNAL_URL)).rejects.toBeInstanceOf(Error);
    }
  });
});
