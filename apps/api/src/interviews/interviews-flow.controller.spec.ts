import 'reflect-metadata';
import { ExecutionContext, RequestMethod } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// Os services reais (InterviewQuestionsService -> InterviewsAiService) importam
// '@nestjs/config', cujo build ESM o Jest deste projeto não transforma. Este
// spec só testa decorators/guards/roles e a delegação a services simulados;
// por isso o módulo do proxy de IA é substituído por uma classe vazia (mesmo
// padrão do JwtAuthGuard abaixo).
jest.mock('../interviews-ai/interviews-ai.service', () => ({
  InterviewsAiService: class InterviewsAiService {},
}));

// Ver comentário em interviews.controller.spec.ts: o JwtAuthGuard real usa o
// build ESM do passport, que o Jest não transforma.
jest.mock('../auth/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class JwtAuthGuard {},
}));

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { InterviewQuestionsController } from './interview-questions.controller';
import type { InterviewQuestionsService } from './interview-questions.service';
import { InterviewsController } from './interviews.controller';
import type { InterviewsService } from './interviews.service';

const guard = new RolesGuard(new Reflector());
const ID = '11111111-1111-4111-8111-111111111111';
const QID = '22222222-2222-4222-8222-222222222222';
const req = { user: { id: 7, role: 'CANDIDATE' } } as never;

function contextFor(
  handler: (...args: never[]) => unknown,
  role: string | null,
): ExecutionContext {
  return {
    getHandler: () => handler,
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { id: 1, role } : undefined }),
    }),
  } as unknown as ExecutionContext;
}

const proto = InterviewQuestionsController.prototype;
const flowProto = InterviewsController.prototype;

const ROUTES: Array<
  [string, (...args: never[]) => unknown, RequestMethod, string]
> = [
  ['generate', proto.generate, RequestMethod.POST, ':id/questions/generate'],
  ['list', proto.list, RequestMethod.GET, ':id/questions'],
  [
    'saveAnswer',
    proto.saveAnswer,
    RequestMethod.PUT,
    ':id/questions/:questionId/answer',
  ],
  [
    'setEvaluationMode',
    flowProto.setEvaluationMode,
    RequestMethod.PATCH,
    ':id/evaluation-mode',
  ],
  ['submit', flowProto.submit, RequestMethod.POST, ':id/submit'],
];

describe('rotas da Fase 2', () => {
  it('InterviewQuestionsController usa o prefixo interviews e os guards', () => {
    expect(Reflect.getMetadata('path', InterviewQuestionsController)).toBe(
      'interviews',
    );
    expect(
      Reflect.getMetadata('__guards__', InterviewQuestionsController),
    ).toEqual([JwtAuthGuard, RolesGuard]);
  });

  it.each(ROUTES)('%s: método e caminho', (_name, handler, method, path) => {
    expect(Reflect.getMetadata('method', handler)).toBe(method);
    expect(Reflect.getMetadata('path', handler)).toBe(path);
  });

  it('não existe POST :id/questions (colidiria com POST /interviews/ai/questions)', () => {
    const postPaths = ROUTES.filter(
      ([, , method]) => method === RequestMethod.POST,
    ).map(([, , , path]) => path);
    expect(postPaths).not.toContain(':id/questions');
  });

  it.each(ROUTES)('%s exige exclusivamente CANDIDATE', (_name, handler) => {
    expect(Reflect.getMetadata('roles', handler)).toEqual(['CANDIDATE']);
    expect(guard.canActivate(contextFor(handler, 'CANDIDATE'))).toBe(true);
    expect(guard.canActivate(contextFor(handler, 'ADMIN'))).toBe(false);
    expect(guard.canActivate(contextFor(handler, 'EVALUATOR'))).toBe(false);
    expect(guard.canActivate(contextFor(handler, null))).toBe(false);
  });

  it('generate e submit respondem 200 (idempotentes)', () => {
    expect(Reflect.getMetadata('__httpCode__', proto.generate)).toBe(200);
    expect(Reflect.getMetadata('__httpCode__', flowProto.submit)).toBe(200);
  });
});

describe('dono sempre vem do JWT', () => {
  function makeQuestions() {
    const service = {
      generate: jest.fn().mockResolvedValue('g'),
      list: jest.fn().mockResolvedValue('l'),
      saveAnswer: jest.fn().mockResolvedValue('s'),
    };
    return {
      service,
      controller: new InterviewQuestionsController(
        service as unknown as InterviewQuestionsService,
      ),
    };
  }

  it('generate / list / saveAnswer', async () => {
    const { service, controller } = makeQuestions();

    await controller.generate(req, ID);
    await controller.list(req, ID);
    await controller.saveAnswer(req, ID, QID, { answer: 'texto' });

    expect(service.generate).toHaveBeenCalledWith(7, ID);
    expect(service.list).toHaveBeenCalledWith(7, ID);
    expect(service.saveAnswer).toHaveBeenCalledWith(7, ID, QID, 'texto');
  });

  it('setEvaluationMode / submit', async () => {
    const service = {
      setEvaluationMode: jest.fn().mockResolvedValue('m'),
      submit: jest.fn().mockResolvedValue('s'),
    };
    const controller = new InterviewsController(
      service as unknown as InterviewsService,
    );

    await controller.setEvaluationMode(req, ID, { evaluationMode: 'AI' });
    await controller.submit(req, ID, { evaluationMode: 'HUMAN' });
    await controller.submit(req, ID, {});

    expect(service.setEvaluationMode).toHaveBeenCalledWith(7, ID, 'AI');
    expect(service.submit).toHaveBeenNthCalledWith(1, 7, ID, 'HUMAN');
    expect(service.submit).toHaveBeenNthCalledWith(2, 7, ID, undefined);
  });
});
