import { join } from 'path';

import { PrismaClient } from '@prisma/client';

import {
  assertIntegrationEnvironment,
  collectDevelopmentUrls,
  IntegrationGuardError,
  verifyDatabaseIdentity,
} from '../support/integration-db-guard';
import { redactConnectionStrings } from '../support/integration-migrate';
import { runPrismaStatus } from '../support/integration-prisma-status';

// Diagnóstico SOMENTE de leitura: comprova, no processo REAL do Prisma, qual
// banco ele selecionaria. Não aplica nem altera nada.
//
// Ordem: (1) guarda de ambiente; (2) identidade do banco por consulta de
// leitura (banco, usuário e marcador); (3) `prisma migrate status` com a
// configuração isolada; (4) conferência do destino que o Prisma informou.
// Nunca há fallback para o `.env` de desenvolvimento.

const INTEGRATION_ROOT = join(__dirname, '..');

async function main(): Promise<void> {
  try {
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
    console.log(`Identidade validada: ${config.toString()}`);

    const { output, diagnosis } = runPrismaStatus(
      config,
      INTEGRATION_ROOT,
      process.env,
    );
    console.log(redactConnectionStrings(output).trim());
    const { target } = diagnosis;
    console.log(
      `Destino do Prisma comprovado: ${target.database} em ${target.host}:${target.port} (schema ${target.schema}).`,
    );
    console.log(`Estado das migrations: ${diagnosis.migrationState}.`);
  } catch (error) {
    console.error(
      error instanceof IntegrationGuardError
        ? `[${error.code}] ${error.message}`
        : 'Falha inesperada no diagnóstico do destino do Prisma.',
    );
    process.exit(1);
  }
}

void main();
