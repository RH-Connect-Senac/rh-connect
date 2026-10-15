import { isAllowedJobUrl, JOB_URL_MAX_LENGTH } from './job-url';

describe('isAllowedJobUrl', () => {
  it.each([
    'https://www.empregare.com/pt-br/vaga-estagio-em-analise-e-desenvolvimento-de-_181565',
    'https://www.empregare.com/pt-br/vaga-secretaria-comercial-tres-lagoas-ms_178376',
    'https://empregare.com/pt-br/vaga-x_1',
    'https://empresa.empregare.com/vaga/1',
    'http://www.empregare.com/pt-br/vaga-x_1',
    'HTTPS://WWW.EMPREGARE.COM/pt-br/vaga-x_1',
    'https://www.empregare.com./pt-br/vaga-x_1',
    '  https://www.empregare.com/pt-br/vaga-x_1  ',
  ])('aceita %s', (url) => {
    expect(isAllowedJobUrl(url)).toBe(true);
  });

  it.each([
    ['localhost', 'http://localhost:3000/admin'],
    ['IP interno', 'http://127.0.0.1/vaga'],
    ['metadados de nuvem', 'http://169.254.169.254/latest/meta-data/'],
    ['rede privada', 'http://10.0.0.5/vaga'],
    ['outro domínio', 'https://example.com/vaga'],
    ['domínio com sufixo falso', 'https://empregare.com.evil.com/vaga'],
    ['domínio com prefixo falso', 'https://evilempregare.com/vaga'],
    ['credenciais na URL', 'https://user:pass@www.empregare.com/vaga'],
    [
      'credencial disfarçando o host',
      'https://www.empregare.com@evil.com/vaga',
    ],
    ['porta não padrão', 'https://www.empregare.com:8443/vaga'],
    ['barra invertida', 'https://evil.com\\@www.empregare.com/vaga'],
    [
      'barra invertida após o host',
      'https://www.empregare.com\\.evil.com/vaga',
    ],
    ['espaço interno', 'https://www.empregare.com/va ga'],
    ['quebra de linha', 'https://www.empregare.com/vaga\nhttps://evil.com'],
    ['protocolo ftp', 'ftp://www.empregare.com/vaga'],
    ['protocolo file', 'file:///etc/passwd'],
    ['javascript', 'javascript:alert(1)'],
    ['sem protocolo', 'www.empregare.com/vaga'],
    ['vazia', ''],
    ['só espaços', '   '],
  ])('rejeita %s', (_name, url) => {
    expect(isAllowedJobUrl(url)).toBe(false);
  });

  it('rejeita valores que não são texto', () => {
    expect(isAllowedJobUrl(undefined)).toBe(false);
    expect(isAllowedJobUrl(null)).toBe(false);
    expect(isAllowedJobUrl(123)).toBe(false);
    expect(isAllowedJobUrl({ url: 'https://www.empregare.com/x' })).toBe(false);
  });

  it('rejeita URL acima do limite', () => {
    const url = `https://www.empregare.com/${'a'.repeat(JOB_URL_MAX_LENGTH)}`;
    expect(isAllowedJobUrl(url)).toBe(false);
  });
});
