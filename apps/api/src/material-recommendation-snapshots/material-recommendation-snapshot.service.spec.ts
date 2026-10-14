import { Prisma } from '@prisma/client';
import { normalizeHumanCriteria } from '../material-recommendations/adapters/human-evaluation.adapter';
import { MATERIAL_TAXONOMY_VERSION } from '../material-recommendations/material-catalog';
import { deriveNeeds } from '../material-recommendations/need-derivation';
import {
  RECOMMENDATION_ENGINE_VERSION,
  recommendMaterials,
} from '../material-recommendations/recommendation-engine';
import type { PrismaService } from '../prisma/prisma.service';
import { MaterialRecommendationSnapshotService } from './material-recommendation-snapshot.service';
import type { SnapshotResult } from './material-recommendation-snapshot.service';

const ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';
const CANDIDATE = 7;

type Row = Record<string, unknown>;

const HIGH = {
  clarity: 9.5,
  coherence: 9.5,
  objectivity: 9.5,
  domain_knowledge: 9.5,
  organization: 9.5,
  requirements_alignment: 9.5,
  examples: 9.5,
};
// Três lacunas de comunicação: sem área, o motor devolve 3 materiais gerais.
const THREE_GAPS = { ...HIGH, clarity: 3, organization: 4, examples: 5 };
// Só conhecimento técnico: sem área reconhecida o motor não tem o que indicar.
const DOMAIN_ONLY = { ...HIGH, domain_knowledge: 3 };

const IT = 'information-technology';
const HR = 'hr-management';

function p2002(target: string[] = ['interview_id']) {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target },
  });
}

interface World {
  interviews: Row[];
  evaluations: Row[];
  profiles: Row[];
  snapshots: Row[];
  recs: Row[];
}

interface Hooks {
  // Roda logo antes do INSERT do cabeçalho (simula a requisição vencedora).
  beforeHeaderCreate?: (world: World) => void;
  headerError?: Error;
  itemsError?: Error;
  interviewReadError?: Error;
}

function interviewRow(overrides: Row = {}): Row {
  return {
    interview_id: ID,
    status: 'COMPLETED',
    evaluation_mode: 'HUMAN',
    candidate_user_id: CANDIDATE,
    ...overrides,
  };
}

function evaluationRow(scores: Row = THREE_GAPS, overrides: Row = {}): Row {
  return {
    interview_id: ID,
    status: 'COMPLETED',
    criteria_scores: { ...scores },
    ...overrides,
  };
}

function world(overrides: Partial<World> = {}): World {
  return {
    interviews: [interviewRow()],
    evaluations: [evaluationRow()],
    profiles: [],
    snapshots: [],
    recs: [],
    ...overrides,
  };
}

function profile(area: string | null): Row {
  return { user_id: CANDIDATE, professional_area: area };
}

