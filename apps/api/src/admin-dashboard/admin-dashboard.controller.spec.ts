import 'reflect-metadata';
import { ExecutionContext, RequestMethod } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// Ver comentário em admin-interviews.controller.spec.ts: o JwtAuthGuard real
// usa o build ESM do passport, que o Jest não transforma. O RolesGuard é o real.
jest.mock('../auth/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class JwtAuthGuard {},
}));

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminDashboardController } from './admin-dashboard.controller';
import type { AdminDashboardService } from './admin-dashboard.service';

const proto = AdminDashboardController.prototype;
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

describe('AdminDashboardController (rota e acesso)', () => {
  it('GET /admin/dashboard com JwtAuthGuard e RolesGuard na classe', () => {
    expect(Reflect.getMetadata('path', AdminDashboardController)).toBe(
      'admin/dashboard',
    );
    expect(
      Reflect.getMetadata('__guards__', AdminDashboardController),
    ).toEqual([JwtAuthGuard, RolesGuard]);
    expect(Reflect.getMetadata('method', proto.getDashboard)).toBe(
      RequestMethod.GET,
    );
    expect(Reflect.getMetadata('path', proto.getDashboard)).toBe('/');
  });

  it('@Roles("ADMIN") está no HANDLER (onde o RolesGuard lê) e só ADMIN passa', () => {
    expect(Reflect.getMetadata('roles', proto.getDashboard)).toEqual(['ADMIN']);
    expect(Reflect.getMetadata('roles', AdminDashboardController)).toBeUndefined();
    expect(guard.canActivate(contextFor(proto.getDashboard, 'ADMIN'))).toBe(true);
    expect(guard.canActivate(contextFor(proto.getDashboard, 'CANDIDATE'))).toBe(false);
    expect(guard.canActivate(contextFor(proto.getDashboard, 'EVALUATOR'))).toBe(false);
    expect(guard.canActivate(contextFor(proto.getDashboard, null))).toBe(false);
  });
});

describe('AdminDashboardController (delegação e contrato)', () => {
  const payload = {
    generatedAt: '2026-10-13T15:00:00.000Z',
    summary: {
      candidateCount: 1,
      activeEvaluatorCount: 3,
      pendingAssignmentCount: 0,
      averageScore: null,
      averageScoreSample: 0,
    },
    interviewsByMonth: [{ month: '2026-10', total: 0 }],
    recentActivity: [],
  };

  it('retorna a projeção do service sem receber body, query nem identidade', async () => {
    const service = { getDashboard: jest.fn().mockResolvedValue(payload) };
    const controller = new AdminDashboardController(
      service as unknown as AdminDashboardService,
    );

    await expect(controller.getDashboard()).resolves.toEqual(payload);
    expect(service.getDashboard).toHaveBeenCalledWith();
    expect(proto.getDashboard.length).toBe(0); // nenhum @Req/@Body/@Query
  });

  it('o contrato expõe exatamente as chaves aprovadas', async () => {
    const service = { getDashboard: jest.fn().mockResolvedValue(payload) };
    const result = await new AdminDashboardController(
      service as unknown as AdminDashboardService,
    ).getDashboard();

    expect(Object.keys(result).sort()).toEqual(
      ['generatedAt', 'interviewsByMonth', 'recentActivity', 'summary'].sort(),
    );
    expect(Object.keys(result.summary).sort()).toEqual(
      [
        'activeEvaluatorCount',
        'averageScore',
        'averageScoreSample',
        'candidateCount',
        'pendingAssignmentCount',
      ].sort(),
    );
  });
});
