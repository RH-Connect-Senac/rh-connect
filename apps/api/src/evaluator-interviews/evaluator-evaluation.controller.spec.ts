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
import { EvaluatorEvaluationController } from './evaluator-evaluation.controller';
import type { EvaluatorEvaluationService } from './evaluator-evaluation.service';

const proto = EvaluatorEvaluationController.prototype;
const guard = new RolesGuard(new Reflector());
const ID = '11111111-1111-4111-8111-111111111111';

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

const ROUTES: Array<
  [string, (...args: never[]) => unknown, RequestMethod, string]
> = [
  ['get', proto.get, RequestMethod.GET, 'interviews/:id/evaluation'],
  ['save', proto.save, RequestMethod.PUT, 'interviews/:id/evaluation'],
];

describe('EvaluatorEvaluationController (rotas e acesso)', () => {
  it('prefixo evaluator, JwtAuthGuard e RolesGuard na classe', () => {
    expect(Reflect.getMetadata('path', EvaluatorEvaluationController)).toBe(
      'evaluator',
    );
    expect(
      Reflect.getMetadata('__guards__', EvaluatorEvaluationController),
    ).toEqual([JwtAuthGuard, RolesGuard]);
  });

  it.each(ROUTES)('%s: método e caminho', (_n, handler, method, path) => {
    expect(Reflect.getMetadata('method', handler)).toBe(method);
    expect(Reflect.getMetadata('path', handler)).toBe(path);
  });

  it.each(ROUTES)('%s exige exclusivamente EVALUATOR (Candidate/Admin => 403)', (_n, handler) => {
    expect(Reflect.getMetadata('roles', handler)).toEqual(['EVALUATOR']);
    expect(guard.canActivate(contextFor(handler, 'EVALUATOR'))).toBe(true);
    expect(guard.canActivate(contextFor(handler, 'CANDIDATE'))).toBe(false);
    expect(guard.canActivate(contextFor(handler, 'ADMIN'))).toBe(false);
    expect(guard.canActivate(contextFor(handler, null))).toBe(false);
  });

  it('o id é validado como UUID nas duas rotas', () => {
    for (const handler of [proto.get, proto.save]) {
      const args = Reflect.getMetadata(
        '__routeArguments__',
        EvaluatorEvaluationController,
        handler.name,
      ) as Record<string, { data?: string; pipes: unknown[] }>;
      const param = Object.values(args).find((a) => a.data === 'id');
      expect(param?.pipes).toHaveLength(1);
    }
  });

  it('delega com o id do JWT e o corpo', () => {
    const service = {
      getEvaluation: jest.fn().mockReturnValue('g'),
      saveDraft: jest.fn().mockReturnValue('s'),
    };
    const controller = new EvaluatorEvaluationController(
      service as unknown as EvaluatorEvaluationService,
    );
    const req = { user: { id: 11, role: 'EVALUATOR' } } as never;
    const body = { criteriaScores: { clarity: 8 } };

    expect(controller.get(req, ID)).toBe('g');
    expect(controller.save(req, ID, body)).toBe('s');
    expect(service.getEvaluation).toHaveBeenCalledWith(11, ID);
    expect(service.saveDraft).toHaveBeenCalledWith(11, ID, body);
  });
});
