import { readFileSync } from 'fs';
import { join } from 'path';

// Guarda de segurança dos testes de integração com PostgreSQL real (R3.2.1-a).
//
// Regras: os testes de integração SÓ podem tocar o banco descartável
// `rhconnect_it`, com o usuário exclusivo `rhconnect_it_user`, em 127.0.0.1.
// Nada aqui lê o `.env` de desenvolvimento como fallback: a URL vem
// EXCLUSIVAMENTE de `INTEGRATION_DATABASE_URL`. O `.env` só é lido, quando
// existe, para COMPARAR e recusar uma URL igual à de desenvolvimento.
//
// Nenhuma mensagem de erro ou log produzido aqui contém a URL, a senha ou
// qualquer trecho da entrada recebida.

export const INTEGRATION_URL_VARIABLE = 'INTEGRATION_DATABASE_URL';
export const INTEGRATION_DB_NAME = 'rhconnect_it';
export const INTEGRATION_DB_USER = 'rhconnect_it_user';
export const INTEGRATION_DB_HOST = '127.0.0.1';
export const INTEGRATION_DB_PORT = '5432';
// Texto gravado manualmente como COMMENT do banco (ver a documentação).
export const INTEGRATION_DB_MARKER = 'rh-connect:integration-test:v1';

export type IntegrationGuardCode =
  | 'PRODUCTION_ENV'
  | 'MISSING_URL'
  | 'INVALID_URL'
  | 'INVALID_PROTOCOL'
  | 'INVALID_HOST'
  | 'INVALID_PORT'
  | 'INVALID_DATABASE'
  | 'INVALID_USER'
  | 'MISSING_PASSWORD'
  | 'UNSUPPORTED_PARAMETER'
  | 'SAME_AS_DEVELOPMENT'
  | 'DEV_ENV_UNREADABLE'
  | 'IDENTITY_CHECK_FAILED'
  | 'IDENTITY_MISMATCH'
  | 'MARKER_MISSING'
  | 'PRISMA_TARGET_MISMATCH'
  | 'PRISMA_TARGET_UNPROVEN'
  | 'MIGRATION_RESULT_UNPROVEN'
  | 'CONFLICTING_DATABASE_URL';

export class IntegrationGuardError extends Error {
  constructor(
    readonly code: IntegrationGuardCode,
    message: string,
  ) {
    super(message);
    this.name = 'IntegrationGuardError';
  }
}

function guardError(
  code: IntegrationGuardCode,
  message: string,
): IntegrationGuardError {
  return new IntegrationGuardError(code, message);
}

// Configuração já validada. A URL (com senha) fica privada: `toJSON`, `toString`
// e `util.inspect` devolvem só dados não sensíveis, para que um `console.log`
// ou serialização acidental nunca exponha a credencial.
export class GuardedIntegrationConfig {
  readonly database = INTEGRATION_DB_NAME;
  readonly user = INTEGRATION_DB_USER;
  readonly host = INTEGRATION_DB_HOST;
  readonly port = INTEGRATION_DB_PORT;

  constructor(private readonly connectionUrl: string) {}

  get url(): string {
    return this.connectionUrl;
  }

  toJSON(): Record<string, string> {
    return this.describe();
  }

  toString(): string {
    return `${this.user}@${this.host}:${this.port}/${this.database}`;
  }

  [Symbol.for('nodejs.util.inspect.custom')](): Record<string, string> {
    return this.describe();
  }

  private describe(): Record<string, string> {
    return {
      database: this.database,
      user: this.user,
      host: this.host,
      port: this.port,
    };
  }
}

// Parâmetros de query aceitos (e valores quando restritos). Qualquer outro
// (`host`, `hostaddr`, `dbname`, `user`, `options`, `service`...) poderia
// redirecionar a conexão e é recusado.
const ALLOWED_QUERY_PARAMETERS = new Map<string, (value: string) => boolean>([
  ['schema', (value) => value === 'public'],
  ['connection_limit', (value) => /^[1-9][0-9]?$/.test(value)],
  ['pool_timeout', (value) => /^[0-9]{1,3}$/.test(value)],
  ['connect_timeout', (value) => /^[0-9]{1,3}$/.test(value)],
  ['sslmode', (value) => ['disable', 'prefer', 'require'].includes(value)],
]);

interface ParsedUrl {
  protocol: string;
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
  query: [string, string][];
}

