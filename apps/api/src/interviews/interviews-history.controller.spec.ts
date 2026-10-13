import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// O JwtAuthGuard real herda de `AuthGuard('jwt')` (@nestjs/passport), cujo
// build ESM o Jest não transforma. Aqui ele é substituído por uma classe
// vazia APENAS neste teste; o RolesGuard e o controller continuam reais.
jest.mock('../auth/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class JwtAuthGuard {},
}));

import { RolesGuard } from '../auth/guards/roles.guard';
import { InterviewsController } from './interviews.controller';
import type { InterviewsService } from './interviews.service';

const list = InterviewsController.prototype.list;
const getResult = InterviewsController.prototype.getResult;
const getById = InterviewsController.prototype.getById;
const listInProgress = InterviewsController.prototype.listInProgress;
const guard = new RolesGuard(new Reflector());

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

// 6A.1: rotas de leitura do candidato (histórico e resultado).
describe('InterviewsController (6A.1: histórico e resultado)', () => {
  it('rotas: GET /interviews e GET /interviews/:id/result', () => {
    expect(Reflect.getMetadata('method', list)).toBe(0); // GET
    expect(['/', '']).toContain(Reflect.getMetadata('path', list));
    expect(Reflect.getMetadata('method', getResult)).toBe(0); // GET
    expect(Reflect.getMetadata('path', getResult)).toBe(':id/result');
  });

  it('as rotas anteriores continuam as mesmas (in-progress e :id)', () => {
    expect(Reflect.getMetadata('path', listInProgress)).toBe('in-progress');
    expect(Reflect.getMetadata('path', getById)).toBe(':id');
    expect(Reflect.getMetadata('method', getById)).toBe(0);
  });

  it.each([
    ['list', list],
    ['getResult', getResult],
  ])('%s exige exclusivamente CANDIDATE', (_name, handler) => {
    expect(Reflect.getMetadata('roles', handler)).toEqual(['CANDIDATE']);
    expect(guard.canActivate(contextFor(handler, 'CANDIDATE'))).toBe(true);
    expect(guard.canActivate(contextFor(handler, 'ADMIN'))).toBe(false);
    expect(guard.canActivate(contextFor(handler, 'EVALUATOR'))).toBe(false);
    expect(guard.canActivate(contextFor(handler, null))).toBe(false);
  });

  it('list usa o id do JWT como dono; não recebe nenhum candidateId do cliente', async () => {
    const listed = { total: 0, interviews: [] };
    const service = { listHistory: jest.fn().mockResolvedValue(listed) };
    const controller = new InterviewsController(
      service as unknown as InterviewsService,
    );
    // mesmo que o cliente mande candidateId na query/corpo, o handler só lê o JWT.
    const req = {
      user: { id: 7, role: 'CANDIDATE' },
      query: { candidateId: '999' },
    } as never;

    await expect(controller.list(req)).resolves.toBe(listed);
    expect(service.listHistory).toHaveBeenCalledWith(7);
    expect(list.length).toBe(1);
  });

  it('getResult consulta com o id do JWT e o id da rota', async () => {
    const result = { interview: { id: 'abc' } };
    const service = { getResult: jest.fn().mockResolvedValue(result) };
    const controller = new InterviewsController(
      service as unknown as InterviewsService,
    );
    const req = { user: { id: 7, role: 'CANDIDATE' } } as never;

    await expect(controller.getResult(req, 'abc')).resolves.toBe(result);
    expect(service.getResult).toHaveBeenCalledWith(7, 'abc');
  });
});
