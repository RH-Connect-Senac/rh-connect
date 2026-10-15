import { readFileSync } from 'fs';
import { join } from 'path';

import {
  assertIntegrationEnvironment,
  IntegrationGuardError,
  type IntegrationGuardCode,
} from './integration-db-guard';
import {
  classifyMigrationState,
  diagnosePrismaStatusOutput,
  runPrismaStatus,
  type SpawnFunction,
} from './integration-prisma-status';

// Testes do diagnóstico somente de leitura do destino do Prisma. Não usam
// banco nem executam o Prisma: o processo é substituído por um falso que
// registra exatamente o que seria executado.

const SECRET = 'S3gr3d0-Unico-Do-Teste';
const DEV_PASSWORD = 'outra-senha';
const VALID_URL = `postgresql://rhconnect_it_user:${SECRET}@127.0.0.1:5432/rhconnect_it?schema=public`;
const DEV_URL = `postgresql://dev_user:${DEV_PASSWORD}@localhost:5432/rh_connect`;

const integrationRoot = join(__dirname, '..');
const guarded = assertIntegrationEnvironment({
  INTEGRATION_DATABASE_URL: VALID_URL,
});

const OK_UP_TO_DATE =
  'Datasource "db": PostgreSQL database "rhconnect_it", schema "public" at "127.0.0.1:5432"\n\n17 migrations found in prisma/migrations\n\nDatabase schema is up to date!';
const OK_PENDING =
  'Datasource "db": PostgreSQL database "rhconnect_it", schema "public" at "127.0.0.1:5432"\n\n17 migrations found in prisma/migrations\n\nFollowing migrations have not yet been applied:\n0_init';
const DEV_OUTPUT =
  'Datasource "db": PostgreSQL database "rh_connect", schema "public" at "localhost:5432"\n\n16 migrations found in prisma/migrations\nNo pending migrations to apply.';

interface Call {
  command: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
}

function fakeSpawn(
  stdout: string,
  extra: Record<string, unknown> = {},
): { spawn: SpawnFunction; calls: Call[] } {
  const calls: Call[] = [];
  const spawn = ((command, args, options) => {
    calls.push({ command, args, cwd: options.cwd, env: options.env });
    return {
      status: 0,
      stdout,
      stderr: '',
      ...extra,
    };
  }) as SpawnFunction;
  return { spawn, calls };
}

function guardCodeOf(action: () => unknown): IntegrationGuardCode {
  try {
    action();
  } catch (error) {
    if (error instanceof IntegrationGuardError) return error.code;
    throw error;
  }
  throw new Error('Esperava IntegrationGuardError');
}

const HOSTILE_ENV: NodeJS.ProcessEnv = {
  PATH: '/bin',
  DATABASE_URL: DEV_URL,
  DOTENV_CONFIG_OVERRIDE: 'false',
  NODE_OPTIONS: '--require=/x.js',
  DIRECT_URL: DEV_URL,
};

describe('diagnóstico do destino do Prisma', () => {
  it('aceita somente rhconnect_it / public / 127.0.0.1:5432 e informa o estado', () => {
    expect(diagnosePrismaStatusOutput(OK_UP_TO_DATE)).toEqual({
      target: {
        database: 'rhconnect_it',
        schema: 'public',
        host: '127.0.0.1',
        port: '5432',
      },
      migrationState: 'up_to_date',
    });
    expect(diagnosePrismaStatusOutput(OK_PENDING).migrationState).toBe(
      'pending',
    );
  });

  it('classifica o estado das migrations', () => {
    expect(classifyMigrationState('Database schema is up to date!')).toBe(
      'up_to_date',
    );
    expect(
      classifyMigrationState('Following migrations have not yet been applied:'),
    ).toBe('pending');
    expect(classifyMigrationState('algo inesperado')).toBe('unknown');
  });

  it('recusa o banco de desenvolvimento, outros alvos e saída sem destino', () => {
    expect(guardCodeOf(() => diagnosePrismaStatusOutput(DEV_OUTPUT))).toBe(
      'PRISMA_TARGET_MISMATCH',
    );
    for (const variant of [
      OK_UP_TO_DATE.replace('127.0.0.1:5432', 'localhost:5432'),
      OK_UP_TO_DATE.replace('127.0.0.1:5432', '127.0.0.1:5433'),
      OK_UP_TO_DATE.replace('schema "public"', 'schema "x"'),
      OK_UP_TO_DATE.replace('rhconnect_it', 'rhconnect'),
      `${OK_UP_TO_DATE}\n${DEV_OUTPUT}`,
    ]) {
      expect(guardCodeOf(() => diagnosePrismaStatusOutput(variant))).toBe(
        'PRISMA_TARGET_MISMATCH',
      );
    }
    for (const output of [
      '',
      'Error: P1001',
      'Database schema is up to date!',
    ]) {
      expect(guardCodeOf(() => diagnosePrismaStatusOutput(output))).toBe(
        'PRISMA_TARGET_UNPROVEN',
      );
    }
  });
});

