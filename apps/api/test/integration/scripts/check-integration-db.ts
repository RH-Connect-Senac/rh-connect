import { PrismaClient } from '@prisma/client';

import {
  assertIntegrationEnvironment,
  collectDevelopmentUrls,
  IntegrationGuardError,
  verifyDatabaseIdentity,
} from '../support/integration-db-guard';

// Verificação SOMENTE de leitura: valida a URL e confirma a identidade do banco.
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
    console.log(
      `Banco de integração verificado: ${config.toString()} (marcador OK).`,
    );
  } catch (error) {
    reportAndExit(error);
  }
}

function reportAndExit(error: unknown): never {
  console.error(
    error instanceof IntegrationGuardError
      ? `[${error.code}] ${error.message}`
      : 'Falha inesperada ao verificar o banco de integração.',
  );
  process.exit(1);
}

void main();
