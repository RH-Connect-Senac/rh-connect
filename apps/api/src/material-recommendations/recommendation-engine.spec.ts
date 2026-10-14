import { MATERIAL_CATALOG, materialKey } from './material-catalog';
import type { MaterialCandidate } from './material-catalog';
import { redundancyGroupOf } from './material-redundancy';
import { deriveNeeds } from './need-derivation';
import {
  MAX_RECOMMENDATIONS,
  RECOMMENDATION_ENGINE_VERSION,
  recommendMaterials,
} from './recommendation-engine';
import type { RecommendedMaterial } from './recommendation-engine';
import { buildRecommendationReason } from './recommendation-reasons';
import { NEED_KEYS } from './recommendation.types';
import type { DevelopmentNeed, NeedKey, NormalizedCriteria } from './recommendation.types';

const IT = 'information-technology';
const HR = 'hr-management';
const SEC = 'secretariat';

const FULL: NormalizedCriteria = {
  clarity: 9,
  coherence: 9,
  objectivity: 9,
  domain_knowledge: 9,
  organization: 9,
  requirements_alignment: 9,
  examples: 9,
};

// Necessidades pela regra real da R1 (o motor nunca recalcula notas).
const needsOf = (override: NormalizedCriteria): DevelopmentNeed[] =>
  deriveNeeds({ ...FULL, ...override });

const need = (key: NeedKey, score: number): DevelopmentNeed => ({
  key,
  score,
  severity: (10 - score) / 10,
  kind: 'gap',
});

const byKey = new Map(MATERIAL_CATALOG.map((material) => [materialKey(material), material]));
const entryOf = (item: RecommendedMaterial): MaterialCandidate => {
  const entry = byKey.get(materialKey(item));
  if (!entry) throw new Error(`fora do catálogo: ${materialKey(item)}`);
  return entry;
};
const keysOf = (items: readonly RecommendedMaterial[]) => items.map(materialKey);
const groupsOf = (items: readonly RecommendedMaterial[]) =>
  keysOf(items).flatMap((key) => redundancyGroupOf(key) ?? []);

function mat(over: Partial<MaterialCandidate> & Pick<MaterialCandidate, 'ref' | 'title'>): MaterialCandidate {
  return {
    source: 'RH_CONNECT',
    area: 'GERAL',
    needs: { primary: [], secondary: [] },
    generalPreparation: false,
    ...over,
  };
}

describe('recommendMaterials: constantes e entrada', () => {
  it('expõe a versão do motor e o limite de 3 recomendações', () => {
    expect(RECOMMENDATION_ENGINE_VERSION).toMatch(/^engine-\d+$/);
    expect(MAX_RECOMMENDATIONS).toBe(3);
  });

  it('respeita `limit` (0 devolve vazio) e ignora necessidades repetidas', () => {
    const needs = [need('clarity', 3), need('clarity', 3)];
    expect(recommendMaterials({ needs }, { limit: 0 })).toEqual([]);
    expect(recommendMaterials({ needs }, { limit: 2 })).toHaveLength(2);
    expect(recommendMaterials({ needs })).toEqual(recommendMaterials({ needs: [need('clarity', 3)] }));
  });
});

