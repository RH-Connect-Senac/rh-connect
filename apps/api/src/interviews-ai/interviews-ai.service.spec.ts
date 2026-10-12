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
    global.fetch = fetchMock as unknown as typeof fetch;
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


  const FORBIDDEN = /groq|llama|provider|bad gateway|econn|fetch failed|\b50[0-9]\b/i;

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
      jsonResponse(502, { error: 'Erro Groq 502: model llama-3 unavailable (Bad Gateway)' }),
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
    fetchMock.mockResolvedValueOnce(jsonResponse(500, { error: 'Traceback (most recent call last) Groq' }));
    const error = await failure(() => service.getJobContext({}));
    expect(error.getStatus()).toBe(502);
    expect(FORBIDDEN.test(error.message)).toBe(false);
  });

  it('504 do Python vira a mensagem de demora', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(504, { error: 'Groq timeout' }));
    const error = await failure(() => service.generateQuestions({}));
    expect(error).toBeInstanceOf(GatewayTimeoutException);
    expect(error.message).toBe('A operação está demorando mais que o esperado. Tente novamente.');
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
    expect(error.message).toBe('A operação está demorando mais que o esperado. Tente novamente.');
  });

  it('422 (validação de negócio) continua repassando a mensagem específica', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(422, { error: 'A vaga não tem requisitos suficientes.' }));
    const error = await failure(() => service.getJobContext({}));
    expect(error).toBeInstanceOf(UnprocessableEntityException);
    expect(error.message).toBe('A vaga não tem requisitos suficientes.');
  });

  it('o detalhe técnico continua disponível no log do servidor', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(502, { error: 'Erro Groq 502' }));
    await failure(() => service.generateQuestions({}));
    expect(logErrorMock.mock.calls.length > 0).toBe(true);
    expect(String(logErrorMock.mock.calls[0][0])).toContain('Erro Groq 502');
  });
});
