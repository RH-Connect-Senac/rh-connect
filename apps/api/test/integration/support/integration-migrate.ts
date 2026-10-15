import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

import {
  INTEGRATION_DB_HOST,
  INTEGRATION_DB_NAME,
  INTEGRATION_DB_PORT,
  IntegrationGuardError,
  type GuardedIntegrationConfig,
  type IdentityQueryClient,
} from './integration-db-guard';

// Montagem (pura, sem executar nada) e verificação do comando que aplica as
// migrations existentes SOMENTE no banco de integração. Só existem os modos
// `migrate status` (somente leitura, usado para PROVAR o alvo antes) e
// `migrate deploy` (aplica o que já está versionado); nenhum outro subcomando
// do Prisma é montado aqui.
//
// Isolamento (R3.2.1-a, correção crítica): o processo do Prisma
// 1. usa `--config` apontando para `prisma.integration.config.ts` (sem dotenv);
// 2. recebe um ambiente SANEADO (sem `DOTENV_*`, `NODE_OPTIONS`, `DIRECT_URL`...),
//    em que `DATABASE_URL` é exatamente a URL de integração validada;
// 3. roda com cwd em `test/integration`, onde não existe `.env`;
// 4. tem o alvo que ELE MESMO informa conferido antes (e depois) do deploy.

export const CONFIRM_FLAG = `--confirm-database=${INTEGRATION_DB_NAME}`;

export type PrismaMigrateMode = 'status' | 'deploy';

export interface MigrateInvocation {
  command: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
}

export const INTEGRATION_PRISMA_CONFIG_FILE = 'prisma.integration.config.ts';

export function resolvePrismaCliEntry(): string {
  const packageJsonPath = require.resolve('prisma/package.json');
  const content: unknown = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  const bin =
    typeof content === 'object' && content !== null
      ? (content as Record<string, unknown>).bin
      : undefined;
  const entry =
    typeof bin === 'string'
      ? bin
      : typeof bin === 'object' && bin !== null
        ? (bin as Record<string, unknown>).prisma
        : undefined;
  if (typeof entry !== 'string') {
    throw new Error('Não foi possível localizar o CLI do Prisma.');
  }
  return join(packageJsonPath, '..', entry);
}

// Variáveis que podem redirecionar a conexão ou injetar código/valores no
// processo do Prisma. `DOTENV_CONFIG_*` é crítico: o dotenv converte o TEXTO
// 'false' em `true` (override ligado) e o `.env` de desenvolvimento passa a
// vencer a URL herdada. `NODE_OPTIONS` poderia pré-carregar o dotenv.
const BLOCKED_ENV_NAMES = new Set([
  'DATABASE_URL',
  'INTEGRATION_DATABASE_URL',
  'DIRECT_URL',
  'SHADOW_DATABASE_URL',
  'NODE_OPTIONS',
  'PRISMA_CONFIG',
]);

export function buildIsolatedPrismaEnv(
  config: GuardedIntegrationConfig,
  baseEnv: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [name, value] of Object.entries(baseEnv)) {
    const upper = name.toUpperCase();
    if (BLOCKED_ENV_NAMES.has(upper)) continue;
    if (upper.startsWith('DOTENV_')) continue;
    if (upper.startsWith('PG')) continue;
    env[name] = value;
  }
  env.DATABASE_URL = config.url;
  env.INTEGRATION_DATABASE_URL = config.url;
  env.CHECKPOINT_DISABLE = '1';
  env.PRISMA_HIDE_UPDATE_MESSAGE = '1';
  return env;
}

export function integrationPrismaConfigPath(integrationRoot: string): string {
  return join(integrationRoot, INTEGRATION_PRISMA_CONFIG_FILE);
}

export function buildIsolatedMigrateInvocation(
  mode: PrismaMigrateMode,
  config: GuardedIntegrationConfig,
  prismaCliEntry: string,
  integrationRoot: string,
  baseEnv: NodeJS.ProcessEnv,
): MigrateInvocation {
  if (mode !== 'status' && mode !== 'deploy') {
    throw new IntegrationGuardError(
      'PRISMA_TARGET_UNPROVEN',
      'Subcomando do Prisma não permitido na infraestrutura de integração.',
    );
  }
  return {
    command: process.execPath,
    args: [
      prismaCliEntry,
      'migrate',
      mode,
      '--config',
      integrationPrismaConfigPath(integrationRoot),
    ],
    cwd: integrationRoot,
    env: buildIsolatedPrismaEnv(config, baseEnv),
  };
}