function makeService(w: World, hooks: Hooks = {}) {
  let nextId = 1;
  let queue: Promise<void> = Promise.resolve();
  const spies = {
    interviewFind: jest.fn(),
    profileFind: jest.fn(),
    snapshotFind: jest.fn(),
    snapshotCreate: jest.fn(),
    recCreateMany: jest.fn(),
  };

  const snapshotView = (snapshot: Row, args: { select: Row }) => {
    const recSelect = args.select.recommendations as
      | { orderBy?: { position?: string } }
      | undefined;
    let recs = w.recs.filter((r) => r.snapshot_id === snapshot.snapshot_id);
    // Só ordena se o serviço PEDIR a ordenação (o banco não ordena sozinho).
    if (recSelect?.orderBy?.position === 'asc') {
      recs = [...recs].sort(
        (a, b) => (a.position as number) - (b.position as number),
      );
    }
    return { ...snapshot, recommendations: recs.map((r) => ({ ...r })) };
  };

  const makeDelegates = (journal: Array<() => void>) => ({
    interview_material_snapshot: {
      findUnique: (args: { where: Row; select: Row }) => {
        spies.snapshotFind(args);
        const found = w.snapshots.find(
          (s) => s.interview_id === args.where.interview_id,
        );
        return Promise.resolve(found ? snapshotView(found, args) : null);
      },
      create: (args: { data: Row }) => {
        spies.snapshotCreate(args);
        if (hooks.headerError) return Promise.reject(hooks.headerError);
        hooks.beforeHeaderCreate?.(w);
        if (w.snapshots.some((s) => s.interview_id === args.data.interview_id)) {
          return Promise.reject(p2002(['interview_id']));
        }
        const row = {
          snapshot_id: `snap-${nextId++}`,
          created_at: new Date('2026-10-14T12:00:00.000Z'),
          ...args.data,
        };
        w.snapshots.push(row);
        journal.push(() => w.snapshots.splice(w.snapshots.indexOf(row), 1));
        return Promise.resolve({ snapshot_id: row.snapshot_id });
      },
    },
    interview_material_recommendation: {
      createMany: (args: { data: Row[] }) => {
        spies.recCreateMany(args);
        if (hooks.itemsError) return Promise.reject(hooks.itemsError);
        const keys = new Set<string>();
        for (const item of args.data) {
          for (const key of [
            `p:${String(item.snapshot_id)}:${String(item.position)}`,
            `r:${String(item.snapshot_id)}:${String(item.source)}:${String(item.material_ref)}`,
          ]) {
            if (keys.has(key)) return Promise.reject(p2002(['snapshot_id']));
            keys.add(key);
          }
        }
        for (const item of args.data) {
          const row = { ...item };
          w.recs.push(row);
          journal.push(() => w.recs.splice(w.recs.indexOf(row), 1));
        }
        return Promise.resolve({ count: args.data.length });
      },
    },
  });

  const prisma = {
    interview: {
      findUnique: (args: { where: Row }) => {
        spies.interviewFind(args);
        if (hooks.interviewReadError) {
          return Promise.reject(hooks.interviewReadError);
        }
        const found = w.interviews.find(
          (i) => i.interview_id === args.where.interview_id,
        );
        if (!found) return Promise.resolve(null);
        const evaluation = w.evaluations.find(
          (e) => e.interview_id === found.interview_id,
        );
        return Promise.resolve({
          ...found,
          evaluation: evaluation ? { ...evaluation } : null,
        });
      },
    },
    candidate_profile: {
      findUnique: (args: { where: Row }) => {
        spies.profileFind(args);
        const found = w.profiles.find((p) => p.user_id === args.where.user_id);
        return Promise.resolve(found ? { ...found } : null);
      },
    },
    ...makeDelegates([]),
    // Transações em série: no Postgres o INSERT concorrente na mesma chave
    // única ESPERA a outra transação confirmar; aqui isso é a fila.
    $transaction: (callback: (tx: unknown) => Promise<unknown>) => {
      const run = queue.then(async () => {
        const journal: Array<() => void> = [];
        try {
          return await callback(makeDelegates(journal));
        } catch (error) {
          while (journal.length) journal.pop()!();
          throw error;
        }
      });
      queue = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    },
  };

  const service = new MaterialRecommendationSnapshotService(
    prisma as unknown as PrismaService,
  );
  return { service, spies, world: w };
}

function ready(result: SnapshotResult) {
  if (result.kind !== 'ready') {
    throw new Error(`esperava snapshot, veio inelegível: ${result.reason}`);
  }
  return result;
}

// Resultado direto do pipeline real (adapter -> necessidades -> motor), para
// comparar com o que foi persistido sem repetir regra nenhuma no teste.
function expectedItems(scores: Row, area: string | null) {
  return recommendMaterials({
    needs: deriveNeeds(normalizeHumanCriteria(scores)),
    professionalArea: area,
  }).map((item, index) => ({
    position: index + 1,
    source: item.source,
    materialRef: item.ref,
    title: item.title,
    resourceType: item.resourceType,
    area: item.area,
    matchedNeed: item.matchedNeed,
    matchKind: item.matchKind,
    reason: item.reason,
  }));
}

