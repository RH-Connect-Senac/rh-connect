import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { inspect } from 'util';
import { runInNewContext } from 'vm';

import {
  assertIntegrationEnvironment,
  collectDevelopmentUrls,
  GuardedIntegrationConfig,
  INTEGRATION_DB_MARKER,
  IntegrationGuardError,
  pointsToSameDatabase,
  isFileNotFoundError,
  readEnvFileDatabaseUrl,
  verifyDatabaseIdentity,
  type IdentityQueryClient,
  type IntegrationGuardCode,
} from './integration-db-guard';
import { CONFIRM_FLAG, hasExplicitConfirmation } from './integration-migrate';

// Testes UNITÁRIOS da infraestrutura de integração. Não usam banco.

const SECRET = 'S3gr3d0-Unico-Do-Teste';
const VALID_URL = `postgresql://rhconnect_it_user:${SECRET}@127.0.0.1:5432/rhconnect_it?schema=public`;
const DEV_URL =
  'postgresql://dev_user:outra-senha@localhost:5432/rhconnect_dev';

function envWith(url: string | undefined, extra: NodeJS.ProcessEnv = {}) {
  return url === undefined
    ? { ...extra }
    : { INTEGRATION_DATABASE_URL: url, ...extra };
}

function guardCode(action: () => unknown): {
  code: IntegrationGuardCode;
  message: string;
} {
  try {
    action();
  } catch (error) {
    if (error instanceof IntegrationGuardError) {
      return { code: error.code, message: error.message };
    }
    throw error;
  }
  throw new Error('Esperava IntegrationGuardError');
}

