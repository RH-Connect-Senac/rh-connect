import { spawnSync, type SpawnSyncReturns } from 'child_process';

import {
  IntegrationGuardError,
  type GuardedIntegrationConfig,
} from './integration-db-guard';
import {
  assertPrismaTargetIsIntegration,
  buildIsolatedMigrateInvocation,
  parsePrismaReportedTargets,
  resolvePrismaCliEntry,
  type PrismaReportedTarget,
} from './integration-migrate';

// Diagnóstico SOMENTE de leitura do destino real do Prisma (R3.2.1-a).
// Executa exclusivamente `prisma migrate status`, com a configuração Prisma
// isolada e o ambiente saneado, e confere o destino que o PRÓPRIO Prisma
// informa. Este módulo não monta nenhum outro subcomando.

export type MigrationState = 'up_to_date' | 'pending' | 'unknown';

export interface PrismaStatusDiagnosis {
  target: PrismaReportedTarget;
  migrationState: MigrationState;
}

export type SpawnFunction = (
  command: string,
  args: string[],
  options: {
    cwd: string;
    env: NodeJS.ProcessEnv;
    encoding: 'utf8';
    timeout: number;
    maxBuffer: number;
  },
) => SpawnSyncReturns<string>;

const STATUS_TIMEOUT_MS = 180_000;

export function classifyMigrationState(output: string): MigrationState {
  if (/Database schema is up to date/i.test(output)) return 'up_to_date';
  if (
    /have not yet been applied|Database schema is not up to date|Following migrations? /i.test(
      output,
    )
  ) {
    return 'pending';
  }
  return 'unknown';
}

// Falha de forma segura: sem alvo comprovado (ou com alvo diferente), lança.
export function diagnosePrismaStatusOutput(
  output: string,
): PrismaStatusDiagnosis {
  assertPrismaTargetIsIntegration(output);
  return {
    target: parsePrismaReportedTargets(output)[0],
    migrationState: classifyMigrationState(output),
  };
}

export function runPrismaStatus(
  config: GuardedIntegrationConfig,
  integrationRoot: string,
  baseEnv: NodeJS.ProcessEnv,
  spawn: SpawnFunction = spawnSync,
  prismaCliEntry: string = resolvePrismaCliEntry(),
): { output: string; diagnosis: PrismaStatusDiagnosis } {
  const invocation = buildIsolatedMigrateInvocation(
    'status',
    config,
    prismaCliEntry,
    integrationRoot,
    baseEnv,
  );
  const result = spawn(invocation.command, invocation.args, {
    cwd: invocation.cwd,
    env: invocation.env,
    encoding: 'utf8',
    timeout: STATUS_TIMEOUT_MS,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) {
    throw new IntegrationGuardError(
      'PRISMA_TARGET_UNPROVEN',
      'O processo do Prisma não pôde ser executado ou excedeu o tempo limite.',
    );
  }
  // O código de saída é ignorado de propósito (migrations pendentes o tornam
  // diferente de zero); só importa o destino que o Prisma informou.
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  return { output, diagnosis: diagnosePrismaStatusOutput(output) };
}