describe('geração do snapshot (HUMAN concluída, sem snapshot)', () => {
  it('A: gera e persiste o snapshot', async () => {
    const { service, world: w } = makeService(world());

    const result = ready(await service.getOrCreateSnapshot(ID));

    expect(result.created).toBe(true);
    expect(result.snapshot.interviewId).toBe(ID);
    expect(result.snapshot.items).toHaveLength(3);
    expect(w.snapshots).toHaveLength(1);
    expect(w.recs).toHaveLength(3);
  });

  it('D: posições persistidas são 1, 2, 3 (base 1, sem buracos)', async () => {
    const { service, world: w } = makeService(world());

    await service.getOrCreateSnapshot(ID);

    expect(w.recs.map((r) => r.position)).toEqual([1, 2, 3]);
    const snapshotId = w.snapshots[0].snapshot_id;
    expect(w.recs.every((r) => r.snapshot_id === snapshotId)).toBe(true);
  });

  it('E: persiste as versões reais do motor e da taxonomia', async () => {
    const { service, world: w } = makeService(world());

    const result = ready(await service.getOrCreateSnapshot(ID));

    expect(w.snapshots[0]).toMatchObject({
      interview_id: ID,
      engine_version: RECOMMENDATION_ENGINE_VERSION,
      taxonomy_version: MATERIAL_TAXONOMY_VERSION,
    });
    expect(result.snapshot.engineVersion).toBe(RECOMMENDATION_ENGINE_VERSION);
    expect(result.snapshot.taxonomyVersion).toBe(MATERIAL_TAXONOMY_VERSION);
  });

  it('F: todos os campos persistidos vêm do motor (pipeline real, sem recálculo)', async () => {
    const scenarios: Array<[Row, string | null]> = [
      [THREE_GAPS, null],
      [THREE_GAPS, IT],
      [DOMAIN_ONLY, IT],
      [DOMAIN_ONLY, HR],
      [HIGH, null],
    ];
    for (const [scores, area] of scenarios) {
      const w = world({
        evaluations: [evaluationRow(scores)],
        profiles: [profile(area)],
      });
      const { service } = makeService(w);

      const result = ready(await service.getOrCreateSnapshot(ID));

      expect(result.snapshot.items).toEqual(expectedItems(scores, area));
      // Colunas no formato do banco.
      expect(
        w.recs.map((r) => ({
          position: r.position,
          source: r.source,
          material_ref: r.material_ref,
          title_snapshot: r.title_snapshot,
          resource_type_snapshot: r.resource_type_snapshot,
          area_snapshot: r.area_snapshot,
          matched_need: r.matched_need,
          match_kind: r.match_kind,
          reason_snapshot: r.reason_snapshot,
        })),
      ).toEqual(
        expectedItems(scores, area).map((item) => ({
          position: item.position,
          source: item.source,
          material_ref: item.materialRef,
          title_snapshot: item.title,
          resource_type_snapshot: item.resourceType,
          area_snapshot: item.area,
          matched_need: item.matchedNeed,
          match_kind: item.matchKind,
          reason_snapshot: item.reason,
        })),
      );
    }
  });

  it('F: preparação geral (sem necessidades) grava matched_need nulo', async () => {
    const w = world({ evaluations: [evaluationRow(HIGH)] });
    const { service } = makeService(w);

    const result = ready(await service.getOrCreateSnapshot(ID));

    expect(result.snapshot.items.length).toBeGreaterThan(0);
    for (const item of result.snapshot.items) {
      expect(item.matchKind).toBe('general_preparation');
      expect(item.matchedNeed).toBeNull();
    }
  });
});

describe('snapshot vazio é um snapshot válido', () => {
  it('C: zero recomendações cria só o cabeçalho', async () => {
    const w = world({ evaluations: [evaluationRow(DOMAIN_ONLY)] });
    const { service, spies } = makeService(w);

    const result = ready(await service.getOrCreateSnapshot(ID));

    expect(result.created).toBe(true);
    expect(result.snapshot.items).toEqual([]);
    expect(w.snapshots).toHaveLength(1);
    expect(w.recs).toHaveLength(0);
    expect(spies.recCreateMany).not.toHaveBeenCalled();
  });

  it('T: a segunda chamada lazy lê o cabeçalho vazio e NÃO gera de novo', async () => {
    const w = world({ evaluations: [evaluationRow(DOMAIN_ONLY)] });
    const { service, spies } = makeService(w);

    await service.getOrCreateSnapshot(ID);
    expect(spies.interviewFind).toHaveBeenCalledTimes(1);
    expect(spies.snapshotCreate).toHaveBeenCalledTimes(1);

    const second = ready(await service.getOrCreateSnapshot(ID));

    expect(second.created).toBe(false);
    expect(second.snapshot.items).toEqual([]);
    expect(spies.interviewFind).toHaveBeenCalledTimes(1);
    expect(spies.snapshotCreate).toHaveBeenCalledTimes(1);
    expect(w.snapshots).toHaveLength(1);
  });
});

