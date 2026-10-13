import 'reflect-metadata';
import { ExecutionContext, RequestMethod } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// Ver comentário em interviews.controller.spec.ts: o JwtAuthGuard real usa o
// build ESM do passport, que o Jest não transforma. O RolesGuard é o real.
jest.mock('../auth/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class JwtAuthGuard {},
}));

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EvaluatorCompletionController } from './evaluator-completion.controller';
import type { EvaluatorCompletionService } from './evaluator-completion.service';

const handler = EvaluatorCompletionController.prototype.complete;
const guard = new RolesGuard(new Reflector());
const ID = '11111111-1111-4111-8111-111111111111';

function contextFor(role: string | null): ExecutionContext {
  return {
    getHandler: () => handler,
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { id: 1, role } : undefined }),
    }),
  } as unknown as ExecutionContext;
}

describe('EvaluatorCompletionController (rota e acesso)', () => {
  it('prefixo evaluator, JwtAuthGuard e RolesGuard na classe', () => {
    expect(Reflect.getMetadata('path', EvaluatorCompletionController)).toBe(
      'evaluator',
    );
    expect(
      Reflect.getMetadata('__guards__', EvaluatorCompletionController),
    ).toEqual([JwtAuthGuard, RolesGuard]);
  });

  it('POST interviews/:id/evaluation/complete respondendo 200', () => {
    expect(Reflect.getMetadata('method', handler)).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata('path', handler)).toBe(
      'interviews/:id/evaluation/complete',
    );
    expect(Reflect.getMetadata('__httpCode__', handler)).toBe(200);
  });

  it('exige exclusivamente EVALUATOR (Candidate e Admin => 403)', () => {
    expect(Reflect.getMetadata('roles', handler)).toEqual(['EVALUATOR']);
    expect(guard.canActivate(contextFor('EVALUATOR'))).toBe(true);
    expect(guard.canActivate(contextFor('CANDIDATE'))).toBe(false);
    expect(guard.canActivate(contextFor('ADMIN'))).toBe(false);
    expect(guard.canActivate(contextFor(null))).toBe(false);
  });

  it('só recebe o id (UUID) e a requisição; nenhum corpo ou query', () => {
    const args = Reflect.getMetadata(
      '__routeArguments__',
      EvaluatorCompletionController,
      'complete',
    ) as Record<string, { data?: string; pipes: unknown[] }>;
    const keys = Object.keys(args);
    expect(keys).toHaveLength(2); // req + param id
    expect(Object.values(args).find((a) => a.data === 'id')?.pipes).toHaveLength(1);
  });

  it('delega com o id do JWT', () => {
    const service = { complete: jest.fn().mockReturnValue('ok') };
    const controller = new EvaluatorCompletionController(
      service as unknown as EvaluatorCompletionService,
    );
    const req = { user: { id: 11, role: 'EVALUATOR' } } as never;

    expect(controller.complete(req, ID)).toBe('ok');
    expect(service.complete).toHaveBeenCalledWith(11, ID);
  });
});