describe('cenários por necessidade (catálogo real)', () => {
  it('A. gap forte em clarity: 3 materiais com clareza como foco e motivo fixo', () => {
    const result = recommendMaterials({ needs: needsOf({ clarity: 3 }) });
    expect(result).toHaveLength(3);
    for (const item of result) {
      expect(item.matchedNeed).toBe('clarity');
      expect(item.matchKind).toBe('primary');
      expect(entryOf(item).needs.primary).toContain('clarity');
      expect(item.reason).toBe('Ajuda a desenvolver clareza na comunicação.');
    }
  });

  it('B. gap em organization: 3 materiais, os principais antes dos secundários', () => {
    const result = recommendMaterials({ needs: needsOf({ organization: 4 }) });
    expect(result).toHaveLength(3);
    expect(result[0].matchKind).toBe('primary');
    expect(result[0].reason).toBe('Reforça organização e estruturação das respostas.');
    const kinds = result.map((item) => item.matchKind);
    expect(kinds).toEqual([...kinds].sort((a, b) => (a === b ? 0 : a === 'primary' ? -1 : 1)));
    for (const item of result) {
      const { primary, secondary } = entryOf(item).needs;
      expect([...primary, ...secondary]).toContain('organization');
    }
  });

  it('C. gap em examples: 3 materiais principais de exemplos', () => {
    const result = recommendMaterials({ needs: needsOf({ examples: 4 }) });
    expect(result).toHaveLength(3);
    for (const item of result) {
      expect(item.matchKind).toBe('primary');
      expect(entryOf(item).needs.primary).toContain('examples');
      expect(item.reason).toBe('Ajuda a apresentar experiências com exemplos mais estruturados.');
    }
  });

  it('D. gap em requirements_alignment: 3 materiais principais, sem material de TI', () => {
    const result = recommendMaterials({ needs: needsOf({ requirements_alignment: 4 }) });
    expect(result).toHaveLength(3);
    for (const item of result) {
      expect(item.matchKind).toBe('primary');
      expect(item.area).toBe('GERAL');
      expect(item.reason).toBe('Ajuda a relacionar sua experiência aos requisitos da vaga.');
    }
  });

  it('E. domain_knowledge para TI: 3 materiais de TI', () => {
    const result = recommendMaterials({ needs: needsOf({ domain_knowledge: 3 }), professionalArea: IT });
    expect(result).toHaveLength(3);
    for (const item of result) {
      expect(item.area).toBe('TI');
      expect(item.matchedNeed).toBe('domain_knowledge');
      expect(item.matchKind).toBe('primary');
      expect(item.reason).toBe('Apoia o desenvolvimento de conhecimento técnico em Tecnologia.');
    }
  });

  it('F. domain_knowledge para RH: só RH; há menos de 3 e o motor não completa (limite do catálogo)', () => {
    const result = recommendMaterials({ needs: needsOf({ domain_knowledge: 3 }), professionalArea: HR });
    expect(result).toHaveLength(1);
    for (const item of result) {
      expect(item.area).toBe('RH');
      expect(item.reason).toBe('Apoia o desenvolvimento de conhecimento da área de Recursos Humanos.');
    }
  });

  it('G. domain_knowledge para Secretariado: nenhum material de domínio; nada de TI/RH nem geral', () => {
    const needs = needsOf({ domain_knowledge: 3 });
    expect(recommendMaterials({ needs, professionalArea: SEC })).toEqual([]);
  });

  it('G2. com preenchimento opcional, Secretariado recebe só preparação geral, rotulada como tal', () => {
    const result = recommendMaterials(
      { needs: needsOf({ domain_knowledge: 3 }), professionalArea: SEC },
      { fillWithGeneralPreparation: true },
    );
    expect(result).toHaveLength(3);
    for (const item of result) {
      expect(item.matchKind).toBe('general_preparation');
      expect(item.matchedNeed).toBeNull();
      expect(item.area).toBe('GERAL');
      expect(entryOf(item).generalPreparation).toBe(true);
    }
  });

  it('H. múltiplas necessidades: uma recomendação por necessidade, da mais severa para a menos', () => {
    const needs = needsOf({ clarity: 3, organization: 5, examples: 6 });
    expect(needs.map((item) => item.key)).toEqual(['clarity', 'organization', 'examples']);
    const result = recommendMaterials({ needs });
    expect(result).toHaveLength(3);
    expect(result.map((item) => item.matchedNeed)).toEqual(['clarity', 'organization', 'examples']);
    expect(result.every((item) => item.matchKind === 'primary')).toBe(true);
  });

  it('H2. domain_knowledge junto com outras necessidades: cobre o domínio da área e a comunicação', () => {
    const result = recommendMaterials({
      needs: needsOf({ domain_knowledge: 3, clarity: 5, examples: 6 }),
      professionalArea: IT,
    });
    expect(result).toHaveLength(3);
    expect(result.map((item) => item.matchedNeed)).toEqual(['domain_knowledge', 'clarity', 'examples']);
    expect(result[0].area).toBe('TI');
    expect(result[1].area).toBe('GERAL');
  });

  it('refinamento (uma necessidade `refine`) também recomenda 3 materiais da necessidade', () => {
    const needs = needsOf({ objectivity: 8 });
    expect(needs).toHaveLength(1);
    expect(needs[0].kind).toBe('refine');
    const result = recommendMaterials({ needs });
    expect(result).toHaveLength(3);
    expect(result.every((item) => item.matchedNeed === 'objectivity')).toBe(true);
  });
});

