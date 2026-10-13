import {
  EVALUATION_CRITERIA,
  TOTAL_CRITERIA,
  computeEvaluationProgress,
} from './evaluation-criteria';

describe('computeEvaluationProgress', () => {
  it('o total é o número de critérios canônicos (7)', () => {
    expect(TOTAL_CRITERIA).toBe(EVALUATION_CRITERIA.length);
    expect(TOTAL_CRITERIA).toBe(7);
  });

  it('nada persistido => sem progresso', () => {
    expect(computeEvaluationProgress({}, null)).toEqual({
      filledCriteria: 0,
      totalCriteria: 7,
      hasSummary: false,
      inProgress: false,
    });
    expect(computeEvaluationProgress(null, undefined).inProgress).toBe(false);
  });

  it('um critério já é progresso', () => {
    const result = computeEvaluationProgress({ clarity: 5 }, null);
    expect(result.filledCriteria).toBe(1);
    expect(result.inProgress).toBe(true);
  });

  it('vários critérios', () => {
    const result = computeEvaluationProgress(
      { clarity: 5, coherence: 6, examples: 0 },
      null,
    );
    expect(result.filledCriteria).toBe(3);
  });

  it('só comentário com conteúdo é progresso', () => {
    const result = computeEvaluationProgress({}, '  Bom candidato  ');
    expect(result.hasSummary).toBe(true);
    expect(result.filledCriteria).toBe(0);
    expect(result.inProgress).toBe(true);
  });

  it('comentário só com espaços/quebras não é progresso', () => {
    expect(computeEvaluationProgress({}, '   \r\n  ').inProgress).toBe(false);
    expect(computeEvaluationProgress({}, '').hasSummary).toBe(false);
  });

  it('chaves desconhecidas e valores não numéricos não contam', () => {
    const result = computeEvaluationProgress(
      { outro: 9, clarity: '7', coherence: null, objectivity: Number.NaN },
      null,
    );
    expect(result.filledCriteria).toBe(0);
    expect(result.inProgress).toBe(false);
  });

  it('entrada corrompida não lança', () => {
    expect(computeEvaluationProgress('x', null).filledCriteria).toBe(0);
    expect(computeEvaluationProgress([1], null).filledCriteria).toBe(0);
  });
});
