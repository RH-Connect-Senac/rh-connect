import { GatewayTimeoutException } from '@nestjs/common';

import { InterviewsAiService } from './interviews-ai.service';

jest.mock('@nestjs/config', () => ({
  ConfigService: class ConfigService {},
}));

type ConfigValues = {
  INTERVIEW_AI_SERVICE_URL?: string;
  INTERVIEW_AI_TIMEOUT_MS?: string;
};

type ConfigReader = {
  get: (key: keyof ConfigValues) => string | undefined;
};

function createService(config: ConfigValues = {}) {
  const configService = {
    get: jest.fn((key: keyof ConfigValues) => config[key]),
  } as ConfigReader;

  return new InterviewsAiService(configService as never);
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function abortablePendingFetch(init: RequestInit | undefined, onSignal: (signal: AbortSignal) => void) {
  const signal = init?.signal as AbortSignal;
  onSignal(signal);

  return new Promise<Response>((_resolve, reject) => {
    signal.addEventListener('abort', () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      reject(error);
    });
  });
}

describe('InterviewsAiService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('usa timeout default de 60000ms nas chamadas ao serviço Python', async () => {
    jest.useFakeTimers();
    const service = createService();
    let abortSignal: AbortSignal | undefined;

    global.fetch = jest.fn((_url, init) => {
      return abortablePendingFetch(init, (signal) => {
        abortSignal = signal;
      });
    }) as jest.MockedFunction<typeof fetch>;

    const request = service.evaluate({ context: {}, answers: [] });

    jest.advanceTimersByTime(59999);
    expect(abortSignal?.aborted).toBe(false);

    jest.advanceTimersByTime(1);
    expect(abortSignal?.aborted).toBe(true);

    await expect(request).rejects.toBeInstanceOf(GatewayTimeoutException);
  });

  it('usa INTERVIEW_AI_TIMEOUT_MS quando configurado', async () => {
    jest.useFakeTimers();
    const service = createService({ INTERVIEW_AI_TIMEOUT_MS: '2500' });
    let abortSignal: AbortSignal | undefined;

    global.fetch = jest.fn((_url, init) => {
      return abortablePendingFetch(init, (signal) => {
        abortSignal = signal;
      });
    }) as jest.MockedFunction<typeof fetch>;

    const request = service.generateQuestions({ context: {} });

    jest.advanceTimersByTime(2499);
    expect(abortSignal?.aborted).toBe(false);

    jest.advanceTimersByTime(1);
    expect(abortSignal?.aborted).toBe(true);

    await expect(request).rejects.toBeInstanceOf(GatewayTimeoutException);
  });

  it('mantém erro controlado quando o timeout é excedido', async () => {
    jest.useFakeTimers();
    const service = createService({ INTERVIEW_AI_TIMEOUT_MS: '10' });

    global.fetch = jest.fn((_url, init) => {
      const signal = init?.signal as AbortSignal;
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        });
      });
    }) as jest.MockedFunction<typeof fetch>;

    const request = service.evaluate({ context: {}, answers: [] });
    jest.advanceTimersByTime(10);

    await expect(request).rejects.toMatchObject({
      response: {
        message: 'Tempo esgotado ao acessar o serviço de entrevista por IA.',
      },
    });
  });

  it('mantém sucesso quando a resposta chega antes do timeout', async () => {
    jest.useFakeTimers();
    const service = createService({ INTERVIEW_AI_TIMEOUT_MS: '60000' });
    const body = { scores: {}, overallScore: 8 };

    global.fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse(body)) as jest.MockedFunction<typeof fetch>;

    await expect(service.evaluate({ context: {}, answers: [] })).resolves.toEqual(body);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5001/evaluate',
      expect.objectContaining({
        method: 'POST',
        signal: expect.any(AbortSignal),
      }),
    );
  });
});
