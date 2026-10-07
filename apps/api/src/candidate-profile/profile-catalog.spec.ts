import {
  ALLOWED_LEVELS_BY_CONTRACT,
  CONTRACT_TYPES,
  PROFESSIONAL_LEVELS,
  isLevelAllowedForContract,
  isLevelApplicable,
} from './profile-catalog';

describe('regra contrato x senioridade', () => {
  it('cobre todos os tipos de contrato do catálogo', () => {
    expect(Object.keys(ALLOWED_LEVELS_BY_CONTRACT).sort()).toEqual(
      [...CONTRACT_TYPES].sort(),
    );
  });

  it.each([
    ['ESTAGIO', []],
    ['CLT', ['TRAINEE', 'JUNIOR', 'PLENO', 'SENIOR']],
    ['PJ', ['JUNIOR', 'PLENO', 'SENIOR']],
    ['TEMPORARIO', ['JUNIOR', 'PLENO', 'SENIOR']],
  ])('%s aceita exatamente %j', (contract, allowed) => {
    for (const level of PROFESSIONAL_LEVELS) {
      expect(isLevelAllowedForContract(contract, level)).toBe(
        (allowed as string[]).includes(level),
      );
    }
  });

  it('sem contrato ou sem senioridade não há combinação a rejeitar', () => {
    expect(isLevelAllowedForContract(null, 'TRAINEE')).toBe(true);
    expect(isLevelAllowedForContract('ESTAGIO', null)).toBe(true);
    expect(isLevelAllowedForContract(undefined, undefined)).toBe(true);
  });

  it('senioridade só não se aplica a estágio', () => {
    expect(isLevelApplicable('ESTAGIO')).toBe(false);
    expect(isLevelApplicable('CLT')).toBe(true);
    expect(isLevelApplicable(null)).toBe(true);
  });
});