describe('idempotência e imutabilidade', () => {
  function preloaded() {
    const w = world({
      snapshots: [
        {
          snapshot_id: 'snap-antigo',
          interview_id: ID,
          engine_version: 'engine-0',
          taxonomy_version: 'tax-antiga',
          created_at: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
      recs: [
        {
          snapshot_id: 'snap-antigo',
          position: 1,
          source: 'RH_CONNECT',
          material_ref: 'ref-antiga',
          title_snapshot: 'Título que não existe mais',
          resource_type_snapshot: 'Leitura',
          area_snapshot: 'GERAL',
          matched_need: 'clarity',
          match_kind: 'primary',
          reason_snapshot: 'Motivo antigo.',
        },
      ],
    });
    return w;
  }

  it('B: snapshot existente é devolvido sem tocar na entrevista, no motor nem no banco', async () => {
    const { service, spies, world: w } = makeService(preloaded());

    const result = ready(await service.getOrCreateSnapshot(ID));

    expect(result.created).toBe(false);
    expect(result.snapshot.snapshotId).toBe('snap-antigo');
    expect(spies.interviewFind).not.toHaveBeenCalled();
    expect(spies.profileFind).not.toHaveBeenCalled();
    expect(spies.snapshotCreate).not.toHaveBeenCalled();
    expect(spies.recCreateMany).not.toHaveBeenCalled();
    expect(w.snapshots).toHaveLength(1);
    expect(w.recs).toHaveLength(1);
  });

  it('U: o existente permanece intacto mesmo que o motor/área/avaliação agora produzam outra coisa', async () => {
    const w = preloaded();
    w.profiles.push(profile(IT));
    w.evaluations = [evaluationRow(DOMAIN_ONLY)];
    const { service, world } = makeService(w);
    const before = JSON.stringify([world.snapshots, world.recs]);

    const first = ready(await service.getOrCreateSnapshot(ID));
    const second = ready(await service.getOrCreateSnapshot(ID));

    expect(first.snapshot).toEqual(second.snapshot);
    expect(first.snapshot.engineVersion).toBe('engine-0');
    expect(first.snapshot.taxonomyVersion).toBe('tax-antiga');
    expect(first.snapshot.items).toEqual([
      {
        position: 1,
        source: 'RH_CONNECT',
        materialRef: 'ref-antiga',
        title: 'Título que não existe mais',
        resourceType: 'Leitura',
        area: 'GERAL',
        matchedNeed: 'clarity',
        matchKind: 'primary',
        reason: 'Motivo antigo.',
      },
    ]);
    expect(JSON.stringify([world.snapshots, world.recs])).toBe(before);
  });

  it('o snapshot gerado não muda quando a área do candidato muda depois', async () => {
    const w = world({
      evaluations: [evaluationRow(DOMAIN_ONLY)],
      profiles: [profile(IT)],
    });
    const { service } = makeService(w);

    const created = ready(await service.getOrCreateSnapshot(ID));
    expect(created.snapshot.items.length).toBeGreaterThan(0);

    w.profiles[0].professional_area = HR;
    const again = ready(await service.getOrCreateSnapshot(ID));

    expect(again.created).toBe(false);
    expect(again.snapshot).toEqual(created.snapshot);
  });

  it('G: itens saem sempre em position ASC, mesmo gravados fora de ordem', async () => {
    const w = preloaded();
    const base = w.recs[0];
    w.recs = [3, 1, 2].map((position) => ({
      ...base,
      position,
      material_ref: `ref-${position}`,
    }));
    const { service } = makeService(w);

    const snapshot = await service.getSnapshot(ID);

    expect(snapshot?.items.map((item) => item.position)).toEqual([1, 2, 3]);
    expect(snapshot?.items.map((item) => item.materialRef)).toEqual([
      'ref-1',
      'ref-2',
      'ref-3',
    ]);
  });

  it('getSnapshot só lê: sem snapshot devolve null e não gera nada', async () => {
    const { service, spies, world: w } = makeService(world());

    expect(await service.getSnapshot(ID)).toBeNull();

    expect(spies.interviewFind).not.toHaveBeenCalled();
    expect(spies.snapshotCreate).not.toHaveBeenCalled();
    expect(w.snapshots).toHaveLength(0);
  });
});

describe('elegibilidade: nada é gravado quando não é HUMAN concluída', () => {
  async function ineligible(interview: Row, evaluation: Row | null) {
    const w = world({
      interviews: [interviewRow(interview)],
      evaluations: evaluation ? [evaluation] : [],
    });
    const { service, spies } = makeService(w);
    const result = await service.getOrCreateSnapshot(ID);
    expect(w.snapshots).toHaveLength(0);
    expect(w.recs).toHaveLength(0);
    expect(spies.snapshotCreate).not.toHaveBeenCalled();
    return result;
  }

  it('H: HUMAN que ainda não está COMPLETED não gera', async () => {
    for (const status of [
      'IN_PROGRESS',
      'ASSIGNED',
      'PENDING_ASSIGNMENT',
      'PENDING_AI_EVALUATION',
      'CANCELLED',
    ]) {
      expect(await ineligible({ status }, evaluationRow())).toEqual({
        kind: 'ineligible',
        reason: 'NOT_COMPLETED',
      });
    }
  });

  it('I: modalidade AI (ou ainda não escolhida) não gera, mesmo COMPLETED', async () => {
    for (const evaluation_mode of ['AI', null]) {
      expect(
        await ineligible({ evaluation_mode, status: 'COMPLETED' }, evaluationRow()),
      ).toEqual({ kind: 'ineligible', reason: 'NOT_HUMAN' });
    }
  });

  it('J: CANCELLED não gera, nem HUMAN nem AI', async () => {
    expect(await ineligible({ status: 'CANCELLED' }, evaluationRow())).toEqual({
      kind: 'ineligible',
      reason: 'NOT_COMPLETED',
    });
    expect(
      await ineligible(
        { status: 'CANCELLED', evaluation_mode: 'AI' },
        evaluationRow(),
      ),
    ).toEqual({ kind: 'ineligible', reason: 'NOT_HUMAN' });
  });

  it('K: avaliação ausente, em rascunho ou sem os 7 critérios é inelegível (explícito)', async () => {
    expect(await ineligible({}, null)).toEqual({
      kind: 'ineligible',
      reason: 'EVALUATION_MISSING',
    });
    expect(await ineligible({}, evaluationRow(THREE_GAPS, { status: 'DRAFT' }))).toEqual({
      kind: 'ineligible',
      reason: 'EVALUATION_NOT_COMPLETED',
    });
    const { clarity: _removed, ...sixCriteria } = THREE_GAPS;
    void _removed;
    expect(await ineligible({}, evaluationRow(sixCriteria))).toEqual({
      kind: 'ineligible',
      reason: 'CRITERIA_INCOMPLETE',
    });
    expect(
      await ineligible({}, evaluationRow({ ...THREE_GAPS, examples: 'dez' })),
    ).toEqual({ kind: 'ineligible', reason: 'CRITERIA_INCOMPLETE' });
    expect(await ineligible({}, evaluationRow({}, {}))).toEqual({
      kind: 'ineligible',
      reason: 'CRITERIA_INCOMPLETE',
    });
  });

  it('K: entrevista inexistente é inelegível', async () => {
    const { service, world: w } = makeService(world());

    expect(await service.getOrCreateSnapshot(OTHER_ID)).toEqual({
      kind: 'ineligible',
      reason: 'INTERVIEW_NOT_FOUND',
    });
    expect(w.snapshots).toHaveLength(0);
  });
});

describe('área profissional', () => {
  it('L: área válida do perfil chega ao motor (domínio técnico vira material da área)', async () => {
    for (const [area, material] of [
      [IT, 'TI'],
      [HR, 'RH'],
    ] as const) {
      const w = world({
        evaluations: [evaluationRow(DOMAIN_ONLY)],
        profiles: [profile(area)],
      });
      const { service, spies } = makeService(w);

      const result = ready(await service.getOrCreateSnapshot(ID));

      expect(spies.profileFind).toHaveBeenCalledWith(
        expect.objectContaining({ where: { user_id: CANDIDATE } }),
      );
      expect(result.snapshot.items.length).toBeGreaterThan(0);
      expect(result.snapshot.items.every((item) => item.area === material)).toBe(true);
      expect(result.snapshot.items).toEqual(expectedItems(DOMAIN_ONLY, area));
    }
  });

  it('M: sem perfil, área nula, vazia ou desconhecida: nada de área inventada (só gerais)', async () => {
    const cases: Row[][] = [
      [],
      [profile(null)],
      [profile('')],
      [profile('Engenharia')],
      [profile('Tecnologia')],
    ];
    for (const profiles of cases) {
      const w = world({ profiles });
      const { service } = makeService(w);

      const result = ready(await service.getOrCreateSnapshot(ID));

      expect(result.snapshot.items.length).toBeGreaterThan(0);
      expect(result.snapshot.items.every((item) => item.area === 'GERAL')).toBe(true);
    }
  });

  it('M: área desconhecida + só domínio técnico = snapshot vazio, igual ao motor', async () => {
    const w = world({
      evaluations: [evaluationRow(DOMAIN_ONLY)],
      profiles: [profile('Engenharia')],
    });
    const { service } = makeService(w);

    const result = ready(await service.getOrCreateSnapshot(ID));

    expect(result.snapshot.items).toEqual(expectedItems(DOMAIN_ONLY, 'Engenharia'));
    expect(result.snapshot.items).toEqual([]);
  });
});

describe('concorrência e erros', () => {
  it('N: P2002 do cabeçalho com vencedor na releitura devolve o snapshot da outra requisição', async () => {
    const w = world();
    const { service, world: state } = makeService(w, {
      // A "requisição A" grava entre a leitura inicial e o INSERT da "B".
      beforeHeaderCreate: (current) => {
        current.snapshots.push({
          snapshot_id: 'snap-vencedor',
          interview_id: ID,
          engine_version: 'engine-1',
          taxonomy_version: 'rh-1+ext-1',
          created_at: new Date('2026-10-14T11:59:59.000Z'),
        });
        current.recs.push({
          snapshot_id: 'snap-vencedor',
          position: 1,
          source: 'RH_CONNECT',
          material_ref: 'ref-vencedora',
          title_snapshot: 'Vencedora',
          resource_type_snapshot: 'Leitura',
          area_snapshot: 'GERAL',
          matched_need: 'clarity',
          match_kind: 'primary',
          reason_snapshot: 'Motivo.',
        });
      },
    });

    const result = ready(await service.getOrCreateSnapshot(ID));

    expect(result.created).toBe(false);
    expect(result.snapshot.snapshotId).toBe('snap-vencedor');
    expect(result.snapshot.items.map((item) => item.materialRef)).toEqual([
      'ref-vencedora',
    ]);
    // A perdedora não deixou nada para trás.
    expect(state.snapshots).toHaveLength(1);
    expect(state.recs).toHaveLength(1);
  });

  it('N: duas chamadas simultâneas terminam com UM snapshot e o mesmo resultado', async () => {
    const { service, world: state } = makeService(world());

    const [a, b] = await Promise.all([
      service.getOrCreateSnapshot(ID),
      service.getOrCreateSnapshot(ID),
    ]);

    expect(state.snapshots).toHaveLength(1);
    expect(state.recs).toHaveLength(3);
    expect(ready(a).snapshot).toEqual(ready(b).snapshot);
  });

  it('O: P2002 dos ITENS não é engolido, e o cabeçalho é desfeito (sem snapshot parcial)', async () => {
    const { service, world: state } = makeService(world(), {
      itemsError: p2002(['snapshot_id', 'position']),
    });

    await expect(service.getOrCreateSnapshot(ID)).rejects.toMatchObject({
      code: 'P2002',
    });

    expect(state.snapshots).toHaveLength(0);
    expect(state.recs).toHaveLength(0);
  });

  it('O: P2002 do cabeçalho SEM vencedor na releitura é inconsistência real e propaga', async () => {
    const { service, world: state } = makeService(world(), {
      headerError: p2002(['interview_id']),
    });

    await expect(service.getOrCreateSnapshot(ID)).rejects.toMatchObject({
      code: 'P2002',
    });

    expect(state.snapshots).toHaveLength(0);
  });

  it('P: erro comum de banco propaga no getOrCreate e não deixa nada gravado', async () => {
    const header = makeService(world(), { headerError: new Error('banco fora') });
    await expect(header.service.getOrCreateSnapshot(ID)).rejects.toThrow('banco fora');
    expect(header.world.snapshots).toHaveLength(0);

    const items = makeService(world(), { itemsError: new Error('disco cheio') });
    await expect(items.service.getOrCreateSnapshot(ID)).rejects.toThrow('disco cheio');
    expect(items.world.snapshots).toHaveLength(0);
    expect(items.world.recs).toHaveLength(0);

    const read = makeService(world(), { interviewReadError: new Error('timeout') });
    await expect(read.service.getOrCreateSnapshot(ID)).rejects.toThrow('timeout');
    expect(read.world.snapshots).toHaveLength(0);
  });

  it('P: um erro que NÃO é Prisma com code P2002 também não é tratado como corrida', async () => {
    const fake = Object.assign(new Error('parece, mas não é'), { code: 'P2002' });
    const { service } = makeService(world(), { headerError: fake });

    await expect(service.getOrCreateSnapshot(ID)).rejects.toBe(fake);
  });
});
