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
import { AdminInterviewsController } from './admin-interviews.controller';
import type { AdminInterviewsService } from './admin-interviews.service';

const proto = AdminInterviewsController.prototype;
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
  [
    'listPendingAssignment',
    proto.listPendingAssignment,
    RequestMethod.GET,
    'interviews/pending-assignment',
  ],
  ['getById', proto.getById, RequestMethod.GET, 'interviews/:id'],
  ['assign', proto.assign, RequestMethod.POST, 'interviews/:id/assign'],
  ['listEvaluators', proto.listEvaluators, RequestMethod.GET, 'evaluators'],
];

describe('AdminInterviewsController (rotas e acesso)', () => {
  it('prefixo admin, JwtAuthGuard e RolesGuard na classe', () => {
    expect(Reflect.getMetadata('path', AdminInterviewsController)).toBe(
      'admin',
    );
    expect(
      Reflect.getMetadata('__guards__', AdminInterviewsController),
    ).toEqual([JwtAuthGuard, RolesGuard]);
  });

  it.each(ROUTES)('%s: método e caminho', (_name, handler, method, path) => {
    expect(Reflect.getMetadata('method', handler)).toBe(method);
    expect(Reflect.getMetadata('path', handler)).toBe(path);
  });

  it('pending-assignment é declarada antes de interviews/:id', () => {
    const names = Object.getOwnPropertyNames(proto);
    expect(names.indexOf('listPendingAssignment')).toBeLessThan(
      names.indexOf('getById'),
    );
  });

  it.each(ROUTES)('%s exige exclusivamente ADMIN', (_name, handler) => {
    expect(Reflect.getMetadata('roles', handler)).toEqual(['ADMIN']);
    expect(guard.canActivate(contextFor(handler, 'ADMIN'))).toBe(true);
    expect(guard.canActivate(contextFor(handler, 'CANDIDATE'))).toBe(false);
    expect(guard.canActivate(contextFor(handler, 'EVALUATOR'))).toBe(false);
    // Sem usuário autenticado (sem JWT) o RolesGuard nega.
    expect(guard.canActivate(contextFor(handler, null))).toBe(false);
  });

  it('assign responde 200', () => {
    expect(Reflect.getMetadata('__httpCode__', proto.assign)).toBe(200);
  });
});

describe('AdminInterviewsController (delegação)', () => {
  function make() {
    const service = {
      listPendingAssignment: jest.fn().mockResolvedValue('queue'),
      getById: jest.fn().mockResolvedValue('detail'),
      assign: jest.fn().mockResolvedValue('assigned'),
      listEvaluators: jest.fn().mockResolvedValue('evaluators'),
    };
    return {
      service,
      controller: new AdminInterviewsController(
        service as unknown as AdminInterviewsService,
      ),
    };
  }

  it('delega fila, detalhe e avaliadores', async () => {
    const { service, controller } = make();

    await expect(controller.listPendingAssignment()).resolves.toBe('queue');
    await expect(controller.getById(ID)).resolves.toBe('detail');
    await expect(controller.listEvaluators()).resolves.toBe('evaluators');
    expect(service.getById).toHaveBeenCalledWith(ID);
  });

  it('assign usa o id do Admin do JWT e só o evaluatorId do corpo', async () => {
    const { service, controller } = make();
    const req = { user: { id: 42, role: 'ADMIN' } } as never;
    const body = {
      evaluatorId: 3,
      assigned_by_user_id: 999,
      status: 'COMPLETED',
    } as never;

    await controller.assign(req, ID, body);

    expect(service.assign).toHaveBeenCalledWith(42, ID, 3);
  });
});
