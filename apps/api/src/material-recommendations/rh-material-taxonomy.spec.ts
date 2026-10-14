import { NEED_KEYS } from './recommendation.types';
import {
  RH_MATERIAL_TAXONOMY,
  RH_TAXONOMY_VERSION,
  findRhMaterialTaxonomy,
} from './rh-material-taxonomy';

const AREAS = ['TI', 'RH', 'SECRETARIADO', 'GERAL'];

describe('RH_MATERIAL_TAXONOMY (dado editorial v1)', () => {
  it('é versionada e cobre os 19 materiais, com ids únicos em kebab-case', () => {
    expect(RH_TAXONOMY_VERSION).toMatch(/^rh-\d+$/);
    expect(RH_MATERIAL_TAXONOMY).toHaveLength(19);
    const ids = RH_MATERIAL_TAXONOMY.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(19);
    for (const entry of RH_MATERIAL_TAXONOMY) {
      expect(entry.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(entry.slug).toBe(entry.id);
      expect(entry.title.trim().length).toBeGreaterThan(0);
      expect(AREAS).toContain(entry.area);
    }
  });

  it('necessidades válidas, sem repetição e sem sobreposição entre principal e secundária', () => {
    for (const entry of RH_MATERIAL_TAXONOMY) {
      const { primary, secondary } = entry.needs;
      for (const key of [...primary, ...secondary]) {
        expect(NEED_KEYS).toContain(key);
      }
      expect(new Set(primary).size).toBe(primary.length);
      expect(new Set(secondary).size).toBe(secondary.length);
      expect(primary.filter((key) => secondary.includes(key))).toEqual([]);
    }
  });

  it('todo material tem alguma necessidade OU é de preparação geral', () => {
    for (const entry of RH_MATERIAL_TAXONOMY) {
      const hasNeed = entry.needs.primary.length + entry.needs.secondary.length > 0;
      expect(hasNeed || entry.generalPreparation).toBe(true);
    }
  });

  it('material geral sem necessidade específica é permitido (ex.: postura)', () => {
    const posture = findRhMaterialTaxonomy('postura-e-linguagem-corporal');
    expect(posture?.needs).toEqual({ primary: [], secondary: [] });
    expect(posture?.generalPreparation).toBe(true);
  });

  it('material de TI nunca é de preparação geral', () => {
    for (const entry of RH_MATERIAL_TAXONOMY.filter((item) => item.area === 'TI')) {
      expect(entry.generalPreparation).toBe(false);
    }
  });

  it('domain_knowledge só tem cobertura em TI (lacuna conhecida, sem forçar TI para RH)', () => {
    const withDomain = RH_MATERIAL_TAXONOMY.filter((entry) =>
      [...entry.needs.primary, ...entry.needs.secondary].includes('domain_knowledge'),
    );
    expect(withDomain.length).toBeGreaterThan(0);
    expect(withDomain.every((entry) => entry.area === 'TI')).toBe(true);
  });

  it('toda necessidade tem ao menos um material que a desenvolve', () => {
    for (const key of NEED_KEYS) {
      const covered = RH_MATERIAL_TAXONOMY.some((entry) =>
        [...entry.needs.primary, ...entry.needs.secondary].includes(key),
      );
      expect(covered).toBe(true);
    }
  });

  it('há materiais gerais suficientes para o complemento (>= 3)', () => {
    expect(RH_MATERIAL_TAXONOMY.filter((entry) => entry.generalPreparation).length).toBeGreaterThanOrEqual(3);
  });

  it('findRhMaterialTaxonomy encontra por id e devolve undefined se não existir', () => {
    expect(findRhMaterialTaxonomy('metodo-star-explicado')?.title).toBe('O método STAR explicado');
    expect(findRhMaterialTaxonomy('nao-existe')).toBeUndefined();
  });
});