describe('I. sem necessidades: fallback de preparação geral', () => {
  it('devolve 3 materiais `generalPreparation`, sem necessidade artificial, com motivo neutro', () => {
    const needs = deriveNeeds(FULL);
    expect(needs).toEqual([]);
    const result = recommendMaterials({ needs, professionalArea: IT });
    expect(result).toHaveLength(3);
    for (const item of result) {
      expect(item.matchKind).toBe('general_preparation');
      expect(item.matchedNeed).toBeNull();
      expect(entryOf(item).generalPreparation).toBe(true);
      expect(item.reason).toBe('Complementa sua preparação geral para entrevistas.');
    }
  });

  it('é neutro quanto à área e não repete grupos editoriais redundantes', () => {
    const base = recommendMaterials({ needs: [] });
    for (const area of [IT, HR, SEC, undefined, null, 'area-desconhecida']) {
      expect(recommendMaterials({ needs: [], professionalArea: area })).toEqual(base);
    }
    const groups = groupsOf(base);
    expect(new Set(groups).size).toBe(groups.length);
  });
});

describe('J/K. determinismo e ausência de duplicatas (todas as combinações)', () => {
  const areas = [undefined, null, IT, HR, SEC, 'area-desconhecida'];
  const reversed = [...MATERIAL_CATALOG].reverse();

  it('mesma entrada, mesma saída e mesma ordem; independe da ordem do catálogo', () => {
    for (const key of NEED_KEYS) {
      for (const area of areas) {
        const input = { needs: [need(key, 3)], professionalArea: area };
        const first = recommendMaterials(input);
        expect(recommendMaterials(input)).toEqual(first);
        expect(recommendMaterials(input, { catalog: reversed })).toEqual(first);
      }
    }
    const multi = { needs: needsOf({ clarity: 2, examples: 4, organization: 5 }), professionalArea: IT };
    expect(recommendMaterials(multi, { catalog: reversed })).toEqual(recommendMaterials(multi));
  });

  it('não altera a entrada recebida', () => {
    const needs = needsOf({ clarity: 3, organization: 5 });
    const snapshot = JSON.parse(JSON.stringify(needs));
    recommendMaterials({ needs, professionalArea: HR });
    expect(needs).toEqual(snapshot);
  });

  it('nenhuma duplicata e no máximo 3 itens, em qualquer combinação', () => {
    for (const key of NEED_KEYS) {
      for (const area of areas) {
        const result = recommendMaterials({ needs: [need(key, 3)], professionalArea: area });
        expect(result.length).toBeLessThanOrEqual(3);
        expect(new Set(keysOf(result)).size).toBe(result.length);
      }
    }
    const many = recommendMaterials({ needs: NEED_KEYS.map((key) => need(key, 3)), professionalArea: IT });
    expect(many.length).toBeLessThanOrEqual(3);
    expect(new Set(keysOf(many)).size).toBe(many.length);
  });

  it('com o catálogo atual, toda necessidade não técnica chega a 3 em qualquer área', () => {
    for (const key of NEED_KEYS.filter((item) => item !== 'domain_knowledge')) {
      for (const area of areas) {
        const result = recommendMaterials({ needs: [need(key, 3)], professionalArea: area });
        expect({ key, area, total: result.length }).toEqual({ key, area, total: 3 });
      }
    }
  });
});

