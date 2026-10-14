import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CACHOLA_SOURCE,
  createCacholaExternalKey,
  normalizeSeedText,
} from './cachola-external-key';

const prisma = new PrismaClient();

type CacholaSeedResource = {
  titulo: string;
  tipo: string;
  secao?: string | null;
  area?: string | null;
  link?: string | null;
  link_direto_disponivel?: boolean;
  capa?: string | null;
};

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
  const importedCount = await seedCacholaResources();

  console.log(
    `Seed da Cachola concluído. Recursos importados/atualizados: ${importedCount}.`,
  );
}

main()
  .catch((error) => {
    console.error('Erro ao executar seed da Cachola:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });