import type { MaterialAreaKey, MaterialNeeds } from './recommendation.types';

// Taxonomia editorial dos materiais do RH Connect, usada pela recomendação.
//
// É DADO EDITORIAL VERSIONADO: qualquer mudança de mapeamento (necessidades,
// área, material geral) deve incrementar `RH_TAXONOMY_VERSION`, para que cada
// recomendação futura registre com qual versão foi gerada.
//
// O conteúdo dos materiais continua no frontend (`apps/web/.../mocks/materials.ts`).
// Aqui ficam só os metadados que o motor precisa; um spec do frontend garante
// que `id`, `slug`, `title` e `area` batem com o catálogo real.
//
// Regras editoriais v1:
// - `primary`: necessidade que o material desenvolve de forma direta.
// - `secondary`: ajuda, mas não é o foco.
// - `generalPreparation`: pode ser usado como complemento geral de preparação
//   quando não houver necessidades específicas ou materiais suficientes.
// - Material de TI nunca é geral; necessidade `domain_knowledge` só tem
//   cobertura em TI. Para RH/Secretariado não há material de domínio técnico:
//   essa lacuna é conhecida e NÃO deve ser preenchida com material de TI.
export const RH_TAXONOMY_VERSION = 'rh-1';

export interface RhMaterialTaxonomyEntry {
  id: string;
  slug: string;
  title: string;
  area: MaterialAreaKey;
  needs: MaterialNeeds;
  generalPreparation: boolean;
}

export const RH_MATERIAL_TAXONOMY: readonly RhMaterialTaxonomyEntry[] = [
  {
    id: 'como-se-apresentar-em-entrevistas',
    slug: 'como-se-apresentar-em-entrevistas',
    title: 'Como se apresentar em entrevistas',
    area: 'GERAL',
    needs: { primary: ['objectivity', 'organization'], secondary: ['clarity'] },
    generalPreparation: true,
  },
  {
    id: 'elevator-pitch-para-entrevistas',
    slug: 'elevator-pitch-para-entrevistas',
    title: 'Elevator pitch para entrevistas',
    area: 'GERAL',
    needs: { primary: ['objectivity'], secondary: ['clarity', 'organization'] },
    generalPreparation: false,
  },
  {
    id: 'comunicacao-verbal-e-nao-verbal',
    slug: 'comunicacao-verbal-e-nao-verbal',
    title: 'Comunicação verbal e não verbal',
    area: 'GERAL',
    needs: { primary: ['clarity'], secondary: ['coherence'] },
    generalPreparation: false,
  },
  {
    id: 'como-articular-ideias-com-clareza',
    slug: 'como-articular-ideias-com-clareza',
    title: 'Como articular ideias com clareza',
    area: 'GERAL',
    needs: { primary: ['clarity', 'coherence'], secondary: ['organization', 'objectivity'] },
    generalPreparation: false,
  },
  {
    id: 'postura-e-linguagem-corporal',
    slug: 'postura-e-linguagem-corporal',
    title: 'Postura e linguagem corporal',
    area: 'GERAL',
    needs: { primary: [], secondary: [] },
    generalPreparation: true,
  },
  {
    id: 'metodo-star-explicado',
    slug: 'metodo-star-explicado',
    title: 'O método STAR explicado',
    area: 'GERAL',
    needs: { primary: ['organization', 'examples'], secondary: ['coherence'] },
    generalPreparation: true,
  },
  {
    id: 'star-na-pratica-exemplos-reais',
    slug: 'star-na-pratica-exemplos-reais',
    title: 'STAR na prática: exemplos reais',
    area: 'GERAL',
    needs: { primary: ['examples'], secondary: ['organization', 'coherence'] },
    generalPreparation: false,
  },
  {
    id: 'perguntas-comportamentais-mais-comuns',
    slug: 'perguntas-comportamentais-mais-comuns',
    title: 'Perguntas comportamentais mais comuns',
    area: 'GERAL',
    needs: { primary: ['examples'], secondary: ['requirements_alignment'] },
    generalPreparation: true,
  },
  {
    id: 'como-responder-fale-sobre-voce',
    slug: 'como-responder-fale-sobre-voce',
    title: "Como responder 'fale sobre você'",
    area: 'GERAL',
    needs: { primary: ['objectivity', 'requirements_alignment'], secondary: ['organization'] },
    generalPreparation: true,
  },
  {
    id: 'primeiro-emprego-como-se-preparar',
    slug: 'primeiro-emprego-como-se-preparar',
    title: 'Primeiro emprego: como se preparar',
    area: 'GERAL',
    needs: { primary: ['requirements_alignment'], secondary: [] },
    generalPreparation: false,
  },
  {
    id: 'jovem-aprendiz-direitos-e-oportunidades',
    slug: 'jovem-aprendiz-direitos-e-oportunidades',
    title: 'Jovem Aprendiz: direitos e oportunidades',
    area: 'GERAL',
    needs: { primary: [], secondary: ['requirements_alignment'] },
    generalPreparation: false,
  },
  {
    id: 'como-conquistar-uma-vaga-de-estagio',
    slug: 'como-conquistar-uma-vaga-de-estagio',
    title: 'Como conquistar uma vaga de estágio',
    area: 'GERAL',
    needs: { primary: [], secondary: ['requirements_alignment'] },
    generalPreparation: false,
  },
  {
    id: 'recolocacao-profissional-por-onde-comecar',
    slug: 'recolocacao-profissional-por-onde-comecar',
    title: 'Recolocação profissional: por onde começar',
    area: 'GERAL',
    needs: { primary: [], secondary: ['requirements_alignment'] },
    generalPreparation: false,
  },
  {
    id: 'perguntas-tecnicas-como-se-preparar',
    slug: 'perguntas-tecnicas-como-se-preparar',
    title: 'Perguntas técnicas: como se preparar',
    area: 'TI',
    needs: { primary: ['domain_knowledge'], secondary: ['requirements_alignment'] },
    generalPreparation: false,
  },
  {
    id: 'fundamentos-de-logica',
    slug: 'fundamentos-de-logica',
    title: 'Fundamentos de Lógica',
    area: 'TI',
    needs: { primary: ['domain_knowledge'], secondary: [] },
    generalPreparation: false,
  },
  {
    id: 'fundamentos-da-web',
    slug: 'fundamentos-da-web',
    title: 'Fundamentos da Web',
    area: 'TI',
    needs: { primary: ['domain_knowledge'], secondary: [] },
    generalPreparation: false,
  },
  {
    id: 'introducao-ao-javascript',
    slug: 'introducao-ao-javascript',
    title: 'Introdução ao JavaScript',
    area: 'TI',
    needs: { primary: ['domain_knowledge'], secondary: [] },
    generalPreparation: false,
  },
  {
    id: 'introducao-ao-git-e-versionamento',
    slug: 'introducao-ao-git-e-versionamento',
    title: 'Introdução ao Git e Versionamento',
    area: 'TI',
    needs: { primary: ['domain_knowledge'], secondary: [] },
    generalPreparation: false,
  },
  {
    id: 'responsividade-e-mobile-first',
    slug: 'responsividade-e-mobile-first',
    title: 'Responsividade e Mobile First',
    area: 'TI',
    needs: { primary: ['domain_knowledge'], secondary: [] },
    generalPreparation: false,
  },
];

export function findRhMaterialTaxonomy(
  materialId: string,
): RhMaterialTaxonomyEntry | undefined {
  return RH_MATERIAL_TAXONOMY.find((entry) => entry.id === materialId);
}