describe('L. fonte não tem peso fixo', () => {
  it('lista inteira do RH Connect é aceitável quando são os melhores (organization)', () => {
    const result = recommendMaterials({ needs: needsOf({ organization: 4 }) });
    expect(new Set(result.map((item) => item.source))).toEqual(new Set(['RH_CONNECT']));
  });

  it('lista inteira externa também: nada exige uma de cada fonte', () => {
    const catalog = [
      mat({ source: 'CACHOLA', ref: 'k1', title: 'C1', needs: { primary: ['clarity'], secondary: [] } }),
      mat({ source: 'ORANGO', ref: 'k2', title: 'C2', needs: { primary: ['clarity'], secondary: [] } }),
      mat({ source: 'ORANGO', ref: 'k3', title: 'C3', needs: { primary: ['clarity'], secondary: [] } }),
      mat({ ref: 'rh1', title: 'Z', needs: { primary: [], secondary: ['clarity'] } }),
    ];
    const result = recommendMaterials({ needs: [need('clarity', 3)] }, { catalog });
    expect(result.map((item) => item.ref)).toEqual(['k1', 'k2', 'k3']);
    expect(result.some((item) => item.source === 'RH_CONNECT')).toBe(false);
  });

  it('com o catálogo real, as fontes aparecem quando são as melhores (clarity)', () => {
    const sources = new Set(recommendMaterials({ needs: needsOf({ clarity: 3 }) }).map((item) => item.source));
    expect(sources.has('CACHOLA') || sources.has('ORANGO')).toBe(true);
  });
});

describe('M. compatibilidade de área', () => {
  it('material de TI nunca chega a RH, Secretariado ou candidato sem área, nem com gap de domínio', () => {
    for (const area of [HR, SEC, undefined, null, 'area-desconhecida']) {
      for (const key of NEED_KEYS) {
        const result = recommendMaterials({ needs: [need(key, 2)], professionalArea: area });
        expect(result.filter((item) => item.area === 'TI')).toEqual([]);
      }
    }
  });

  it('material de RH só vai para RH; material de TI só para TI', () => {
    for (const [area, allowed] of [
      [IT, ['TI', 'GERAL']],
      [HR, ['RH', 'GERAL']],
      [SEC, ['SECRETARIADO', 'GERAL']],
      [undefined, ['GERAL']],
    ] as const) {
      for (const key of NEED_KEYS) {
        const result = recommendMaterials({ needs: [need(key, 2)], professionalArea: area });
        for (const item of result) expect(allowed).toContain(item.area);
      }
    }
  });

  it('domain_knowledge nunca casa com material GERAL, mesmo que a taxonomia o cite', () => {
    const catalog = [
      mat({ ref: 'geral', title: 'Geral', needs: { primary: ['domain_knowledge'], secondary: [] } }),
    ];
    expect(recommendMaterials({ needs: [need('domain_knowledge', 3)], professionalArea: IT }, { catalog })).toEqual([]);
  });

  it('área específica do candidato vence GERAL em empate semântico', () => {
    const catalog = [
      mat({ ref: 'g', title: 'A geral', needs: { primary: ['organization'], secondary: [] } }),
      mat({ ref: 'r', title: 'Z rh', area: 'RH', needs: { primary: ['organization'], secondary: [] } }),
    ];
    const result = recommendMaterials({ needs: [need('organization', 3)], professionalArea: HR }, { catalog });
    expect(result.map((item) => item.ref)).toEqual(['r', 'g']);
  });

  it('a área nunca supera o encaixe semântico: GERAL principal vence TI secundário', () => {
    const catalog = [
      mat({ ref: 'ti', title: 'A ti', area: 'TI', needs: { primary: [], secondary: ['clarity'] } }),
      mat({ ref: 'g', title: 'Z geral', needs: { primary: ['clarity'], secondary: [] } }),
    ];
    const result = recommendMaterials({ needs: [need('clarity', 3)], professionalArea: IT }, { catalog });
    expect(result.map((item) => item.ref)).toEqual(['g', 'ti']);
  });
});