describe('assertIntegrationEnvironment', () => {
  it('aceita exatamente 127.0.0.1:5432, rhconnect_it e rhconnect_it_user', () => {
    const config = assertIntegrationEnvironment(envWith(VALID_URL));
    expect(config.url).toBe(VALID_URL);
    expect(config.toString()).toBe(
      'rhconnect_it_user@127.0.0.1:5432/rhconnect_it',
    );
  });

  it('aceita porta omitida e parâmetros permitidos', () => {
    const url = `postgres://rhconnect_it_user:${SECRET}@127.0.0.1/rhconnect_it?schema=public&connection_limit=10&pool_timeout=20&connect_timeout=5&sslmode=disable`;
    expect(() => assertIntegrationEnvironment(envWith(url))).not.toThrow();
  });

  it('a configuração nunca expõe a senha em JSON, string ou inspect', () => {
    const config = assertIntegrationEnvironment(envWith(VALID_URL));
    expect(JSON.stringify(config)).not.toContain(SECRET);
    expect(String(config)).not.toContain(SECRET);
    expect(inspect(config)).not.toContain(SECRET);
    expect(`${JSON.stringify({ config })}`).not.toContain(SECRET);
    expect(config).toBeInstanceOf(GuardedIntegrationConfig);
  });

  const rejected: [string, string | undefined, IntegrationGuardCode][] = [
    ['ausente', undefined, 'MISSING_URL'],
    ['vazia', '', 'MISSING_URL'],
    ['só espaços', '   ', 'MISSING_URL'],
    ['texto que não é URL', 'isso nao e uma url', 'INVALID_URL'],
    [
      'protocolo mysql',
      `mysql://rhconnect_it_user:${SECRET}@127.0.0.1:5432/rhconnect_it`,
      'INVALID_PROTOCOL',
    ],
    [
      'host localhost',
      `postgresql://rhconnect_it_user:${SECRET}@localhost:5432/rhconnect_it`,
      'INVALID_HOST',
    ],
    [
      'host 127.0.0.2',
      `postgresql://rhconnect_it_user:${SECRET}@127.0.0.2:5432/rhconnect_it`,
      'INVALID_HOST',
    ],
    [
      'host 0.0.0.0',
      `postgresql://rhconnect_it_user:${SECRET}@0.0.0.0:5432/rhconnect_it`,
      'INVALID_HOST',
    ],
    [
      'host IPv6 loopback',
      `postgresql://rhconnect_it_user:${SECRET}@[::1]:5432/rhconnect_it`,
      'INVALID_HOST',
    ],
    [
      'host remoto',
      `postgresql://rhconnect_it_user:${SECRET}@db.exemplo.com:5432/rhconnect_it`,
      'INVALID_HOST',
    ],
    [
      'vários hosts',
      `postgresql://rhconnect_it_user:${SECRET}@127.0.0.1:5432,db.exemplo.com:5432/rhconnect_it`,
      'INVALID_URL',
    ],
    [
      'porta 5433',
      `postgresql://rhconnect_it_user:${SECRET}@127.0.0.1:5433/rhconnect_it`,
      'INVALID_PORT',
    ],
    [
      'banco de desenvolvimento',
      `postgresql://rhconnect_it_user:${SECRET}@127.0.0.1:5432/rhconnect_dev`,
      'INVALID_DATABASE',
    ],
    [
      'banco com sufixo extra',
      `postgresql://rhconnect_it_user:${SECRET}@127.0.0.1:5432/rhconnect_it2`,
      'INVALID_DATABASE',
    ],
    [
      'banco em maiúsculas',
      `postgresql://rhconnect_it_user:${SECRET}@127.0.0.1:5432/RHCONNECT_IT`,
      'INVALID_DATABASE',
    ],
    [
      'banco ausente',
      `postgresql://rhconnect_it_user:${SECRET}@127.0.0.1:5432`,
      'INVALID_DATABASE',
    ],
    [
      'usuário postgres',
      `postgresql://postgres:${SECRET}@127.0.0.1:5432/rhconnect_it`,
      'INVALID_USER',
    ],
    [
      'usuário com sufixo',
      `postgresql://rhconnect_it_user2:${SECRET}@127.0.0.1:5432/rhconnect_it`,
      'INVALID_USER',
    ],
    [
      'sem senha',
      'postgresql://rhconnect_it_user@127.0.0.1:5432/rhconnect_it',
      'MISSING_PASSWORD',
    ],
    [
      'parâmetro host',
      `${VALID_URL}&host=%2Fvar%2Frun%2Fpostgresql`,
      'UNSUPPORTED_PARAMETER',
    ],
    [
      'parâmetro dbname',
      `${VALID_URL}&dbname=rhconnect_dev`,
      'UNSUPPORTED_PARAMETER',
    ],
    ['parâmetro user', `${VALID_URL}&user=postgres`, 'UNSUPPORTED_PARAMETER'],
    [
      'parâmetro options',
      `${VALID_URL}&options=-csearch_path%3Dother`,
      'UNSUPPORTED_PARAMETER',
    ],
    [
      'parâmetro herdado de Object',
      `${VALID_URL}&constructor=1`,
      'UNSUPPORTED_PARAMETER',
    ],
    [
      'schema diferente de public',
      `postgresql://rhconnect_it_user:${SECRET}@127.0.0.1:5432/rhconnect_it?schema=outro`,
      'UNSUPPORTED_PARAMETER',
    ],
    [
      'connection_limit inválido',
      `${VALID_URL}&connection_limit=0`,
      'UNSUPPORTED_PARAMETER',
    ],
  ];

  it.each(rejected)('rejeita: %s', (_name, url, code) => {
    const result = guardCode(() => assertIntegrationEnvironment(envWith(url)));
    expect(result.code).toBe(code);
    // Nenhuma mensagem pode carregar a senha nem a URL recebida.
    expect(result.message).not.toContain(SECRET);
    if (url) expect(result.message).not.toContain(url);
  });

  it('rejeita NODE_ENV=production mesmo com URL válida', () => {
    const result = guardCode(() =>
      assertIntegrationEnvironment(
        envWith(VALID_URL, { NODE_ENV: 'production' }),
      ),
    );
    expect(result.code).toBe('PRODUCTION_ENV');
  });

  it('não faz fallback: DATABASE_URL sozinha nunca é usada', () => {
    const result = guardCode(() =>
      assertIntegrationEnvironment({ DATABASE_URL: VALID_URL }),
    );
    expect(result.code).toBe('MISSING_URL');
  });

  describe('coincidência com a URL de desenvolvimento', () => {
    it('rejeita URL idêntica', () => {
      const result = guardCode(() =>
        assertIntegrationEnvironment(envWith(VALID_URL), [VALID_URL]),
      );
      expect(result.code).toBe('SAME_AS_DEVELOPMENT');
      expect(result.message).not.toContain(SECRET);
    });

    it('rejeita mesmo banco em host equivalente (localhost) e outro usuário', () => {
      const dev = 'postgresql://dev:x@localhost:5432/rhconnect_it';
      const result = guardCode(() =>
        assertIntegrationEnvironment(envWith(VALID_URL), [dev]),
      );
      expect(result.code).toBe('SAME_AS_DEVELOPMENT');
    });

    it('aceita quando o banco de desenvolvimento é outro', () => {
      expect(() =>
        assertIntegrationEnvironment(envWith(VALID_URL), [DEV_URL]),
      ).not.toThrow();
    });

    it('pointsToSameDatabase compara host, porta e banco', () => {
      expect(pointsToSameDatabase(DEV_URL, DEV_URL)).toBe(true);
      expect(
        pointsToSameDatabase(
          'postgresql://a:b@127.0.0.1:5432/x',
          'postgresql://c:d@localhost/x',
        ),
      ).toBe(true);
      expect(
        pointsToSameDatabase(
          'postgresql://a:b@127.0.0.1:5432/x',
          'postgresql://a:b@127.0.0.1:5432/y',
        ),
      ).toBe(false);
      expect(
        pointsToSameDatabase(
          'postgresql://a:b@127.0.0.1:5432/x',
          'postgresql://a:b@127.0.0.1:5433/x',
        ),
      ).toBe(false);
    });
  });
});

