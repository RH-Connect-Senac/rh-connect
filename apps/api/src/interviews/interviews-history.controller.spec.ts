import 'reflect-metadata';
import {
  ConflictException,
  ExecutionContext,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// O JwtAuthGuard real herda de `AuthGuard('jwt')` (@nestjs/passport), cujo
// build ESM o Jest não transforma. Aqui ele é substituído por uma classe
// vazia APENAS neste teste; o RolesGuard e o controller continuam reais.
jest.mock('../auth/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class JwtAuthGuard {},
}));

import { RolesGuard } from '../auth/guards/roles.guard';
import type { PrismaService } from '../prisma/prisma.service';
import { InterviewsController } from './interviews.controller';
import type { MaterialRecommendationResultService } from '../material-recommendation-snapshots/material-recommendation-result.service';
import { InterviewsService } from './interviews.service';

// Montagem das recomendações é testada à parte; aqui só importa que o controller a receba.
const materials = { listForInterview: jest.fn().mockResolvedValue([]) };

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
      materials as unknown as MaterialRecommendationResultService,
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

  it('getResult consulta com o id do JWT e o id da rota e acrescenta as recomendações', async () => {
    const result = { interview: { id: 'abc' } };
    const recommendations = [{ position: 1, title: 'Material' }];
    const service = { getResult: jest.fn().mockResolvedValue(result) };
    const materialsFake = {
      listForInterview: jest.fn().mockResolvedValue(recommendations),
    };
    const controller = new InterviewsController(
      service as unknown as InterviewsService,
      materialsFake as unknown as MaterialRecommendationResultService,
    );
    const req = { user: { id: 7, role: 'CANDIDATE' } } as never;

    await expect(controller.getResult(req, 'abc')).resolves.toEqual({
      interview: { id: 'abc' },
      materialRecommendations: recommendations,
    });
    expect(service.getResult).toHaveBeenCalledWith(7, 'abc');
    expect(materialsFake.listForInterview).toHaveBeenCalledWith('abc');
    // O objeto original do service não é mutado (campo aditivo no retorno).
    expect(result).toEqual({ interview: { id: 'abc' } });
  });

  it('só monta as recomendações DEPOIS de a autorização do resultado passar (404/409 propagam)', async () => {
    for (const failure of [
      new NotFoundException('Entrevista não encontrada.'),
      new ConflictException('INTERVIEW_RESULT_NOT_AVAILABLE'),
    ]) {
      const service = { getResult: jest.fn().mockRejectedValue(failure) };
      const materialsFake = { listForInterview: jest.fn() };
      const controller = new InterviewsController(
        service as unknown as InterviewsService,
        materialsFake as unknown as MaterialRecommendationResultService,
      );
      const req = { user: { id: 7, role: 'CANDIDATE' } } as never;

      await expect(controller.getResult(req, 'abc')).rejects.toBe(failure);
      expect(materialsFake.listForInterview).not.toHaveBeenCalled();
    }
  });

  it('entrevista de IA concluída (resultado indisponível, 409) nunca gera recomendações', async () => {
    const prisma = {
      interview: {
        findFirst: jest.fn().mockResolvedValue({
          interview_id: 'abc',
          status: 'COMPLETED',
          evaluation_mode: 'AI',
          evaluation: { status: 'COMPLETED' },
        }),
      },
    };
    const materialsFake = { listForInterview: jest.fn() };
    const controller = new InterviewsController(
      new InterviewsService(prisma as unknown as PrismaService),
      materialsFake as unknown as MaterialRecommendationResultService,
    );
    const req = { user: { id: 7, role: 'CANDIDATE' } } as never;

    await expect(controller.getResult(req, 'abc')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(materialsFake.listForInterview).not.toHaveBeenCalled();
  });

  it('HUMAN ainda não concluída (ASSIGNED) mantém o 409 atual e não gera nada', async () => {
    const prisma = {
      interview: {
        findFirst: jest.fn().mockResolvedValue({
          interview_id: 'abc',
          status: 'ASSIGNED',
          evaluation_mode: 'HUMAN',
          evaluation: { status: 'DRAFT' },
        }),
      },
    };
    const materialsFake = { listForInterview: jest.fn() };
    const controller = new InterviewsController(
      new InterviewsService(prisma as unknown as PrismaService),
      materialsFake as unknown as MaterialRecommendationResultService,
    );
    const req = { user: { id: 7, role: 'CANDIDATE' } } as never;

    await expect(controller.getResult(req, 'abc')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(materialsFake.listForInterview).not.toHaveBeenCalled();
  });

  it('a falha de outro candidato (404 por ownership no WHERE) preserva o isolamento', async () => {
    const prisma = { interview: { findFirst: jest.fn().mockResolvedValue(null) } };
    const materialsFake = { listForInterview: jest.fn() };
    const controller = new InterviewsController(
      new InterviewsService(prisma as unknown as PrismaService),
      materialsFake as unknown as MaterialRecommendationResultService,
    );
    const req = { user: { id: 8, role: 'CANDIDATE' } } as never;

    await expect(controller.getResult(req, 'abc')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.interview.findFirst.mock.calls[0][0].where).toEqual({
      interview_id: 'abc',
      candidate_user_id: 8,
    });
    expect(materialsFake.listForInterview).not.toHaveBeenCalled();
  });
});
