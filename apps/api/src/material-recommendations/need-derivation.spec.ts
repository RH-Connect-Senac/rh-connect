import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  MAX_NEEDS,
  NEED_THRESHOLD,
  REFINE_CEILING,
  deriveNeeds,
} from './need-derivation';
import type { NormalizedCriteria } from './recommendation.types';

const code = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const all = (value: number): NormalizedCriteria => ({
  clarity: value,
  coherence: value,
  objectivity: value,
  domain_knowledge: value,
  organization: value,
  requirements_alignment: value,
  examples: value,
});

describe('deriveNeeds: constantes da regra v1', () => {
  it('limite 7, teto de refinamento 9 e no máximo 3 necessidades', () => {
    expect(NEED_THRESHOLD).toBe(7);
    expect(REFINE_CEILING).toBe(9);
    expect(MAX_NEEDS).toBe(3);
  });

  it('os números da regra vivem só nas constantes (não se espalham no código)', () => {
    const source = code(readFileSync(join(__dirname, 'need-derivation.ts'), 'utf8'));
    expect(source.match(/\b7\b/g) ?? []).toHaveLength(1);
    expect(source.match(/\b9\b/g) ?? []).toHaveLength(1);
    expect(source.match(/\b3\b/g) ?? []).toHaveLength(1);
  });
});

describe('deriveNeeds: gaps (nota < limite)', () => {
  it('devolve os critérios abaixo de 7 do pior para o melhor, como gap', () => {
    const needs = deriveNeeds({
      ...all(8),
      clarity: 5,
      objectivity: 6.5,
      examples: 3,
    });
    expect(needs.map((n) => n.key)).toEqual(['examples', 'clarity', 'objectivity']);
    expect(needs.every((n) => n.kind === 'gap')).toBe(true);
    expect(needs[0]).toEqual({ key: 'examples', score: 3, severity: 0.7, kind: 'gap' });
    expect(needs[2].severity).toBeCloseTo(0.35, 4);
  });

  it('nota exatamente igual ao limite NÃO é necessidade', () => {
    expect(deriveNeeds({ ...all(9), clarity: 7 }).map((n) => n.kind)).toEqual(['refine']);
    expect(deriveNeeds({ ...all(9), clarity: 6.9 }).map((n) => n.kind)).toEqual(['gap']);
  });

  it('devolve no máximo 3, escolhendo as 3 piores', () => {
    const needs = deriveNeeds({
      clarity: 2,
      coherence: 4,
      objectivity: 1,
      domain_knowledge: 3,
      organization: 5,
      requirements_alignment: 9,
      examples: 9,
    });
    expect(needs.map((n) => n.key)).toEqual(['objectivity', 'clarity', 'domain_knowledge']);
  });

  it('empate de nota segue a ordem canônica dos critérios', () => {
    const needs = deriveNeeds({ ...all(9), examples: 5, clarity: 5, organization: 5, coherence: 5 });
    expect(needs.map((n) => n.key)).toEqual(['clarity', 'coherence', 'organization']);
  });

  it('gap tem prioridade: com gap, nenhum refine é devolvido', () => {
    const needs = deriveNeeds({ ...all(8), examples: 6 });
    expect(needs).toHaveLength(1);
    expect(needs[0].kind).toBe('gap');
  });
});

describe('deriveNeeds: refinamento', () => {
  it('sem nenhum < 7, o pior critério abaixo de 9 vira um único refine', () => {
    const needs = deriveNeeds({ ...all(8.5), organization: 7.5, examples: 8 });
    expect(needs).toEqual([
      { key: 'organization', score: 7.5, severity: 0.25, kind: 'refine' },
    ]);
  });

  it('empate no refine escolhe o primeiro na ordem canônica', () => {
    const needs = deriveNeeds({ ...all(9.5), objectivity: 8, examples: 8 });
    expect(needs.map((n) => n.key)).toEqual(['objectivity']);
  });

  it('tudo a partir de 9 não gera necessidade (o motor usa materiais gerais)', () => {
    expect(deriveNeeds(all(9))).toEqual([]);
    expect(deriveNeeds(all(10))).toEqual([]);
  });
});

describe('deriveNeeds: entradas incompletas ou inválidas', () => {
  it('sem critérios => lista vazia', () => {
    expect(deriveNeeds({})).toEqual([]);
  });

  it('ignora critérios ausentes, NaN e infinitos', () => {
    const needs = deriveNeeds({
      clarity: Number.NaN,
      coherence: Number.POSITIVE_INFINITY,
      objectivity: Number.NEGATIVE_INFINITY,
      examples: 4,
    });
    expect(needs.map((n) => n.key)).toEqual(['examples']);
  });

  it('limita notas fora da escala 0–10', () => {
    const needs = deriveNeeds({ ...all(10), clarity: -3, coherence: 14 });
    expect(needs).toEqual([{ key: 'clarity', score: 0, severity: 1, kind: 'gap' }]);
  });

  it('não altera a entrada e é determinístico', () => {
    const input: NormalizedCriteria = { clarity: 5, examples: 6 };
    const snapshot = JSON.stringify(input);
    const first = deriveNeeds(input);
    expect(JSON.stringify(input)).toBe(snapshot);
    expect(deriveNeeds(input)).toEqual(first);
  });
});

describe('deriveNeeds: regra configurável', () => {
  it('aceita outro limite, teto e quantidade sem mudar o padrão', () => {
    const input = { ...all(9.5), clarity: 6.5, examples: 5.5 };
    expect(deriveNeeds(input, { threshold: 6 }).map((n) => n.key)).toEqual(['examples']);
    expect(deriveNeeds(input, { maxNeeds: 1 }).map((n) => n.key)).toEqual(['examples']);
    expect(deriveNeeds(input, { maxNeeds: 0 })).toEqual([]);
    expect(deriveNeeds(all(9.2), { refineCeiling: 9.5 })).toHaveLength(1);
    expect(deriveNeeds(input)).toHaveLength(2);
  });
});