describe('N/O. principal x secundária e ausência de enchimento irrelevante', () => {
  it('N. principal vence secundária em cenário equivalente', () => {
    const catalog = [
      mat({ ref: 'sec', title: 'A secundário', needs: { primary: [], secondary: ['clarity'] } }),
      mat({ ref: 'pri', title: 'Z principal', needs: { primary: ['clarity'], secondary: [] } }),
    ];
    const result = recommendMaterials({ needs: [need('clarity', 3)] }, { catalog });
    expect(result.map((item) => [item.ref, item.matchKind])).toEqual([
      ['pri', 'primary'],
      ['sec', 'secondary'],
    ]);
    expect(result[1].reason).toBe('Também contribui para a clareza na comunicação.');
  });

  it('O. não completa com material sem relação: devolve menos de 3', () => {
    const catalog = [
      mat({ ref: 'a', title: 'A', needs: { primary: ['clarity'], secondary: [] } }),
      mat({ ref: 'b', title: 'B', needs: { primary: ['examples'], secondary: [] } }),
      mat({ ref: 'c', title: 'C', needs: { primary: ['organization'], secondary: [] } }),
    ];
    const result = recommendMaterials({ needs: [need('clarity', 3)] }, { catalog });
    expect(result.map((item) => item.ref)).toEqual(['a']);
  });

  it('O2. nenhum item devolvido deixa de citar a necessidade (catálogo real)', () => {
    for (const key of NEED_KEYS) {
      for (const area of [IT, HR, SEC, undefined]) {
        const result = recommendMaterials({ needs: [need(key, 3)], professionalArea: area });
        for (const item of result) {
          const { primary, secondary } = entryOf(item).needs;
          expect([...primary, ...secondary]).toContain(key);
        }
      }
    }
  });

  it('o preenchimento com preparação geral é opcional e rotulado', () => {
    const catalog = [
      mat({ ref: 'a', title: 'A', needs: { primary: ['clarity'], secondary: [] } }),
      mat({ ref: 'g1', title: 'G1', generalPreparation: true }),
      mat({ ref: 'g2', title: 'G2', generalPreparation: true }),
    ];
    const result = recommendMaterials(
      { needs: [need('clarity', 3)] },
      { catalog, fillWithGeneralPreparation: true },
    );
    expect(result.map((item) => [item.ref, item.matchKind])).toEqual([
      ['a', 'primary'],
      ['g1', 'general_preparation'],
      ['g2', 'general_preparation'],
    ]);
  });
});