function parseConnectionUrl(raw: string): ParsedUrl | null {
  try {
    const url = new URL(raw);
    const path = url.pathname.startsWith('/')
      ? url.pathname.slice(1)
      : url.pathname;
    return {
      protocol: url.protocol,
      host: url.hostname,
      port: url.port,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: decodeURIComponent(path),
      query: Array.from(url.searchParams.entries()),
    };
  } catch {
    // Descarta o erro de propósito: a mensagem do parser pode ecoar a entrada.
    return null;
  }
}

const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '::1', '[::1]'];

function canonicalHost(host: string): string {
  return LOOPBACK_HOSTS.includes(host.toLowerCase())
    ? 'loopback'
    : host.toLowerCase();
}

// Duas URLs apontam para o mesmo banco quando são idênticas ou quando host
// (com todos os loopbacks equivalentes), porta e nome do banco coincidem.
export function pointsToSameDatabase(a: string, b: string): boolean {
  if (a.trim() === b.trim()) return true;
  const first = parseConnectionUrl(a.trim());
  const second = parseConnectionUrl(b.trim());
  if (!first || !second) return false;
  return (
    canonicalHost(first.host) === canonicalHost(second.host) &&
    (first.port || '5432') === (second.port || '5432') &&
    first.database === second.database
  );
}

// Valida o ambiente SEM tocar no banco. `developmentUrls` são as URLs de
// desenvolvimento conhecidas (DATABASE_URL do ambiente e do `.env`), usadas só
// para recusar coincidência.
export function assertIntegrationEnvironment(
  env: NodeJS.ProcessEnv,
  developmentUrls: readonly string[] = [],
): GuardedIntegrationConfig {
  if (env.NODE_ENV === 'production') {
    throw guardError(
      'PRODUCTION_ENV',
      'Testes de integração são proibidos com NODE_ENV=production.',
    );
  }

  const raw = env[INTEGRATION_URL_VARIABLE];
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw guardError(
      'MISSING_URL',
      `Defina ${INTEGRATION_URL_VARIABLE} explicitamente (não há fallback para o .env de desenvolvimento).`,
    );
  }
  const value = raw.trim();

  const parsed = parseConnectionUrl(value);
  if (!parsed) {
    throw guardError(
      'INVALID_URL',
      `${INTEGRATION_URL_VARIABLE} não é uma URL de conexão válida.`,
    );
  }
  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
    throw guardError(
      'INVALID_PROTOCOL',
      `${INTEGRATION_URL_VARIABLE} deve usar o protocolo postgresql://.`,
    );
  }
  if (parsed.host !== INTEGRATION_DB_HOST) {
    throw guardError(
      'INVALID_HOST',
      `O host do banco de integração deve ser exatamente ${INTEGRATION_DB_HOST}.`,
    );
  }
  if (parsed.port !== '' && parsed.port !== INTEGRATION_DB_PORT) {
    throw guardError(
      'INVALID_PORT',
      `A porta do banco de integração deve ser ${INTEGRATION_DB_PORT}.`,
    );
  }
  if (parsed.database !== INTEGRATION_DB_NAME) {
    throw guardError(
      'INVALID_DATABASE',
      `O banco de integração deve se chamar exatamente ${INTEGRATION_DB_NAME}.`,
    );
  }
  if (parsed.user !== INTEGRATION_DB_USER) {
    throw guardError(
      'INVALID_USER',
      `O usuário do banco de integração deve ser exatamente ${INTEGRATION_DB_USER}.`,
    );
  }
  if (parsed.password === '') {
    throw guardError(
      'MISSING_PASSWORD',
      `${INTEGRATION_URL_VARIABLE} precisa conter a senha do usuário de integração.`,
    );
  }
  for (const [name, parameterValue] of parsed.query) {
    const isValid = ALLOWED_QUERY_PARAMETERS.get(name);
    if (!isValid || !isValid(parameterValue)) {
      throw guardError(
        'UNSUPPORTED_PARAMETER',
        `A URL de integração contém um parâmetro de query não permitido (${ALLOWED_QUERY_PARAMETERS.has(name) ? name : 'desconhecido'}).`,
      );
    }
  }
  for (const developmentUrl of developmentUrls) {
    if (pointsToSameDatabase(value, developmentUrl)) {
      throw guardError(
        'SAME_AS_DEVELOPMENT',
        'A URL de integração aponta para o mesmo banco da URL de desenvolvimento.',
      );
    }
  }

  return new GuardedIntegrationConfig(value);
}

