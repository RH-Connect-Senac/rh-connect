import { normalizeGmailEmail, normalizeLoginEmail } from './email-normalization';

describe('normalizeGmailEmail (cadastro)', () => {
  it('normaliza caixa alta para minúscula preservando pontos', () => {
    expect(normalizeGmailEmail('Lucas.Teste@Gmail.com')).toBe(
      'lucas.teste@gmail.com',
    );
  });

  it('preserva "+" na parte local, sem tratá-lo como equivalente ao e-mail base', () => {
    expect(normalizeGmailEmail('Lucas+Senac@Gmail.com')).toBe(
      'lucas+senac@gmail.com',
    );
  });

  it('aceita whitespace externo e normaliza da mesma forma', () => {
    expect(normalizeGmailEmail(' lucas+senac@gmail.com ')).toBe(
      'lucas+senac@gmail.com',
    );
  });

  it('rejeita domínio diferente de gmail.com', () => {
    expect(normalizeGmailEmail('usuario@outlook.com')).toBeNull();
  });

  it('rejeita um e-mail sintaticamente inválido', () => {
    expect(normalizeGmailEmail('a@@gmail.com')).toBeNull();
  });

  it('rejeita valores que não são string', () => {
    expect(normalizeGmailEmail(undefined)).toBeNull();
    expect(normalizeGmailEmail(123)).toBeNull();
  });
});

describe('normalizeLoginEmail', () => {
  it('normaliza caixa alta para minúscula', () => {
    expect(normalizeLoginEmail('USUARIO@GMAIL.COM')).toBe('usuario@gmail.com');
  });

  it('aceita whitespace externo e normaliza da mesma forma', () => {
    expect(normalizeLoginEmail('  usuario@gmail.com  ')).toBe(
      'usuario@gmail.com',
    );
  });

  it('preserva pontos na parte local de um e-mail Gmail', () => {
    expect(normalizeLoginEmail('usuario.teste@gmail.com')).toBe(
      'usuario.teste@gmail.com',
    );
  });

  it('preserva "+" na parte local, sem tratá-lo como equivalente ao e-mail base', () => {
    expect(normalizeLoginEmail('Lucas+Senac@Gmail.com')).toBe(
      'lucas+senac@gmail.com',
    );
  });

  it('não trata "usuario+tag@gmail.com" como equivalente a "usuario@gmail.com"', () => {
    expect(normalizeLoginEmail('usuario+tag@gmail.com')).toBe(
      'usuario+tag@gmail.com',
    );
    expect(normalizeLoginEmail('usuario+tag@gmail.com')).not.toBe(
      normalizeLoginEmail('usuario@gmail.com'),
    );
  });

  it('rejeita um e-mail de domínio hotmail.com', () => {
    expect(normalizeLoginEmail('usuario@hotmail.com')).toBeNull();
  });

  it('rejeita um e-mail de domínio rhconnect.com', () => {
    expect(normalizeLoginEmail('usuario@rhconnect.com')).toBeNull();
  });

  it('rejeita um e-mail sintaticamente inválido', () => {
    expect(normalizeLoginEmail('a@@gmail.com')).toBeNull();
  });

  it('rejeita valores que não são string', () => {
    expect(normalizeLoginEmail(undefined)).toBeNull();
    expect(normalizeLoginEmail(123)).toBeNull();
  });
});
