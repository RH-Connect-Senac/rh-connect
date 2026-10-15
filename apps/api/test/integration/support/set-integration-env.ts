import {
  assertIntegrationEnvironment,
  collectDevelopmentUrls,
} from './integration-db-guard';

// Executa em cada arquivo de teste de integração, antes dos imports do teste.
// Revalida a URL e a publica como DATABASE_URL SOMENTE neste processo, para que
// PrismaClient/PrismaService usem o banco de integração e nunca o `.env`.
// A comparação estrita com o DATABASE_URL do ambiente já foi feita no
// globalSetup (antes desta substituição); aqui ela é ignorada porque, a partir
// do segundo arquivo, DATABASE_URL já é a própria URL de integração.
const config = assertIntegrationEnvironment(
  process.env,
  collectDevelopmentUrls(process.env, { ignoreEnvDatabaseUrl: true }),
);
process.env.DATABASE_URL = config.url;
