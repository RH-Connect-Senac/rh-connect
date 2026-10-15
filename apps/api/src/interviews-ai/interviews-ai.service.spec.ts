// O service importa `@nestjs/config` (ESM no Jest): o módulo é isolado aqui, como nos demais specs.
jest.mock('@nestjs/config', () => ({
  ConfigService: class ConfigService {
    get() {
      return undefined;
    }
  },
}));

import {
  BadGatewayException,
  BadRequestException,
  GatewayTimeoutException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InterviewsAiService } from './interviews-ai.service';

type FetchMock = jest.Mock;

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  };
}

describe('InterviewsAiService: mensagens seguras para o cliente', () => {
  const originalFetch = global.fetch;
  let service: InterviewsAiService;
  let fetchMock: FetchMock;

  let logErrorMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    service = new InterviewsAiService({
      get: () => undefined,
    } as never);
    // silencia o log de erro nos testes e permite conferir que o detalhe técnico é registrado
    logErrorMock = jest.fn();
    (service['logger'] as unknown as { error: jest.Mock }).error = logErrorMock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const FORBIDDEN =
    /groq|llama|provider|bad gateway|econn|fetch failed|\b50[0-9]\b/i;

  async function failure(run: () => Promise<unknown>) {
    try {
      await run();
    } catch (error) {
      return error as Error & { getStatus: () => number };
    }
    throw new Error('esperava falha');
  }

  it('502 do Python com texto do provider: mantém 502 mas não repassa o detalhe', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(502, {
        error: 'Erro Groq 502: model llama-3 unavailable (Bad Gateway)',
      }),
    );
    const error = await failure(() => service.generateQuestions({}));
    expect(error).toBeInstanceOf(BadGatewayException);
    expect(error.getStatus()).toBe(502);
    expect(FORBIDDEN.test(error.message)).toBe(false);
    expect(error.message).toBe(
      'Não foi possível gerar as perguntas agora. Tente novamente em instantes.',
    );
  });

  it('500 e demais 5xx viram mensagem genérica de produto', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(500, { error: 'Traceback (most recent call last) Groq' }),
    );
    const error = await failure(() => service.getJobContext({}));
    expect(error.getStatus()).toBe(502);
    expect(FORBIDDEN.test(error.message)).toBe(false);
  });

  it('504 do Python vira a mensagem de demora', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(504, { error: 'Groq timeout' }),
    );
    const error = await failure(() => service.generateQuestions({}));
    expect(error).toBeInstanceOf(GatewayTimeoutException);
    expect(error.message).toBe(
      'A operação está demorando mais que o esperado. Tente novamente.',
    );
  });

  it('serviço fora do ar (ECONNREFUSED/fetch failed): 503 com texto de produto', async () => {
    fetchMock.mockImplementationOnce(() =>
      Promise.reject(new TypeError('fetch failed ECONNREFUSED 127.0.0.1:5001')),
    );
    const error = await failure(() => service.generateQuestions({}));
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect(FORBIDDEN.test(error.message)).toBe(false);
    expect(error.message).toBe(
      'O serviço está temporariamente indisponível. Tente novamente em alguns instantes.',
    );
  });

  it('abort por tempo: 504 com texto de produto', async () => {
    const abort = new Error('aborted');
    abort.name = 'AbortError';
    fetchMock.mockImplementationOnce(() => Promise.reject(abort));
    const error = await failure(() => service.generateQuestions({}));
    expect(error).toBeInstanceOf(GatewayTimeoutException);
    expect(error.message).toBe(
      'A operação está demorando mais que o esperado. Tente novamente.',
    );
  });

  it('422 (validação de negócio) continua repassando a mensagem específica', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(422, { error: 'A vaga não tem requisitos suficientes.' }),
    );
    const error = await failure(() => service.getJobContext({}));
    expect(error).toBeInstanceOf(UnprocessableEntityException);
    expect(error.message).toBe('A vaga não tem requisitos suficientes.');
  });

  it('o detalhe técnico continua disponível no log do servidor', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(502, { error: 'Erro Groq 502' }),
    );
    await failure(() => service.generateQuestions({}));
    expect(logErrorMock.mock.calls.length > 0).toBe(true);
    expect(String(logErrorMock.mock.calls[0][0])).toContain('Erro Groq 502');
  });
});