describe('leitura do .env de desenvolvimento (somente comparação)', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'rh-guard-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('arquivo ausente => null (sem erro)', () => {
    expect(readEnvFileDatabaseUrl(join(dir, 'nao-existe.env'))).toBeNull();
  });

  it('arquivo em diretório inexistente => null (ENOENT)', () => {
    expect(
      readEnvFileDatabaseUrl(join(dir, 'sem-pasta', 'nao-existe.env')),
    ).toBeNull();
  });

  it('isFileNotFoundError aceita só ENOENT, inclusive de outro realm (Jest/vm)', () => {
    const crossRealm: unknown = runInNewContext(
      "Object.assign(new Error('x'), { code: 'ENOENT' })",
    );
    // Garante que o cenário reproduz o problema: instanceof falha entre realms.
    expect(crossRealm instanceof Error).toBe(false);
    expect(isFileNotFoundError(crossRealm)).toBe(true);
    expect(
      isFileNotFoundError(Object.assign(new Error('x'), { code: 'ENOENT' })),
    ).toBe(true);
    for (const code of ['EACCES', 'EPERM', 'EISDIR', 'ENOTDIR', 'EMFILE']) {
      expect(isFileNotFoundError(Object.assign(new Error('x'), { code }))).toBe(
        false,
      );
    }
    for (const value of [null, undefined, 'ENOENT', 42, {}, new Error('x')]) {
      expect(isFileNotFoundError(value)).toBe(false);
    }
  });

  it('lê DATABASE_URL com ou sem aspas e CRLF', () => {
    const file = join(dir, '.env');
    writeFileSync(file, `JWT=abc\r\nDATABASE_URL="${DEV_URL}"\r\nOUTRA=1\r\n`);
    expect(readEnvFileDatabaseUrl(file)).toBe(DEV_URL);
    writeFileSync(file, `DATABASE_URL=${DEV_URL}\n`);
    expect(readEnvFileDatabaseUrl(file)).toBe(DEV_URL);
  });

  it('sem DATABASE_URL no arquivo => null', () => {
    const file = join(dir, '.env');
    writeFileSync(file, 'JWT_SECRET=x\n');
    expect(readEnvFileDatabaseUrl(file)).toBeNull();
  });

  it('falha de leitura diferente de ausência é recusada (sem vazar caminho/conteúdo)', () => {
    // Um diretório no lugar do arquivo gera EISDIR.
    const result = guardCode(() => readEnvFileDatabaseUrl(dir));
    expect(result.code).toBe('DEV_ENV_UNREADABLE');
    expect(result.message).not.toContain(dir);
  });

  it('collectDevelopmentUrls junta ambiente e arquivo, e respeita ignoreEnvDatabaseUrl', () => {
    const file = join(dir, '.env');
    writeFileSync(file, `DATABASE_URL=${DEV_URL}\n`);
    const env = { DATABASE_URL: VALID_URL };
    expect(collectDevelopmentUrls(env, { envFilePath: file })).toEqual([
      VALID_URL,
      DEV_URL,
    ]);
    expect(
      collectDevelopmentUrls(env, {
        envFilePath: file,
        ignoreEnvDatabaseUrl: true,
      }),
    ).toEqual([DEV_URL]);
  });
});

describe('verifyDatabaseIdentity (consulta somente de leitura)', () => {
  function clientReturning(rows: unknown) {
    const queries: string[] = [];
    const client: IdentityQueryClient = {
      $queryRaw: (query) => {
        queries.push(query.join('?'));
        return Promise.resolve(rows);
      },
    };
    return { client, queries };
  }

  const goodRow = {
    database_name: 'rhconnect_it',
    user_name: 'rhconnect_it_user',
    marker: INTEGRATION_DB_MARKER,
  };

  it('aceita banco, usuário e marcador corretos', async () => {
    const { client } = clientReturning([goodRow]);
    await expect(verifyDatabaseIdentity(client)).resolves.toBeUndefined();
  });

  it('executa uma única consulta, e ela é um SELECT sem comandos de escrita', async () => {
    const { client, queries } = clientReturning([goodRow]);
    await verifyDatabaseIdentity(client);
    expect(queries).toHaveLength(1);
    expect(queries[0]).toMatch(/^\s*select\b/i);
    expect(queries[0]).not.toMatch(
      /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|comment)\b/i,
    );
  });

  it.each([
    [
      'banco errado',
      { ...goodRow, database_name: 'rhconnect_dev' },
      'IDENTITY_MISMATCH',
    ],
    [
      'usuário errado',
      { ...goodRow, user_name: 'postgres' },
      'IDENTITY_MISMATCH',
    ],
    ['marcador ausente', { ...goodRow, marker: null }, 'MARKER_MISSING'],
    ['marcador diferente', { ...goodRow, marker: 'outro' }, 'MARKER_MISSING'],
  ] as const)('rejeita: %s', async (_name, row, code) => {
    const { client } = clientReturning([row]);
    await expect(verifyDatabaseIdentity(client)).rejects.toMatchObject({
      code,
    });
  });

  it('resultado vazio ou malformado => IDENTITY_MISMATCH', async () => {
    for (const rows of [[], null, 'x', [null]]) {
      const { client } = clientReturning(rows);
      await expect(verifyDatabaseIdentity(client)).rejects.toMatchObject({
        code: 'IDENTITY_MISMATCH',
      });
    }
  });

  it('falha da consulta vira IDENTITY_CHECK_FAILED sem vazar a mensagem original', async () => {
    const client: IdentityQueryClient = {
      $queryRaw: () => Promise.reject(new Error(`senha ${SECRET} inválida`)),
    };
    const error: unknown = await verifyDatabaseIdentity(client).then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(IntegrationGuardError);
    if (error instanceof IntegrationGuardError) {
      expect(error.code).toBe('IDENTITY_CHECK_FAILED');
      expect(error.message).not.toContain(SECRET);
      expect(Object.prototype.hasOwnProperty.call(error, 'cause')).toBe(false);
    }
  });
});

