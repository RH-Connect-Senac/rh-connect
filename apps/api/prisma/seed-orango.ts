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
  categoriesProcessed: number;
  categoryLinksSynced: number;
  unknownCategoryCodesFound: number;
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

/**
 * Categorias (Etapa 3D.2 — somente ingestão de categoria/taxonomia):
 *
 * O campo `categoria` do JSON da Orango traz uma string com um ou mais
 * códigos numéricos separados por vírgula (ex.: "296", "67, 348"). Esses
 * códigos, isoladamente, não têm significado para o candidato — por isso a
 * Etapa 1 optou por não persisti-los em `area`/`section`.
 *
 * O mapeamento abaixo (código → nome oficial/slug) foi confirmado por
 * auditoria evidencial em etapa anterior: cada código foi cruzado contra a
 * tag de categoria exibida nas páginas públicas de curso do site da Orango
 * (orango.senac.br), usando o `slug` que aparece no link
 * `https://orango.senac.br/categoria/<slug>/`. Não é um mapeamento
 * inferido — é o mesmo mapeamento usado pelo próprio site da Orango.
 *
 * Este mapeamento só é usado para popular `external_resource_category`
 * (fonte "ORANGO") e sincronizar `external_resource_category_link`. Nenhuma
 * categoria fora desta lista é criada: um código não mapeado é contado em
 * `unknownCategoryCodesFound` e simplesmente não gera vínculo, sem
 * interromper o seed do curso correspondente.
 */
type OrangoCategoryDefinition = {
  code: string;
  name: string;
  slug: string;
};

const ORANGO_CATEGORIES: OrangoCategoryDefinition[] = [
  { code: '64', name: 'Marketing', slug: 'marketing' },
  { code: '67', name: 'Empreendedorismo', slug: 'empreendedorismo' },
  { code: '294', name: 'Criatividade', slug: 'criatividade' },
  { code: '295', name: 'Games', slug: 'games' },
  { code: '296', name: 'Audiovisual', slug: 'audiovisual' },
  { code: '297', name: 'Negócios', slug: 'negocios' },
  { code: '298', name: 'Comportamento', slug: 'comportamento' },
  { code: '304', name: 'Projetos', slug: 'projetos' },
  {
    code: '305',
    name: 'Inteligência artificial',
    slug: 'inteligencia-artificial',
  },
  { code: '347', name: 'Design', slug: 'design' },
  { code: '348', name: 'Inovação', slug: 'inovacao' },
  { code: '350', name: 'Gastronomia', slug: 'gastronomia' },
  { code: '351', name: 'Moda', slug: 'moda' },
  { code: '353', name: 'Turismo', slug: 'turismo' },
  { code: '362', name: 'Eventos', slug: 'eventos' },
  { code: '372', name: 'Meio Ambiente', slug: 'meio-ambiente' },
];

/**
 * Faz o parse do campo `categoria` (string com códigos separados por
 * vírgula) em uma lista de códigos únicos e normalizados (trim, sem vazios,
 * sem duplicados dentro do mesmo curso). Não valida contra o mapeamento
 * oficial aqui — a validação/descoberta de códigos desconhecidos acontece
 * em `seedOrangoResources`, onde o resultado é contabilizado.
 */
function parseOrangoCategoryCodes(value: unknown): string[] {
  if (typeof value !== 'string') {
    return [];
  }

  const codes = value
    .split(',')
    .map((code) => code.trim())
    .filter((code) => code.length > 0);

  const unique: string[] = [];
  for (const code of codes) {
    if (!unique.includes(code)) {
      unique.push(code);
    }
  }

  return unique;
}

/**
 * Upsert idempotente das 16 categorias oficiais da Orango em
 * `external_resource_category` (identidade: `[source, external_code]`).
 * Retorna um mapa código → `category_id` para resolver os vínculos de cada
 * curso sem uma consulta extra por curso.
 */
async function upsertOrangoCategories(
  prisma: PrismaClient,
): Promise<Map<string, string>> {
  const categoryIdByCode = new Map<string, string>();

  for (const category of ORANGO_CATEGORIES) {
    const record = await prisma.external_resource_category.upsert({
      where: {
        source_external_code: {
          source: ORANGO_SOURCE,
          external_code: category.code,
        },
      },
      update: {
        name: category.name,
        slug: category.slug,
        updated_at: new Date(),
      },
      create: {
        source: ORANGO_SOURCE,
        external_code: category.code,
        name: category.name,
        slug: category.slug,
      },
    });

    categoryIdByCode.set(category.code, record.category_id);
  }

  return categoryIdByCode;
}

/**
 * Sincroniza os vínculos de categoria de UM curso: apaga os vínculos
 * existentes desse `resource_id` e recria a partir do conjunto atual de
 * `categoryIds`. Isso (em vez de um upsert incremental) garante que, se uma
 * categoria for removida do JSON numa reimportação futura, o vínculo antigo
 * não fique órfão. As duas operações rodam numa transação por curso para
 * que nenhum curso fique momentaneamente sem nenhum vínculo entre o delete
 * e o recreate.
 */
async function syncOrangoCategoryLinks(
  prisma: PrismaClient,
  resourceId: string,
  categoryIds: string[],
): Promise<number> {
  return prisma.$transaction(async (tx) => {
    await tx.external_resource_category_link.deleteMany({
      where: { resource_id: resourceId },
    });

    if (categoryIds.length === 0) {
      return 0;
    }

    await tx.external_resource_category_link.createMany({
      data: categoryIds.map((categoryId) => ({
        resource_id: resourceId,
        category_id: categoryId,
      })),
    });

    return categoryIds.length;
  });
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
    categoriesProcessed: 0,
    categoryLinksSynced: 0,
    unknownCategoryCodesFound: 0,
  };

  const categoryIdByCode = await upsertOrangoCategories(prisma);
  result.categoriesProcessed = categoryIdByCode.size;
  const unknownCategoryCodes = new Set<string>();

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

    const upsertedResource = await prisma.external_learning_resource.upsert({
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

    const categoryCodes = parseOrangoCategoryCodes(resource.categoria);
    const resolvedCategoryIds: string[] = [];
    for (const code of categoryCodes) {
      const categoryId = categoryIdByCode.get(code);
      if (categoryId) {
        resolvedCategoryIds.push(categoryId);
      } else {
        unknownCategoryCodes.add(code);
      }
    }

    result.categoryLinksSynced += await syncOrangoCategoryLinks(
      prisma,
      upsertedResource.resource_id,
      resolvedCategoryIds,
    );
  }

  result.unknownCategoryCodesFound = unknownCategoryCodes.size;

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
