import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// O JwtAuthGuard real herda de `AuthGuard('jwt')` (@nestjs/passport), cujo
// build ESM o Jest não transforma; substituído por uma classe vazia APENAS aqui.
jest.mock('../auth/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class JwtAuthGuard {},
}));

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MaterialConsolidatedRecommendationsController } from './material-consolidated-recommendations.controller';
import type { MaterialConsolidatedRecommendationsService } from './material-consolidated-recommendations.service';

const list = MaterialConsolidatedRecommendationsController.prototype.list;
const guard = new RolesGuard(new Reflector());

function contextFor(role: string | null): ExecutionContext {
  return {
    getHandler: () => list,
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { id: 1, role } : undefined }),
    }),
  } as unknown as ExecutionContext;
}

describe('MaterialConsolidatedRecommendationsController', () => {
  it('rota: GET /candidate/materials/recommendations (namespace de materiais do candidato)', () => {
    expect(Reflect.getMetadata('path', MaterialConsolidatedRecommendationsController)).toBe(
      'candidate/materials/recommendations',
    );
    expect(Reflect.getMetadata('method', list)).toBe(0); // GET
    expect(Reflect.getMetadata('path', list)).toBe('/');
  });

  it('só leitura: nenhum handler de escrita', () => {
    const methods = Object.getOwnPropertyNames(MaterialConsolidatedRecommendationsController.prototype).filter(
      (name) => name !== 'constructor',
    );
    expect(methods).toEqual(['list']);
  });

  it('usa JwtAuthGuard e RolesGuard e exige exclusivamente CANDIDATE', () => {
    expect(Reflect.getMetadata('__guards__', MaterialConsolidatedRecommendationsController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
    expect(Reflect.getMetadata('roles', list)).toEqual(['CANDIDATE']);
    expect(guard.canActivate(contextFor('CANDIDATE'))).toBe(true);
    expect(guard.canActivate(contextFor('ADMIN'))).toBe(false);
    expect(guard.canActivate(contextFor('EVALUATOR'))).toBe(false);
    expect(guard.canActivate(contextFor(null))).toBe(false);
  });

  it('U. não aceita candidateId do cliente: o handler só recebe a requisição (sem param/query/body)', () => {
    const args = Reflect.getMetadata('__routeArguments__', MaterialConsolidatedRecommendationsController, 'list') as Record<string, unknown>;
    // RouteParamtypes.REQUEST === 0; qualquer outro tipo (param/query/body) reprovaria
    expect(Object.keys(args).every((key) => key.startsWith('0:'))).toBe(true);
    expect(list.length).toBe(1);
  });

  it('U. consolida com o id do JWT, ignorando qualquer candidateId enviado', async () => {
    const payload = { recommendations: [] };
    const service = { listForCandidate: jest.fn().mockResolvedValue(payload) };
    const controller = new MaterialConsolidatedRecommendationsController(
      service as unknown as MaterialConsolidatedRecommendationsService,
    );
    const req = {
      user: { id: 7, role: 'CANDIDATE' },
      query: { candidateId: '999' },
      body: { candidateId: 999 },
      params: { candidateId: '999' },
    } as never;

    await expect(controller.list(req)).resolves.toBe(payload);
    expect(service.listForCandidate).toHaveBeenCalledTimes(1);
    expect(service.listForCandidate).toHaveBeenCalledWith(7);
  });
});
