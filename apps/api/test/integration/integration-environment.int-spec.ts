import { PrismaClient } from '@prisma/client';

import {
  INTEGRATION_URL_VARIABLE,
  verifyDatabaseIdentity,
} from './support/integration-db-guard';

// Teste de infraestrutura, SOMENTE leitura: confirma que o processo de teste usa
// exclusivamente a URL de integração e que o banco conectado tem a identidade
// esperada. Não cria, altera nem apaga dados.
describe('Ambiente de integração (somente leitura)', () => {
  let client: PrismaClient;

  beforeAll(() => {
    client = new PrismaClient();
  });

  afterAll(async () => {
    await client.$disconnect();
  });

  it('DATABASE_URL do processo é a URL de integração validada', () => {
    expect(process.env.DATABASE_URL).toBeDefined();
    expect(process.env.DATABASE_URL).toBe(
      process.env[INTEGRATION_URL_VARIABLE]?.trim(),
    );
  });

  it('a conexão aberta tem a identidade do banco de integração', async () => {
    await expect(verifyDatabaseIdentity(client)).resolves.toBeUndefined();
  });
});