// Reconhece "arquivo inexistente" olhando o `code` do erro, sem `instanceof
// Error`: dentro do Jest (vm context) os erros do módulo `fs` vêm de outro
// realm e `instanceof Error` seria falso, tratando um arquivo ausente como
// ilegível. Só `ENOENT` conta; qualquer outro código continua bloqueando.
export function isFileNotFoundError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  return (error as { code?: unknown }).code === 'ENOENT';
}

// Lê a DATABASE_URL de `apps/api/.env` SOMENTE para comparação. Ausência do
// arquivo é normal; qualquer outra falha de leitura é recusada (silenciar
// enfraqueceria a proteção).
export function readEnvFileDatabaseUrl(envFilePath: string): string | null {
  let content: string;
  try {
    content = readFileSync(envFilePath, 'utf8');
  } catch (error) {
    if (isFileNotFoundError(error)) return null;
    throw guardError(
      'DEV_ENV_UNREADABLE',
      'Não foi possível ler o .env de desenvolvimento para comparação.',
    );
  }
  for (const line of content.split(/\r?\n/)) {
    const match = /^\s*DATABASE_URL\s*=\s*(.*)$/.exec(line);
    if (match) {
      const found = match[1].trim().replace(/^(['"])(.*)\1$/, '$2');
      return found === '' ? null : found;
    }
  }
  return null;
}

export const DEFAULT_DEV_ENV_FILE = join(__dirname, '..', '..', '..', '.env');

export interface DevelopmentUrlOptions {
  envFilePath?: string;
  // Usado pelo setup por arquivo de teste, que já substituiu DATABASE_URL pela
  // URL de integração (a checagem estrita já ocorreu no globalSetup).
  ignoreEnvDatabaseUrl?: boolean;
}

export function collectDevelopmentUrls(
  env: NodeJS.ProcessEnv,
  options: DevelopmentUrlOptions = {},
): string[] {
  const urls: string[] = [];
  const fromEnv = env.DATABASE_URL;
  if (
    !options.ignoreEnvDatabaseUrl &&
    typeof fromEnv === 'string' &&
    fromEnv.trim() !== ''
  ) {
    urls.push(fromEnv.trim());
  }
  const fromFile = readEnvFileDatabaseUrl(
    options.envFilePath ?? DEFAULT_DEV_ENV_FILE,
  );
  if (fromFile) urls.push(fromFile);
  return urls;
}

// Cliente mínimo exigido para a verificação de identidade (o PrismaClient
// satisfaz esta forma). Só executa UMA consulta de leitura.
export interface IdentityQueryClient {
  $queryRaw(query: TemplateStringsArray): Promise<unknown>;
}

function readString(row: unknown, key: string): string | null {
  if (typeof row !== 'object' || row === null) return null;
  const value: unknown = (row as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : null;
}

// Confirma, com uma consulta exclusivamente de leitura, que a conexão aberta é
// MESMO o banco de integração: nome, usuário e marcador gravado no banco.
// Deve rodar antes de qualquer migration ou escrita.
export async function verifyDatabaseIdentity(
  client: IdentityQueryClient,
): Promise<void> {
  let rows: unknown;
  try {
    rows =
      await client.$queryRaw`SELECT current_database() AS database_name, current_user AS user_name, shobj_description(d.oid, 'pg_database') AS marker FROM pg_database d WHERE d.datname = current_database()`;
  } catch {
    // Descarta o erro original (pode conter detalhes da conexão).
    throw guardError(
      'IDENTITY_CHECK_FAILED',
      'Não foi possível consultar a identidade do banco de integração.',
    );
  }
  const row: unknown = Array.isArray(rows) ? (rows as unknown[])[0] : null;
  const database = readString(row, 'database_name');
  const user = readString(row, 'user_name');
  const marker = readString(row, 'marker');

  if (database !== INTEGRATION_DB_NAME || user !== INTEGRATION_DB_USER) {
    throw guardError(
      'IDENTITY_MISMATCH',
      'A conexão não é o banco/usuário de integração esperados.',
    );
  }
  if (marker !== INTEGRATION_DB_MARKER) {
    throw guardError(
      'MARKER_MISSING',
      'O banco não possui o marcador de identidade de integração (COMMENT ON DATABASE).',
    );
  }
}