describe('P. diversidade e redundâncias editoriais', () => {
  it('dois materiais de diversidade e inclusão não aparecem juntos quando há alternativa', () => {
    const result = recommendMaterials({
      needs: needsOf({ domain_knowledge: 3, clarity: 5 }),
      professionalArea: HR,
    });
    expect(result).toHaveLength(3);
    expect(groupsOf(result).filter((group) => group === 'diversity-inclusion')).toHaveLength(1);
    expect(result.map((item) => item.matchedNeed)).toEqual(['domain_knowledge', 'clarity', 'clarity']);
  });

  it('RH + domain_knowledge: nunca os dois de diversidade e inclusão; aceita menos de 3', () => {
    const result = recommendMaterials({ needs: needsOf({ domain_knowledge: 3 }), professionalArea: HR });
    expect(result).toHaveLength(1);
    expect(result.length).toBeLessThan(3);
    expect(groupsOf(result)).toEqual(['diversity-inclusion']);
    expect(result[0].area).toBe('RH');
    expect(result[0].matchedNeed).toBe('domain_knowledge');
  });

  it('o item de diversidade e inclusão escolhido é sempre o mesmo (determinístico)', () => {
    const input = { needs: needsOf({ domain_knowledge: 3 }), professionalArea: HR };
    const first = recommendMaterials(input);
    expect(recommendMaterials(input, { catalog: [...MATERIAL_CATALOG].reverse() })).toEqual(first);
  });

  it('só um item distinto relevante: devolve 1, sem completar com preparação geral', () => {
    const result = recommendMaterials({ needs: needsOf({ domain_knowledge: 3 }), professionalArea: HR });
    expect(result.some((item) => item.matchKind === 'general_preparation')).toBe(false);
  });

  it('redundância também vale com preenchimento opcional: o geral não repete grupo do já escolhido', () => {
    const result = recommendMaterials(
      { needs: needsOf({ domain_knowledge: 3 }), professionalArea: HR },
      { fillWithGeneralPreparation: true },
    );
    const groups = groupsOf(result);
    expect(new Set(groups).size).toBe(groups.length);
    expect(result[0].matchKind).toBe('primary');
    expect(result.slice(1).every((item) => item.matchKind === 'general_preparation')).toBe(true);
  });

  it('os dois STAR não aparecem juntos em um gap de exemplos', () => {
    const result = recommendMaterials({ needs: needsOf({ examples: 3 }) });
    const star = keysOf(result).filter((key) => redundancyGroupOf(key) === 'star-method');
    expect(star.length).toBeLessThanOrEqual(1);
    expect(result).toHaveLength(3);
  });

  it('no máximo um material de apresentação pessoal em um gap de objetividade', () => {
    const result = recommendMaterials({ needs: needsOf({ objectivity: 3 }) });
    const self = keysOf(result).filter((key) => redundancyGroupOf(key) === 'self-presentation');
    expect(self.length).toBeLessThanOrEqual(1);
    expect(result).toHaveLength(3);
  });

  it('em nenhuma combinação do catálogo real há dois itens do mesmo grupo, mesmo com menos de 3', () => {
    for (const key of NEED_KEYS) {
      for (const area of [IT, HR, SEC, undefined]) {
        const result = recommendMaterials({ needs: [need(key, 3)], professionalArea: area });
        const groups = groupsOf(result);
        expect({ key, area, repeated: groups.length - new Set(groups).size }).toEqual({
          key,
          area,
          repeated: 0,
        });
      }
    }
  });
});

describe('formato do resultado e motivos', () => {
  it('cada item traz fonte, ref da taxonomia, título, área, necessidade, tipo e motivo; sem UUID', () => {
    const result = recommendMaterials({ needs: needsOf({ clarity: 3 }) });
    for (const item of result) {
      expect(Object.keys(item).sort()).toEqual(
        ['area', 'matchKind', 'matchedNeed', 'reason', 'ref', 'source', 'title'].sort(),
      );
      expect(['RH_CONNECT', 'CACHOLA', 'ORANGO']).toContain(item.source);
      expect(item.ref.length).toBeGreaterThan(0);
      expect(item.reason).toBe(buildRecommendationReason(item.matchKind, item.matchedNeed, item.area));
    }
  });

  it('a `ref` de um material externo é a external_key da curadoria (não um UUID)', () => {
    const result = recommendMaterials({ needs: needsOf({ domain_knowledge: 3 }), professionalArea: HR });
    for (const item of result) {
      expect(item.source).not.toBe('RH_CONNECT');
      expect(item.ref).toMatch(/^(ORANGO\|\d+|[0-9a-f]{32})$/);
    }
  });
});
