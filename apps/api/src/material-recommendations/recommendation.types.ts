// Tipos da fronteira do motor de recomendação de materiais.
//
// Este arquivo NÃO conhece a modalidade da avaliação, o banco nem nenhum módulo
// de entrevistas: ele só descreve "necessidades de desenvolvimento" já
// normalizadas. Quem traduz uma avaliação concreta para estes tipos são os
// adapters (pasta `adapters/`).

// Necessidades v1: coincidem com os 7 critérios canônicos de avaliação (mesmas
// chaves, mesma ordem). A ordem é a canônica e serve de desempate determinístico.
export const NEED_KEYS = [
  'clarity',
  'coherence',
  'objectivity',
  'domain_knowledge',
  'organization',
  'requirements_alignment',
  'examples',
] as const;

export type NeedKey = (typeof NEED_KEYS)[number];

// Notas por critério, na escala 0–10, depois de normalizadas por um adapter.
// Parcial de propósito: um critério ausente simplesmente não gera necessidade.
export type NormalizedCriteria = Partial<Record<NeedKey, number>>;

// `gap`: nota abaixo do limite de necessidade (oportunidade clara de melhora).
// `refine`: nenhum critério abaixo do limite, mas há margem para evoluir.
export type NeedKind = 'gap' | 'refine';

export interface DevelopmentNeed {
  key: NeedKey;
  // Nota do critério (0–10) que originou a necessidade.
  score: number;
  // 0–1; quanto maior, mais urgente: (10 - nota) / 10.
  severity: number;
  kind: NeedKind;
}

// Origem de um material recomendável (catálogo do RH Connect ou curadoria externa).
export type MaterialSource = 'RH_CONNECT' | 'CACHOLA' | 'ORANGO';

// Área de um material. `GERAL` = serve a qualquer área profissional.
export type MaterialAreaKey = 'TI' | 'RH' | 'SECRETARIADO' | 'GERAL';

// Necessidades que um material ajuda a desenvolver. `primary`: foco do
// material. `secondary`: ajuda, mas não é o foco. Pode ser vazio nos dois
// (material de preparação geral).
export interface MaterialNeeds {
  primary: readonly NeedKey[];
  secondary: readonly NeedKey[];
}
