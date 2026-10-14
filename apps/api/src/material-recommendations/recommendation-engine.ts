import { MATERIAL_CATALOG, materialKey } from './material-catalog';
import type { MaterialCandidate } from './material-catalog';
import { redundancyGroupOf } from './material-redundancy';
import { isAreaCompatible, isSpecificAreaMatch, toMaterialArea } from './professional-area';
import { buildRecommendationReason } from './recommendation-reasons';
import type { RecommendationMatchKind } from './recommendation-reasons';
import type {
  DevelopmentNeed,
  MaterialAreaKey,
  MaterialSource,
  NeedKey,
} from './recommendation.types';

// Motor PURO e determinístico de recomendação de materiais. Só depende das
// taxonomias (via catálogo), do mapa de áreas, dos grupos de redundância e dos
// motivos fixos. Não conhece modalidade de avaliação, banco, rede nem relógio,
// e não recalcula notas: recebe as necessidades já derivadas (`deriveNeeds`).
//
// Regra, em ordem:
//
// 0. Elegibilidade: material `GERAL` serve a todos; material de área específica
//    só serve a quem tem exatamente essa área. `domain_knowledge` só casa com
//    material de área específica (nunca com `GERAL`).
// 1. Casamento semântico: só entra material cuja taxonomia cita a necessidade
//    (principal ou secundária). Nada irrelevante entra para completar a lista.
// 2. Cobertura (fase A): em ordem de severidade, cada necessidade recebe seu
//    melhor material, a menos que um já escolhido a cubra como principal.
// 3. Preenchimento (fase B): demais vagas por ranking global.
//
// Ranking (comparador, nesta ordem):
//   1. principal vence secundária;
//   2. área específica do candidato vence `GERAL` (nunca supera 1);
//   3. necessidade mais severa;
//   4. cobertura: soma da severidade das necessidades que o material atende;
//   5. diversidade: material do mesmo grupo editorial de redundância de um já
//      escolhido NUNCA entra (nem para completar vagas): se só houver um item
//      editorialmente distinto, a lista tem menos de 3;
//   6. desempate: título e depois chave, por ordem de código (sem peso por fonte).
export type { RecommendationMatchKind };

export const RECOMMENDATION_ENGINE_VERSION = 'engine-1';
export const MAX_RECOMMENDATIONS = 3;

const SEVERITY_SCALE = 10000;

export interface RecommendedMaterial {
  source: MaterialSource;
  // Referência persistente da taxonomia (id do RH Connect ou external_key).
  ref: string;
  title: string;
  area: MaterialAreaKey;
  // Necessidade que motivou a escolha; `null` na preparação geral.
  matchedNeed: NeedKey | null;
  matchKind: RecommendationMatchKind;
  reason: string;
}

export interface RecommendationInput {
  // Necessidades já derivadas (R1), da mais para a menos severa.
  needs: readonly DevelopmentNeed[];
  // Área do perfil (`information-technology`, `hr-management`, `secretariat`).
  professionalArea?: string | null;
}

export interface RecommendationOptions {
  limit?: number;
  catalog?: readonly MaterialCandidate[];
  // Se houver necessidades mas poucos materiais específicos, completa com
  // materiais de preparação geral (marcados como `general_preparation`).
  // Padrão `false`: menos de 3 é preferível a completar sem relação com a necessidade.
  fillWithGeneralPreparation?: boolean;
}

type NeedMatch = 'primary' | 'secondary';

interface PreparedNeed {
  key: NeedKey;
  severity: number;
}

interface Pair {
  material: MaterialCandidate;
  need: NeedKey;
  kind: NeedMatch;
  areaRank: number;
  severity: number;
  coverage: number;
}

const KIND_RANK: Readonly<Record<NeedMatch, number>> = { primary: 0, secondary: 1 };

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function tieBreak(a: MaterialCandidate, b: MaterialCandidate): number {
  return compareText(a.title, b.title) || compareText(materialKey(a), materialKey(b));
}

function compareWithinNeed(a: Pair, b: Pair): number {
  return (
    KIND_RANK[a.kind] - KIND_RANK[b.kind] ||
    a.areaRank - b.areaRank ||
    b.coverage - a.coverage ||
    tieBreak(a.material, b.material)
  );
}

function compareGlobal(a: Pair, b: Pair): number {
  return (
    KIND_RANK[a.kind] - KIND_RANK[b.kind] ||
    a.areaRank - b.areaRank ||
    b.severity - a.severity ||
    b.coverage - a.coverage ||
    tieBreak(a.material, b.material)
  );
}

function matchOf(material: MaterialCandidate, need: NeedKey): NeedMatch | null {
  // Conhecimento de domínio exige material de área específica (já filtrado
  // pela elegibilidade): conteúdo geral nunca é "conhecimento técnico".
  if (need === 'domain_knowledge' && material.area === 'GERAL') return null;
  if (material.needs.primary.includes(need)) return 'primary';
  if (material.needs.secondary.includes(need)) return 'secondary';
  return null;
}

