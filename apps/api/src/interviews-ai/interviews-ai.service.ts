import {
  BadGatewayException,
  BadRequestException,
  GatewayTimeoutException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const DEFAULT_INTERVIEW_AI_SERVICE_URL = 'http://127.0.0.1:5001';
const DEFAULT_TIMEOUT_MS = 20000;
// Timeout próprio da extração de vaga (só POST /job-context). Deve ser MAIOR que o
// orçamento total do extrator Python (ORCAMENTO_TOTAL_SEGUNDOS = 15 s em http_segura.py),
// para que o Python responda 504 TEMPO_ESGOTADO antes de o Nest abortar. Não altera o
// timeout de perguntas/avaliação (INTERVIEW_AI_TIMEOUT_MS).
const DEFAULT_JOB_CONTEXT_TIMEOUT_MS = 20000;

// Códigos de erro estáveis devolvidos por POST /job-context do serviço Python.
// Cada um vira uma exceção HTTP com mensagem fixa e segura: o texto vindo do
// Python nunca é repassado (pode conter detalhes de infraestrutura).
interface JobContextErrorMapping {
  create: (message: string) => HttpException;
  message: string;
}

const badRequest = (message: string) => new BadRequestException(message);
const unprocessable = (message: string) =>
  new UnprocessableEntityException(message);
const notFound = (message: string) => new NotFoundException(message);
const badGateway = (message: string) => new BadGatewayException(message);
const gatewayTimeout = (message: string) =>
  new GatewayTimeoutException(message);

const LINK_NOT_ALLOWED: JobContextErrorMapping = {
  create: unprocessable,
  message: 'Link da vaga não permitido.',
};
const JOB_UNREACHABLE: JobContextErrorMapping = {
  create: badGateway,
  message: 'Não foi possível acessar a vaga. Tente novamente em instantes.',
};

const JOB_CONTEXT_ERRORS: Record<string, JobContextErrorMapping> = {
  URL_AUSENTE: { create: badRequest, message: 'Informe o link da vaga.' },
  URL_NAO_PERMITIDA: LINK_NOT_ALLOWED,
  REDIRECIONAMENTO_NAO_PERMITIDO: LINK_NOT_ALLOWED,
  VAGA_SEM_DADOS: {
    create: unprocessable,
    message: 'A vaga não possui informações suficientes.',
  },
  VAGA_NAO_ENCONTRADA: {
    create: notFound,
    message: 'Vaga não encontrada. Verifique se o link ainda está ativo.',
  },
  DESTINO_BLOQUEADO: JOB_UNREACHABLE,
  DNS_FALHOU: JOB_UNREACHABLE,
  ACESSO_VAGA_FALHOU: JOB_UNREACHABLE,
  RESPOSTA_MUITO_GRANDE: JOB_UNREACHABLE,
  REDIRECIONAMENTOS_EXCESSIVOS: JOB_UNREACHABLE,
  VAGA_ACESSO_BLOQUEADO: JOB_UNREACHABLE,
  TEMPO_ESGOTADO: {
    create: gatewayTimeout,
    message: 'Tempo esgotado ao acessar a vaga. Tente novamente.',
  },
  EXTRACAO_FALHOU: {
    create: badGateway,
    message:
      'Não foi possível extrair as informações da vaga. Tente novamente em instantes.',
  },
};

@Injectable()
export class InterviewsAiService {
  private readonly logger = new Logger(InterviewsAiService.name);
  private readonly serviceUrl: string;
  private readonly timeoutMs: number;
  private readonly jobContextTimeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.serviceUrl = this.resolveServiceUrl();
    this.timeoutMs = this.resolveTimeoutMs();
    this.jobContextTimeoutMs = this.resolveJobContextTimeoutMs();
  }

  getJobContext(payload: Record<string, unknown>) {
    return this.postToPython('/job-context', payload, this.jobContextTimeoutMs);
  }

  generateQuestions(payload: Record<string, unknown>) {
    return this.postToPython('/questions', payload);
  }

  evaluate(payload: Record<string, unknown>) {
    return this.postToPython('/evaluate', payload);
  }

  private async postToPython(
    path: string,
    payload: Record<string, unknown>,
    timeoutMs: number = this.timeoutMs,
  ) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.serviceUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const body = await this.readJsonResponse(response);

      if (!response.ok) {
        throw this.mapPythonError(response.status, body);
      }

      return body;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.error(`Timeout ao acessar o serviço de IA (${path})`);
        throw new GatewayTimeoutException(
          'A operação está demorando mais que o esperado. Tente novamente.',
        );
      }

      this.logger.error(
        `Serviço de IA indisponível (${path}): ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException(
        'O serviço está temporariamente indisponível. Tente novamente em alguns instantes.',
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private async readJsonResponse(response: Response) {
    try {
      return (await response.json()) as unknown;
    } catch {
      return null;
    }
  }

  private mapPythonError(status: number, body: unknown) {
    const mapped = this.mapJobContextError(status, body);
    if (mapped) {
      return mapped;
    }

    const detail = this.extractErrorMessage(body);
    const message = detail || 'Não foi possível concluir esta ação agora.';

    // Falha do serviço de IA/provider: o detalhe técnico fica no log; o cliente recebe
    // uma mensagem de produto (o status HTTP continua o mesmo).
    if (status >= 500) {
      this.logger.error(`Serviço de IA respondeu ${status}: ${detail ?? '(sem corpo)'}`);
      return status === 504
        ? new GatewayTimeoutException(
            'A operação está demorando mais que o esperado. Tente novamente.',
          )
        : status === 502
          ? new BadGatewayException(
              'Não foi possível gerar as perguntas agora. Tente novamente em instantes.',
            )
          : new BadGatewayException(
              'Não conseguimos concluir esta ação no momento. Tente novamente.',
            );
    }

    switch (status) {
      case 400:
        return new BadRequestException(message);
      case 422:
        return new UnprocessableEntityException(message);
      case 502:
        return new BadGatewayException(message);
      case 504:
        return new GatewayTimeoutException(message);
      default:
        if (status >= 500) {
          return new BadGatewayException(message);
        }
        return new InternalServerErrorException(message);
    }
  }

  private mapJobContextError(status: number, body: unknown) {
    const code = this.extractErrorCode(body);
    if (!code || !Object.hasOwn(JOB_CONTEXT_ERRORS, code)) {
      return null;
    }
    const mapping = JOB_CONTEXT_ERRORS[code];

    // Só o código e o status vão para o log; o corpo do Python não.
    this.logger.warn(`Extração de vaga falhou (${status}): ${code}`);

    return mapping.create(mapping.message);
  }

  private extractErrorCode(body: unknown) {
    if (
      body &&
      typeof body === 'object' &&
      'code' in body &&
      typeof body.code === 'string'
    ) {
      return body.code;
    }
    return null;
  }

  private extractErrorMessage(body: unknown) {
    if (
      body &&
      typeof body === 'object' &&
      'error' in body &&
      typeof body.error === 'string'
    ) {
      return body.error;
    }
    return null;
  }

  private resolveServiceUrl() {
    const configuredUrl = this.configService
      .get<string>('INTERVIEW_AI_SERVICE_URL')
      ?.trim();

    return (configuredUrl || DEFAULT_INTERVIEW_AI_SERVICE_URL).replace(/\/+$/, '');
  }

  private resolveTimeoutMs() {
    const configuredTimeout = Number(
      this.configService.get<string>('INTERVIEW_AI_TIMEOUT_MS'),
    );

    if (Number.isFinite(configuredTimeout) && configuredTimeout > 0) {
      return configuredTimeout;
    }

    return DEFAULT_TIMEOUT_MS;
  }

  private resolveJobContextTimeoutMs() {
    const configuredTimeout = Number(
      this.configService.get<string>('INTERVIEW_AI_JOB_CONTEXT_TIMEOUT_MS'),
    );

    if (Number.isFinite(configuredTimeout) && configuredTimeout > 0) {
      return configuredTimeout;
    }

    return DEFAULT_JOB_CONTEXT_TIMEOUT_MS;
  }
}
