import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// O JwtAuthGuard real herda de `AuthGuard('jwt')` (@nestjs/passport), cujo
// build ESM o Jest não transforma. Aqui ele é substituído por uma classe
// vazia APENAS neste teste; o RolesGuard (que decide ADMIN x demais) e o
// controller continuam reais. O jest.mock é içado para antes dos imports.
jest.mock('../auth/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class JwtAuthGuard {},
}));

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminCandidatesController } from './admin-candidates.controller';
import type { AdminCandidatesService } from './admin-candidates.service';

describe('AdminCandidatesController — GET :id/profile', () => {
  const handler = AdminCandidatesController.prototype.getProfile;
  const guard = new RolesGuard(new Reflector());

  function contextFor(role: string | null): ExecutionContext {
    return {
      getHandler: () => handler,
      switchToHttp: () => ({
        getRequest: () => ({ user: role ? { id: 1, role } : undefined }),
      }),
    } as unknown as ExecutionContext;
  }

  it('é declarada como GET :id/profile (rota própria do Admin)', () => {
    expect(Reflect.getMetadata('path', handler)).toBe(':id/profile');
    expect(Reflect.getMetadata('method', handler)).toBe(0); // RequestMethod.GET
    expect(Reflect.getMetadata('path', AdminCandidatesController)).toBe(
      'admin/candidates',
    );
  });

  it('o controller usa JwtAuthGuard e RolesGuard', () => {
    expect(Reflect.getMetadata('__guards__', AdminCandidatesController)).toEqual(
      [JwtAuthGuard, RolesGuard],
    );
  });

  it('exige exclusivamente a role ADMIN', () => {
    expect(Reflect.getMetadata('roles', handler)).toEqual(['ADMIN']);
  });

  it('permite ADMIN', () => {
    expect(guard.canActivate(contextFor('ADMIN'))).toBe(true);
  });

  it('nega CANDIDATE (403)', () => {
    expect(guard.canActivate(contextFor('CANDIDATE'))).toBe(false);
  });

  it('nega EVALUATOR (403)', () => {
    expect(guard.canActivate(contextFor('EVALUATOR'))).toBe(false);
  });

  it('delega ao service com o id da rota e devolve o perfil', async () => {
    const profile = { professionalTitle: 'Dev', isComplete: false };
    const service = { getProfile: jest.fn().mockResolvedValue(profile) };
    const controller = new AdminCandidatesController(
      service as unknown as AdminCandidatesService,
    );

    await expect(controller.getProfile(7)).resolves.toBe(profile);
    expect(service.getProfile).toHaveBeenCalledWith(7);
  });

  it('não expõe nenhuma rota de escrita no controller', () => {
    const names = Object.getOwnPropertyNames(
      AdminCandidatesController.prototype,
    ).filter((name) => name !== 'constructor');

    for (const name of names) {
      const fn = (AdminCandidatesController.prototype as any)[name];
      expect(Reflect.getMetadata('method', fn)).toBe(0); // somente GET
    }
  });
});
