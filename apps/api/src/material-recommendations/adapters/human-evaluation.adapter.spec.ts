import {
  CRITERION_KEYS,
  EVALUATION_CRITERIA,
} from '../../evaluator-interviews/evaluation-criteria';
import { deriveNeeds } from '../need-derivation';
import { NEED_KEYS } from '../recommendation.types';
import { normalizeHumanCriteria } from './human-evaluation.adapter';

describe('normalizeHumanCriteria', () => {
  it('as necessidades v1 coincidem com os critérios canônicos (mesmas chaves e ordem)', () => {
    expect([...NEED_KEYS]).toEqual([...CRITERION_KEYS]);
    expect(EVALUATION_CRITERIA.map((criterion) => criterion.key)).toEqual([...NEED_KEYS]);
  });

  it('normaliza o JSONB persistido para critérios por chave de necessidade', () => {
    expect(
      normalizeHumanCriteria({
        clarity: 8,
        coherence: 6.5,
        objectivity: 7,
        domain_knowledge: 5,
        organization: 9,
        requirements_alignment: 4,
        examples: 10,
      }),
    ).toEqual({
      clarity: 8,
      coherence: 6.5,
      objectivity: 7,
      domain_knowledge: 5,
      organization: 9,
      requirements_alignment: 4,
      examples: 10,
    });
  });

  it('ignora chaves desconhecidas e valores que não são número finito', () => {
    expect(
      normalizeHumanCriteria({
        clarity: 7,
        coherence: '8',
        objectivity: Number.NaN,
        examples: null,
        inexistente: 3,
      }),
    ).toEqual({ clarity: 7 });
  });

  it('entrada ausente ou de tipo errado vira objeto vazio', () => {
    expect(normalizeHumanCriteria(null)).toEqual({});
    expect(normalizeHumanCriteria(undefined)).toEqual({});
    expect(normalizeHumanCriteria([1, 2, 3])).toEqual({});
    expect(normalizeHumanCriteria('texto')).toEqual({});
  });

  it('alimenta deriveNeeds ponta a ponta (adapter -> critérios -> necessidades)', () => {
    const needs = deriveNeeds(
      normalizeHumanCriteria({
        clarity: 9,
        coherence: 9,
        objectivity: 5,
        domain_knowledge: 8,
        organization: 6,
        requirements_alignment: 9,
        examples: 9,
      }),
    );
    expect(needs.map((n) => [n.key, n.kind])).toEqual([
      ['objectivity', 'gap'],
      ['organization', 'gap'],
    ]);
  });
});
