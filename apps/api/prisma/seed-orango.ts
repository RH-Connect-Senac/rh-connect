import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Seed de ingestão do catálogo real da Orango na tabela existente
 * `external_learning_resource` (a mesma usada pela Cachola).
 *
 * Decisões desta etapa (Etapa 1 — somente ingestão/persistência):
 * - `source` = "ORANGO".
 * - `resource_type` = "Curso" (valor fixo): o model exige o campo (obrigatório,
 *   sem default) e o JSON da Orango não fornece um equivalente explícito; "Curso"
 *   é o menor rótulo defensável dado o conteúdo do catálogo, seguindo o padrão de
 *   rótulos em português já usado pela Cachola ("Vídeo", "Podcast", "eBook").
 * - `area` = null: a coluna aceita null e não existe mapa oficial de
 *   código→significado para os códigos numéricos de categoria da Orango
 *   (ex.: "296", "67, 348"). Não são inventados valores de área.
 * - `section` = não preenchido (permanece null): esse campo É exibido
 *   diretamente ao candidato no front quando preenchido, então gravar os
 *   códigos brutos de categoria aqui os exporia como um rótulo sem sentido.
 *   Por isso, os códigos de categoria da Orango NÃO são persistidos nesta etapa.
 * - `direct_link_available` = true: o link da Orango aponta diretamente para a
 *   página do curso específico, no mesmo padrão dos links da Cachola marcados
 *   como diretos; o campo hoje não tem nenhum efeito condicional no front.
 * - `descricao`, `competencias`, `duracao` e os códigos de `categoria` não
 *   possuem coluna equivalente no model atual e não são persistidos nesta
 *   etapa (nenhuma migration é feita para acomodá-los).
 *
 * Esta função recebe o PrismaClient do chamador — não cria nem desconecta
 * nenhuma conexão própria. Isso permite reutilizá-la a partir do seed
 * principal (`seed.ts`, usando o mesmo client já aberto) e também rodá-la de
 * forma isolada via `pnpm run seed:orango` (que usa seu próprio client,
 * criado e desconectado apenas no bloco `main()` abaixo).
 */

export const ORANGO_SOURCE = 'ORANGO';

type OrangoSeedResource = {
  id?: number | string | null;
  titulo?: string | null;
  descricao?: string | null;
  categoria?: string | null;
  competencias?: unknown;
  duracao?: unknown;
  imagem?: string | null;
  link?: string | null;
  plataforma?: string | null;
};

export type SeedOrangoResult = {
  totalRecords: number;
  importedCount: number;
  skippedMissingId: number;
  skippedMissingTitle: number;
  skippedMissingLink: number;
  skippedDuplicateIdInBatch: number;
};

function normalizeSeedText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeOrangoId(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return null;
}

/**
 * Identidade conceitual: ORANGO + ID nativo do curso.
 * Formato: "ORANGO|<id>" (ex.: "ORANGO|42").
 *
 * Diferente da Cachola (que não possui ID nativo e por isso usa um hash do
 * título+tipo), a Orango fornece um ID numérico estável — por isso a chave
 * concatena a fonte e o ID diretamente, sem hash, evitando a fragilidade de
 * derivar identidade de texto livre (título) quando já existe um
 * identificador confiável. O prefixo "ORANGO|" garante namespace por fonte e
 * não colide com o formato de hash hexadecimal de 32 caracteres usado pela
 * Cachola. Cabe com folga no limite da coluna (VarChar(128)).
 */
export function createOrangoExternalKey(externalId: string): string {
  return `${ORANGO_SOURCE}|${externalId}`;
}

function loadOrangoResources(): OrangoSeedResource[] {
  const filePath = join(__dirname, 'seed-data', 'orango-cursos.json');
  const content = readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(content);

  if (!Array.isArray(parsed)) {
    throw new Error(
      'orango-cursos.json não contém uma lista de registros (esperado um array JSON).',
    );
  }

  return parsed as OrangoSeedResource[];
}

export async function seedOrangoResources(
  prisma: PrismaClient,
): Promise<SeedOrangoResult> {
  const resources = loadOrangoResources();

  const result: SeedOrangoResult = {
    totalRecords: resources.length,
    importedCount: 0,
    skippedMissingId: 0,
    skippedMissingTitle: 0,
    skippedMissingLink: 0,
    skippedDuplicateIdInBatch: 0,
  };

  const seenIds = new Set<string>();

  for (const resource of resources) {
    const externalId = normalizeOrangoId(resource.id);
    if (!externalId) {
      result.skippedMissingId += 1;
      continue;
    }

    const title = normalizeSeedText(resource.titulo);
    if (!title) {
      result.skippedMissingTitle += 1;
      continue;
    }

    const link = normalizeSeedText(resource.link);
    if (!link) {
      result.skippedMissingLink += 1;
      continue;
    }

    if (seenIds.has(externalId)) {
      result.skippedDuplicateIdInBatch += 1;
      continue;
    }
    seenIds.add(externalId);

    const externalKey = createOrangoExternalKey(externalId);
    const coverUrl = normalizeSeedText(resource.imagem) || null;

    await prisma.external_learning_resource.upsert({
      where: { external_key: externalKey },
      update: {
        title,
        resource_type: 'Curso',
        area: null,
        url: link,
        cover_url: coverUrl,
        direct_link_available: true,
        is_active: true,
        updated_at: new Date(),
      },
      create: {
        source: ORANGO_SOURCE,
        external_key: externalKey,
        title,
        resource_type: 'Curso',
        area: null,
        url: link,
        cover_url: coverUrl,
        direct_link_available: true,
        is_active: true,
      },
    });

    result.importedCount += 1;
  }

  return result;
}

async function main() {
  const prisma = new PrismaClient();

  try {
    const result = await seedOrangoResources(prisma);

    console.log('Seed do Orango concluído.');
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

// Só executa automaticamente quando o arquivo é rodado diretamente
// (ex.: `pnpm run seed:orango`). Ao ser importado por `seed.ts`, nada aqui
// roda sozinho — só a função `seedOrangoResources` é usada, com o
// PrismaClient do chamador.
if (require.main === module) {
  main().catch((error) => {
    console.error('Erro ao executar seed do Orango:', error);
    process.exit(1);
  });
}
