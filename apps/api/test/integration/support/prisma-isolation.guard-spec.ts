import { spawnSync } from 'child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { isAbsolute, join } from 'path';

import {
  assertIntegrationEnvironment,
  IntegrationGuardError,
  type IntegrationGuardCode,
} from './integration-db-guard';
import {
  assertPrismaTargetIsIntegration,
  buildIsolatedMigrateInvocation,
  buildIsolatedPrismaEnv,
  integrationPrismaConfigPath,
  listVersionedMigrations,
  parsePrismaReportedTargets,
  redactConnectionStrings,
  verifyMigrationsApplied,
  type PrismaMigrateMode,
} from './integration-migrate';

// Regressão da correção crítica do isolamento das migrations (R3.2.1-a).
//
// Falha original: `db:integration:migrate` validava a URL de integração, mas o
// Prisma aplicou as migrations no banco de DESENVOLVIMENTO. O processo filho
// recebia `DOTENV_CONFIG_OVERRIDE='false'` (TEXTO), que o dotenv converte em
// `true`; o `import "dotenv/config"` do `prisma.config.ts` então sobrescrevia a
// URL herdada com a do `.env` de desenvolvimento.
//
// Estes testes NÃO usam banco. Os que dependem de processo real (dotenv de
// verdade, configuração Prisma de verdade) usam processos filhos com um `.env`
// "de desenvolvimento" criado em diretório temporário. Nenhuma saída exibe
// URLs: os filhos imprimem apenas rótulos (integration | dev | other).

const SECRET = 'S3gr3d0-Unico-Do-Teste';
const DEV_PASSWORD = 'outra-senha';
const VALID_URL = `postgresql://rhconnect_it_user:${SECRET}@127.0.0.1:5432/rhconnect_it?schema=public`;
const DEV_URL = `postgresql://dev_user:${DEV_PASSWORD}@localhost:5432/rh_connect`;

const integrationRoot = join(__dirname, '..');
const apiRoot = join(integrationRoot, '..', '..');
const configPath = integrationPrismaConfigPath(integrationRoot);

const guarded = assertIntegrationEnvironment({
  INTEGRATION_DATABASE_URL: VALID_URL,
});

// Ambiente "hostil": tudo que poderia redirecionar o Prisma para o dev.
const HOSTILE_ENV: NodeJS.ProcessEnv = {
  PATH: '/bin',
  HOME: '/home/x',
  DATABASE_URL: DEV_URL,
  DIRECT_URL: DEV_URL,
  SHADOW_DATABASE_URL: DEV_URL,
  DOTENV_CONFIG_OVERRIDE: 'false',
  DOTENV_CONFIG_PATH: '/qualquer/.env',
  NODE_OPTIONS: '--require=/qualquer/preload.js',
  PGHOST: 'localhost',
  PGDATABASE: 'rh_connect',
  PRISMA_CONFIG: '/qualquer/prisma.config.ts',
};

function guardCodeOf(action: () => unknown): IntegrationGuardCode {
  try {
    action();
  } catch (error) {
    if (error instanceof IntegrationGuardError) return error.code;
    throw error;
  }
  throw new Error('Esperava IntegrationGuardError');
}

describe('ambiente saneado do processo do Prisma', () => {
  it('usa exatamente a URL de integração e remove tudo que poderia redirecionar a conexão', () => {
    const env = buildIsolatedPrismaEnv(guarded, HOSTILE_ENV);
    expect(env.DATABASE_URL).toBe(VALID_URL);
    expect(env.INTEGRATION_DATABASE_URL).toBe(VALID_URL);
    for (const name of [
      'DIRECT_URL',
      'SHADOW_DATABASE_URL',
      'DOTENV_CONFIG_OVERRIDE',
      'DOTENV_CONFIG_PATH',
      'NODE_OPTIONS',
      'PGHOST',
      'PGDATABASE',
      'PRISMA_CONFIG',
    ]) {
      expect(Object.keys(env)).not.toContain(name);
    }
    expect(Object.values(env)).not.toContain(DEV_URL);
    expect(env.PATH).toBe('/bin');
  });

  it('remove variantes de caixa diferente (Windows) e não altera o ambiente de origem', () => {
    const base: NodeJS.ProcessEnv = {
      Dotenv_Config_Override: 'true',
      Database_Url: DEV_URL,
      node_options: '--require=x',
    };
    const env = buildIsolatedPrismaEnv(guarded, base);
    expect(Object.keys(env).sort()).toEqual(
      [
        'CHECKPOINT_DISABLE',
        'DATABASE_URL',
        'INTEGRATION_DATABASE_URL',
        'PRISMA_HIDE_UPDATE_MESSAGE',
      ].sort(),
    );
    expect(env.DATABASE_URL).toBe(VALID_URL);
    expect(base.Database_Url).toBe(DEV_URL);
  });
});

