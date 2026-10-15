import { spawnSync } from 'child_process';
import { join } from 'path';

import { PrismaClient } from '@prisma/client';

import {
  assertIntegrationEnvironment,
  collectDevelopmentUrls,
  IntegrationGuardError,
  verifyDatabaseIdentity,
  type GuardedIntegrationConfig,
} from '../support/integration-db-guard';
import {
  assertPrismaTargetIsIntegration,
  buildIsolatedMigrateInvocation,
  CONFIRM_FLAG,
  hasExplicitConfirmation,
  listVersionedMigrations,
  redactConnectionStrings,
  resolvePrismaCliEntry,
  verifyMigrationsApplied,
  type PrismaMigrateMode,
} from '../support/integration-migrate';

// Aplica as migrations já versionadas SOMENTE no banco de integração.
//
// Ordem (qualquer falha interrompe antes do passo seguinte):
// 1. confirmação explícita na linha de comando;
// 2. guarda de ambiente (INTEGRATION_DATABASE_URL, host, banco, usuário...);
// 3. verificação de identidade do banco (consulta de leitura + marcador);
// 4. PROVA do alvo no processo REAL do Prisma: `migrate status` (somente
//    leitura) com a configuração isolada; o banco que o Prisma imprime precisa
//    ser o de integração;
// 5. `migrate deploy` com a mesma configuração isolada (alvo conferido de novo);
// 6. verificação de leitura de que todas as migrations constam como concluídas.
//
// Nunca há fallback para o `.env` de desenvolvimento.

const INTEGRATION_ROOT = join(__dirname, '..');
const MIGRATIONS_DIR = join(
  INTEGRATION_ROOT,
  '..',
  '..',
  'prisma',
  'migrations',
);
const PRISMA_TIMEOUT_MS = 180_000;

function runPrisma(
  mode: PrismaMigrateMode,
  config: GuardedIntegrationConfig,
): { status: number; output: string } {
  const invocation = buildIsolatedMigrateInvocation(
    mode,
    config,
    resolvePrismaCliEntry(),
    INTEGRATION_ROOT,
    process.env,
  );
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: invocation.cwd,
    env: invocation.env,
    encoding: 'utf8',
    timeout: PRISMA_TIMEOUT_MS,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) {
    throw new IntegrationGuardError(
      'PRISMA_TARGET_UNPROVEN',
      'O processo do Prisma não pôde ser executado ou excedeu o tempo limite.',
    );
  }
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  return { status: result.status ?? 1, output };
}

async function main(): Promise<void> {
  try {
    if (!hasExplicitConfirmation(process.argv.slice(2))) {
      console.error(
        `Confirmação ausente. Execute novamente com ${CONFIRM_FLAG}.`,
      );
      process.exit(1);
    }

    const config = assertIntegrationEnvironment(
      process.env,
      collectDevelopmentUrls(process.env),
    );
    const client = new PrismaClient({ datasourceUrl: config.url });
    try {
      await verifyDatabaseIdentity(client);
    } finally {
      await client.$disconnect();
    }

    console.log(`Banco de integração validado: ${config.toString()}`);
    console.log(
      'Comprovando o alvo no processo do Prisma (somente leitura)...',
    );
    // O código de saída do `status` é ignorado de propósito (migrations
    // pendentes o tornam diferente de zero); só importa o alvo informado.
    const preflight = runPrisma('status', config);
    assertPrismaTargetIsIntegration(preflight.output);
    console.log('Alvo do Prisma comprovado: rhconnect_it em 127.0.0.1:5432.');

    console.log('Aplicando migrations versionadas...');
    const deploy = runPrisma('deploy', config);
    console.log(redactConnectionStrings(deploy.output).trim());
    assertPrismaTargetIsIntegration(deploy.output);
    if (deploy.status !== 0) process.exit(deploy.status);

    const verifier = new PrismaClient({ datasourceUrl: config.url });
    try {
      await verifyMigrationsApplied(
        verifier,
        listVersionedMigrations(MIGRATIONS_DIR),
      );
    } finally {
      await verifier.$disconnect();
    }
    console.log('Migrations conferidas no banco de integração.');
  } catch (error) {
    console.error(
      error instanceof IntegrationGuardError
        ? `[${error.code}] ${error.message}`
        : 'Falha inesperada ao aplicar as migrations de integração.',
    );
    process.exit(1);
  }
}

void main();
