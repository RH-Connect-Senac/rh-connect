import type { MaterialAreaKey } from './recommendation.types';

// Mapa ÚNICO entre a área profissional do perfil do candidato e a área usada
// na taxonomia de materiais. Nenhum outro arquivo compara essas strings.
//
// Área desconhecida (ausente, vazia ou fora do mapa) NÃO vira `GERAL`: o
// candidato simplesmente fica sem área específica e só enxerga materiais gerais.
export const PROFESSIONAL_AREA_KEYS = [
  'information-technology',
  'hr-management',
  'secretariat',
] as const;

export type ProfessionalAreaKey = (typeof PROFESSIONAL_AREA_KEYS)[number];

const PROFESSIONAL_AREA_TO_MATERIAL_AREA: Readonly<
  Record<ProfessionalAreaKey, MaterialAreaKey>
> = {
  'information-technology': 'TI',
  'hr-management': 'RH',
  secretariat: 'SECRETARIADO',
};

export function toMaterialArea(
  professionalArea: string | null | undefined,
): MaterialAreaKey | null {
  if (typeof professionalArea !== 'string') return null;
  const key = professionalArea.trim().toLowerCase();
  if (!(PROFESSIONAL_AREA_KEYS as readonly string[]).includes(key)) return null;
  return PROFESSIONAL_AREA_TO_MATERIAL_AREA[key as ProfessionalAreaKey];
}

// Material `GERAL` serve a qualquer candidato. Material de área específica só
// serve a quem tem exatamente essa área (sem área conhecida, nenhum serve).
export function isAreaCompatible(
  materialArea: MaterialAreaKey,
  candidateArea: MaterialAreaKey | null,
): boolean {
  return materialArea === 'GERAL' || materialArea === candidateArea;
}

// Área específica do candidato igual à do material (vantagem de ranking).
export function isSpecificAreaMatch(
  materialArea: MaterialAreaKey,
  candidateArea: MaterialAreaKey | null,
): boolean {
  return materialArea !== 'GERAL' && materialArea === candidateArea;
}
