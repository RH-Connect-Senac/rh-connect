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
  HttpException,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InterviewsAiService } from './interviews-ai.service';

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  };
}

const PYTHON_LEAK =
  'conexao com 10.0.0.5 recusada (Traceback) http://169.254.169.254/';

describe('InterviewsAiService.getJobContext: contrato de erros do /job-context', () => {
  const originalFetch = global.fetch;
  let service: InterviewsAiService;
  let fetchMock: jest.Mock;
  let warnMock: jest.Mock;
  let errorMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    service = new InterviewsAiService({ get: () => undefined } as never);
    warnMock = jest.fn();
    errorMock = jest.fn();
    const logger = service['logger'] as unknown as {
      warn: jest.Mock;
      error: jest.Mock;
    };
    logger.warn = warnMock;
    logger.error = errorMock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  async function failure() {
    try {
      await service.getJobContext({ url: 'https://www.empregare.com/x' });
    } catch (error) {
      return error as HttpException;
    }
    throw new Error('esperava falha');
  }

  it('vaga válida: repassa o contexto exatamente como o Python devolveu', async () => {
    const context = {
      title: 'Analista Comercial SDR',
      company: 'Empresa',
      summary: '',
      activities: ['a'],
      requirements: ['r'],
      location: 'SP',
      contractType: 'CLT',
      workMode: null,
      sourceUrl: 'https://www.empregare.com/x',
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(200, context));
    await expect(
      service.getJobContext({ url: context.sourceUrl }),
    ).resolves.toEqual(context);
  });

  const cases: Array<
    [string, number, new (...args: never[]) => HttpException, string]
  > = [
    ['URL_AUSENTE', 400, BadRequestException, 'Informe o link da vaga.'],
    [
      'URL_NAO_PERMITIDA',
      422,
      UnprocessableEntityException,
      'Link da vaga não permitido.',
    ],
    [
      'REDIRECIONAMENTO_NAO_PERMITIDO',
      422,
      UnprocessableEntityException,
      'Link da vaga não permitido.',
    ],
    [
      'VAGA_SEM_DADOS',
      422,
      UnprocessableEntityException,
      'A vaga não possui informações suficientes.',
    ],
    [
      'VAGA_NAO_ENCONTRADA',
      404,
      NotFoundException,
      'Vaga não encontrada. Verifique se o link ainda está ativo.',
    ],
    [
      'DESTINO_BLOQUEADO',
      502,
      BadGatewayException,
      'Não foi possível acessar a vaga. Tente novamente em instantes.',
    ],
    [
      'DNS_FALHOU',
      502,
      BadGatewayException,
      'Não foi possível acessar a vaga. Tente novamente em instantes.',
    ],
    [
      'ACESSO_VAGA_FALHOU',
      502,
      BadGatewayException,
      'Não foi possível acessar a vaga. Tente novamente em instantes.',
    ],
    [
      'RESPOSTA_MUITO_GRANDE',
      502,
      BadGatewayException,
      'Não foi possível acessar a vaga. Tente novamente em instantes.',
    ],
    [
      'REDIRECIONAMENTOS_EXCESSIVOS',
      502,
      BadGatewayException,
      'Não foi possível acessar a vaga. Tente novamente em instantes.',
    ],
    [
      'VAGA_ACESSO_BLOQUEADO',
      502,
      BadGatewayException,
      'Não foi possível acessar a vaga. Tente novamente em instantes.',
    ],
    [
      'TEMPO_ESGOTADO',
      504,
      GatewayTimeoutException,
      'Tempo esgotado ao acessar a vaga. Tente novamente.',
    ],
    [
      'EXTRACAO_FALHOU',
      502,
      BadGatewayException,
      'Não foi possível extrair as informações da vaga. Tente novamente em instantes.',
    ],
  ];

  it.each(cases)(
    'código %s vira exceção com status e mensagem fixos',
    async (code, pythonStatus, expectedClass, expectedMessage) => {
      // o status vindo do Python é irrelevante para a mensagem: vale o código
      const status = code === 'EXTRACAO_FALHOU' ? 500 : pythonStatus;
      fetchMock.mockResolvedValueOnce(
        jsonResponse(status, { error: PYTHON_LEAK, code }),
      );
      const error = await failure();
      expect(error).toBeInstanceOf(expectedClass);
      expect(error.message).toBe(expectedMessage);
      expect(error.getStatus()).toBe(
        code === 'EXTRACAO_FALHOU' ? 502 : pythonStatus,
      );
    },
  );

  it('nunca repassa o texto vindo do Python (IPs, URLs internas, stack)', async () => {
    for (const [code] of cases) {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(422, { error: PYTHON_LEAK, code }),
      );
      const error = await failure();
      expect(error.message).not.toMatch(/10\.0\.0\.5|169\.254|Traceback|http/i);
      expect(JSON.stringify(error.getResponse())).not.toMatch(
        /10\.0\.0\.5|169\.254|Traceback/i,
      );
    }
  });

  it('o log registra só o código e o status, sem o corpo do Python', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(502, { error: PYTHON_LEAK, code: 'DESTINO_BLOQUEADO' }),
    );
    await failure();
    expect(warnMock).toHaveBeenCalledTimes(1);
    const [logged] = warnMock.mock.calls[0] as [string];
    expect(logged).toContain('DESTINO_BLOQUEADO');
    expect(logged).not.toMatch(/10\.0\.0\.5|169\.254/);
    expect(errorMock).not.toHaveBeenCalled();
  });

  it('código desconhecido ou de protótipo não é mapeado: segue o tratamento antigo', async () => {
    for (const code of ['constructor', 'toString', '__proto__', 'OUTRO']) {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(422, { error: 'Mensagem em português do Python.', code }),
      );
      const error = await failure();
      expect(error).toBeInstanceOf(UnprocessableEntityException);
      expect(error.message).toBe('Mensagem em português do Python.');
    }
  });

  it('sem código (Python antigo): 422 e 400 continuam repassando a mensagem', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, { error: 'Informe a URL da vaga.' }),
    );
    const error = await failure();
    expect(error).toBeInstanceOf(BadRequestException);
    expect(error.message).toBe('Informe a URL da vaga.');
  });

  it('serviço Python fora do ar continua sendo 503 com texto de produto', async () => {
    fetchMock.mockRejectedValueOnce(
      new Error('fetch failed ECONNREFUSED 127.0.0.1:5001'),
    );
    const error = await failure();
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect(error.message).toBe(
      'O serviço está temporariamente indisponível. Tente novamente em alguns instantes.',
    );
  });

  it('timeout do próprio Nest continua sendo 504', async () => {
    const abort = new Error('aborted');
    abort.name = 'AbortError';
    fetchMock.mockRejectedValueOnce(abort);
    const error = await failure();
    expect(error).toBeInstanceOf(GatewayTimeoutException);
  });
});