describe('runPrismaStatus (processo do Prisma simulado)', () => {
  it('executa exclusivamente "migrate status" com --config isolado, cwd sem .env e ambiente saneado', () => {
    const { spawn, calls } = fakeSpawn(OK_UP_TO_DATE);
    const { diagnosis } = runPrismaStatus(
      guarded,
      integrationRoot,
      HOSTILE_ENV,
      spawn,
      '/prisma/build/index.js',
    );
    expect(diagnosis.migrationState).toBe('up_to_date');
    expect(calls).toHaveLength(1);
    expect(calls[0].command).toBe(process.execPath);
    expect(calls[0].args).toEqual([
      '/prisma/build/index.js',
      'migrate',
      'status',
      '--config',
      join(integrationRoot, 'prisma.integration.config.ts'),
    ]);
    expect(calls[0].cwd).toBe(integrationRoot);
    expect(calls[0].env.DATABASE_URL).toBe(VALID_URL);
    expect(Object.keys(calls[0].env)).not.toContain('DOTENV_CONFIG_OVERRIDE');
    expect(Object.keys(calls[0].env)).not.toContain('NODE_OPTIONS');
    expect(Object.keys(calls[0].env)).not.toContain('DIRECT_URL');
    expect(Object.values(calls[0].env)).not.toContain(DEV_URL);
  });

  it('ignora o código de saída (migrations pendentes) mas exige o destino', () => {
    const { spawn } = fakeSpawn(OK_PENDING, { status: 1 });
    expect(
      runPrismaStatus(guarded, integrationRoot, {}, spawn, '/p.js').diagnosis
        .migrationState,
    ).toBe('pending');
  });

  it('recusa quando o Prisma informa o banco de desenvolvimento, sem vazar credenciais', () => {
    const { spawn } = fakeSpawn(`${DEV_OUTPUT}\nDATABASE_URL=${DEV_URL}`);
    try {
      runPrismaStatus(guarded, integrationRoot, HOSTILE_ENV, spawn, '/p.js');
      throw new Error('esperava falha');
    } catch (error) {
      expect(error).toBeInstanceOf(IntegrationGuardError);
      expect((error as IntegrationGuardError).code).toBe(
        'PRISMA_TARGET_MISMATCH',
      );
      const message = (error as Error).message;
      expect(message).not.toContain(DEV_PASSWORD);
      expect(message).not.toContain(SECRET);
      expect(message).not.toContain('postgresql://');
    }
  });

  it('falha de forma segura quando o processo não executa, estoura o tempo ou não informa o destino', () => {
    for (const { spawn } of [
      fakeSpawn('', { error: new Error(`falha ${DEV_URL}`) }),
      fakeSpawn('', { status: null }),
      fakeSpawn('Error: P1001 não foi possível conectar'),
    ]) {
      expect(
        guardCodeOf(() =>
          runPrismaStatus(guarded, integrationRoot, {}, spawn, '/p.js'),
        ),
      ).toMatch(/^PRISMA_TARGET_UNPROVEN$/);
    }
  });
});

describe('proteções estáticas do diagnóstico', () => {
  const read = (relative: string) =>
    readFileSync(join(integrationRoot, relative), 'utf8')
      .split(/\r?\n/)
      .filter((line) => !/^\s*\/\//.test(line))
      .join('\n');
  const runner = read('support/integration-prisma-status.ts');
  const script = read('scripts/prisma-check-integration-db.ts');
  const packageJson = JSON.parse(
    readFileSync(join(integrationRoot, '..', '..', 'package.json'), 'utf8'),
  ) as { scripts: Record<string, string> };

  it('o script dedicado carrega só .env.integration e não referencia deploy/reset/dev/push', () => {
    const command = packageJson.scripts['db:integration:prisma-check'];
    expect(command).toBe(
      'dotenv -e .env.integration -- ts-node test/integration/scripts/prisma-check-integration-db.ts',
    );
    for (const content of [runner, script, command]) {
      expect(content).not.toMatch(/deploy|reset|push|\bmigrate\s+dev\b/i);
    }
  });

  it('verifica a identidade antes do Prisma e não usa shell, dotenv nem .env', () => {
    expect(script.indexOf('verifyDatabaseIdentity(client)')).toBeGreaterThan(
      -1,
    );
    expect(script.indexOf('verifyDatabaseIdentity(client)')).toBeLessThan(
      script.indexOf('runPrismaStatus('),
    );
    for (const content of [runner, script]) {
      expect(content).not.toMatch(/shell\s*:\s*true|dotenv|readFileSync/);
      expect(content).not.toMatch(/\.\.\.\s*(baseEnv|process\.env)/);
    }
    expect(runner).toContain("'status'");
  });
});
