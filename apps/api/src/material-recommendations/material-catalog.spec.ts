import { EXTERNAL_MATERIAL_TAXONOMY, EXTERNAL_TAXONOMY_VERSION } from './external-material-taxonomy';
import {
  MATERIAL_CATALOG,
  MATERIAL_TAXONOMY_VERSION,
  buildMaterialCatalog,
  materialKey,
} from './material-catalog';
import { REDUNDANCY_GROUPS, redundancyGroupOf } from './material-redundancy';
import { RH_MATERIAL_TAXONOMY, RH_TAXONOMY_VERSION } from './rh-material-taxonomy';

describe('MATERIAL_CATALOG (catálogo unificado só para o motor)', () => {
  it('une as duas taxonomias sem perder nem inventar itens', () => {
    expect(MATERIAL_CATALOG).toHaveLength(RH_MATERIAL_TAXONOMY.length + EXTERNAL_MATERIAL_TAXONOMY.length);
    expect(MATERIAL_CATALOG.filter((item) => item.source === 'RH_CONNECT')).toHaveLength(
      RH_MATERIAL_TAXONOMY.length,
    );
    expect(MATERIAL_CATALOG.filter((item) => item.source === 'CACHOLA')).toHaveLength(
      EXTERNAL_MATERIAL_TAXONOMY.filter((item) => item.source === 'CACHOLA').length,
    );
    expect(MATERIAL_CATALOG.filter((item) => item.source === 'ORANGO')).toHaveLength(
      EXTERNAL_MATERIAL_TAXONOMY.filter((item) => item.source === 'ORANGO').length,
    );
  });

  it('usa a referência persistente da taxonomia: id do RH Connect e external_key dos externos', () => {
    for (const entry of RH_MATERIAL_TAXONOMY) {
      const item = MATERIAL_CATALOG.find((m) => m.source === 'RH_CONNECT' && m.ref === entry.id);
      expect(item).toMatchObject({
        title: entry.title,
        area: entry.area,
        needs: entry.needs,
        generalPreparation: entry.generalPreparation,
      });
    }
    for (const entry of EXTERNAL_MATERIAL_TAXONOMY) {
      const item = MATERIAL_CATALOG.find((m) => m.source === entry.source && m.ref === entry.externalKey);
      expect(item).toMatchObject({
        title: entry.title,
        area: entry.area,
        needs: entry.needs,
        generalPreparation: entry.generalPreparation,
      });
    }
  });

  it('chaves únicas, e a construção é repetível', () => {
    const keys = MATERIAL_CATALOG.map(materialKey);
    expect(new Set(keys).size).toBe(keys.length);
    expect(buildMaterialCatalog()).toEqual(MATERIAL_CATALOG);
  });

  it('a versão conjunta registra as duas taxonomias', () => {
    expect(MATERIAL_TAXONOMY_VERSION).toBe(`${RH_TAXONOMY_VERSION}+${EXTERNAL_TAXONOMY_VERSION}`);
  });
});

describe('REDUNDANCY_GROUPS (dado editorial)', () => {
  const catalogKeys = new Set(MATERIAL_CATALOG.map(materialKey));

  it('todo grupo tem ao menos dois materiais, todos existentes no catálogo', () => {
    for (const [group, keys] of Object.entries(REDUNDANCY_GROUPS)) {
      expect({ group, size: keys.length >= 2 }).toEqual({ group, size: true });
      for (const key of keys) {
        expect({ group, key, exists: catalogKeys.has(key) }).toEqual({ group, key, exists: true });
      }
    }
  });

  it('nenhum material está em dois grupos nem repetido no mesmo grupo', () => {
    const all = Object.values(REDUNDANCY_GROUPS).flat();
    expect(new Set(all).size).toBe(all.length);
  });

  it('redundancyGroupOf resolve o grupo conhecido e ignora o resto', () => {
    expect(redundancyGroupOf('ORANGO:ORANGO|86')).toBe('diversity-inclusion');
    expect(redundancyGroupOf('CACHOLA:8dd795a58c91c5db06d57ba448fc1ae4')).toBe('diversity-inclusion');
    expect(redundancyGroupOf('RH_CONNECT:fundamentos-da-web')).toBeUndefined();
  });
});