describe('InterviewsAiService.evaluate: retorno bruto e tipagem (R2.3)', () => {
  const originalFetch = global.fetch;
  let service: InterviewsAiService;
  let fetchMock: FetchMock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    service = new InterviewsAiService({ get: () => undefined } as never);
    (service['logger'] as unknown as { error: jest.Mock }).error = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const PAYLOAD = {
    context: { title: 'Analista' },
    answers: [{ questionId: 1, answer: 'Resposta' }],
  };

  // Resposta propositalmente "suja" para o contrato da R2.1: rótulos em
  // português, nota geral divergente, campo extra, texto numérico e null.
  function rawPythonBody() {
    return {
      scores: { Clareza: 8, Coerência: '7', Criatividade: 5 },
      overallScore: 9.9,
      strengths: ['a', ''],
      summary: null,
      campoExtra: { qualquer: true },
      questionsEvaluation: [{ questionId: 99, score: 11 }],
    };
  }

  type Equal<A, B> =
    (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
      ? true
      : false;

  it('o retorno de evaluate é tipado como Promise<unknown> (nunca como a resposta validada)', () => {
    const isUnknown: Equal<
      Awaited<ReturnType<InterviewsAiService['evaluate']>>,
      unknown
    > = true;
    expect(isUnknown).toBe(true);
  });

  it('devolve o corpo do Python intacto: mesmo objeto, sem remover, converter ou renomear campos', async () => {
    const body = rawPythonBody();
    const snapshot = JSON.parse(JSON.stringify(body)) as unknown;
    fetchMock.mockResolvedValueOnce(jsonResponse(200, body));

    const result = await service.evaluate(PAYLOAD);

    expect(result).toBe(body);
    expect(result).toStrictEqual(snapshot);
  });

  it('não normaliza nem valida: resposta fora do contrato da R2.1 é devolvida sem erro', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { qualquer: 'coisa' }));
    await expect(service.evaluate(PAYLOAD)).resolves.toStrictEqual({
      qualquer: 'coisa',
    });
  });

  it('corpo 200 sem JSON válido continua resultando em null (comportamento atual)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.reject(new Error('invalid json')),
    });
    await expect(service.evaluate(PAYLOAD)).resolves.toBeNull();
  });

  it('chama só POST /evaluate, uma vez, com o payload sem alterações (sem persistência)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, rawPythonBody()));

    await service.evaluate(PAYLOAD);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://127.0.0.1:5001/evaluate');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify(PAYLOAD));
    // O serviço depende só de ConfigService: não há acesso a banco/Prisma.
    expect(InterviewsAiService.length).toBe(1);
  });

  describe('erros HTTP continuam como antes', () => {
    async function failure(run: () => Promise<unknown>) {
      try {
        await run();
      } catch (error) {
        return error as Error & { getStatus: () => number };
      }
      throw new Error('esperava falha');
    }

    it('400 repassa a mensagem do Python', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(400, { error: 'Respostas inválidas.' }),
      );
      const error = await failure(() => service.evaluate(PAYLOAD));
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toBe('Respostas inválidas.');
    });

    it('422 repassa a mensagem do Python', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(422, { error: 'Contexto insuficiente.' }),
      );
      const error = await failure(() => service.evaluate(PAYLOAD));
      expect(error).toBeInstanceOf(UnprocessableEntityException);
      expect(error.message).toBe('Contexto insuficiente.');
    });

    it('502 mantém o status e esconde o detalhe do provider', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(502, { error: 'Erro Groq 502: modelo indisponível' }),
      );
      const error = await failure(() => service.evaluate(PAYLOAD));
      expect(error).toBeInstanceOf(BadGatewayException);
      expect(error.getStatus()).toBe(502);
      expect(error.message).not.toMatch(/groq/i);
    });

    it('500 vira 502 com mensagem genérica', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(500, { error: 'Traceback' }),
      );
      const error = await failure(() => service.evaluate(PAYLOAD));
      expect(error.getStatus()).toBe(502);
      expect(error.message).toBe(
        'Não conseguimos concluir esta ação no momento. Tente novamente.',
      );
    });

    it('504 do Python vira 504 com mensagem de demora', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(504, { error: 'timeout' }));
      const error = await failure(() => service.evaluate(PAYLOAD));
      expect(error).toBeInstanceOf(GatewayTimeoutException);
    });

    it('serviço fora do ar vira 503', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
      const error = await failure(() => service.evaluate(PAYLOAD));
      expect(error).toBeInstanceOf(ServiceUnavailableException);
    });

    it('abort por tempo vira 504', async () => {
      const abort = new Error('aborted');
      abort.name = 'AbortError';
      fetchMock.mockRejectedValueOnce(abort);
      const error = await failure(() => service.evaluate(PAYLOAD));
      expect(error).toBeInstanceOf(GatewayTimeoutException);
    });
  });
});
