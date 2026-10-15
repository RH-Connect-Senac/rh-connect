import {
  assertIntegrationEnvironment,
  collectDevelopmentUrls,
  IntegrationGuardError,
  pointsToSameDatabase,
  verifyDatabaseIdentity,
  type DevelopmentUrlOptions,
  type GuardedIntegrationConfig,
  type IdentityQueryClient,
} from './integration-db-guard';

// Abertura do cliente Prisma dos testes de persistência (R3.2.1-b).
//
// Regra: NENHUM cliente de escrita existe antes de a configuração ser validada
// e de a identidade do banco (nome, usuário e marcador) ser confirmada por uma
// consulta de leitura. A URL vem EXCLUSIVAMENTE de INTEGRATION_DATABASE_URL e é
// passada explicitamente ao cliente; DATABASE_URL e `.env` nunca são fonte.
//
// Variáveis que poderiam apontar o Prisma para outro lugar (DATABASE_URL,
// DIRECT_URL, SHADOW_DATABASE_URL) só são aceitas se apontarem para o MESMO
// banco de integração; qualquer divergência interrompe antes de abrir conexão.

const CONFLICT_CHECKED_VARIABLES = [
  'DATABASE_URL',
  'DIRECT_URL',
  'SHADOW_DATABASE_URL',
] as const;

export type DisconnectableClient = IdentityQueryClient & {
  $disconnect(): Promise<unknown>;
};

export type ClientFactory<T extends DisconnectableClient> = (
  datasourceUrl: string,
) => T;

export interface VerifiedIntegrationHandle<T extends DisconnectableClient> {
  client: T;
  config: GuardedIntegrationConfig;
}

export function assertNoConflictingConnectionVariables(
  env: NodeJS.ProcessEnv,
  config: GuardedIntegrationConfig,
): void {
  for (const name of CONFLICT_CHECKED_VARIABLES) {
    const value = env[name];
    if (typeof value !== 'string' || value.trim() === '') continue;
    if (!pointsToSameDatabase(value, config.url)) {
      throw new IntegrationGuardError(
        'CONFLICTING_DATABASE_URL',
        `A variável ${name} aponta para um banco diferente do banco de integração; execução recusada.`,
      );
    }
  }
}

export async function openVerifiedIntegrationClient<
  T extends DisconnectableClient,
>(
  env: NodeJS.ProcessEnv,
  factory: ClientFactory<T>,
  options: Pick<DevelopmentUrlOptions, 'envFilePath'> = {},
): Promise<VerifiedIntegrationHandle<T>> {
  // 1. Validação pura (nenhuma conexão). O DATABASE_URL do ambiente não entra na
  //    comparação com o desenvolvimento porque o setup de integração o iguala à
  //    URL de integração; a divergência é tratada logo abaixo.
  const config = assertIntegrationEnvironment(
    env,
    collectDevelopmentUrls(env, {
      ignoreEnvDatabaseUrl: true,
      envFilePath: options.envFilePath,
    }),
  );
  assertNoConflictingConnectionVariables(env, config);

  // 2. Cliente com a URL validada, passada explicitamente.
  const client = factory(config.url);

  // 3. Identidade do banco por consulta de leitura, antes de devolver o cliente.
  try {
    await verifyDatabaseIdentity(client);
  } catch (error) {
    await client.$disconnect();
    throw error;
  }
  return { client, config };
}
