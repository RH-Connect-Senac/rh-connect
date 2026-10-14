import { EXTERNAL_MATERIAL_TAXONOMY, EXTERNAL_TAXONOMY_VERSION } from './external-material-taxonomy';
import type { MaterialAreaKey, MaterialNeeds, MaterialSource } from './recommendation.types';
import { RH_MATERIAL_TAXONOMY, RH_TAXONOMY_VERSION } from './rh-material-taxonomy';

// Catálogo unificado SÓ para o motor: junta a taxonomia do RH Connect e a
// curadoria externa num formato comum, sem alterar nenhuma das duas.
// `ref` é a referência persistente da taxonomia: `id` (RH Connect) ou
// `externalKey` (Cachola/Orango). Nunca um UUID de banco.
export interface MaterialCandidate {
  source: MaterialSource;
  ref: string;
  title: string;
  // Rótulo de exibição do tipo ("Leitura", "Curso", "Vídeo"...). Dado de
  // apresentação: não participa de nenhuma regra de ranking.
  resourceType: string;
  area: MaterialAreaKey;
  needs: MaterialNeeds;
  generalPreparation: boolean;
}

// Tipo dos materiais do RH Connect no catálogo unificado (no frontend o tipo é
// o código interno `READING`; aqui já é o rótulo exibido ao candidato).
export const RH_CONNECT_RESOURCE_TYPE = 'Leitura';

// Versão conjunta das taxonomias que alimentam o motor.
export const MATERIAL_TAXONOMY_VERSION = `${RH_TAXONOMY_VERSION}+${EXTERNAL_TAXONOMY_VERSION}`;

export function materialKey(material: { source: MaterialSource; ref: string }): string {
  return `${material.source}:${material.ref}`;
}

export function buildMaterialCatalog(): readonly MaterialCandidate[] {
  const rh = RH_MATERIAL_TAXONOMY.map<MaterialCandidate>((entry) => ({
    source: 'RH_CONNECT',
    ref: entry.id,
    title: entry.title,
    resourceType: RH_CONNECT_RESOURCE_TYPE,
    area: entry.area,
    needs: entry.needs,
    generalPreparation: entry.generalPreparation,
  }));
  const external = EXTERNAL_MATERIAL_TAXONOMY.map<MaterialCandidate>((entry) => ({
    source: entry.source,
    ref: entry.externalKey,
    title: entry.title,
    resourceType: entry.resourceType,
    area: entry.area,
    needs: entry.needs,
    generalPreparation: entry.generalPreparation,
  }));
  return [...rh, ...external];
}

export const MATERIAL_CATALOG: readonly MaterialCandidate[] = buildMaterialCatalog();
