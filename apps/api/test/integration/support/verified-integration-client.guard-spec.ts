import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import {
  INTEGRATION_DB_MARKER,
  IntegrationGuardError,
  type IntegrationGuardCode,
} from './integration-db-guard';
import {
  openVerifiedIntegrationClient,
  type DisconnectableClient,
} from './verified-integration-client';

// Testes UNITÁRIOS (sem banco) da abertura segura do cliente usado pela suíte de
// persistência: tudo que precisa falhar, falha ANTES de qualquer escrita, e o
// cliente falso só aceita as duas operações de leitura/encerramento.

const SECRET = 'S3gr3d0-Unico-Do-Teste';
const DEV_PASSWORD = 'outra-senha';
const VALID_URL = `postgresql://rhconnect_it_user:${SECRET}@127.0.0.1:5432/rhconnect_it?schema=public`;
const DEV_URL = `postgresql://dev_user:${DEV_PASSWORD}@localhost:5432/rh_connect`;

const GOOD_ROW = {
  database_name: 'rhconnect_it',
  user_name: 'rhconnect_it_user',
  marker: INTEGRATION_DB_MARKER,
};

interface Probe {
  factory: jest.Mock<DisconnectableClient, [string]>;
  accessed: string[];
}

// Cliente falso: qualquer propriedade além de $queryRaw/$disconnect (ou seja,
// qualquer modelo/escrita) derruba o teste.
function probe(outcome: Record<string, unknown> | Error): Probe {
  const accessed: string[] = [];
  const client = new Proxy(
    {},
    {
      get(_target, property) {
        const name = String(property);
        accessed.push(name);
        if (name === '$queryRaw') {
          return () =>
            outcome instanceof Error
              ? Promise.reject(outcome)
              : Promise.resolve([outcome]);
        }
        if (name === '$disconnect') return () => Promise.resolve();
        throw new Error(`Acesso não permitido ao cliente: ${name}`);
      },
    },
  ) as DisconnectableClient;
  return {
    factory: jest.fn<DisconnectableClient, [string]>(() => client),
    accessed,
  };
}

async function failureOf(
  action: Promise<unknown>,
): Promise<{ code: IntegrationGuardCode; message: string }> {
  try {
    await action;
  } catch (error) {
    if (error instanceof IntegrationGuardError) {
      return { code: error.code, message: error.message };
    }
    throw error;
  }
  throw new Error('Esperava IntegrationGuardError');
}

function expectNoLeak(message: string) {
  expect(message).not.toContain(SECRET);
  expect(message).not.toContain(DEV_PASSWORD);
  expect(message).not.toContain('postgresql://');
}

