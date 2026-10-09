import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// O JwtAuthGuard real herda de `AuthGuard('jwt')` (@nestjs/passport), cujo
// build ESM o Jest não transforma. Aqui ele é substituído por uma classe
// vazia APENAS neste teste; o RolesGuard e o controller continuam reais.
jest.mock('../auth/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class JwtAuthGuard {},
}));

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { InterviewsController } from './interviews.controller';
import type { InterviewsService } from './interviews.service';
import type { CreateInterviewDto } from './dto/create-interview.dto';

const create = InterviewsController.prototype.create;
const getById = InterviewsController.prototype.getById;
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

describe('InterviewsController', () => {
  it('rotas: POST /interviews e GET /interviews/:id', () => {
    expect(Reflect.getMetadata('path', InterviewsController)).toBe(
      'interviews',
    );
    expect(Reflect.getMetadata('method', create)).toBe(1); // POST
    expect(Reflect.getMetadata('method', getById)).toBe(0); // GET
    expect(Reflect.getMetadata('path', getById)).toBe(':id');
  });

  it('usa JwtAuthGuard e RolesGuard', () => {
    expect(Reflect.getMetadata('__guards__', InterviewsController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
  });

  it.each([
    ['create', create],
    ['getById', getById],
  ])('%s exige exclusivamente CANDIDATE', (_name, handler) => {
    expect(Reflect.getMetadata('roles', handler)).toEqual(['CANDIDATE']);
    expect(guard.canActivate(contextFor(handler, 'CANDIDATE'))).toBe(true);
    expect(guard.canActivate(contextFor(handler, 'ADMIN'))).toBe(false);
    expect(guard.canActivate(contextFor(handler, 'EVALUATOR'))).toBe(false);
    expect(guard.canActivate(contextFor(handler, null))).toBe(false);
  });

  it('create usa o id do JWT como dono, nunca o corpo', async () => {
    const created = { id: 'abc' };
    const service = { create: jest.fn().mockResolvedValue(created) };
    const controller = new InterviewsController(
      service as unknown as InterviewsService,
    );
    const body = {
      sourceUrl: 'https://x.test/1',
      title: 'Dev',
      candidateId: 999,
    } as unknown as CreateInterviewDto;

    const req = { user: { id: 7, role: 'CANDIDATE' } } as never;
    await expect(controller.create(req, body)).resolves.toBe(created);
    expect(service.create).toHaveBeenCalledWith(7, body);
  });

  it('getById consulta com o id do JWT', async () => {
    const found = { id: 'abc' };
    const service = { getOwned: jest.fn().mockResolvedValue(found) };
    const controller = new InterviewsController(
      service as unknown as InterviewsService,
    );
    const req = { user: { id: 7, role: 'CANDIDATE' } } as never;

    await expect(controller.getById(req, 'abc')).resolves.toBe(found);
    expect(service.getOwned).toHaveBeenCalledWith(7, 'abc');
  });
});
