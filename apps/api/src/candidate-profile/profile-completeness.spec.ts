import {
  evaluateProfileCompleteness,
  type CompletenessInput,
} from './profile-completeness';

const declared = new Date('2026-10-01T12:00:00.000Z');

function complete(overrides: Partial<CompletenessInput> = {}): CompletenessInput {
  return {
    professionalTitle: 'Desenvolvedora Front-end',
    professionalArea: 'information-technology',
    professionalSubarea: 'frontend-development',
    desiredPosition: 'Desenvolvedora React',
    professionalLevel: 'JUNIOR',
    contractType: 'CLT',
    professionalSummary: 'Resumo profissional.',
    educationCount: 1,
    courseCount: 1,
    experienceCount: 1,
    technicalSkillCount: 1,
    behavioralSkillCount: 1,
    coursesNoneDeclaredAt: null,
    experienceNoneDeclaredAt: null,
    technicalSkillsNoneDeclaredAt: null,
    ...overrides,
  };
}

describe('evaluateProfileCompleteness', () => {
  it('perfil totalmente preenchido está completo', () => {
    expect(evaluateProfileCompleteness(complete())).toEqual({
      isComplete: true,
      missingSections: [],
      missingObjectiveFields: [],
    });
  });

  it('perfil vazio (recém-cadastrado) falta todas as seções', () => {
    const result = evaluateProfileCompleteness(
      complete({
        professionalTitle: null,
        professionalArea: null,
        professionalSubarea: null,
        desiredPosition: null,
        professionalLevel: null,
        contractType: null,
        professionalSummary: null,
        educationCount: 0,
        courseCount: 0,
        experienceCount: 0,
        technicalSkillCount: 0,
        behavioralSkillCount: 0,
      }),
    );
    expect(result.isComplete).toBe(false);
    expect(result.missingSections).toEqual([
      'objective',
      'education',
      'courses',
      'experience',
      'technicalSkills',
      'behavioralSkills',
    ]);
    expect(result.missingObjectiveFields).toHaveLength(7);
  });

  it.each([
    ['professionalTitle', { professionalTitle: null }],
    ['professionalTitle', { professionalTitle: '   ' }],
    ['professionalArea', { professionalArea: null, professionalSubarea: null }],
    ['professionalSubarea', { professionalSubarea: null }],
    ['desiredPosition', { desiredPosition: '' }],
    ['professionalLevel', { professionalLevel: null }],
    ['contractType', { contractType: null }],
    ['professionalSummary', { professionalSummary: null }],
  ])('objetivo incompleto sem %s', (field, overrides) => {
    const result = evaluateProfileCompleteness(complete(overrides));
    expect(result.isComplete).toBe(false);
    expect(result.missingSections).toEqual(['objective']);
    expect(result.missingObjectiveFields).toContain(field);
  });

  describe('senioridade x tipo de contrato', () => {
    it('ESTAGIO sem senioridade está completo e não lista professionalLevel', () => {
      const result = evaluateProfileCompleteness(
        complete({ contractType: 'ESTAGIO', professionalLevel: null }),
      );
      expect(result).toEqual({
        isComplete: true,
        missingSections: [],
        missingObjectiveFields: [],
      });
    });

    it.each(['CLT', 'PJ', 'TEMPORARIO'])(
      '%s sem senioridade continua pendente',
      (contractType) => {
        const result = evaluateProfileCompleteness(
          complete({ contractType, professionalLevel: null }),
        );
        expect(result.isComplete).toBe(false);
        expect(result.missingSections).toEqual(['objective']);
        expect(result.missingObjectiveFields).toEqual(['professionalLevel']);
      },
    );

    it('sem contrato e sem senioridade: faltam os dois', () => {
      const result = evaluateProfileCompleteness(
        complete({ contractType: null, professionalLevel: null }),
      );
      expect(result.missingObjectiveFields).toEqual([
        'professionalLevel',
        'contractType',
      ]);
    });
  });

  it('subárea incompatível com a área não conta como preenchida', () => {
    const result = evaluateProfileCompleteness(
      complete({
        professionalArea: 'secretariat',
        professionalSubarea: 'frontend-development',
      }),
    );
    expect(result.missingObjectiveFields).toEqual(['professionalSubarea']);
    expect(result.isComplete).toBe(false);
  });

  it('formação exige ao menos 1 registro (não há declaração)', () => {
    const result = evaluateProfileCompleteness(complete({ educationCount: 0 }));
    expect(result.missingSections).toEqual(['education']);
  });

  describe.each([
    ['courses', 'courseCount', 'coursesNoneDeclaredAt'],
    ['experience', 'experienceCount', 'experienceNoneDeclaredAt'],
    ['technicalSkills', 'technicalSkillCount', 'technicalSkillsNoneDeclaredAt'],
  ] as const)('seção %s', (section, countKey, declKey) => {
    it('sem registro e sem declaração -> pendente', () => {
      const result = evaluateProfileCompleteness(
        complete({ [countKey]: 0, [declKey]: null } as Partial<CompletenessInput>),
      );
      expect(result.missingSections).toEqual([section]);
    });

    it('com declaração de ausência -> completa', () => {
      const result = evaluateProfileCompleteness(
        complete({
          [countKey]: 0,
          [declKey]: declared,
        } as Partial<CompletenessInput>),
      );
      expect(result.isComplete).toBe(true);
    });

    it('com registro -> completa', () => {
      const result = evaluateProfileCompleteness(
        complete({ [countKey]: 2, [declKey]: null } as Partial<CompletenessInput>),
      );
      expect(result.isComplete).toBe(true);
    });
  });

  it('habilidades comportamentais exigem >= 1 e não aceitam declaração', () => {
    const result = evaluateProfileCompleteness(
      complete({
        behavioralSkillCount: 0,
        // declarações das outras seções não "emprestam" para esta
        coursesNoneDeclaredAt: declared,
        experienceNoneDeclaredAt: declared,
        technicalSkillsNoneDeclaredAt: declared,
      }),
    );
    expect(result.missingSections).toEqual(['behavioralSkills']);
  });
});