describe('openVerifiedIntegrationClient', () => {
  it('abre o cliente com a URL de integração explícita e só usa leitura/encerramento', async () => {
    const { factory, accessed } = probe(GOOD_ROW);
    const handle = await openVerifiedIntegrationClient(
      { INTEGRATION_DATABASE_URL: VALID_URL },
      factory,
    );
    expect(factory).toHaveBeenCalledTimes(1);
    expect(factory).toHaveBeenCalledWith(VALID_URL);
    expect(handle.config.toString()).toBe(
      'rhconnect_it_user@127.0.0.1:5432/rhconnect_it',
    );
    expect(accessed).toEqual(['$queryRaw']);
  });

  it('aceita DATABASE_URL igual à de integração (como deixa o setup do Jest)', async () => {
    const { factory } = probe(GOOD_ROW);
    await expect(
      openVerifiedIntegrationClient(
        { INTEGRATION_DATABASE_URL: VALID_URL, DATABASE_URL: VALID_URL },
        factory,
      ),
    ).resolves.toBeDefined();
  });

  it('URL de integração ausente: falha sem criar nenhum cliente', async () => {
    const { factory } = probe(GOOD_ROW);
    for (const env of [
      {},
      { DATABASE_URL: DEV_URL },
      { INTEGRATION_DATABASE_URL: ' ' },
    ]) {
      const failure = await failureOf(
        openVerifiedIntegrationClient(env, factory),
      );
      expect(failure.code).toBe('MISSING_URL');
      expectNoLeak(failure.message);
    }
    expect(factory).not.toHaveBeenCalled();
  });

  it('banco, host, porta ou usuário diferentes do permitido: falha sem criar cliente', async () => {
    const { factory } = probe(GOOD_ROW);
    const variants: Array<[string, RegExp]> = [
      [
        VALID_URL.replace('/rhconnect_it?', '/rh_connect?'),
        /^INVALID_DATABASE$/,
      ],
      [VALID_URL.replace('127.0.0.1', 'localhost'), /^INVALID_HOST$/],
      [VALID_URL.replace(':5432', ':5433'), /^INVALID_PORT$/],
      [VALID_URL.replace('rhconnect_it_user', 'postgres'), /^INVALID_USER$/],
      [DEV_URL, /^INVALID_/],
    ];
    for (const [url, code] of variants) {
      const failure = await failureOf(
        openVerifiedIntegrationClient(
          { INTEGRATION_DATABASE_URL: url },
          factory,
        ),
      );
      expect(failure.code).toMatch(code);
      expectNoLeak(failure.message);
    }
    expect(factory).not.toHaveBeenCalled();
  });

  it('NODE_ENV=production: falha sem criar cliente', async () => {
    const { factory } = probe(GOOD_ROW);
    const failure = await failureOf(
      openVerifiedIntegrationClient(
        { INTEGRATION_DATABASE_URL: VALID_URL, NODE_ENV: 'production' },
        factory,
      ),
    );
    expect(failure.code).toBe('PRODUCTION_ENV');
    expect(factory).not.toHaveBeenCalled();
  });

  it.each(['DATABASE_URL', 'DIRECT_URL', 'SHADOW_DATABASE_URL'])(
    '%s de desenvolvimento no ambiente: falha sem criar cliente',
    async (name) => {
      const { factory } = probe(GOOD_ROW);
      const failure = await failureOf(
        openVerifiedIntegrationClient(
          { INTEGRATION_DATABASE_URL: VALID_URL, [name]: DEV_URL },
          factory,
        ),
      );
      expect(failure.code).toBe('CONFLICTING_DATABASE_URL');
      expect(failure.message).toContain(name);
      expectNoLeak(failure.message);
      expect(factory).not.toHaveBeenCalled();
    },
  );

  it('variáveis conflitantes juntas (dev + integração): sempre recusa', async () => {
    const { factory } = probe(GOOD_ROW);
    const failure = await failureOf(
      openVerifiedIntegrationClient(
        {
          INTEGRATION_DATABASE_URL: VALID_URL,
          DATABASE_URL: VALID_URL,
          DIRECT_URL: DEV_URL,
        },
        factory,
      ),
    );
    expect(failure.code).toBe('CONFLICTING_DATABASE_URL');
    expect(factory).not.toHaveBeenCalled();
  });

  it('URL de integração igual à do .env de desenvolvimento: SAME_AS_DEVELOPMENT', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rhc-verified-'));
    try {
      const envFile = join(dir, '.env');
      writeFileSync(envFile, `DATABASE_URL="${VALID_URL}"\n`);
      const { factory } = probe(GOOD_ROW);
      const failure = await failureOf(
        openVerifiedIntegrationClient(
          { INTEGRATION_DATABASE_URL: VALID_URL },
          factory,
          { envFilePath: envFile },
        ),
      );
      expect(failure.code).toBe('SAME_AS_DEVELOPMENT');
      expectNoLeak(failure.message);
      expect(factory).not.toHaveBeenCalled();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('marcador ausente ou incorreto: falha, encerra o cliente e não o devolve', async () => {
    for (const marker of [null, 'outro-marcador', '']) {
      const { factory, accessed } = probe({ ...GOOD_ROW, marker });
      const failure = await failureOf(
        openVerifiedIntegrationClient(
          { INTEGRATION_DATABASE_URL: VALID_URL },
          factory,
        ),
      );
      expect(failure.code).toBe('MARKER_MISSING');
      expect(accessed).toEqual(['$queryRaw', '$disconnect']);
      expectNoLeak(failure.message);
    }
  });

  it('banco ou usuário conectado diferentes do esperado: IDENTITY_MISMATCH', async () => {
    for (const row of [
      { ...GOOD_ROW, database_name: 'rh_connect' },
      { ...GOOD_ROW, user_name: 'postgres' },
    ]) {
      const { factory, accessed } = probe(row);
      const failure = await failureOf(
        openVerifiedIntegrationClient(
          { INTEGRATION_DATABASE_URL: VALID_URL },
          factory,
        ),
      );
      expect(failure.code).toBe('IDENTITY_MISMATCH');
      expect(accessed).toEqual(['$queryRaw', '$disconnect']);
    }
  });

  it('falha na consulta de identidade: IDENTITY_CHECK_FAILED, sem vazar o erro original', async () => {
    const { factory, accessed } = probe(
      new Error(`conexão recusada ${DEV_URL} ${VALID_URL}`),
    );
    const failure = await failureOf(
      openVerifiedIntegrationClient(
        { INTEGRATION_DATABASE_URL: VALID_URL },
        factory,
      ),
    );
    expect(failure.code).toBe('IDENTITY_CHECK_FAILED');
    expect(accessed).toEqual(['$queryRaw', '$disconnect']);
    expectNoLeak(failure.message);
  });
});

describe('proteções estáticas da suíte de persistência', () => {
  const integrationRoot = join(__dirname, '..');
  const persistenceDir = join(integrationRoot, 'persistence');
  const files = readdirSync(persistenceDir)
    .filter((name) => name.endsWith('.ts'))
    .map((name) => ({
      name,
      content: readFileSync(join(persistenceDir, name), 'utf8')
        .split(/\r?\n/)
        .filter((line) => !/^\s*\/\//.test(line))
        .join('\n'),
    }));
  const spec = files.find((file) => file.name.endsWith('.persist-spec.ts'));
  const fixtures = files.find(
    (file) => file.name === 'persistence-fixtures.ts',
  );

  it('a suíte e as fixtures existem', () => {
    expect(spec).toBeDefined();
    expect(fixtures).toBeDefined();
  });

  it('nenhuma operação ampla ou destrutiva, DDL, reset, push nem fonte de conexão alternativa', () => {
    for (const { content } of files) {
      expect(content).not.toMatch(
        /TRUNCATE|\bDROP\b|deleteMany|\$executeRaw|\$queryRawUnsafe|migrate\s+(reset|dev|deploy)|db\s+push/i,
      );
      expect(content).not.toMatch(/DATABASE_URL|dotenv|readFileSync/);
      expect(content).not.toMatch(/\.updateMany\(|\.upsert\(/);
    }
  });

  it('remoção só de linha única em app_user, e só nas fixtures', () => {
    for (const { name, content } of files) {
      const all = content.match(/\.delete\(/g) ?? [];
      const users = content.match(/app_user\.delete\(/g) ?? [];
      expect(all).toHaveLength(users.length);
      if (name !== 'persistence-fixtures.ts') expect(all).toHaveLength(0);
    }
    expect(fixtures?.content).toContain('isFixtureEmail');
  });

  it('todo cliente nasce da abertura verificada, com URL explícita', () => {
    expect(spec?.content).toContain('openVerifiedIntegrationClient(');
    for (const { content } of files) {
      for (const match of content.matchAll(
        /new (PrismaClient|PrismaService)\(([^)]*)\)/g,
      )) {
        expect(match[2]).toContain('datasourceUrl');
      }
    }
    expect(spec?.content).not.toMatch(/new PrismaClient\(/);
  });

  it('a verificação de identidade vem antes de qualquer fixture na suíte', () => {
    const content = spec?.content ?? '';
    const opened = content.indexOf('openVerifiedIntegrationClient(');
    const firstWrite = content.indexOf('sweepStaleFixtures');
    expect(opened).toBeGreaterThan(-1);
    expect(firstWrite).toBeGreaterThan(opened);
    expect(content.indexOf('createInterview')).toBeGreaterThan(opened);
  });

  it('o comando dedicado usa só .env.integration, config própria e execução em série', () => {
    const packageJson = JSON.parse(
      readFileSync(join(integrationRoot, '..', '..', 'package.json'), 'utf8'),
    ) as { scripts: Record<string, string> };
    expect(packageJson.scripts['test:integration:persistence']).toBe(
      'dotenv -e .env.integration -- jest --config ./test/integration/jest-integration-persistence.config.js --runInBand',
    );
  });

  it('a configuração da persistência isola o sufixo .persist-spec.ts dos demais runners', () => {
    const config = readFileSync(
      join(integrationRoot, 'jest-integration-persistence.config.js'),
      'utf8',
    );
    expect(config).toContain("testRegex: '\\\\.persist-spec\\\\.ts$'");
    expect(config).toContain('maxWorkers: 1');
    expect(config).toContain('support/global-setup.ts');
    expect(config).toContain('support/set-integration-env.ts');
    const persist = /\.persist-spec\.ts$/;
    const sample = 'a.persist-spec.ts';
    expect(persist.test(sample)).toBe(true);
    // Nenhum outro runner captura o arquivo de persistência (que escreve).
    expect(/\.int-spec\.ts$/.test(sample)).toBe(false);
    expect(/\.guard-spec\.ts$/.test(sample)).toBe(false);
    expect(/.*\.spec\.ts$/.test(sample)).toBe(false);
    expect(/.e2e-spec.ts$/.test(sample)).toBe(false);
    // E o runner somente-leitura não captura a persistência.
    expect(persist.test('a.int-spec.ts')).toBe(false);
    const readOnly = readFileSync(
      join(integrationRoot, 'jest-integration.config.js'),
      'utf8',
    );
    expect(readOnly).toContain("testRegex: '\\\\.int-spec\\\\.ts$'");
  });
});