describe('InterviewsAiService: política de timeout por rota', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;
  let setTimeoutSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, {}));
    global.fetch = fetchMock;
    setTimeoutSpy = jest.spyOn(global, 'setTimeout');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    setTimeoutSpy.mockRestore();
  });

  function serviceWith(config: Record<string, string>) {
    return new InterviewsAiService({
      get: (key: string) => config[key],
    } as never);
  }

  function delaysUsed() {
    return (setTimeoutSpy.mock.calls as Array<[unknown, number]>).map(
      (call) => call[1],
    );
  }

  it('sem configuração: extração de vaga, perguntas e avaliação usam 20 s', async () => {
    const service = serviceWith({});
    await service.getJobContext({});
    await service.generateQuestions({});
    await service.evaluate({});
    expect(delaysUsed().filter((delay) => delay === 20000)).toHaveLength(3);
  });

  it('o timeout do job-context é maior que o orçamento de 15 s do extrator Python', async () => {
    await serviceWith({}).getJobContext({});
    const [delay] = delaysUsed();
    expect(delay).toBeGreaterThan(15000);
  });

  it('INTERVIEW_AI_TIMEOUT_MS continua valendo só para perguntas e avaliação', async () => {
    const service = serviceWith({ INTERVIEW_AI_TIMEOUT_MS: '7000' });
    await service.getJobContext({});
    await service.generateQuestions({});
    await service.evaluate({});
    expect(delaysUsed()).toEqual([20000, 7000, 7000]);
  });

  it('INTERVIEW_AI_JOB_CONTEXT_TIMEOUT_MS ajusta só a extração de vaga', async () => {
    const service = serviceWith({
      INTERVIEW_AI_JOB_CONTEXT_TIMEOUT_MS: '25000',
    });
    await service.getJobContext({});
    await service.generateQuestions({});
    expect(delaysUsed()).toEqual([25000, 20000]);
  });

  it('valor inválido do timeout do job-context cai no padrão', async () => {
    const service = serviceWith({ INTERVIEW_AI_JOB_CONTEXT_TIMEOUT_MS: 'abc' });
    await service.getJobContext({});
    expect(delaysUsed()).toEqual([20000]);
  });
});
