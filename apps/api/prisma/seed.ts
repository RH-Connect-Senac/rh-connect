import { PrismaClient } from '@prisma/client';
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

async function main() {
  const password_hash = await bcrypt.hash('RhConnect@2026', 10);

  // CANDIDATE 1
  const candidato1 = await prisma.app_user.upsert({
    where: { email: 'candidato1.rhconnect@gmail.com' },
    update: {},
    create: {
      name: 'João Lima (demo)',
      email: 'candidato1.rhconnect@gmail.com',
      password_hash,
      user_role: 'CANDIDATE',
      account_status: 'ACTIVE',
      onboarding_completed_at: new Date(),
    },
  });

  await prisma.candidate_profile.upsert({
    where: { user_id: candidato1.user_id },
    update: {},
    create: {
      user_id: candidato1.user_id,
    },
  });

  // CANDIDATE 2
  const candidato2 = await prisma.app_user.upsert({
    where: { email: 'candidato2.rhconnect@gmail.com' },
    update: {},
    create: {
      name: 'Novo candidato (demo)',
      email: 'candidato2.rhconnect@gmail.com',
      password_hash,
      user_role: 'CANDIDATE',
      account_status: 'ACTIVE',
      onboarding_completed_at: null,
    },
  });

  await prisma.candidate_profile.upsert({
    where: { user_id: candidato2.user_id },
    update: {},
    create: {
      user_id: candidato2.user_id,
    },
  });

  // EVALUATOR ACTIVE
  await prisma.app_user.upsert({
    where: { email: 'carlos.andrade@gmail.com' },
    update: {},
    create: {
      name: 'Carlos Andrade (demo)',
      email: 'carlos.andrade@gmail.com',
      password_hash,
      user_role: 'EVALUATOR',
      account_status: 'ACTIVE',
      onboarding_completed_at: new Date(),
    },
  });

  // ADMIN
  await prisma.app_user.upsert({
    where: { email: 'admin.rhconnect@gmail.com' },
    update: {},
    create: {
      name: 'Admin (demo)',
      email: 'admin.rhconnect@gmail.com',
      password_hash,
      user_role: 'ADMIN',
      account_status: 'ACTIVE',
      onboarding_completed_at: new Date(),
    },
  });

  // EVALUATOR INVITED
  const avaliadorConvidado = await prisma.app_user.upsert({
    where: { email: 'patricia.gomes@gmail.com' },
    update: {},
    create: {
      name: 'Patricia Gomes (demo)',
      email: 'patricia.gomes@gmail.com',
      password_hash: null,
      user_role: 'EVALUATOR',
      account_status: 'INVITED',
      onboarding_completed_at: null,
    },
  });

  await prisma.evaluator_profile.upsert({
    where: { user_id: avaliadorConvidado.user_id },
    update: {},
    create: {
      user_id: avaliadorConvidado.user_id,
    },
  });

  const activationToken = 'seed-evaluator-invite-token';

  const token_hash = createHash('sha256')
    .update(activationToken)
    .digest('hex');

  const expires_at = new Date();
  expires_at.setDate(expires_at.getDate() + 7);

  await prisma.account_activation_token.upsert({
    where: { token_hash },
    update: {},
    create: {
      user_id: avaliadorConvidado.user_id,
      token_hash,
      token_purpose: 'EVALUATOR_INVITE',
      expires_at,
    },
  });

  const cacholaResourcesCount = await seedCacholaResources();

  console.log(`Seed concluído. Recursos Cachola importados: ${cacholaResourcesCount}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
