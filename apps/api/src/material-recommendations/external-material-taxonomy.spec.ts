import {
  EXTERNAL_MATERIAL_TAXONOMY,
  EXTERNAL_TAXONOMY_VERSION,
  findExternalMaterialTaxonomy,
} from './external-material-taxonomy';
import { NEED_KEYS } from './recommendation.types';

const AREAS = ['TI', 'RH', 'SECRETARIADO', 'GERAL'];
const SOURCES = ['CACHOLA', 'ORANGO'];

describe('EXTERNAL_MATERIAL_TAXONOMY (curadoria editorial v1)', () => {
  it('é versionada e tem a curadoria esperada: 13 itens (7 Cachola e 6 Orango)', () => {
    expect(EXTERNAL_TAXONOMY_VERSION).toMatch(/^ext-\d+$/);
    expect(EXTERNAL_MATERIAL_TAXONOMY).toHaveLength(13);
    const count = (source: string) =>
      EXTERNAL_MATERIAL_TAXONOMY.filter((entry) => entry.source === source).length;
    expect(count('CACHOLA')).toBe(7);
    expect(count('ORANGO')).toBe(6);
  });

  it('campos obrigatórios preenchidos, fonte e área válidas, chave única por fonte', () => {
    const seen = new Set<string>();
    for (const entry of EXTERNAL_MATERIAL_TAXONOMY) {
      expect(SOURCES).toContain(entry.source);
      expect(AREAS).toContain(entry.area);
      expect(entry.externalKey.trim().length).toBeGreaterThan(0);
      expect(entry.title.trim().length).toBeGreaterThan(0);
      expect(entry.resourceType.trim().length).toBeGreaterThan(0);
      expect(entry.rationale.trim().length).toBeGreaterThan(0);
      const id = `${entry.source}:${entry.externalKey}`;
      expect(seen.has(id)).toBe(false);
      seen.add(id);
    }
  });

  it('formato da chave por fonte: Cachola em hash de 32 hex, Orango em ORANGO|<id>', () => {
    for (const entry of EXTERNAL_MATERIAL_TAXONOMY) {
      if (entry.source === 'CACHOLA') {
        expect(entry.externalKey).toMatch(/^[0-9a-f]{32}$/);
      } else {
        expect(entry.externalKey).toMatch(/^ORANGO\|\d+$/);
      }
    }
  });

  it('necessidades válidas, sem repetição e sem sobreposição entre principal e secundária', () => {
    for (const entry of EXTERNAL_MATERIAL_TAXONOMY) {
      const { primary, secondary } = entry.needs;
      for (const key of [...primary, ...secondary]) {
        expect(NEED_KEYS).toContain(key);
      }
      expect(new Set(primary).size).toBe(primary.length);
      expect(new Set(secondary).size).toBe(secondary.length);
      expect(primary.filter((key) => secondary.includes(key))).toEqual([]);
    }
  });

  it('todo item tem alguma necessidade OU é de preparação geral', () => {
    for (const entry of EXTERNAL_MATERIAL_TAXONOMY) {
      const hasNeed = entry.needs.primary.length + entry.needs.secondary.length > 0;
      expect(hasNeed || entry.generalPreparation).toBe(true);
    }
  });

  it('domain_knowledge só em conhecimento de área (TI ou RH): nunca em GERAL nem em preparação geral', () => {
    for (const entry of EXTERNAL_MATERIAL_TAXONOMY) {
      const all = [...entry.needs.primary, ...entry.needs.secondary];
      if (!all.includes('domain_knowledge')) continue;
      expect(['TI', 'RH']).toContain(entry.area);
      expect(entry.generalPreparation).toBe(false);
    }
  });

  it('itens de TI e de RH são de conhecimento de área (domain_knowledge principal)', () => {
    for (const entry of EXTERNAL_MATERIAL_TAXONOMY) {
      if (entry.area === 'TI' || entry.area === 'RH') {
        expect(entry.needs.primary).toContain('domain_knowledge');
      }
    }
  });

  it('preparação geral: somente o pitch profissional (Cachola) e a etiqueta profissional (Orango)', () => {
    const general = EXTERNAL_MATERIAL_TAXONOMY.filter((entry) => entry.generalPreparation)
      .map((entry) => `${entry.source}:${entry.title}`)
      .sort();
    expect(general).toEqual([
      'CACHOLA:Sua Carreira: como fazer pitch profissional',
      'ORANGO:Etiqueta profissional: imagem que inspira credibilidade',
    ]);
  });

  it('todas as 7 necessidades aparecem em algum item e `examples` tem material principal', () => {
    for (const key of NEED_KEYS) {
      const covered = EXTERNAL_MATERIAL_TAXONOMY.some((entry) =>
        [...entry.needs.primary, ...entry.needs.secondary].includes(key),
      );
      expect({ key, covered }).toEqual({ key, covered: true });
    }
    expect(
      EXTERNAL_MATERIAL_TAXONOMY.some((entry) => entry.needs.primary.includes('examples')),
    ).toBe(true);
  });
});

describe('findExternalMaterialTaxonomy', () => {
  it('encontra pela fonte e pela chave', () => {
    const cachola = findExternalMaterialTaxonomy('CACHOLA', 'c5a8088f375aa1535bc228e1b6f0ef30');
    expect(cachola?.title).toBe('Sua Carreira: como fazer pitch profissional');
    const orango = findExternalMaterialTaxonomy('ORANGO', 'ORANGO|130');
    expect(orango?.title).toBe('Escrita criativa e storytelling');
    expect(orango?.needs.primary).toEqual(['examples']);
  });

  it('retorna undefined para chave inexistente', () => {
    expect(findExternalMaterialTaxonomy('ORANGO', 'ORANGO|999999')).toBeUndefined();
    expect(findExternalMaterialTaxonomy('CACHOLA', 'nao-existe')).toBeUndefined();
  });

  it('não confunde fontes: a mesma chave em outra fonte não é encontrada', () => {
    expect(findExternalMaterialTaxonomy('CACHOLA', 'ORANGO|130')).toBeUndefined();
    expect(
      findExternalMaterialTaxonomy('ORANGO', 'c5a8088f375aa1535bc228e1b6f0ef30'),
    ).toBeUndefined();
  });
});