describe('invocação do Prisma com configuração isolada', () => {
  it.each(['status', 'deploy'] as PrismaMigrateMode[])(
    'monta "migrate %s" com --config da integração, cwd sem .env e ambiente saneado',
    (mode) => {
      const invocation = buildIsolatedMigrateInvocation(
        mode,
        guarded,
        '/prisma/build/index.js',
        integrationRoot,
        HOSTILE_ENV,
      );
      expect(invocation.command).toBe(process.execPath);
      expect(invocation.args).toEqual([
        '/prisma/build/index.js',
        'migrate',
        mode,
        '--config',
        configPath,
      ]);
      expect(configPath.endsWith('prisma.integration.config.ts')).toBe(true);
      expect(isAbsolute(configPath)).toBe(true);
      expect(invocation.cwd).toBe(integrationRoot);
      expect(invocation.env.DATABASE_URL).toBe(VALID_URL);
      expect(Object.keys(invocation.env)).not.toContain(
        'DOTENV_CONFIG_OVERRIDE',
      );
    },
  );

  it('recusa qualquer subcomando que não seja status/deploy (reset, dev, push...)', () => {
    for (const mode of ['reset', 'dev', 'push', 'resolve', '']) {
      expect(
        guardCodeOf(() =>
          buildIsolatedMigrateInvocation(
            mode as PrismaMigrateMode,
            guarded,
            '/prisma/build/index.js',
            integrationRoot,
            {},
          ),
        ),
      ).toBe('PRISMA_TARGET_UNPROVEN');
    }
  });
});

describe('prova do alvo informado pelo próprio Prisma', () => {
  const ok =
    'Prisma schema loaded from x\nDatasource "db": PostgreSQL database "rhconnect_it", schema "public" at "127.0.0.1:5432"\n\n17 migrations found in prisma/migrations';
  const dev =
    'Datasource "db": PostgreSQL database "rh_connect", schema "public" at "localhost:5432"\n\n16 migrations found in prisma/migrations\nNo pending migrations to apply.';

  it('extrai banco, schema, host e porta', () => {
    expect(parsePrismaReportedTargets(ok)).toEqual([
      {
        database: 'rhconnect_it',
        schema: 'public',
        host: '127.0.0.1',
        port: '5432',
      },
    ]);
  });

  it('aceita somente o banco de integração', () => {
    expect(() => assertPrismaTargetIsIntegration(ok)).not.toThrow();
  });

  it('recusa a saída real observada na falha (banco de desenvolvimento)', () => {
    expect(guardCodeOf(() => assertPrismaTargetIsIntegration(dev))).toBe(
      'PRISMA_TARGET_MISMATCH',
    );
  });

  it('recusa host, porta, schema ou banco diferentes, mesmo que um dos alvos esteja correto', () => {
    const variants = [
      ok.replace('127.0.0.1:5432', 'localhost:5432'),
      ok.replace('127.0.0.1:5432', '127.0.0.1:5433'),
      ok.replace('schema "public"', 'schema "outro"'),
      ok.replace('rhconnect_it', 'rhconnect_it2'),
      `${ok}\n${dev}`,
    ];
    for (const output of variants) {
      expect(guardCodeOf(() => assertPrismaTargetIsIntegration(output))).toBe(
        'PRISMA_TARGET_MISMATCH',
      );
    }
  });

  it('falha de forma segura quando o alvo não pode ser comprovado', () => {
    for (const output of [
      '',
      'Error: P1001 não foi possível conectar',
      'migrations found',
    ]) {
      expect(guardCodeOf(() => assertPrismaTargetIsIntegration(output))).toBe(
        'PRISMA_TARGET_UNPROVEN',
      );
    }
  });

  it('a mensagem de recusa não carrega URLs nem credenciais', () => {
    const noisy = `${dev}\nDATABASE_URL=${DEV_URL}`;
    try {
      assertPrismaTargetIsIntegration(noisy);
      throw new Error('esperava falha');
    } catch (error) {
      const message = (error as Error).message;
      expect(message).not.toContain(DEV_PASSWORD);
      expect(message).not.toContain('postgresql://');
    }
  });

  it('redige URLs de conexão antes de repassar a saída ao terminal', () => {
    const text = `erro em ${DEV_URL} e ${VALID_URL}.`;
    const redacted = redactConnectionStrings(text);
    expect(redacted).not.toContain(DEV_PASSWORD);
    expect(redacted).not.toContain(SECRET);
    expect(redacted).toContain('[URL omitida]');
  });
});