function prepareNeeds(needs: readonly DevelopmentNeed[]): PreparedNeed[] {
  const seen = new Set<NeedKey>();
  const prepared: Array<PreparedNeed & { index: number }> = [];
  needs.forEach((need, index) => {
    if (seen.has(need.key)) return;
    seen.add(need.key);
    const raw = Number.isFinite(need.severity) ? need.severity : 0;
    const severity = Math.round(Math.min(1, Math.max(0, raw)) * SEVERITY_SCALE);
    prepared.push({ key: need.key, severity, index });
  });
  // Mais severa primeiro; empate mantém a ordem recebida.
  return prepared
    .sort((a, b) => b.severity - a.severity || a.index - b.index)
    .map(({ key, severity }) => ({ key, severity }));
}

function uniqueByKey(catalog: readonly MaterialCandidate[]): MaterialCandidate[] {
  const seen = new Set<string>();
  const unique: MaterialCandidate[] = [];
  for (const material of catalog) {
    const key = materialKey(material);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(material);
  }
  return unique;
}

function normalizeLimit(limit: number | undefined): number {
  if (limit === undefined) return MAX_RECOMMENDATIONS;
  return Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : MAX_RECOMMENDATIONS;
}

class Selection {
  readonly picked: RecommendedMaterial[] = [];
  readonly materials: MaterialCandidate[] = [];
  private readonly keys = new Set<string>();
  private readonly groups = new Set<string>();

  constructor(readonly limit: number) {}

  get full(): boolean {
    return this.picked.length >= this.limit;
  }

  has(material: MaterialCandidate): boolean {
    return this.keys.has(materialKey(material));
  }

  isRedundant(material: MaterialCandidate): boolean {
    const group = redundancyGroupOf(materialKey(material));
    return group !== undefined && this.groups.has(group);
  }

  add(
    material: MaterialCandidate,
    matchedNeed: NeedKey | null,
    matchKind: RecommendationMatchKind,
  ): void {
    const key = materialKey(material);
    this.keys.add(key);
    const group = redundancyGroupOf(key);
    if (group !== undefined) this.groups.add(group);
    this.materials.push(material);
    this.picked.push({
      source: material.source,
      ref: material.ref,
      title: material.title,
      area: material.area,
      matchedNeed,
      matchKind,
      reason: buildRecommendationReason(matchKind, matchedNeed, material.area),
    });
  }
}

function buildPairs(
  eligible: readonly MaterialCandidate[],
  needs: readonly PreparedNeed[],
  candidateArea: MaterialAreaKey | null,
): Pair[] {
  const pairs: Pair[] = [];
  for (const material of eligible) {
    const matches = needs
      .map((need) => ({ need, kind: matchOf(material, need.key) }))
      .filter((item): item is { need: PreparedNeed; kind: NeedMatch } => item.kind !== null);
    if (matches.length === 0) continue;
    const coverage = matches.reduce((total, item) => total + item.need.severity, 0);
    const areaRank = isSpecificAreaMatch(material.area, candidateArea) ? 0 : 1;
    for (const item of matches) {
      pairs.push({
        material,
        need: item.need.key,
        kind: item.kind,
        areaRank,
        severity: item.need.severity,
        coverage,
      });
    }
  }
  return pairs;
}

function selectForNeeds(
  selection: Selection,
  pairs: readonly Pair[],
  needs: readonly PreparedNeed[],
): void {
  // Fase A: cobertura, uma necessidade por vez, da mais severa para a menos.
  for (const need of needs) {
    if (selection.full) return;
    const covered = selection.materials.some((material) => matchOf(material, need.key) === 'primary');
    if (covered) continue;
    const best = pairs
      .filter((pair) => pair.need === need.key)
      .filter((pair) => !selection.has(pair.material) && !selection.isRedundant(pair.material))
      .sort(compareWithinNeed)[0];
    if (best) selection.add(best.material, best.need, best.kind);
  }

  // Fase B: preenchimento por ranking global, sem material redundante.
  const ranked = [...pairs].sort(compareGlobal);
  for (const pair of ranked) {
    if (selection.full) return;
    if (selection.has(pair.material) || selection.isRedundant(pair.material)) continue;
    selection.add(pair.material, pair.need, pair.kind);
  }
}

function selectGeneralPreparation(
  selection: Selection,
  eligible: readonly MaterialCandidate[],
): void {
  const breadth = (material: MaterialCandidate) =>
    material.needs.primary.length + material.needs.secondary.length;
  // Mais versátil primeiro (atende mais necessidades), depois desempate neutro.
  const ranked = eligible
    .filter((material) => material.generalPreparation)
    .sort((a, b) => breadth(b) - breadth(a) || tieBreak(a, b));
  for (const material of ranked) {
    if (selection.full) return;
    if (selection.has(material) || selection.isRedundant(material)) continue;
    selection.add(material, null, 'general_preparation');
  }
}

export function recommendMaterials(
  input: RecommendationInput,
  options: RecommendationOptions = {},
): RecommendedMaterial[] {
  const limit = normalizeLimit(options.limit);
  if (limit === 0) return [];

  const candidateArea = toMaterialArea(input.professionalArea);
  const eligible = uniqueByKey(options.catalog ?? MATERIAL_CATALOG).filter((material) =>
    isAreaCompatible(material.area, candidateArea),
  );
  const needs = prepareNeeds(input.needs);
  const selection = new Selection(limit);

  if (needs.length === 0) {
    selectGeneralPreparation(selection, eligible);
    return selection.picked;
  }

  selectForNeeds(selection, buildPairs(eligible, needs, candidateArea), needs);
  if (options.fillWithGeneralPreparation) {
    selectGeneralPreparation(selection, eligible);
  }
  return selection.picked;
}
