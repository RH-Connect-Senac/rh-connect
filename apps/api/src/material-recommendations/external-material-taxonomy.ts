import type { MaterialAreaKey, MaterialNeeds } from './recommendation.types';

// Taxonomia editorial dos materiais EXTERNOS (Cachola e Orango) que podem
// participar da recomendação. É uma curadoria pequena e deliberada: só entram
// itens com relação defensável com uma das 7 necessidades da avaliação ou com
// a preparação geral para entrevistas. O catálogo completo continua nos seeds.
//
// Referência persistente: `externalKey` (a mesma de `external_learning_resource`).
// Nunca o UUID do banco, que muda por ambiente. `title` e `resourceType` são
// metadados de legibilidade (a chave da Cachola é um hash) e são validados
// contra os seeds por spec; não são fonte de verdade.
//
// Bump de versão sempre que a curadoria mudar.
export const EXTERNAL_TAXONOMY_VERSION = 'ext-1';

export type ExternalMaterialSource = 'CACHOLA' | 'ORANGO';

export interface ExternalMaterialTaxonomyEntry {
  source: ExternalMaterialSource;
  externalKey: string;
  title: string;
  resourceType: string;
  area: MaterialAreaKey;
  needs: MaterialNeeds;
  generalPreparation: boolean;
  rationale: string;
}

export const EXTERNAL_MATERIAL_TAXONOMY: readonly ExternalMaterialTaxonomyEntry[] =
  [
    // ---- Cachola ----
    {
      source: 'CACHOLA',
      externalKey: '352c172a38592288cb5406c7e7aff3c7',
      title: 'Comunicação assertiva: técnicas para aplicar no dia a dia #8',
      resourceType: 'Podcast',
      area: 'GERAL',
      needs: { primary: ['clarity'], secondary: ['objectivity'] },
      generalPreparation: false,
      rationale:
        'Comunicação assertiva ajuda a falar de forma clara e direta, sem rodeios.',
    },
    {
      source: 'CACHOLA',
      externalKey: '3aa0672a1d96ad10e75a9c75f74e3871',
      title: 'Comunicação e oratória: como falar bem',
      resourceType: 'Podcast',
      area: 'GERAL',
      needs: { primary: ['clarity'], secondary: ['organization'] },
      generalPreparation: false,
      rationale:
        'Oratória trabalha dicção, ritmo e estrutura da fala, base de uma resposta clara.',
    },
    {
      source: 'CACHOLA',
      externalKey: 'db7cf13bec46a94bb0483e7a802152b2',
      title:
        'Persuasão: como usar a retórica e a comunicação persuasiva na sua vida pessoal e profissional',
      resourceType: 'eBook',
      area: 'GERAL',
      needs: { primary: ['coherence'], secondary: ['organization'] },
      generalPreparation: false,
      rationale:
        'Retórica e argumentação ensinam a encadear ideias até uma conclusão consistente.',
    },
    {
      source: 'CACHOLA',
      externalKey: 'c5a8088f375aa1535bc228e1b6f0ef30',
      title: 'Sua Carreira: como fazer pitch profissional',
      resourceType: 'Vídeo',
      area: 'GERAL',
      needs: { primary: ['objectivity'], secondary: ['requirements_alignment'] },
      generalPreparation: true,
      rationale:
        'O pitch treina apresentar a trajetória de forma curta e dirigida ao que o interlocutor busca.',
    },
    {
      source: 'CACHOLA',
      externalKey: 'b1072805301187580f1e5ee8bb008cc4',
      title: 'Como desenvolver o pensamento computacional?',
      resourceType: 'Vídeo',
      area: 'TI',
      needs: { primary: ['domain_knowledge'], secondary: [] },
      generalPreparation: false,
      rationale:
        'Fundamento técnico de tecnologia: decomposição, padrões e abstração de problemas.',
    },
    {
      source: 'CACHOLA',
      externalKey: '7fe4e57c331003795974d1acc6300fc5',
      title: 'O que é cloud computing e como funciona? Computação em Nuvem',
      resourceType: 'Vídeo',
      area: 'TI',
      needs: { primary: ['domain_knowledge'], secondary: [] },
      generalPreparation: false,
      rationale:
        'Conceito técnico recorrente em vagas de tecnologia, útil para ganhar repertório da área.',
    },
    {
      source: 'CACHOLA',
      externalKey: '8dd795a58c91c5db06d57ba448fc1ae4',
      title: 'Diversidade e inclusão: e suas dimensões',
      resourceType: 'eBook',
      area: 'RH',
      needs: { primary: ['domain_knowledge'], secondary: [] },
      generalPreparation: false,
      rationale:
        'Conhecimento de área para quem atua ou se candidata em recursos humanos.',
    },
    // ---- Orango ----
    {
      source: 'ORANGO',
      externalKey: 'ORANGO|74',
      title: 'Etiqueta profissional: imagem que inspira credibilidade',
      resourceType: 'Curso',
      area: 'GERAL',
      needs: { primary: [], secondary: ['clarity'] },
      generalPreparation: true,
      rationale:
        'Postura, comunicação e imagem profissional: preparação geral para o dia da entrevista.',
    },
    {
      source: 'ORANGO',
      externalKey: 'ORANGO|95',
      title: 'Gestão de carreira: planeje seu futuro com propósito',
      resourceType: 'Curso',
      area: 'GERAL',
      needs: { primary: ['requirements_alignment'], secondary: [] },
      generalPreparation: false,
      rationale:
        'Posicionamento e planejamento de carreira ajudam a ligar a experiência ao que a vaga pede.',
    },
    {
      source: 'ORANGO',
      externalKey: 'ORANGO|99',
      title: 'Conexão real: comunicação não-violenta com empatia',
      resourceType: 'Curso',
      area: 'GERAL',
      needs: { primary: [], secondary: ['clarity'] },
      generalPreparation: false,
      rationale:
        'Comunicar com mais assertividade e diálogos mais claros; apoio, não solução principal.',
    },
    {
      source: 'ORANGO',
      externalKey: 'ORANGO|54',
      title: 'Gestão ágil de projetos com Scrum e Kanban',
      resourceType: 'Curso',
      area: 'TI',
      needs: { primary: ['domain_knowledge'], secondary: [] },
      generalPreparation: false,
      rationale:
        'Métodos ágeis são conhecimento técnico recorrente em vagas de tecnologia.',
    },
    {
      source: 'ORANGO',
      externalKey: 'ORANGO|86',
      title: 'Construindo uma cultura diversa e inclusiva',
      resourceType: 'Curso',
      area: 'RH',
      needs: { primary: ['domain_knowledge'], secondary: [] },
      generalPreparation: false,
      rationale:
        'Cultura organizacional e inclusão: conhecimento de área para recursos humanos.',
    },
    {
      source: 'ORANGO',
      externalKey: 'ORANGO|130',
      title: 'Escrita criativa e storytelling',
      resourceType: 'Curso',
      area: 'GERAL',
      needs: { primary: ['examples'], secondary: ['coherence'] },
      generalPreparation: false,
      rationale:
        'Storytelling ajuda a transformar experiências em exemplos narrativos concretos e bem encadeados.',
    },
  ];

export function findExternalMaterialTaxonomy(
  source: ExternalMaterialSource,
  externalKey: string,
): ExternalMaterialTaxonomyEntry | undefined {
  return EXTERNAL_MATERIAL_TAXONOMY.find(
    (entry) => entry.source === source && entry.externalKey === externalKey,
  );
}