describe('verificação de leitura pós-deploy', () => {
  const rows = (items: Array<[string, boolean, boolean]>) => ({
    $queryRaw: () =>
      Promise.resolve(
        items.map(([migration_name, finished, rolled_back]) => ({
          migration_name,
          finished,
          rolled_back,
        })),
      ),
  });

  it('aceita quando todas as migrations versionadas estão concluídas', async () => {
    await expect(
      verifyMigrationsApplied(
        rows([
          ['a', true, false],
          ['b', true, false],
          ['extra', true, false],
        ]),
        ['a', 'b'],
      ),
    ).resolves.toBeUndefined();
  });

  it('recusa migration ausente, não concluída, revertida ou lista vazia', async () => {
    for (const client of [
      rows([['a', true, false]]),
      rows([
        ['a', true, false],
        ['b', false, false],
      ]),
      rows([
        ['a', true, false],
        ['b', true, true],
      ]),
    ]) {
      await expect(
        verifyMigrationsApplied(client, ['a', 'b']),
      ).rejects.toMatchObject({ code: 'MIGRATION_RESULT_UNPROVEN' });
    }
    await expect(
      verifyMigrationsApplied(rows([['a', true, false]]), []),
    ).rejects.toMatchObject({ code: 'MIGRATION_RESULT_UNPROVEN' });
  });

  it('falha de forma segura (sem vazar o erro original) quando a consulta falha', async () => {
    const client = {
      $queryRaw: () => Promise.reject(new Error(`conexão ${DEV_URL} recusada`)),
    };
    try {
      await verifyMigrationsApplied(client, ['a']);
      throw new Error('esperava falha');
    } catch (error) {
      expect(error).toBeInstanceOf(IntegrationGuardError);
      expect((error as IntegrationGuardError).code).toBe(
        'MIGRATION_RESULT_UNPROVEN',
      );
      expect((error as Error).message).not.toContain(DEV_PASSWORD);
      expect(Object.prototype.hasOwnProperty.call(error, 'cause')).toBe(false);
    }
  });

  it('lista como versionadas só as pastas com migration.sql', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rhc-migrations-'));
    try {
      mkdirSync(join(dir, '2_b'));
      writeFileSync(join(dir, '2_b', 'migration.sql'), '');
      mkdirSync(join(dir, '1_a'));
      writeFileSync(join(dir, '1_a', 'migration.sql'), '');
      mkdirSync(join(dir, '3_vazia'));
      writeFileSync(join(dir, 'migration_lock.toml'), '');
      expect(listVersionedMigrations(dir)).toEqual(['1_a', '2_b']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('encontra as migrations reais do projeto', () => {
    const names = listVersionedMigrations(
      join(apiRoot, 'prisma', 'migrations'),
    );
    expect(names.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Configuração efetivamente consumida pelo Prisma: processos filhos reais, com
// `dotenv/config` REAL pré-carregado (equivale ao `import "dotenv/config"` do
// prisma.config.ts de desenvolvimento) e um `.env` de desenvolvimento no cwd.
// ---------------------------------------------------------------------------
describe('configuração consumida pelo Prisma (processos reais)', () => {
  let workDir: string;
  let devEnvDir: string;
  let childScript: string;

  beforeAll(() => {
    workDir = mkdtempSync(join(tmpdir(), 'rhc-isolation-'));
    devEnvDir = join(workDir, 'dev-cwd');
    mkdirSync(devEnvDir);
    writeFileSync(join(devEnvDir, '.env'), `DATABASE_URL=${DEV_URL}\n`);
    childScript = join(workDir, 'child.js');
    writeFileSync(
      childScript,
      [
        "const label = (u) => (u === process.env.EXPECT_INT ? 'integration' : u === process.env.EXPECT_DEV ? 'dev' : u === undefined ? 'unset' : 'other');",
        'try {',
        "  if (process.env.CHILD_MODE === 'dotenv-only') {",
        '    console.log(JSON.stringify({ database: label(process.env.DATABASE_URL) }));',
        '  } else {',
        '    const loaded = require(process.env.CFG_PATH);',
        '    const cfg = loaded.default || loaded;',
        '    console.log(JSON.stringify({',
        '      url: label(cfg.datasource.url),',
        '      envDatabase: label(process.env.DATABASE_URL),',
        '      engine: cfg.engine,',
        '      schema: cfg.schema,',
        '      migrations: cfg.migrations.path,',
        '      hasSeed: cfg.migrations.seed !== undefined,',
        '    }));',
        '  }',
        '} catch (e) {',
        "  console.error('GUARD_CODE=' + (e && e.code ? e.code : 'UNKNOWN'));",
        '  process.exit(3);',
        '}',
      ].join('\n'),
    );
  });

  afterAll(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  function runChild(
    mode: 'dotenv-only' | 'config',
    env: NodeJS.ProcessEnv,
    cwd: string = devEnvDir,
  ) {
    const preload = ['-r', require.resolve('dotenv/config')];
    if (mode === 'config') {
      preload.push('-r', require.resolve('ts-node/register'));
    }
    const result = spawnSync(process.execPath, [...preload, childScript], {
      cwd,
      encoding: 'utf8',
      timeout: 90_000,
      env: {
        ...(process.env.SystemRoot
          ? { SystemRoot: process.env.SystemRoot }
          : {}),
        TS_NODE_PROJECT: join(apiRoot, 'tsconfig.json'),
        TS_NODE_TRANSPILE_ONLY: 'true',
        EXPECT_INT: VALID_URL,
        EXPECT_DEV: DEV_URL,
        CFG_PATH: configPath,
        CHILD_MODE: mode,
        ...env,
      },
    });
    const stdout = result.stdout ?? '';
    const stderr = result.stderr ?? '';
    const lastLine = stdout.trim().split(/\r?\n/).pop() ?? '';
    let json: Record<string, unknown> | null = null;
    try {
      json = JSON.parse(lastLine) as Record<string, unknown>;
    } catch {
      json = null;
    }
    const code = /GUARD_CODE=([A-Z_]+)/.exec(stderr)?.[1] ?? null;
    return { status: result.status, json, code, all: `${stdout}\n${stderr}` };
  }

  function expectNoLeak(all: string) {
    expect(all).not.toContain(SECRET);
    expect(all).not.toContain(DEV_PASSWORD);
    expect(all).not.toContain('postgresql://');
  }

  it('REPRODUÇÃO: DOTENV_CONFIG_OVERRIDE="false" (texto) faz o dotenv sobrescrever a URL pelo .env de desenvolvimento', () => {
    const legacy = runChild('dotenv-only', {
      DATABASE_URL: VALID_URL,
      DOTENV_CONFIG_OVERRIDE: 'false',
    });
    expect(legacy.status).toBe(0);
    expect(legacy.json).toEqual({ database: 'dev' });

    const control = runChild('dotenv-only', { DATABASE_URL: VALID_URL });
    expect(control.json).toEqual({ database: 'integration' });
  }, 120_000);

  it('o ambiente saneado impede a sobrescrita mesmo com dotenv real e .env de desenvolvimento no cwd', () => {
    const env = buildIsolatedPrismaEnv(guarded, HOSTILE_ENV);
    const result = runChild('dotenv-only', env);
    expect(result.status).toBe(0);
    expect(result.json).toEqual({ database: 'integration' });
  }, 120_000);

  it('a configuração Prisma de integração, carregada de verdade, só entrega a URL de integração', () => {
    const env = buildIsolatedPrismaEnv(guarded, HOSTILE_ENV);
    const result = runChild('config', env);
    expect(result.status).toBe(0);
    expect(result.json).toMatchObject({
      url: 'integration',
      envDatabase: 'integration',
      engine: 'classic',
      hasSeed: false,
    });
    const schema = String(result.json?.schema);
    const migrations = String(result.json?.migrations);
    expect(isAbsolute(schema)).toBe(true);
    expect(isAbsolute(migrations)).toBe(true);
    expect(schema).toBe(join(apiRoot, 'prisma', 'schema.prisma'));
    expect(migrations).toBe(join(apiRoot, 'prisma', 'migrations'));
    expectNoLeak(result.all);
  }, 120_000);

  it('a configuração recusa a falha original: URL de integração + .env de desenvolvimento sobrescrevendo DATABASE_URL', () => {
    const result = runChild('config', {
      INTEGRATION_DATABASE_URL: VALID_URL,
      DOTENV_CONFIG_OVERRIDE: 'false',
    });
    expect(result.status).toBe(3);
    expect(result.code).toBe('PRISMA_TARGET_MISMATCH');
    expect(result.json).toBeNull();
    expectNoLeak(result.all);
  }, 120_000);

  it('a configuração recusa DATABASE_URL de desenvolvimento herdado do ambiente', () => {
    const result = runChild('config', {
      INTEGRATION_DATABASE_URL: VALID_URL,
      DATABASE_URL: DEV_URL,
    });
    expect(result.status).toBe(3);
    expect(result.code).toBe('PRISMA_TARGET_MISMATCH');
    expectNoLeak(result.all);
  }, 120_000);

  it('a configuração recusa quando o .env tenta trocar a própria INTEGRATION_DATABASE_URL por outro banco', () => {
    const cwd = join(workDir, 'dev-cwd-2');
    mkdirSync(cwd);
    writeFileSync(join(cwd, '.env'), `INTEGRATION_DATABASE_URL=${DEV_URL}\n`);
    const result = runChild(
      'config',
      { INTEGRATION_DATABASE_URL: VALID_URL, DOTENV_CONFIG_OVERRIDE: 'true' },
      cwd,
    );
    expect(result.status).toBe(3);
    expect(result.code).toMatch(
      /^(INVALID_HOST|INVALID_PORT|INVALID_DATABASE|INVALID_USER|SAME_AS_DEVELOPMENT)$/,
    );
    expectNoLeak(result.all);
  }, 120_000);

  it('sem INTEGRATION_DATABASE_URL a configuração falha e NÃO recorre ao DATABASE_URL nem ao .env', () => {
    const result = runChild('config', { DATABASE_URL: DEV_URL });
    expect(result.status).toBe(3);
    expect(result.code).toBe('MISSING_URL');
    expect(result.json).toBeNull();
    expectNoLeak(result.all);
  }, 120_000);
});

// ---------------------------------------------------------------------------
// Proteções estáticas do fluxo de migration
// ---------------------------------------------------------------------------
describe('proteções estáticas do fluxo de migration', () => {
  function code(relative: string): string {
    return readFileSync(join(integrationRoot, relative), 'utf8')
      .split(/\r?\n/)
      .filter((line) => !/^\s*\/\//.test(line))
      .join('\n');
  }

  const config = code('prisma.integration.config.ts');
  const migrate = code('support/integration-migrate.ts');
  const script = code('scripts/migrate-integration-db.ts');

  it('a configuração isolada não usa dotenv nem env("DATABASE_URL")', () => {
    expect(config).not.toMatch(/dotenv/i);
    expect(config).not.toMatch(/\benv\s*\(/);
    expect(config).not.toMatch(/readFileSync|\.env['"`]/);
    expect(config).toContain("engine: 'classic'");
    expect(config).not.toMatch(/seed/);
  });

  it('nenhum arquivo do fluxo define DOTENV_CONFIG_OVERRIDE nem monta o ambiente a partir de spread cru', () => {
    for (const content of [config, migrate, script]) {
      expect(content).not.toMatch(/DOTENV_CONFIG_OVERRIDE/);
      expect(content).not.toMatch(/\.\.\.\s*(baseEnv|process\.env)/);
    }
  });

  it('o script usa a configuração isolada, sem shell e sem npx/pnpm para o Prisma', () => {
    expect(script).toContain('buildIsolatedMigrateInvocation');
    expect(script).not.toMatch(/shell\s*:\s*true/);
    expect(script).not.toMatch(/\b(npx|pnpm|execSync)\b|\bexec\(/);
    expect(migrate).toContain("'--config'");
    expect(migrate).not.toMatch(/'reset'|'dev'|'push'/);
  });

  it('o alvo do Prisma é comprovado (status) ANTES de qualquer deploy e conferido depois', () => {
    const status = script.indexOf("runPrisma('status'");
    const proof = script.indexOf('assertPrismaTargetIsIntegration(preflight');
    const deploy = script.indexOf("runPrisma('deploy'");
    expect(status).toBeGreaterThan(-1);
    expect(proof).toBeGreaterThan(status);
    expect(deploy).toBeGreaterThan(proof);
    expect(script).toContain('assertPrismaTargetIsIntegration(deploy.output)');
    expect(script).toContain('verifyMigrationsApplied');
  });

  it('o prisma.config.ts de desenvolvimento continua intacto e fora do fluxo de integração', () => {
    const dev = readFileSync(join(apiRoot, 'prisma.config.ts'), 'utf8');
    expect(dev).toContain('dotenv/config');
    for (const content of [config, migrate, script]) {
      expect(content).not.toMatch(/['"`]\.{0,2}\/?prisma\.config['"`.]/);
    }
    expect(migrate).toContain('prisma.integration.config.ts');
  });
});
