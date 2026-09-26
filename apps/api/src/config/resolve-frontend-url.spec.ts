import { resolveFrontendUrl } from './resolve-frontend-url';

describe('resolveFrontendUrl (Bloco 6)', () => {
  it('em produção, retorna o valor configurado quando FRONTEND_URL está definido', () => {
    expect(
      resolveFrontendUrl({
        NODE_ENV: 'production',
        FRONTEND_URL: 'https://rh-connect.example.com',
      } as NodeJS.ProcessEnv),
    ).toBe('https://rh-connect.example.com');
  });

  it('em produção, lança quando FRONTEND_URL está ausente', () => {
    expect(() =>
      resolveFrontendUrl({ NODE_ENV: 'production' } as NodeJS.ProcessEnv),
    ).toThrow(/FRONTEND_URL/);
  });

  it('em produção, lança quando FRONTEND_URL é uma string vazia', () => {
    expect(() =>
      resolveFrontendUrl({
        NODE_ENV: 'production',
        FRONTEND_URL: '',
      } as NodeJS.ProcessEnv),
    ).toThrow(/FRONTEND_URL/);
  });

  it('em produção, lança quando FRONTEND_URL contém apenas espaços em branco', () => {
    expect(() =>
      resolveFrontendUrl({
        NODE_ENV: 'production',
        FRONTEND_URL: '   ',
      } as NodeJS.ProcessEnv),
    ).toThrow(/FRONTEND_URL/);
  });

  it('fora de produção, usa o fallback de localhost quando FRONTEND_URL está ausente', () => {
    expect(
      resolveFrontendUrl({ NODE_ENV: 'development' } as NodeJS.ProcessEnv),
    ).toBe('http://localhost:5173');
  });

  it('fora de produção, usa o valor configurado quando FRONTEND_URL está definido', () => {
    expect(
      resolveFrontendUrl({
        NODE_ENV: 'development',
        FRONTEND_URL: 'http://localhost:4000',
      } as NodeJS.ProcessEnv),
    ).toBe('http://localhost:4000');
  });

  it('sem NODE_ENV definido (mesmo comportamento de "fora de produção"), usa o fallback de localhost', () => {
    expect(resolveFrontendUrl({} as NodeJS.ProcessEnv)).toBe(
      'http://localhost:5173',
    );
  });
});
