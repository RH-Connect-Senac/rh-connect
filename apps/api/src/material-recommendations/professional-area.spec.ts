import {
  PROFESSIONAL_AREA_KEYS,
  isAreaCompatible,
  isSpecificAreaMatch,
  toMaterialArea,
} from './professional-area';

describe('toMaterialArea (área do perfil -> área da taxonomia)', () => {
  it('mapeia as três áreas do perfil', () => {
    expect(toMaterialArea('information-technology')).toBe('TI');
    expect(toMaterialArea('hr-management')).toBe('RH');
    expect(toMaterialArea('secretariat')).toBe('SECRETARIADO');
  });

  it('o mapa cobre exatamente as áreas do perfil conhecidas', () => {
    expect([...PROFESSIONAL_AREA_KEYS]).toEqual(['information-technology', 'hr-management', 'secretariat']);
    for (const key of PROFESSIONAL_AREA_KEYS) {
      expect(['TI', 'RH', 'SECRETARIADO']).toContain(toMaterialArea(key));
    }
  });

  it('tolera espaços e caixa; área desconhecida ou ausente vira null (nunca GERAL)', () => {
    expect(toMaterialArea('  Information-Technology ')).toBe('TI');
    for (const raw of [undefined, null, '', '   ', 'financas', 'TI', 'GERAL']) {
      expect(toMaterialArea(raw)).toBeNull();
    }
  });
});

describe('compatibilidade de área', () => {
  it('GERAL serve a qualquer candidato, inclusive sem área', () => {
    for (const candidate of ['TI', 'RH', 'SECRETARIADO', null] as const) {
      expect(isAreaCompatible('GERAL', candidate)).toBe(true);
    }
  });

  it('área específica só serve à mesma área; sem área do candidato, não serve', () => {
    expect(isAreaCompatible('TI', 'TI')).toBe(true);
    expect(isAreaCompatible('TI', 'RH')).toBe(false);
    expect(isAreaCompatible('TI', 'SECRETARIADO')).toBe(false);
    expect(isAreaCompatible('RH', 'TI')).toBe(false);
    expect(isAreaCompatible('SECRETARIADO', 'RH')).toBe(false);
    expect(isAreaCompatible('TI', null)).toBe(false);
  });

  it('vantagem de ranking só para área específica igual à do candidato', () => {
    expect(isSpecificAreaMatch('RH', 'RH')).toBe(true);
    expect(isSpecificAreaMatch('GERAL', 'RH')).toBe(false);
    expect(isSpecificAreaMatch('TI', 'RH')).toBe(false);
    expect(isSpecificAreaMatch('GERAL', null)).toBe(false);
  });
});