// Exige a confirmação explícita do nome do banco na linha de comando.
export function hasExplicitConfirmation(argv: readonly string[]): boolean {
  return argv.includes(CONFIRM_FLAG);
}

export interface PrismaReportedTarget {
  database: string;
  schema: string;
  host: string;
  port: string;
}

const DATASOURCE_LINE =
  /Datasource "[^"\r\n]*": PostgreSQL database "([^"\r\n]*)", schema "([^"\r\n]*)" at "([^"\r\n]*)"/g;

// Extrai o(s) alvo(s) que o PRÓPRIO Prisma imprime ao conectar. Esta é a
// prova do banco realmente usado, independente de qualquer mensagem do wrapper.
export function parsePrismaReportedTargets(
  output: string,
): PrismaReportedTarget[] {
  const targets: PrismaReportedTarget[] = [];
  for (const match of output.matchAll(DATASOURCE_LINE)) {
    const hostPort = match[3];
    const separator = hostPort.lastIndexOf(':');
    targets.push({
      database: match[1],
      schema: match[2],
      host: separator >= 0 ? hostPort.slice(0, separator) : hostPort,
      port: separator >= 0 ? hostPort.slice(separator + 1) : '',
    });
  }
  return targets;
}

function describeSafely(value: string): string {
  return /^[A-Za-z0-9_.-]{1,64}$/.test(value) ? value : '(valor inválido)';
}

// Falha de forma segura: se o Prisma não informou o alvo, ou informou qualquer
// alvo diferente do banco de integração, a operação é interrompida.
export function assertPrismaTargetIsIntegration(output: string): void {
  const targets = parsePrismaReportedTargets(output);
  if (targets.length === 0) {
    throw new IntegrationGuardError(
      'PRISMA_TARGET_UNPROVEN',
      'Não foi possível comprovar o banco usado pelo Prisma; migrations interrompidas.',
    );
  }
  for (const target of targets) {
    if (
      target.database !== INTEGRATION_DB_NAME ||
      target.schema !== 'public' ||
      target.host !== INTEGRATION_DB_HOST ||
      target.port !== INTEGRATION_DB_PORT
    ) {
      throw new IntegrationGuardError(
        'PRISMA_TARGET_MISMATCH',
        `O Prisma apontou para outro banco (${describeSafely(target.database)} em ${describeSafely(target.host)}:${describeSafely(target.port)}); migrations interrompidas.`,
      );
    }
  }
}

// Impede que a saída do Prisma (repassada ao terminal) exiba qualquer URL de
// conexão, caso alguma mensagem de erro a inclua.
export function redactConnectionStrings(text: string): string {
  return text.replace(/postgres(?:ql)?:\/\/\S+/gi, '[URL omitida]');
}

// Nomes das migrations versionadas: diretórios que contêm `migration.sql`.
export function listVersionedMigrations(migrationsDir: string): string[] {
  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        existsSync(join(migrationsDir, entry.name, 'migration.sql')),
    )
    .map((entry) => entry.name)
    .sort();
}

// Verificação SOMENTE de leitura, após o deploy: toda migration versionada
// precisa constar como concluída e não revertida no banco de integração.
export async function verifyMigrationsApplied(
  client: IdentityQueryClient,
  expected: readonly string[],
): Promise<void> {
  let rows: unknown;
  try {
    rows =
      await client.$queryRaw`SELECT migration_name, (finished_at IS NOT NULL) AS finished, (rolled_back_at IS NOT NULL) AS rolled_back FROM _prisma_migrations`;
  } catch {
    throw new IntegrationGuardError(
      'MIGRATION_RESULT_UNPROVEN',
      'Não foi possível confirmar as migrations aplicadas no banco de integração.',
    );
  }
  const applied = new Set<string>();
  if (Array.isArray(rows)) {
    for (const row of rows as unknown[]) {
      if (typeof row !== 'object' || row === null) continue;
      const record = row as Record<string, unknown>;
      if (
        typeof record.migration_name === 'string' &&
        record.finished === true &&
        record.rolled_back !== true
      ) {
        applied.add(record.migration_name);
      }
    }
  }
  if (expected.length === 0 || expected.some((name) => !applied.has(name))) {
    throw new IntegrationGuardError(
      'MIGRATION_RESULT_UNPROVEN',
      'O banco de integração não possui todas as migrations versionadas como concluídas.',
    );
  }
}
