import { assertJwtSecretConfigured } from './assert-jwt-secret';

describe('assertJwtSecretConfigured (Prompt 13 / M4)', () => {
  it('não lança quando JWT_SECRET está definido e não vazio', () => {
    expect(() =>
      assertJwtSecretConfigured({
        JWT_SECRET: 'um-segredo-de-teste-qualquer',
      } as NodeJS.ProcessEnv),
    ).not.toThrow();
  });

  it('lança quando JWT_SECRET está ausente do ambiente', () => {
    expect(() => assertJwtSecretConfigured({} as NodeJS.ProcessEnv)).toThrow(
      /JWT_SECRET/,
    );
  });

  it('lança quando JWT_SECRET é uma string vazia', () => {
    expect(() =>
      assertJwtSecretConfigured({ JWT_SECRET: '' } as NodeJS.ProcessEnv),
    ).toThrow(/JWT_SECRET/);
  });

  it('lança quando JWT_SECRET contém apenas espaços em branco', () => {
    expect(() =>
      assertJwtSecretConfigured({ JWT_SECRET: '   ' } as NodeJS.ProcessEnv),
    ).toThrow(/JWT_SECRET/);
  });

  it('a mensagem de erro nunca inclui o valor do segredo', () => {
    const secretValue = 'valor-que-nunca-pode-aparecer-no-erro';
    try {
      assertJwtSecretConfigured({} as NodeJS.ProcessEnv);
      fail('deveria ter lançado');
    } catch (error) {
      expect((error as Error).message).not.toContain(secretValue);
    }
  });
});
