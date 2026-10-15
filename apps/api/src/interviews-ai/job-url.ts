import { ValidationOptions, registerDecorator } from 'class-validator';

// O serviço Python baixa a URL recebida (seguindo redirecionamentos). Sem
// restrição, qualquer usuário autenticado faria a VPS acessar endereços
// arbitrários (localhost, rede interna, metadados de nuvem: SSRF). O extrator é
// específico da Empregare, então só aceitamos links dela.
export const ALLOWED_JOB_URL_HOSTS = ['empregare.com'] as const;
export const JOB_URL_MAX_LENGTH = 2048;

export const JOB_URL_MESSAGE = 'Informe o link de uma vaga da Empregare.';

// Barra caracteres que parsers diferentes (WHATWG x urllib3/requests) leem de
// formas distintas, como a barra invertida, e qualquer espaço/controle interno.
// Os caracteres de controle são checados por código (e não por regex) para não
// violar a regra `no-control-regex` do ESLint.
const UNSAFE_URL_CHARS = /[\s\\]/;

function hasControlChars(text: string): boolean {
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

export function isAllowedJobUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const raw = value.trim();
  if (raw.length === 0 || raw.length > JOB_URL_MAX_LENGTH) return false;
  if (UNSAFE_URL_CHARS.test(raw) || hasControlChars(raw)) return false;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  if (url.username || url.password) return false;
  // `port` é vazio quando é a porta padrão do protocolo.
  if (url.port !== '') return false;

  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  return ALLOWED_JOB_URL_HOSTS.some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`),
  );
}

export function IsAllowedJobUrl(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isAllowedJobUrl',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate: (value: unknown) => isAllowedJobUrl(value),
        defaultMessage: () => JOB_URL_MESSAGE,
      },
    });
  };
}
