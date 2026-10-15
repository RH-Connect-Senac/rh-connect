import { join } from 'path';

import { defineConfig } from 'prisma/config';

import {
  assertIntegrationEnvironment,
  collectDevelopmentUrls,
  IntegrationGuardError,
  pointsToSameDatabase,
} from './support/integration-db-guard';

// Configuração Prisma EXCLUSIVA da integração (R3.2.1-a). É a única usada pelo
// comando `db:integration:migrate` (via `prisma migrate ... --config <este
// arquivo>`); o `prisma.config.ts` de desenvolvimento NUNCA é carregado nesse
// fluxo.
//
// Diferenças deliberadas em relação ao de desenvolvimento:
// - não importa nem executa `dotenv`: nenhum `.env` altera a conexão;
// - a URL não vem de `env("DATABASE_URL")`: vem de `INTEGRATION_DATABASE_URL`,
//   já validada pela guarda no momento em que o Prisma carrega este arquivo;
// - qualquer falha de validação interrompe o carregamento (o Prisma não chega
//   a abrir conexão alguma);
// - sem `seed`: o seed não faz parte das migrations de integração.
//
// Mensagens de erro nunca contêm a URL nem a senha.

const apiRoot = join(__dirname, '..', '..');

const guarded = assertIntegrationEnvironment(
  process.env,
  collectDevelopmentUrls(process.env, { ignoreEnvDatabaseUrl: true }),
);

// O schema do projeto usa `env("DATABASE_URL")`. O comando protegido publica
// ali a MESMA URL de integração; se vier qualquer outra coisa (por exemplo,
// uma URL de desenvolvimento reinjetada por um `.env`), recusa.
const inherited = process.env.DATABASE_URL;
if (
  typeof inherited === 'string' &&
  inherited.trim() !== '' &&
  !pointsToSameDatabase(inherited, guarded.url)
) {
  throw new IntegrationGuardError(
    'PRISMA_TARGET_MISMATCH',
    'DATABASE_URL aponta para um banco diferente do banco de integração; migrations recusadas.',
  );
}

export default defineConfig({
  schema: join(apiRoot, 'prisma', 'schema.prisma'),
  migrations: {
    path: join(apiRoot, 'prisma', 'migrations'),
  },
  engine: 'classic',
  datasource: {
    url: guarded.url,
  },
});
