import {
  MAX_CONSOLIDATED_RECOMMENDATIONS,
  RECENT_INTERVIEW_LIMIT,
  consolidateMaterials,
  selectRecentInterviewIds,
} from './material-recommendation-consolidation';
import type { InterviewSnapshotItems } from './material-recommendation-consolidation';
import type { MaterialSnapshotItem } from './material-recommendation-snapshot.service';

function item(
  ref: string,
  position: number,
  overrides: Partial<MaterialSnapshotItem> = {},
): MaterialSnapshotItem {
  return {
    position,
    source: 'CACHOLA',
    materialRef: ref,
    title: `Título ${ref}`,
    resourceType: 'Curso',
    area: 'GERAL',
    matchedNeed: 'clarity',
    matchKind: 'primary',
    reason: `Motivo ${ref}`,
    ...overrides,
  };
}

const interview = (
  interviewId: string,
  items: MaterialSnapshotItem[],
): InterviewSnapshotItems => ({ interviewId, items });

const refsOf = (list: ReturnType<typeof consolidateMaterials>) =>
  list.map((entry) => entry.materialRef);

describe('constantes centralizadas', () => {
  it('5 entrevistas recentes e no máximo 9 materiais', () => {
    expect(RECENT_INTERVIEW_LIMIT).toBe(5);
    expect(MAX_CONSOLIDATED_RECOMMENDATIONS).toBe(9);
  });
});

describe('selectRecentInterviewIds (recência pela conclusão da avaliação)', () => {
  const at = (iso: string) => new Date(iso);

  it('ordena pela conclusão da avaliação, da mais recente para a mais antiga', () => {
    const ids = selectRecentInterviewIds([
      { interviewId: 'a', completedAt: at('2026-10-01T00:00:00Z'), fallbackAt: at('2026-12-01T00:00:00Z') },
      { interviewId: 'b', completedAt: at('2026-10-03T00:00:00Z'), fallbackAt: at('2026-10-03T00:00:00Z') },
      { interviewId: 'c', completedAt: at('2026-10-02T00:00:00Z'), fallbackAt: at('2026-10-02T00:00:00Z') },
    ]);
    // o fallbackAt (updated_at) de "a" é o mais novo, mas NÃO manda quando há completed_at
    expect(ids).toEqual(['b', 'c', 'a']);
  });

  it('sem completed_at usa o fallback; empate desempata pelo id', () => {
    const ids = selectRecentInterviewIds([
      { interviewId: 'z', completedAt: null, fallbackAt: at('2026-10-05T00:00:00Z') },
      { interviewId: 'y', completedAt: at('2026-10-05T00:00:00Z'), fallbackAt: at('2026-01-01T00:00:00Z') },
      { interviewId: 'x', completedAt: null, fallbackAt: at('2026-10-06T00:00:00Z') },
    ]);
    expect(ids).toEqual(['x', 'y', 'z']);
  });

  it('J. só as 5 mais recentes entram', () => {
    const candidates = Array.from({ length: 8 }, (_, index) => ({
      interviewId: `i${index}`,
      completedAt: new Date(Date.UTC(2026, 9, 1 + index)),
      fallbackAt: new Date(0),
    }));
    expect(selectRecentInterviewIds(candidates)).toEqual(['i7', 'i6', 'i5', 'i4', 'i3']);
    expect(selectRecentInterviewIds([])).toEqual([]);
  });

  it('não altera a lista recebida', () => {
    const input = Object.freeze([
      Object.freeze({ interviewId: 'a', completedAt: new Date(1), fallbackAt: new Date(0) }),
      Object.freeze({ interviewId: 'b', completedAt: new Date(2), fallbackAt: new Date(0) }),
    ]);
    expect(selectRecentInterviewIds(input)).toEqual(['b', 'a']);
  });
});

