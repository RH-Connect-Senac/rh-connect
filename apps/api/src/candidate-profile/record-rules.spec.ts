import {
  validateCourseRules,
  validateEducationRules,
  validateExperienceRules,
} from './record-rules';

const now = new Date('2026-10-06T12:00:00.000Z'); // mês corrente: 2026-10

const edu = (overrides: Record<string, unknown> = {}) => ({
  status: 'CONCLUIDO',
  academicLevel: 'TECNOLOGO',
  degree: 'ADS' as string | null,
  educationInstitution: 'Senac' as string | null,
  startDate: '2020-02' as string | null,
  endDate: '2024-12' as string | null,
  ...overrides,
});

describe('validateEducationRules', () => {
  it('formação concluída com início e fim válidos', () => {
    expect(validateEducationRules(edu(), now)).toEqual([]);
  });

  it('instituição é sempre obrigatória', () => {
    expect(validateEducationRules(edu({ educationInstitution: null }), now)).toHaveLength(1);
    expect(validateEducationRules(edu({ educationInstitution: '  ' }), now)).toHaveLength(1);
  });

  it('curso é obrigatório, exceto em ensino fundamental e médio', () => {
    for (const level of ['TECNICO', 'TECNOLOGO', 'GRADUACAO', 'POS_GRADUACAO', 'MESTRADO', 'DOUTORADO']) {
      expect(validateEducationRules(edu({ academicLevel: level, degree: null }), now)).toHaveLength(1);
      expect(validateEducationRules(edu({ academicLevel: level, degree: '  ' }), now)).toHaveLength(1);
      expect(validateEducationRules(edu({ academicLevel: level }), now)).toEqual([]);
    }
    for (const level of ['ENSINO_FUNDAMENTAL', 'ENSINO_MEDIO']) {
      expect(validateEducationRules(edu({ academicLevel: level, degree: null }), now)).toEqual([]);
      expect(validateEducationRules(edu({ academicLevel: level }), now)).toEqual([]);
    }
  });

  it('data de início é obrigatória', () => {
    expect(validateEducationRules(edu({ startDate: null }), now).length).toBeGreaterThan(0);
  });

  it('conclusão é obrigatória quando CONCLUIDO', () => {
    expect(validateEducationRules(edu({ endDate: null }), now)).toHaveLength(1);
  });

  it('em andamento: previsão de conclusão é opcional e pode ser futura', () => {
    expect(validateEducationRules(edu({ status: 'EM_ANDAMENTO', endDate: null }), now)).toEqual([]);
    expect(validateEducationRules(edu({ status: 'EM_ANDAMENTO', endDate: '2028-12' }), now)).toEqual([]);
    expect(validateEducationRules(edu({ status: 'EM_ANDAMENTO', startDate: '2024-01', endDate: '2026-10' }), now)).toEqual([]);
  });

  it('em andamento: previsão não pode ser anterior ao início', () => {
    expect(
      validateEducationRules(edu({ status: 'EM_ANDAMENTO', startDate: '2026-05', endDate: '2026-04' }), now),
    ).toHaveLength(1);
  });

  it('concluído com data futura é rejeitado', () => {
    expect(validateEducationRules(edu({ status: 'CONCLUIDO', endDate: '2026-10' }), now)).toEqual([]);
    expect(validateEducationRules(edu({ status: 'CONCLUIDO', endDate: '2026-11' }), now)).toHaveLength(1);
  });

  it('trancado e interrompido aceitam conclusão opcional', () => {
    expect(validateEducationRules(edu({ status: 'TRANCADO', endDate: null }), now)).toEqual([]);
    expect(validateEducationRules(edu({ status: 'INTERROMPIDO', endDate: '2023-01' }), now)).toEqual([]);
  });

  it('rejeita fim antes do início, início futuro e conclusão futura', () => {
    expect(validateEducationRules(edu({ startDate: '2024-05', endDate: '2024-04' }), now)).toHaveLength(1);
    expect(validateEducationRules(edu({ status: 'EM_ANDAMENTO', startDate: '2027-01', endDate: null }), now)).toHaveLength(1);
    expect(validateEducationRules(edu({ startDate: '2024-05', endDate: '2027-01' }), now)).toHaveLength(1);
    expect(validateEducationRules(edu({ status: 'TRANCADO', startDate: '2024-05', endDate: '2027-01' }), now)).toHaveLength(1);
  });
});

