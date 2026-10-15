import { PrismaClient } from '@prisma/client';

import {
  assertIntegrationEnvironment,
  collectDevelopmentUrls,
  verifyDatabaseIdentity,
} from './integration-db-guard';

// Roda uma vez antes de qualquer teste de integração. Valida o ambiente e
// confirma a identidade do banco com uma consulta SOMENTE de leitura. Não aplica
// migrations, não escreve e não limpa nada. Se falhar, nenhum teste executa.
export default async function globalSetup(): Promise<void> {
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
}
