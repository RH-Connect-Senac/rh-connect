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
import { EvaluatorHistoryController } from './evaluator-history.controller';
import type { EvaluatorHistoryService } from './evaluator-history.service';

const proto = EvaluatorHistoryController.prototype;
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
  ['list', proto.list, RequestMethod.GET, 'history'],
  ['getById', proto.getById, RequestMethod.GET, 'history/:id'],
];

describe('EvaluatorHistoryController (rotas e acesso)', () => {
  it('prefixo evaluator, JwtAuthGuard e RolesGuard na classe', () => {
    expect(Reflect.getMetadata('path', EvaluatorHistoryController)).toBe(
      'evaluator',
    );
    expect(
      Reflect.getMetadata('__guards__', EvaluatorHistoryController),
    ).toEqual([JwtAuthGuard, RolesGuard]);
  });

  it.each(ROUTES)('%s: método e caminho', (_name, handler, method, path) => {
    expect(Reflect.getMetadata('method', handler)).toBe(method);
    expect(Reflect.getMetadata('path', handler)).toBe(path);
  });

  it.each(ROUTES)('%s exige exclusivamente EVALUATOR', (_name, handler) => {
    expect(Reflect.getMetadata('roles', handler)).toEqual(['EVALUATOR']);
    expect(guard.canActivate(contextFor(handler, 'EVALUATOR'))).toBe(true);
    // Candidato e Admin são negados pelo RolesGuard (o Nest responde 403).
    expect(guard.canActivate(contextFor(handler, 'CANDIDATE'))).toBe(false);
    expect(guard.canActivate(contextFor(handler, 'ADMIN'))).toBe(false);
    // Sem usuário autenticado (sem JWT) o RolesGuard nega.
    expect(guard.canActivate(contextFor(handler, null))).toBe(false);
  });

  it('nenhuma rota aceita corpo ou query: a identidade só vem do JWT', () => {
    const bodyOrQuery = (name: 'list' | 'getById') => {
      const args = Reflect.getMetadata(
        '__routeArguments__',
        EvaluatorHistoryController,
        name,
      ) as Record<string, unknown> | undefined;
      // RouteParamtypes: BODY = 3, QUERY = 4.
      return Object.keys(args ?? {}).filter(
        (key) => key.startsWith('3:') || key.startsWith('4:'),
      );
    };
    expect(bodyOrQuery('list')).toEqual([]);
    expect(bodyOrQuery('getById')).toEqual([]);
  });

  it('o id da entrevista exige UUID (ParseUUIDPipe)', () => {
    const args = Reflect.getMetadata(
      '__routeArguments__',
      EvaluatorHistoryController,
      'getById',
    ) as Record<string, { pipes: unknown[] }>;
    const param = Object.entries(args).find(([key]) => key.startsWith('5:'));
    expect(param?.[1].pipes).toHaveLength(1);
  });
});

describe('EvaluatorHistoryController (delegação)', () => {
  function make() {
    const service = {
      listCompleted: jest.fn().mockResolvedValue('queue'),
      getCompletedById: jest.fn().mockResolvedValue('detail'),
    };
    return {
      service,
      controller: new EvaluatorHistoryController(
        service as unknown as EvaluatorHistoryService,
      ),
    };
  }

  it('usa o user_id do JWT na lista do histórico', async () => {
    const { service, controller } = make();
    const req = { user: { id: 42, role: 'EVALUATOR' } } as never;

    await expect(controller.list(req)).resolves.toBe('queue');
    expect(service.listCompleted).toHaveBeenCalledWith(42);
  });

  it('usa o user_id do JWT no detalhe, com o id da URL', async () => {
    const { service, controller } = make();
    const req = { user: { id: 42, role: 'EVALUATOR' } } as never;

    await expect(controller.getById(req, ID)).resolves.toBe('detail');
    expect(service.getCompletedById).toHaveBeenCalledWith(42, ID);
  });
});