describe('validateCourseRules', () => {
  const c = (o: Record<string, unknown>) => ({
    status: 'CONCLUIDO',
    startDate: null as string | null,
    completedAt: null as string | null,
    ...o,
  });

  it('concluído exige conclusão, que não pode ser futura (início opcional)', () => {
    expect(validateCourseRules(c({}), now)).toHaveLength(1);
    expect(validateCourseRules(c({ completedAt: '2026-10' }), now)).toEqual([]);
    expect(validateCourseRules(c({ completedAt: '2026-11' }), now)).toHaveLength(1);
  });

  it('concluído com início e conclusão válidos', () => {
    expect(validateCourseRules(c({ startDate: '2023-02', completedAt: '2025-02' }), now)).toEqual([]);
    expect(validateCourseRules(c({ startDate: '2025-02', completedAt: '2025-02' }), now)).toEqual([]);
  });

  it('conclusão anterior ao início é rejeitada', () => {
    expect(validateCourseRules(c({ startDate: '2025-02', completedAt: '2025-01' }), now)).toHaveLength(1);
  });

  it('em andamento sem início e sem previsão é válido', () => {
    expect(validateCourseRules(c({ status: 'EM_ANDAMENTO' }), now)).toEqual([]);
  });

  it('em andamento com início, com e sem previsão; previsão futura permitida', () => {
    expect(validateCourseRules(c({ status: 'EM_ANDAMENTO', startDate: '2025-02' }), now)).toEqual([]);
    expect(validateCourseRules(c({ status: 'EM_ANDAMENTO', startDate: '2025-02', completedAt: '2027-12' }), now)).toEqual([]);
    expect(validateCourseRules(c({ status: 'EM_ANDAMENTO', completedAt: '2027-12' }), now)).toEqual([]);
  });

  it('em andamento: previsão anterior ao início é rejeitada', () => {
    expect(validateCourseRules(c({ status: 'EM_ANDAMENTO', startDate: '2025-02', completedAt: '2025-01' }), now)).toHaveLength(1);
  });
});

describe('validateExperienceRules', () => {
  it('experiência atual sem término é válida', () => {
    expect(
      validateExperienceRules(
        { isCurrent: true, startDate: '2024-01', endDate: null },
        now,
      ),
    ).toEqual([]);
  });

  it('experiência atual com término é rejeitada', () => {
    expect(
      validateExperienceRules(
        { isCurrent: true, startDate: '2024-01', endDate: '2025-01' },
        now,
      ),
    ).toHaveLength(1);
  });

  it('experiência encerrada exige término', () => {
    expect(
      validateExperienceRules(
        { isCurrent: false, startDate: '2022-01', endDate: null },
        now,
      ),
    ).toHaveLength(1);
  });

  it('término informado não pode ser anterior ao início nem futuro', () => {
    expect(
      validateExperienceRules(
        { isCurrent: false, startDate: '2022-01', endDate: '2023-06' },
        now,
      ),
    ).toEqual([]);
    expect(
      validateExperienceRules(
        { isCurrent: false, startDate: '2022-06', endDate: '2022-05' },
        now,
      ),
    ).toHaveLength(1);
    expect(
      validateExperienceRules(
        { isCurrent: false, startDate: '2022-06', endDate: '2027-01' },
        now,
      ),
    ).toHaveLength(1);
  });

  it('início futuro é rejeitado', () => {
    expect(
      validateExperienceRules(
        { isCurrent: true, startDate: '2027-01', endDate: null },
        now,
      ),
    ).toHaveLength(1);
  });
});
