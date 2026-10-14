import type { MaterialAreaKey, NeedKey } from './recommendation.types';

// Motivos curtos e determinísticos de cada recomendação. Texto fixo por
// (tipo de correspondência, necessidade): nada é gerado ou variado em tempo de
// execução. Toda frase exibida ao candidato nasce aqui.
export type RecommendationMatchKind = 'primary' | 'secondary' | 'general_preparation';

export const GENERAL_PREPARATION_REASON =
  'Complementa sua preparação geral para entrevistas.';

const PRIMARY_REASON: Readonly<Record<Exclude<NeedKey, 'domain_knowledge'>, string>> = {
  clarity: 'Ajuda a desenvolver clareza na comunicação.',
  coherence: 'Ajuda a conectar as ideias com coerência nas respostas.',
  objectivity: 'Ajuda a responder com mais objetividade.',
  organization: 'Reforça organização e estruturação das respostas.',
  requirements_alignment: 'Ajuda a relacionar sua experiência aos requisitos da vaga.',
  examples: 'Ajuda a apresentar experiências com exemplos mais estruturados.',
};

const SECONDARY_REASON: Readonly<Record<Exclude<NeedKey, 'domain_knowledge'>, string>> = {
  clarity: 'Também contribui para a clareza na comunicação.',
  coherence: 'Também contribui para a coerência das respostas.',
  objectivity: 'Também contribui para respostas mais objetivas.',
  organization: 'Também contribui para a organização das respostas.',
  requirements_alignment: 'Também contribui para alinhar sua experiência à vaga.',
  examples: 'Também contribui para ilustrar respostas com exemplos.',
};

const DOMAIN_SUBJECT: Readonly<Record<MaterialAreaKey, string>> = {
  TI: 'conhecimento técnico em Tecnologia',
  RH: 'conhecimento da área de Recursos Humanos',
  SECRETARIADO: 'conhecimento da área de Secretariado',
  GERAL: 'conhecimento da sua área',
};

export function buildRecommendationReason(
  kind: RecommendationMatchKind,
  need: NeedKey | null,
  materialArea: MaterialAreaKey,
): string {
  if (kind === 'general_preparation' || need === null) return GENERAL_PREPARATION_REASON;
  if (need === 'domain_knowledge') {
    const subject = DOMAIN_SUBJECT[materialArea];
    return kind === 'primary'
      ? `Apoia o desenvolvimento de ${subject}.`
      : `Também contribui para o ${subject}.`;
  }
  return kind === 'primary' ? PRIMARY_REASON[need] : SECONDARY_REASON[need];
}
