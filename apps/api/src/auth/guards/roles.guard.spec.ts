import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { get: jest.Mock };

  function createContext(userRole: string): ExecutionContext {
    return {
      getHandler: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: userRole } }),
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    reflector = { get: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('deve permitir acesso se a rota não exigir nenhuma role', () => {
    reflector.get.mockReturnValue(undefined);

    const result = guard.canActivate(createContext('CANDIDATE'));

    expect(result).toBe(true);
  });

  it('deve permitir acesso se a role do usuário estiver na lista exigida', () => {
    reflector.get.mockReturnValue(['ADMIN', 'EVALUATOR']);

    const result = guard.canActivate(createContext('ADMIN'));

    expect(result).toBe(true);
  });

  it('deve negar acesso se a role do usuário não estiver na lista exigida', () => {
    reflector.get.mockReturnValue(['ADMIN']);

    const result = guard.canActivate(createContext('CANDIDATE'));

    expect(result).toBe(false);
  });
});
