import { Prisma, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();
const CACHOLA_SOURCE = 'CACHOLA';

type CacholaSeedResource = {
  titulo: string;
  tipo: string;
  secao?: string | null;
  area?: string | null;
  link?: string | null;
  link_direto_disponivel?: boolean;
  capa?: string | null;
};

function normalizeSeedText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function createCacholaExternalKey(resource: CacholaSeedResource) {
  const title = normalizeSeedText(resource.titulo).toLowerCase();
  const type = normalizeSeedText(resource.tipo).toLowerCase();

  return createHash('sha256')
    .update(`${CACHOLA_SOURCE}|${title}|${type}`)
    .digest('hex')
    .slice(0, 32);
}

function loadCacholaResources() {
  const filePath = join(__dirname, 'seed-data', 'cachola-recursos.json');
  const content = readFileSync(filePath, 'utf8');

  return JSON.parse(content) as CacholaSeedResource[];
}

async function seedCacholaResources() {
  const resources = loadCacholaResources();
  let importedCount = 0;

  for (const resource of resources) {
    const title = normalizeSeedText(resource.titulo);
    const resourceType = normalizeSeedText(resource.tipo);

    if (!title || !resourceType) {
      continue;
    }

    const externalKey = createCacholaExternalKey(resource);

    await prisma.external_learning_resource.upsert({
      where: { external_key: externalKey },
      update: {
        title,
        resource_type: resourceType,
        section: normalizeSeedText(resource.secao) || null,
        area: normalizeSeedText(resource.area) || null,
        url: normalizeSeedText(resource.link) || null,
        cover_url: normalizeSeedText(resource.capa) || null,
        direct_link_available: Boolean(resource.link_direto_disponivel),
        is_active: true,
        updated_at: new Date(),
      },
      create: {
        source: CACHOLA_SOURCE,
        external_key: externalKey,
        title,
        resource_type: resourceType,
        section: normalizeSeedText(resource.secao) || null,
        area: normalizeSeedText(resource.area) || null,
        url: normalizeSeedText(resource.link) || null,
        cover_url: normalizeSeedText(resource.capa) || null,
        direct_link_available: Boolean(resource.link_direto_disponivel),
        is_active: true,
      },
    });

    importedCount += 1;
  }

  return importedCount;
}

// ---------------------------------------------------------------------------
// Contas oficiais de suporte/desenvolvimento do RH Connect
//
// Este seed apenas GARANTE (bootstrap) essas contas. Ele NUNCA:
//  - cria candidatos (candidatos nascem só pelo cadastro real, POST /auth/register);
//  - apaga, limpa ou reseta dados do banco;
//  - sobrescreve senha, onboarding, status ou disponibilidade de contas existentes.
//
// `initialStatus` e `AVAILABLE` são valores de CRIAÇÃO, não de sincronização.
// ---------------------------------------------------------------------------
type OfficialRole = 'ADMIN' | 'EVALUATOR';

type OfficialAccount = {
  name: string;
  email: string;
  role: OfficialRole;
  initialStatus: 'ACTIVE' | 'INVITED';
  // Contas ACTIVE nascem com a senha de SEED_ACCOUNTS_PASSWORD; convidadas, sem senha.
  withPassword: boolean;
  // Presente só para avaliadores. Campos ausentes não são sincronizados.
  evaluatorProfile?: { area?: string; specialization?: string };
};

const OFFICIAL_ACCOUNTS: OfficialAccount[] = [
  {
    name: 'Admin RH Connect',
    email: 'admin.rhconnect@gmail.com',
    role: 'ADMIN',
    initialStatus: 'ACTIVE',
    withPassword: true,
  },
  {
    name: 'Carlos Andrade',
    email: 'carlos.andrade@gmail.com',
    role: 'EVALUATOR',
    initialStatus: 'ACTIVE',
    withPassword: true,
    evaluatorProfile: {
      area: 'Gestão de RH',
      specialization: 'Recrutamento e Seleção',
    },
  },
  {
    name: 'Eduardo Rocha',
    email: 'eduardo.rocha@gmail.com',
    role: 'EVALUATOR',
    initialStatus: 'ACTIVE',
    withPassword: true,
    evaluatorProfile: {
      area: 'Tecnologia da Informação',
      specialization: 'Gestão de Projetos de TI',
    },
  },
  {
    name: 'Camila Dias',
    email: 'camila.dias@gmail.com',
    role: 'EVALUATOR',
    initialStatus: 'ACTIVE',
    withPassword: true,
    evaluatorProfile: {
      area: 'Secretariado',
      specialization: 'Assessoria Executiva',
    },
  },
  {
    // Convidada: nasce INVITED e sem senha. O seed não cria token de convite
    // (ver comentário em seedOfficialAccounts).
    name: 'Patricia Gomes',
    email: 'patricia.gomes@gmail.com',
    role: 'EVALUATOR',
    initialStatus: 'INVITED',
    withPassword: false,
    evaluatorProfile: {},
  },
];

function readAccountsPassword() {
  const password = process.env.SEED_ACCOUNTS_PASSWORD;

  if (!password || password.trim().length === 0) {
    throw new Error(
      'SEED_ACCOUNTS_PASSWORD não está definida. Defina-a em apps/api/.env ' +
        '(senha inicial das contas oficiais Admin, Carlos, Eduardo e Camila) ' +
        'e execute o seed novamente. Nenhuma alteração foi feita no banco.',
    );
  }

  return password;
}

async function assertNoRoleConflicts(tx: Prisma.TransactionClient) {
  const existing = await tx.app_user.findMany({
    where: { email: { in: OFFICIAL_ACCOUNTS.map((account) => account.email) } },
    select: { email: true, user_role: true },
  });

  const expectedRoles = new Map<string, OfficialRole>(
    OFFICIAL_ACCOUNTS.map((account) => [account.email, account.role]),
  );

  const conflicts = existing.filter(
    (user) => expectedRoles.get(user.email) !== user.user_role,
  );

  if (conflicts.length > 0) {
    const details = conflicts
      .map(
        (user) =>
          `${user.email} (existe como ${user.user_role}, esperado ${expectedRoles.get(user.email)})`,
      )
      .join('; ');

    throw new Error(
      `Seed abortado: conta(s) oficial(is) já existem com role incompatível: ${details}. ` +
        'Corrija manualmente a conta no banco; o seed não altera roles existentes. ' +
        'Nenhuma alteração foi feita.',
    );
  }

  return new Set(existing.map((user) => user.email));
}

async function seedOfficialAccounts(accountsPassword: string) {
  // Hash calculado fora da transação para não segurá-la durante o bcrypt.
  const passwordHash = await bcrypt.hash(accountsPassword, 10);

  // Convite da Patricia: o seed NÃO cria token. Um token fixo ficaria no
  // repositório, e um aleatório não teria como ser entregue (o fluxo atual não
  // envia e-mail e não devolve o token). Patricia continua INVITED e sem senha
  // até o fluxo real de convite emitir um token. Se ela já foi ativada, o seed
  // não toca em status, senha, onboarding nem tokens dela.
  return prisma.$transaction(
    async (tx) => {
      // 1) Trava de role: lança erro antes de qualquer escrita.
      const alreadyExisting = await assertNoRoleConflicts(tx);

      const created: string[] = [];
      const synced: string[] = [];

      // 2) Escritas: criação com defaults; update só de campos estruturais.
      for (const account of OFFICIAL_ACCOUNTS) {
        const user = await tx.app_user.upsert({
          where: { email: account.email },
          // Só o nome oficial. Role já validada; status, senha e onboarding
          // de contas existentes nunca são alterados.
          update: { name: account.name },
          create: {
            name: account.name,
            email: account.email,
            password_hash: account.withPassword ? passwordHash : null,
            user_role: account.role,
            account_status: account.initialStatus,
            onboarding_completed_at:
              account.initialStatus === 'ACTIVE' ? new Date() : null,
          },
          select: { user_id: true },
        });

        if (account.evaluatorProfile) {
          const { area, specialization } = account.evaluatorProfile;

          await tx.evaluator_profile.upsert({
            where: { user_id: user.user_id },
            // Área e especialização são dados estruturais estáveis (campos
            // ausentes são ignorados). Disponibilidade nunca é sobrescrita.
            update: { area, specialization },
            create: {
              user_id: user.user_id,
              area,
              specialization,
              availability_status: 'AVAILABLE',
            },
          });
        }

        (alreadyExisting.has(account.email) ? synced : created).push(
          account.email,
        );
      }

      return { created, synced };
    },
    { maxWait: 10000, timeout: 30000 },
  );
}

async function main() {
  // Falha cedo, antes de tocar no banco, se a senha das contas não existir.
  const accountsPassword = readAccountsPassword();

  const { created, synced } = await seedOfficialAccounts(accountsPassword);

  const cacholaResourcesCount = await seedCacholaResources();

  console.log(
    `Seed concluído. Contas oficiais criadas: ${created.length} ` +
      `(${created.join(', ') || 'nenhuma'}); já existentes e sincronizadas ` +
      `(nome/perfil): ${synced.length}. ` +
      `Recursos Cachola importados: ${cacholaResourcesCount}.`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