describe('consolidateMaterials', () => {
  it('sem entrevistas ou só com snapshots vazios devolve []', () => {
    expect(consolidateMaterials([])).toEqual([]);
    expect(consolidateMaterials([interview('i1', []), interview('i2', [])])).toEqual([]);
  });

  it('B. uma entrevista: as recomendações dela, com contagem 1', () => {
    const result = consolidateMaterials([interview('i1', [item('a', 1), item('b', 2), item('c', 3)])]);
    expect(refsOf(result)).toEqual(['a', 'b', 'c']);
    expect(result.map((entry) => entry.recommendationCount)).toEqual([1, 1, 1]);
  });

  it('C/D/E. várias entrevistas: o mesmo material aparece UMA vez, com a contagem de entrevistas distintas', () => {
    const result = consolidateMaterials([
      interview('i1', [item('a', 1), item('b', 2)]),
      interview('i2', [item('a', 1), item('c', 2)]),
      interview('i3', [item('a', 3)]),
    ]);
    expect(refsOf(result).filter((ref) => ref === 'a')).toHaveLength(1);
    expect(result.find((entry) => entry.materialRef === 'a')?.recommendationCount).toBe(3);
    expect(result.find((entry) => entry.materialRef === 'b')?.recommendationCount).toBe(1);
    expect(result.find((entry) => entry.materialRef === 'c')?.recommendationCount).toBe(1);
  });

  it('a identidade é (source, material_ref), não o título: mesma ref em fontes diferentes são materiais distintos', () => {
    const result = consolidateMaterials([
      interview('i1', [
        item('x', 1, { source: 'CACHOLA', title: 'Igual' }),
        item('x', 2, { source: 'ORANGO', title: 'Igual' }),
      ]),
      interview('i2', [item('x', 1, { source: 'CACHOLA', title: 'Outro título' })]),
    ]);
    expect(result).toHaveLength(2);
    expect(result.find((entry) => entry.source === 'CACHOLA')?.recommendationCount).toBe(2);
    expect(result.find((entry) => entry.source === 'ORANGO')?.recommendationCount).toBe(1);
  });

  it('F. recorrência vence o material recomendado uma única vez, mesmo mais novo e com position melhor', () => {
    const result = consolidateMaterials([
      interview('novo', [item('unico', 1), item('recorrente', 2)]),
      interview('antigo', [item('recorrente', 3)]),
    ]);
    expect(refsOf(result)).toEqual(['recorrente', 'unico']);
  });

  it('G. empate de recorrência: a entrevista mais recente vence', () => {
    const result = consolidateMaterials([
      interview('novo', [item('b', 3)]),
      interview('antigo', [item('a', 1)]),
    ]);
    expect(refsOf(result)).toEqual(['b', 'a']);
  });

  it('H. empate de recorrência e recência: a melhor position (menor) vence', () => {
    const result = consolidateMaterials([interview('i1', [item('b', 1), item('a', 3), item('c', 2)])]);
    expect(refsOf(result)).toEqual(['b', 'c', 'a']);
  });

  it('H2. a melhor position histórica considera TODAS as ocorrências, não só a mais recente', () => {
    const result = consolidateMaterials([
      interview('novo', [item('a', 3), item('b', 2)]),
      interview('antigo', [item('a', 1), item('b', 2)]),
    ]);
    // contagem 2 e 2; ambos na entrevista mais recente; a tem melhor position (1)
    expect(refsOf(result)).toEqual(['a', 'b']);
  });

  it('I. desempate final determinístico por source e material_ref, independente da ordem de entrada', () => {
    const build = (reverse: boolean) => {
      const first = [item('z', 1, { source: 'RH_CONNECT' }), item('b', 2, { source: 'ORANGO' }), item('a', 3, { source: 'CACHOLA' })];
      const second = [item('z', 3, { source: 'RH_CONNECT' }), item('b', 2, { source: 'ORANGO' }), item('a', 1, { source: 'CACHOLA' })];
      return consolidateMaterials([
        interview('i1', reverse ? [...first].reverse() : first),
        interview('i2', reverse ? [...second].reverse() : second),
      ]);
    };
    // todos: contagem 2, aparecem na entrevista mais recente, melhor position 1 (z e a) ou 2 (b)
    const normal = build(false);
    expect(normal.map((entry) => `${entry.source}:${entry.materialRef}`)).toEqual([
      'CACHOLA:a',
      'RH_CONNECT:z',
      'ORANGO:b',
    ]);
    expect(build(true).map((entry) => `${entry.source}:${entry.materialRef}`)).toEqual(
      normal.map((entry) => `${entry.source}:${entry.materialRef}`),
    );
  });

  it('desempate por material_ref dentro da mesma fonte', () => {
    const result = consolidateMaterials([
      interview('i1', [item('b', 1), item('a', 2)]),
      interview('i2', [item('b', 2), item('a', 1)]),
    ]);
    expect(refsOf(result)).toEqual(['a', 'b']);
  });

  it('X. o ranking não considera a fonte: quem tem melhores métricas vence, seja qual for', () => {
    const result = consolidateMaterials([
      interview('i1', [item('rh', 1, { source: 'RH_CONNECT' }), item('or', 2, { source: 'ORANGO' }), item('ca', 3, { source: 'CACHOLA' })]),
      interview('i2', [item('or', 1, { source: 'ORANGO' })]),
    ]);
    expect(result.map((entry) => entry.source)).toEqual(['ORANGO', 'RH_CONNECT', 'CACHOLA']);
  });

  it('J. só as 5 entrevistas mais recentes influenciam', () => {
    const recentes = ['i1', 'i2', 'i3', 'i4', 'i5'].map((id) => interview(id, [item('base', 1)]));
    const antiga = interview('i6', [item('base', 1), item('so-na-antiga', 2)]);
    const result = consolidateMaterials([...recentes, antiga]);
    expect(refsOf(result)).toEqual(['base']);
    expect(result[0].recommendationCount).toBe(5);
  });

  it('o representante é a ocorrência MAIS RECENTE, sem misturar campos de entrevistas diferentes', () => {
    const result = consolidateMaterials([
      interview('novo', [
        item('a', 3, { title: 'Título novo', resourceType: 'Vídeo', area: 'TI', reason: 'Motivo novo', matchedNeed: 'examples', matchKind: 'secondary' }),
      ]),
      interview('antigo', [
        item('a', 1, { title: 'Título antigo', resourceType: 'Curso', area: 'GERAL', reason: 'Motivo antigo', matchedNeed: 'clarity', matchKind: 'primary' }),
      ]),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].representative).toEqual(
      item('a', 3, { title: 'Título novo', resourceType: 'Vídeo', area: 'TI', reason: 'Motivo novo', matchedNeed: 'examples', matchKind: 'secondary' }),
    );
  });

  it('não altera as entradas e é determinístico', () => {
    const input = Object.freeze([
      Object.freeze(interview('i1', [Object.freeze(item('a', 1)), Object.freeze(item('b', 2))])),
      Object.freeze(interview('i2', [Object.freeze(item('b', 1))])),
    ]);
    const first = consolidateMaterials(input);
    expect(consolidateMaterials(input)).toEqual(first);
    expect(refsOf(first)).toEqual(['b', 'a']);
  });

  it('não limita em 9 por conta própria (o limite é aplicado depois do filtro de disponibilidade)', () => {
    const many = Array.from({ length: 12 }, (_, index) => item(`m${String(index).padStart(2, '0')}`, (index % 3) + 1));
    expect(consolidateMaterials([interview('i1', many.slice(0, 3)), interview('i2', many.slice(3, 6)), interview('i3', many.slice(6, 9)), interview('i4', many.slice(9, 12))])).toHaveLength(12);
  });
});
