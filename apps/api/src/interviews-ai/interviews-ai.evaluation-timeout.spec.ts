// O service importa `@nestjs/config` (ESM no Jest): o módulo é isolado aqui, como nos demais specs.
jest.mock('@nestjs/config', () => ({
  ConfigService: class ConfigService {
    get() {
      return undefined;
    }
  },
}));

import { GatewayTimeoutException, Logger } from '@nestjs/common';
import { InterviewsAiService } from './interviews-ai.service';

// R3.3a-2: timeout próprio de POST /evaluate (INTERVIEW_AI_EVALUATION_TIMEOUT_MS).
// Perguntas e extração de vaga mantêm os timeouts anteriores.

const DEFAULT_MS = 20000;

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  };
}

describe('InterviewsAiService: timeout próprio da avaliação (R3.3a-2)', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;
  let setTimeoutSpy: jest.SpyInstance;
  let warnMock: jest.SpyInstance;
  let errorMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, {}));
    global.fetch = fetchMock;
    setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    // O aviso de configuração inválida sai no construtor: o Logger é
    // interceptado antes de criar o service.
    warnMock = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    errorMock = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    setTimeoutSpy.mockRestore();
    warnMock.mockRestore();
    errorMock.mockRestore();
    jest.useRealTimers();
  });

  function serviceWith(config: Record<string, string | undefined>) {
    return new InterviewsAiService({
      get: (key: string) => config[key],
    } as never);
  }

  // Os atrasos usados por cada chamada, na ordem em que foram feitas.
  function delaysUsed() {
    return (setTimeoutSpy.mock.calls as Array<[unknown, number]>).map(
      (call) => call[1],
    );
  }

  // Cria o service (o construtor pode avisar de configuração inválida) e só
  // então mede os atrasos de cada operação.
  async function delaysPerOperation(
    config: Record<string, string | undefined>,
  ) {
    const service = serviceWith(config);
    setTimeoutSpy.mockClear();
    await service.getJobContext({});
    await service.generateQuestions({});
    await service.evaluate({});
    const [jobContext, questions, evaluation] = delaysUsed();
    return { jobContext, questions, evaluation };
  }

  describe('configuração', () => {
    it('INTERVIEW_AI_EVALUATION_TIMEOUT_MS vale só para a avaliação', async () => {
      const delays = await delaysPerOperation({
        INTERVIEW_AI_EVALUATION_TIMEOUT_MS: '45000',
      });
      expect(delays).toEqual({
        jobContext: DEFAULT_MS,
        questions: DEFAULT_MS,
        evaluation: 45000,
      });
    });

    it('perguntas continuam no INTERVIEW_AI_TIMEOUT_MS e a extração de vaga no seu próprio', async () => {
      const delays = await delaysPerOperation({
        INTERVIEW_AI_TIMEOUT_MS: '7000',
        INTERVIEW_AI_JOB_CONTEXT_TIMEOUT_MS: '25000',
        INTERVIEW_AI_EVALUATION_TIMEOUT_MS: '90000',
      });
      expect(delays).toEqual({
        jobContext: 25000,
        questions: 7000,
        evaluation: 90000,
      });
    });

    it('a avaliação pode ficar MENOR que o timeout geral (valor explícito é respeitado)', async () => {
      const delays = await delaysPerOperation({
        INTERVIEW_AI_TIMEOUT_MS: '30000',
        INTERVIEW_AI_EVALUATION_TIMEOUT_MS: '5000',
      });
      expect(delays.questions).toBe(30000);
      expect(delays.evaluation).toBe(5000);
    });

    it.each([
      ['ausente', undefined],
      ['vazia', ''],
      ['só espaços', '   '],
    ])(
      'variável %s: a avaliação usa o timeout geral, sem aviso e sem valor novo',
      async (_label, value) => {
        const delays = await delaysPerOperation({
          INTERVIEW_AI_EVALUATION_TIMEOUT_MS: value,
        });
        expect(delays.evaluation).toBe(DEFAULT_MS);
        expect(warnMock).not.toHaveBeenCalled();
      },
    );

    it('sem variável própria, a avaliação acompanha INTERVIEW_AI_TIMEOUT_MS (comportamento anterior)', async () => {
      const delays = await delaysPerOperation({
        INTERVIEW_AI_TIMEOUT_MS: '7000',
      });
      expect(delays.questions).toBe(7000);
      expect(delays.evaluation).toBe(7000);
    });

    it.each([
      'abc',
      '10s',
      '0',
      '-5',
      '1.5',
      'NaN',
      'Infinity',
      '2147483648',
      '99999999999999999999',
    ])(
      'valor inválido %p: cai no timeout geral e avisa uma vez',
      async (value) => {
        const delays = await delaysPerOperation({
          INTERVIEW_AI_TIMEOUT_MS: '7000',
          INTERVIEW_AI_EVALUATION_TIMEOUT_MS: value,
        });
        expect(delays.evaluation).toBe(7000);
        expect(delays.questions).toBe(7000);
        expect(warnMock).toHaveBeenCalledTimes(1);
        const message = String((warnMock.mock.calls[0] as unknown[])[0]);
        expect(message).toContain('INTERVIEW_AI_EVALUATION_TIMEOUT_MS');
      },
    );

    it('limites do intervalo válido: 1 ms e o máximo do timer são aceitos', async () => {
      expect(
        (await delaysPerOperation({ INTERVIEW_AI_EVALUATION_TIMEOUT_MS: '1' }))
          .evaluation,
      ).toBe(1);
      expect(
        (
          await delaysPerOperation({
            INTERVIEW_AI_EVALUATION_TIMEOUT_MS: '2147483647',
          })
        ).evaluation,
      ).toBe(2147483647);
      expect(warnMock).not.toHaveBeenCalled();
    });

    it('configuração inválida da avaliação não altera perguntas nem extração de vaga', async () => {
      const delays = await delaysPerOperation({
        INTERVIEW_AI_EVALUATION_TIMEOUT_MS: 'abc',
      });
      expect(delays.jobContext).toBe(DEFAULT_MS);
      expect(delays.questions).toBe(DEFAULT_MS);
    });
  });

  describe('regressão: perguntas e demais operações', () => {
    it('defaults sem nenhuma configuração: tudo em 20 s', async () => {
      const delays = await delaysPerOperation({});
      expect(delays).toEqual({
        jobContext: DEFAULT_MS,
        questions: DEFAULT_MS,
        evaluation: DEFAULT_MS,
      });
    });

    it('generateQuestions e getJobContext não leem a variável da avaliação, mesmo com valor extremo', async () => {
      const service = serviceWith({
        INTERVIEW_AI_EVALUATION_TIMEOUT_MS: '1',
      });
      setTimeoutSpy.mockClear();
      await service.generateQuestions({});
      await service.getJobContext({});
      expect(delaysUsed()).toEqual([DEFAULT_MS, DEFAULT_MS]);
    });

    it('a chamada de avaliação não muda: POST /evaluate, uma vez, mesmo payload e cabeçalho', async () => {
      const service = serviceWith({
        INTERVIEW_AI_EVALUATION_TIMEOUT_MS: '45000',
      });
      const payload = { context: { title: 'X' }, answers: [{ questionId: 1 }] };
      await service.evaluate(payload);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [
        string,
        { method: string; headers: unknown; body: string; signal: AbortSignal },
      ];
      expect(url).toBe('http://127.0.0.1:5001/evaluate');
      expect(init.method).toBe('POST');
      expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
      expect(JSON.parse(init.body)).toEqual(payload);
      expect(init.signal).toBeInstanceOf(AbortSignal);
    });
  });

  describe('cancelamento por tempo', () => {
    // fetch que só termina quando o sinal de cancelamento dispara.
    function hangUntilAborted() {
      fetchMock.mockImplementation(
        (_url: string, init: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init.signal.addEventListener('abort', () => {
              const abort = new Error('aborted');
              abort.name = 'AbortError';
              reject(abort);
            });
          }),
      );
    }

    it('estourar o prazo da avaliação cancela a espera e vira 504 de produto', async () => {
      jest.useFakeTimers();
      hangUntilAborted();
      const service = serviceWith({
        INTERVIEW_AI_EVALUATION_TIMEOUT_MS: '45000',
      });

      const pending = service.evaluate({});
      const assertion = expect(pending).rejects.toBeInstanceOf(
        GatewayTimeoutException,
      );
      const signal = (
        fetchMock.mock.calls[0] as [string, { signal: AbortSignal }]
      )[1].signal;

      await jest.advanceTimersByTimeAsync(44999);
      expect(signal.aborted).toBe(false);
      await jest.advanceTimersByTimeAsync(1);
      expect(signal.aborted).toBe(true);
      await assertion;

      await pending.catch((error: Error) => {
        expect(error.message).toBe(
          'A operação está demorando mais que o esperado. Tente novamente.',
        );
      });
    });

    it('com a avaliação mais longa que as perguntas, só as perguntas são canceladas no prazo curto', async () => {
      jest.useFakeTimers();
      hangUntilAborted();
      const service = serviceWith({
        INTERVIEW_AI_TIMEOUT_MS: '10000',
        INTERVIEW_AI_EVALUATION_TIMEOUT_MS: '60000',
      });

      const questions = service.generateQuestions({});
      const evaluation = service.evaluate({});
      const questionsResult = expect(questions).rejects.toBeInstanceOf(
        GatewayTimeoutException,
      );
      const [questionsSignal, evaluationSignal] = (
        fetchMock.mock.calls as Array<[string, { signal: AbortSignal }]>
      ).map((call) => call[1].signal);

      await jest.advanceTimersByTimeAsync(10000);
      expect(questionsSignal.aborted).toBe(true);
      expect(evaluationSignal.aborted).toBe(false);
      await questionsResult;

      const evaluationResult = expect(evaluation).rejects.toBeInstanceOf(
        GatewayTimeoutException,
      );
      await jest.advanceTimersByTimeAsync(50000);
      expect(evaluationSignal.aborted).toBe(true);
      await evaluationResult;
    });

    it('o log do timeout da avaliação avisa que o Python pode continuar; o das perguntas não', async () => {
      jest.useFakeTimers();
      hangUntilAborted();
      const service = serviceWith({});

      const evaluation = expect(service.evaluate({})).rejects.toBeDefined();
      await jest.advanceTimersByTimeAsync(DEFAULT_MS);
      await evaluation;
      const questions = expect(
        service.generateQuestions({}),
      ).rejects.toBeDefined();
      await jest.advanceTimersByTimeAsync(DEFAULT_MS);
      await questions;

      const messages = (errorMock.mock.calls as unknown[][]).map((call) =>
        String(call[0]),
      );
      expect(messages[0]).toContain('(/evaluate)');
      expect(messages[0]).toContain('Python pode continuar');
      expect(messages[1]).toContain('(/questions)');
      expect(messages[1]).not.toContain('Python');
    });

    it('resposta dentro do prazo não deixa temporizador pendente', async () => {
      jest.useFakeTimers();
      fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));
      const service = serviceWith({
        INTERVIEW_AI_EVALUATION_TIMEOUT_MS: '45000',
      });
      await expect(service.evaluate({})).resolves.toEqual({ ok: true });
      expect(jest.getTimerCount()).toBe(0);
    });
  });
});
