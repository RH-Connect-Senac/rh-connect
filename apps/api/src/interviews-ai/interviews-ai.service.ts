import {
  BadGatewayException,
  BadRequestException,
  GatewayTimeoutException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const DEFAULT_INTERVIEW_AI_SERVICE_URL = 'http://127.0.0.1:5001';
const DEFAULT_TIMEOUT_MS = 20000;

@Injectable()
export class InterviewsAiService {
  private readonly serviceUrl: string;
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.serviceUrl = this.resolveServiceUrl();
    this.timeoutMs = this.resolveTimeoutMs();
  }

  getJobContext(payload: Record<string, unknown>) {
    return this.postToPython('/job-context', payload);
  }

  generateQuestions(payload: Record<string, unknown>) {
    return this.postToPython('/questions', payload);
  }

  evaluate(payload: Record<string, unknown>) {
    return this.postToPython('/evaluate', payload);
  }

  private async postToPython(path: string, payload: Record<string, unknown>) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

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
        throw new GatewayTimeoutException(
          'Tempo esgotado ao acessar o serviço de entrevista por IA.',
        );
      }

      throw new ServiceUnavailableException(
        'Serviço de entrevista por IA indisponível.',
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
    const message =
      this.extractErrorMessage(body) || 'Erro no serviço de entrevista por IA.';

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
}
