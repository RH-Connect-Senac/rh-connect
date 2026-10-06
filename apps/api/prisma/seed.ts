import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { readAccountsPassword, seedOfficialAccounts } from './seed-accounts';
import { seedOrangoResources } from './seed-orango';

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
  // Falha cedo, antes de tocar no banco, se a senha das contas não existir.
  const accountsPassword = readAccountsPassword();

  const { created, synced } = await seedOfficialAccounts(
    prisma,
    accountsPassword,
  );

  const cacholaResourcesCount = await seedCacholaResources();

  const orangoResult = await seedOrangoResources(prisma);

  console.log(
    `Seed concluído. Recursos Cachola importados: ${cacholaResourcesCount}.`,
  );
  console.log(
    `Recursos Orango importados: ${orangoResult.importedCount} de ${orangoResult.totalRecords} registros lidos.`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
