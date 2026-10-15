import 'reflect-metadata';
import { ExecutionContext, RequestMethod } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// O InterviewsAiService importa '@nestjs/config' (build ESM que o Jest deste
// projeto não transforma); aqui só importa o TIPO/token. Mesmo padrão dos
// demais specs de controller.
jest.mock('./interviews-ai.service', () => ({
  InterviewsAiService: class InterviewsAiService {},
}));

// O JwtAuthGuard real usa o build ESM do passport (ver interviews.controller.spec.ts).
jest.mock('../auth/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class JwtAuthGuard {},
}));

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AiRateLimitGuard } from './ai-rate-limit.guard';
import { EvaluateDto } from './dto/evaluate.dto';
import { JobContextDto } from './dto/job-context.dto';
import { QuestionsDto } from './dto/questions.dto';
import { InterviewsAiController } from './interviews-ai.controller';
import type { InterviewsAiService } from './interviews-ai.service';

const rolesGuard = new RolesGuard(new Reflector());
const proto = InterviewsAiController.prototype;

type Handler = (...args: never[]) => unknown;

function contextFor(handler: Handler, role: string | null): ExecutionContext {
  return {
    getHandler: () => handler,
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { id: 1, role } : undefined }),
    }),
  } as unknown as ExecutionContext;
}

// Lê o handler pelo nome, sem referenciar o método solto (`proto.metodo` viola
// `@typescript-eslint/unbound-method`). O nome é checado pelo compilador contra
// os membros públicos do controller e, se o método não existir, o teste falha
// com mensagem clara em vez de seguir com `undefined`.
function handlerOf(name: keyof InterviewsAiController): Handler {
  const handler: unknown = Object.getOwnPropertyDescriptor(proto, name)?.value;
  if (typeof handler !== 'function') {
    throw new Error(`InterviewsAiController.${name} não é um método`);
  }
  return handler as Handler;
}

// [nome, caminho, handler, papéis permitidos]
const ROUTES: Array<[string, string, Handler, string[]]> = [
  ['getJobContext', 'job-context', handlerOf('getJobContext'), ['CANDIDATE']],
  ['generateQuestions', 'questions', handlerOf('generateQuestions'), ['ADMIN']],
  ['evaluate', 'evaluate', handlerOf('evaluate'), ['ADMIN']],
];

describe('InterviewsAiController: proteção das rotas de IA', () => {
  it('mantém o prefixo interviews/ai (consumidor existente: wizard do candidato)', () => {
    expect(Reflect.getMetadata('path', InterviewsAiController)).toBe(
      'interviews/ai',
    );
  });

  it('exige JWT, papel e cota de IA, NESSA ordem (não autenticado nunca consome cota)', () => {
    expect(Reflect.getMetadata('__guards__', InterviewsAiController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
      AiRateLimitGuard,
    ]);
  });

  it.each(ROUTES)(
    '%s: POST /%s com o caminho original',
    (_n, path, handler) => {
      expect(Reflect.getMetadata('method', handler)).toBe(RequestMethod.POST);
      expect(Reflect.getMetadata('path', handler)).toBe(path);
    },
  );

  it('toda rota do controller declara papéis (RolesGuard ignora metadata de classe)', () => {
    const handlers = Object.getOwnPropertyNames(proto).filter(
      (name) => name !== 'constructor',
    );

    expect(handlers.sort()).toEqual(
      ['evaluate', 'generateQuestions', 'getJobContext'].sort(),
    );
    // O conjunto acima é exatamente o de ROUTES; cada handler declara papéis.
    for (const [, , handler] of ROUTES) {
      const roles: unknown = Reflect.getMetadata('roles', handler);
      expect(Array.isArray(roles) && roles.length > 0).toBe(true);
    }
  });

  it.each(ROUTES)(
    '%s (/%s): só os papéis permitidos; qualquer outro (ou sem login) é negado',
    (_name, _path, handler, allowed) => {
      expect(Reflect.getMetadata('roles', handler)).toEqual(allowed);

      for (const role of ['CANDIDATE', 'ADMIN', 'EVALUATOR']) {
        expect(rolesGuard.canActivate(contextFor(handler, role))).toBe(
          allowed.includes(role),
        );
      }
      expect(rolesGuard.canActivate(contextFor(handler, null))).toBe(false);
      expect(rolesGuard.canActivate(contextFor(handler, 'QUALQUER'))).toBe(
        false,
      );
    },
  );

  it('candidato só alcança job-context; avaliador não alcança nenhuma rota de IA', () => {
    expect(
      rolesGuard.canActivate(
        contextFor(handlerOf('getJobContext'), 'CANDIDATE'),
      ),
    ).toBe(true);
    expect(
      rolesGuard.canActivate(
        contextFor(handlerOf('generateQuestions'), 'CANDIDATE'),
      ),
    ).toBe(false);
    expect(
      rolesGuard.canActivate(contextFor(handlerOf('evaluate'), 'CANDIDATE')),
    ).toBe(false);
    for (const [, , handler] of ROUTES) {
      expect(rolesGuard.canActivate(contextFor(handler, 'EVALUATOR'))).toBe(
        false,
      );
    }
  });
});

describe('InterviewsAiController: delegação ao serviço (contrato com o Python preservado)', () => {
  function make() {
    const service = {
      getJobContext: jest.fn().mockResolvedValue({ title: 'Vaga' }),
      generateQuestions: jest.fn().mockResolvedValue({ questions: [] }),
      evaluate: jest.fn().mockResolvedValue({ overallScore: 7 }),
    };
    return {
      service,
      controller: new InterviewsAiController(
        service as unknown as InterviewsAiService,
      ),
    };
  }

  it('job-context repassa só a url ao serviço', async () => {
    const { service, controller } = make();
    const dto = Object.assign(new JobContextDto(), {
      url: 'https://www.empregare.com/pt-br/vaga-x_1',
      extra: 'ignorado',
    });

    await expect(controller.getJobContext(dto)).resolves.toEqual({
      title: 'Vaga',
    });
    expect(service.getJobContext).toHaveBeenCalledWith({
      url: 'https://www.empregare.com/pt-br/vaga-x_1',
    });
  });

  it('questions e evaluate repassam context/answers sem alterar o formato', async () => {
    const { service, controller } = make();
    const questions = Object.assign(new QuestionsDto(), {
      context: { title: 'Vaga' },
    });
    const evaluate = Object.assign(new EvaluateDto(), {
      context: { title: 'Vaga' },
      answers: [
        {
          questionId: 1,
          questionText: 'P?',
          questionType: 'Tecnica',
          answer: 'R',
        },
      ],
    });

    await controller.generateQuestions(questions);
    await controller.evaluate(evaluate);

    expect(service.generateQuestions).toHaveBeenCalledWith({
      context: { title: 'Vaga' },
    });
    expect(service.evaluate).toHaveBeenCalledWith({
      context: { title: 'Vaga' },
      answers: evaluate.answers,
    });
  });
});