describe('confirmação do comando de migration protegido', () => {
  it('exige a confirmação explícita do nome do banco', () => {
    expect(hasExplicitConfirmation([])).toBe(false);
    expect(hasExplicitConfirmation(['--confirm-database=rhconnect'])).toBe(
      false,
    );
    expect(hasExplicitConfirmation(['--confirm-database=rhconnect_dev'])).toBe(
      false,
    );
    expect(hasExplicitConfirmation([CONFIRM_FLAG])).toBe(true);
    expect(CONFIRM_FLAG).toBe('--confirm-database=rhconnect_it');
  });
});

describe('proteções estáticas da infraestrutura', () => {
  const apiRoot = join(__dirname, '..', '..', '..');
  const integrationRoot = join(apiRoot, 'test', 'integration');

  function sourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = join(dir, entry.name);
      // `persistence/` (R3.2.1-b) tem varredura própria e mais específica, em
      // verified-integration-client.guard-spec.ts.
      if (entry.isDirectory()) {
        return entry.name === 'persistence' ? [] : sourceFiles(full);
      }
      const isCode = /\.ts$/.test(entry.name);
      const isTest = /\.(guard-spec|int-spec)\.ts$/.test(entry.name);
      return isCode && !isTest ? [full] : [];
    });
  }

  const packageJson = JSON.parse(
    readFileSync(join(apiRoot, 'package.json'), 'utf8'),
  ) as { scripts: Record<string, string> };
  const integrationScripts = Object.entries(packageJson.scripts).filter(
    ([name]) => /integration/.test(name),
  );

  it('os scripts de integração existem e nenhum faz migrate reset/dev nem db push', () => {
    expect(integrationScripts.map(([name]) => name).sort()).toEqual([
      'db:integration:check',
      'db:integration:migrate',
      'db:integration:prisma-check',
      'test:integration',
      'test:integration:guard',
      'test:integration:persistence',
    ]);
    for (const [, command] of integrationScripts) {
      expect(command).not.toMatch(
        /migrate\s+(reset|dev)|db\s+push|prisma\s+migrate/i,
      );
    }
  });

  it('scripts que usam banco carregam apenas .env.integration (nunca .env)', () => {
    for (const name of [
      'db:integration:check',
      'db:integration:migrate',
      'db:integration:prisma-check',
      'test:integration',
      'test:integration:persistence',
    ]) {
      const command = packageJson.scripts[name];
      expect(command).toMatch(/^dotenv -e \.env\.integration -- /);
      expect(command).not.toMatch(/-e \.env(\s|$)/);
    }
    expect(packageJson.scripts['test:integration']).toContain('--runInBand');
    expect(packageJson.scripts['test:integration:guard']).not.toContain(
      'dotenv',
    );
  });

  it('o código de infraestrutura não contém operações destrutivas nem lê o .env como fallback', () => {
    const files = sourceFiles(integrationRoot);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      expect(content).not.toMatch(
        /migrate\s+(reset|dev)|db\s+push|\bTRUNCATE\b|\bDROP\b|\bDELETE\b|deleteMany|\$executeRaw|\$queryRawUnsafe|from ['"]dotenv/i,
      );
    }
  });

  it('a configuração de integração isola e não é capturada pelos outros runners', () => {
    const config = readFileSync(
      join(integrationRoot, 'jest-integration.config.js'),
      'utf8',
    );
    expect(config).toContain("testRegex: '\\\\.int-spec\\\\.ts$'");
    expect(config).toContain('maxWorkers: 1');
    expect(config).toContain('support/global-setup.ts');
    expect(config).toContain('support/set-integration-env.ts');
    const regex = /\.int-spec\.ts$/;
    expect(regex.test('a.int-spec.ts')).toBe(true);
    expect(regex.test('a.spec.ts')).toBe(false);
    expect(regex.test('a.e2e-spec.ts')).toBe(false);

    // Os runners existentes (unitário e E2E) não devem capturar `.int-spec.ts`.
    expect(/.*\.spec\.ts$/.test('a.int-spec.ts')).toBe(false);
    expect(/.e2e-spec.ts$/.test('a.int-spec.ts')).toBe(false);
  });
});
