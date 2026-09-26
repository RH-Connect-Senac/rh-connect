import { shouldEnableSwagger } from './should-enable-swagger';

describe('shouldEnableSwagger (Bloco 6)', () => {
  it('habilita quando ENABLE_SWAGGER é exatamente "true"', () => {
    expect(
      shouldEnableSwagger({ ENABLE_SWAGGER: 'true' } as NodeJS.ProcessEnv),
    ).toBe(true);
  });

  it('não habilita quando ENABLE_SWAGGER está ausente', () => {
    expect(shouldEnableSwagger({} as NodeJS.ProcessEnv)).toBe(false);
  });

  it('não habilita quando ENABLE_SWAGGER é "false"', () => {
    expect(
      shouldEnableSwagger({ ENABLE_SWAGGER: 'false' } as NodeJS.ProcessEnv),
    ).toBe(false);
  });

  it('não habilita para variações do valor (case-sensitive, sem equivalentes)', () => {
    expect(
      shouldEnableSwagger({ ENABLE_SWAGGER: 'TRUE' } as NodeJS.ProcessEnv),
    ).toBe(false);
    expect(
      shouldEnableSwagger({ ENABLE_SWAGGER: '1' } as NodeJS.ProcessEnv),
    ).toBe(false);
  });

  it('não habilita com base apenas em NODE_ENV, mesmo em desenvolvimento', () => {
    expect(
      shouldEnableSwagger({ NODE_ENV: 'development' } as NodeJS.ProcessEnv),
    ).toBe(false);
  });
});
