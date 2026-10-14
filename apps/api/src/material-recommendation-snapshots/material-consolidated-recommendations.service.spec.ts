import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Logger } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { MaterialConsolidatedRecommendationsService } from './material-consolidated-recommendations.service';

// Taxonomia real + UMA entrada fictícia em que id e slug são diferentes.
jest.mock('../material-recommendations/rh-material-taxonomy', () => {
  const actual = jest.requireActual<
    typeof import('../material-recommendations/rh-material-taxonomy')
  >('../material-recommendations/rh-material-taxonomy');
  return {
    ...actual,
    RH_MATERIAL_TAXONOMY: [
      ...actual.RH_MATERIAL_TAXONOMY,
      {
        id: 'rh-id-editorial-distinto',
        slug: 'slug-distinto-do-id',
        title: 'Material com id diferente do slug',
        area: 'GERAL',
        needs: { primary: [], secondary: [] },
        generalPreparation: false,
      },
    ],
  };
});

const ME = 7;
const OTHER = 8;
const RH_REAL = 'como-se-apresentar-em-entrevistas';
const RH_ID_DISTINTO = 'rh-id-editorial-distinto';
const RH_SLUG_DISTINTO = 'slug-distinto-do-id';

interface InterviewRow {
  interview_id: string;
  candidate_user_id: number;
  status: string;
  updated_at: Date;
  completed_at: Date | null;
  hasSnapshot: boolean;
}

interface RecRow {
  interviewId: string;
  position: number;
  source: string;
  ref: string;
  title?: string;
  reason?: string;
}

// Título/motivo históricos NEUTROS para os testes de vazamento: o fixture padrão
// deriva esses textos do material_ref, o que contaminaria a checagem de que a
// referência técnica não sai no contrato.
const NEUTRAL_TEXT = {
  title: 'Material de teste',
  reason: 'Recomendado para praticar comunicação',
};

const day = (n: number) => new Date(Date.UTC(2026, 9, n));

function interviewRow(id: string, completedDay: number, overrides: Partial<InterviewRow> = {}): InterviewRow {
  return {
    interview_id: id,
    candidate_user_id: ME,
    status: 'COMPLETED',
    updated_at: day(28),
    completed_at: day(completedDay),
    hasSnapshot: true,
    ...overrides,
  };
}

function rec(interviewId: string, position: number, source: string, ref: string, extra: Partial<RecRow> = {}): RecRow {
  return { interviewId, position, source, ref, ...extra };
}

function resource(ref: string, overrides: Record<string, unknown> = {}) {
  return {
    source: 'CACHOLA',
    external_key: ref,
    url: `https://exemplo.test/${ref}`,
    cover_url: `https://exemplo.test/${ref}.webp`,
    direct_link_available: true,
    is_active: true,
    ...overrides,
  };
}

function makeService(
  interviews: InterviewRow[],
  recs: RecRow[],
  resources: Array<Record<string, unknown>> = [],
  options: { resourceError?: Error } = {},
) {
  const interviewFindMany = jest.fn(
    (args: { where: { candidate_user_id: number; status: string } }) =>
      Promise.resolve(
        interviews
          .filter(
            (row) =>
              row.candidate_user_id === args.where.candidate_user_id &&
              row.status === args.where.status &&
              row.hasSnapshot,
          )
          .map((row) => ({
            interview_id: row.interview_id,
            updated_at: row.updated_at,
            evaluation: row.completed_at ? { completed_at: row.completed_at } : null,
          })),
      ),
  );
  const recFindMany = jest.fn(
    (args: { where: { snapshot: { interview_id: { in: string[] } } } }) =>
      Promise.resolve(
        recs
          .filter((row) => args.where.snapshot.interview_id.in.includes(row.interviewId))
          .map((row) => ({
            position: row.position,
            source: row.source,
            material_ref: row.ref,
            title_snapshot: row.title ?? `Título ${row.ref}`,
            resource_type_snapshot: row.source === 'RH_CONNECT' ? 'Leitura' : 'Curso',
            area_snapshot: 'GERAL',
            matched_need: 'clarity',
            match_kind: 'primary',
            reason_snapshot: row.reason ?? `Motivo ${row.ref}`,
            snapshot: { interview_id: row.interviewId },
          })),
      ),
  );
  const resourceFindMany = jest.fn(() =>
    options.resourceError ? Promise.reject(options.resourceError) : Promise.resolve(resources),
  );
  const prisma = {
    interview: { findMany: interviewFindMany },
    interview_material_recommendation: { findMany: recFindMany },
    external_learning_resource: { findMany: resourceFindMany },
  };
  const service = new MaterialConsolidatedRecommendationsService(prisma as unknown as PrismaService);
  return { service, interviewFindMany, recFindMany, resourceFindMany };
}

let errorSpy: jest.SpyInstance;
beforeEach(() => {
  errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
});
afterEach(() => jest.restoreAllMocks());

const refsOf = (result: { recommendations: Array<{ title: string }> }) =>
  result.recommendations.map((entry) => entry.title);

describe('fonte de dados e janela', () => {
  it('A. candidato sem snapshots devolve [] sem consultar itens nem catálogo', async () => {
    const { service, recFindMany, resourceFindMany } = makeService([], []);
    await expect(service.listForCandidate(ME)).resolves.toEqual({ recommendations: [] });
    expect(recFindMany).not.toHaveBeenCalled();
    expect(resourceFindMany).not.toHaveBeenCalled();
  });

  it('entrevista sem snapshot, não concluída ou de outro candidato não participa', async () => {
    const { service } = makeService(
      [
        interviewRow('sem-snap', 20, { hasSnapshot: false }),
        interviewRow('assigned', 21, { status: 'ASSIGNED' }),
        interviewRow('outro', 22, { candidate_user_id: OTHER }),
      ],
      [rec('sem-snap', 1, 'CACHOLA', 'a'), rec('assigned', 1, 'CACHOLA', 'b'), rec('outro', 1, 'CACHOLA', 'c')],
      [resource('a'), resource('b'), resource('c')],
    );
    await expect(service.listForCandidate(ME)).resolves.toEqual({ recommendations: [] });
  });

  it('B. uma entrevista: as recomendações dela, em ordem de position', async () => {
    const { service } = makeService(
      [interviewRow('i1', 10)],
      [rec('i1', 3, 'CACHOLA', 'c'), rec('i1', 1, 'CACHOLA', 'a'), rec('i1', 2, 'CACHOLA', 'b')],
      [resource('a'), resource('b'), resource('c')],
    );
    const result = await service.listForCandidate(ME);
    expect(refsOf(result)).toEqual(['Título a', 'Título b', 'Título c']);
    expect(result.recommendations.map((entry) => entry.recommendationCount)).toEqual([1, 1, 1]);
  });

  it('C/D/E/F. várias entrevistas: sem duplicar, com contagem e a recorrência na frente', async () => {
    const { service } = makeService(
      [interviewRow('i1', 10), interviewRow('i2', 12), interviewRow('i3', 11)],
      [
        rec('i1', 1, 'CACHOLA', 'unico-antigo'),
        rec('i1', 2, 'CACHOLA', 'repetido'),
        rec('i2', 1, 'CACHOLA', 'unico-novo'),
        rec('i2', 2, 'CACHOLA', 'repetido'),
        rec('i3', 1, 'CACHOLA', 'repetido'),
      ],
      [resource('unico-antigo'), resource('unico-novo'), resource('repetido')],
    );
    const result = await service.listForCandidate(ME);
    expect(refsOf(result)).toEqual(['Título repetido', 'Título unico-novo', 'Título unico-antigo']);
    expect(result.recommendations.map((entry) => entry.recommendationCount)).toEqual([3, 1, 1]);
  });

  it('G. a recência vem da conclusão da avaliação, não da ordem do banco nem do updated_at', async () => {
    const { service } = makeService(
      [
        // "velha" tem updated_at (snapshot/lazy) mais novo, mas foi concluída antes
        interviewRow('velha', 10, { updated_at: day(29) }),
        interviewRow('nova', 15, { updated_at: day(11) }),
      ],
      [rec('velha', 1, 'CACHOLA', 'da-velha'), rec('nova', 1, 'CACHOLA', 'da-nova')],
      [resource('da-velha'), resource('da-nova')],
    );
    expect(refsOf(await service.listForCandidate(ME))).toEqual(['Título da-nova', 'Título da-velha']);
  });

  it('J. só as 5 entrevistas mais recentes influenciam (a consulta de itens recebe só as 5)', async () => {
    const interviews = Array.from({ length: 6 }, (_, index) => interviewRow(`i${index + 1}`, 10 + index));
    const recs = interviews.map((row) => rec(row.interview_id, 1, 'CACHOLA', `m-${row.interview_id}`));
    const { service, recFindMany } = makeService(
      interviews,
      recs,
      recs.map((row) => resource(row.ref)),
    );
    const result = await service.listForCandidate(ME);
    const where = recFindMany.mock.calls[0][0].where.snapshot.interview_id.in;
    expect([...where].sort()).toEqual(['i2', 'i3', 'i4', 'i5', 'i6']);
    expect(refsOf(result)).not.toContain('Título m-i1');
    expect(result.recommendations).toHaveLength(5);
  });

  it('K. no máximo 9 materiais únicos', async () => {
    const interviews = Array.from({ length: 5 }, (_, index) => interviewRow(`i${index}`, 10 + index));
    const recs = interviews.flatMap((row) =>
      [1, 2, 3].map((position) => rec(row.interview_id, position, 'CACHOLA', `${row.interview_id}-p${position}`)),
    );
    const { service } = makeService(interviews, recs, recs.map((row) => resource(row.ref)));
    expect((await service.listForCandidate(ME)).recommendations).toHaveLength(9);
  });

  it('L. não força 9: 4 boas recomendações devolvem 4', async () => {
    const { service } = makeService(
      [interviewRow('i1', 10), interviewRow('i2', 11)],
      [rec('i1', 1, 'CACHOLA', 'a'), rec('i1', 2, 'CACHOLA', 'b'), rec('i2', 1, 'CACHOLA', 'c'), rec('i2', 2, 'CACHOLA', 'd')],
      ['a', 'b', 'c', 'd'].map((ref) => resource(ref)),
    );
    expect((await service.listForCandidate(ME)).recommendations).toHaveLength(4);
  });

  it('M. snapshot vazio não gera item (mas a entrevista ocupa uma vaga da janela)', async () => {
    const interviews = [interviewRow('vazia', 20), ...[1, 2, 3, 4].map((n) => interviewRow(`i${n}`, 10 + n)), interviewRow('antiga', 5)];
    const { service, recFindMany } = makeService(
      interviews,
      [rec('antiga', 1, 'CACHOLA', 'so-antiga'), rec('i4', 1, 'CACHOLA', 'ok')],
      [resource('so-antiga'), resource('ok')],
    );
    const result = await service.listForCandidate(ME);
    expect(refsOf(result)).toEqual(['Título ok']);
    expect(recFindMany.mock.calls[0][0].where.snapshot.interview_id.in).not.toContain('antiga');
  });
});

describe('disponibilidade atual', () => {
  it('N. externo ativo: AVAILABLE com url, capa e link direto', async () => {
    const { service } = makeService([interviewRow('i1', 10)], [rec('i1', 1, 'CACHOLA', 'a')], [resource('a')]);
    const [entry] = (await service.listForCandidate(ME)).recommendations;
    expect(entry).toMatchObject({
      source: 'CACHOLA',
      availability: 'AVAILABLE',
      internalSlug: null,
      directLinkAvailable: true,
      url: 'https://exemplo.test/a',
      coverUrl: 'https://exemplo.test/a.webp',
    });
  });

  it('O/P. externo inativo ou removido NÃO entra, e o próximo do ranking ocupa a vaga', async () => {
    const interviews = Array.from({ length: 4 }, (_, index) => interviewRow(`i${index}`, 10 + index));
    const recs = interviews.flatMap((row) =>
      [1, 2, 3].map((position) => rec(row.interview_id, position, 'CACHOLA', `${row.interview_id}-p${position}`)),
    );
    // 12 candidatos: 1 inativo, 1 removido (sem linha no catálogo), 10 ativos
    const resources = recs
      .filter((row) => row.ref !== 'i3-p1')
      .map((row) => resource(row.ref, row.ref === 'i3-p2' ? { is_active: false } : {}));
    const { service } = makeService(interviews, recs, resources);
    const result = await service.listForCandidate(ME);
    const titles = refsOf(result);
    expect(titles).not.toContain('Título i3-p1');
    expect(titles).not.toContain('Título i3-p2');
    expect(result.recommendations).toHaveLength(9);
    expect(result.recommendations.every((entry) => entry.availability === 'AVAILABLE')).toBe(true);
  });

  it('Q. falha técnica do catálogo: UNKNOWN, sem link, sem derrubar o endpoint e com log', async () => {
    const { service } = makeService(
      [interviewRow('i1', 10)],
      [rec('i1', 1, 'CACHOLA', 'a'), rec('i1', 2, 'RH_CONNECT', RH_REAL)],
      [],
      { resourceError: new Error('db fora') },
    );
    const result = await service.listForCandidate(ME);
    expect(result.recommendations).toHaveLength(2);
    expect(result.recommendations[0]).toMatchObject({
      source: 'CACHOLA',
      availability: 'UNKNOWN',
      url: null,
      coverUrl: null,
      directLinkAvailable: false,
      internalSlug: null,
    });
    // RH Connect não depende do catálogo externo
    expect(result.recommendations[1]).toMatchObject({ availability: 'IN_APP', internalSlug: RH_REAL });
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('R. RH Connect válido: IN_APP com o SLUG da taxonomia (não o material_ref)', async () => {
    const { service, resourceFindMany } = makeService(
      [interviewRow('i1', 10)],
      [
        rec('i1', 1, 'RH_CONNECT', RH_ID_DISTINTO, NEUTRAL_TEXT),
        rec('i1', 2, 'RH_CONNECT', RH_REAL, NEUTRAL_TEXT),
      ],
    );
    const result = await service.listForCandidate(ME);
    expect(result.recommendations.map((entry) => entry.internalSlug)).toEqual([RH_SLUG_DISTINTO, RH_REAL]);
    expect(result.recommendations.every((entry) => entry.availability === 'IN_APP')).toBe(true);
    expect(JSON.stringify(result)).not.toContain(RH_ID_DISTINTO);
    expect(resourceFindMany).not.toHaveBeenCalled();
  });

  it('S. RH Connect fora da taxonomia atual não quebra e não ocupa vaga da lista ativa', async () => {
    const { service } = makeService(
      [interviewRow('i1', 10)],
      [rec('i1', 1, 'RH_CONNECT', 'material-removido'), rec('i1', 2, 'RH_CONNECT', RH_REAL)],
    );
    const result = await service.listForCandidate(ME);
    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0].internalSlug).toBe(RH_REAL);
  });

  it('o representante histórico (título/motivo) vem da ocorrência mais recente', async () => {
    const { service } = makeService(
      [interviewRow('velha', 10), interviewRow('nova', 12)],
      [
        rec('velha', 1, 'CACHOLA', 'a', { title: 'Título velho', reason: 'Motivo velho' }),
        rec('nova', 2, 'CACHOLA', 'a', { title: 'Título novo', reason: 'Motivo novo' }),
      ],
      [resource('a')],
    );
    const [entry] = (await service.listForCandidate(ME)).recommendations;
    expect(entry).toMatchObject({ title: 'Título novo', reason: 'Motivo novo', recommendationCount: 2 });
  });
});

describe('contrato, autorização e consultas', () => {
  const LEAKS = [
    'material_ref',
    'materialRef',
    'external_key',
    'externalKey',
    'snapshot_id',
    'snapshotId',
    'recommendation_id',
    'recommendationId',
    'interview_id',
    'interviewId',
    'resource_id',
    'resourceId',
    'position',
    'matchedNeed',
    'matchKind',
  ];

  it('T. só as chaves do contrato; nenhum id, referência ou valor interno vaza', async () => {
    const { service } = makeService(
      [interviewRow('entrevista-secreta', 10)],
      [
        rec('entrevista-secreta', 1, 'CACHOLA', 'chave-externa-secreta', NEUTRAL_TEXT),
        rec('entrevista-secreta', 2, 'RH_CONNECT', RH_ID_DISTINTO, NEUTRAL_TEXT),
      ],
      [resource('chave-externa-secreta')],
    );
    const result = await service.listForCandidate(ME);
    expect(Object.keys(result)).toEqual(['recommendations']);
    for (const entry of result.recommendations) {
      expect(Object.keys(entry).sort()).toEqual(
        [
          'area',
          'availability',
          'coverUrl',
          'directLinkAvailable',
          'internalSlug',
          'reason',
          'recommendationCount',
          'resourceType',
          'source',
          'title',
          'url',
        ].sort(),
      );
    }
    const json = JSON.stringify(result);
    for (const forbidden of [...LEAKS, 'entrevista-secreta', RH_ID_DISTINTO]) {
      expect({ forbidden, leaked: json.includes(forbidden) }).toEqual({ forbidden, leaked: false });
    }
    // a chave externa só pode aparecer dentro das URLs públicas que o catálogo já expõe
    const semUrls = json.replace(/https:\/\/exemplo\.test\/[^"]*/g, '');
    expect(semUrls).not.toContain('chave-externa-secreta');
    expect(result.recommendations[0].url).toBe('https://exemplo.test/chave-externa-secreta');
  });

  it('U. o candidato vem do argumento (JWT) e só enxerga as próprias entrevistas', async () => {
    const interviews = [interviewRow('minha', 10), interviewRow('dele', 11, { candidate_user_id: OTHER })];
    const recs = [rec('minha', 1, 'CACHOLA', 'meu'), rec('dele', 1, 'CACHOLA', 'dele')];
    const resources = [resource('meu'), resource('dele')];

    const mine = makeService(interviews, recs, resources);
    expect(refsOf(await mine.service.listForCandidate(ME))).toEqual(['Título meu']);
    expect(mine.interviewFindMany.mock.calls[0][0].where.candidate_user_id).toBe(ME);

    const theirs = makeService(interviews, recs, resources);
    expect(refsOf(await theirs.service.listForCandidate(OTHER))).toEqual(['Título dele']);
  });

  it('a consulta filtra por entrevista COMPLETED com snapshot, sem filtrar pela modalidade (preparado para IA)', async () => {
    const { service, interviewFindMany } = makeService([], []);
    await service.listForCandidate(ME);
    const args = interviewFindMany.mock.calls[0][0] as unknown as {
      where: Record<string, unknown>;
      select: Record<string, unknown>;
    };
    expect(args.where).toEqual({
      candidate_user_id: ME,
      status: 'COMPLETED',
      material_snapshot: { isNot: null },
    });
    expect(JSON.stringify(args.where)).not.toMatch(/evaluation_mode|HUMAN|AI/);
    // recência pela conclusão da avaliação (não pelo created_at do snapshot)
    expect(args.select).toMatchObject({ evaluation: { select: { completed_at: true } } });
    expect(JSON.stringify(args.select)).not.toContain('created_at');
  });

  it('V. sem N+1: 1 consulta de entrevistas, 1 de itens e 1 de catálogo, qualquer que seja o número de materiais', async () => {
    const interviews = Array.from({ length: 5 }, (_, index) => interviewRow(`i${index}`, 10 + index));
    const recs = interviews.flatMap((row) =>
      [1, 2, 3].map((position) =>
        rec(row.interview_id, position, position === 3 ? 'ORANGO' : 'CACHOLA', `${row.interview_id}-p${position}`),
      ),
    );
    const { service, interviewFindMany, recFindMany, resourceFindMany } = makeService(
      interviews,
      recs,
      recs.map((row) => resource(row.ref, { source: row.source })),
    );
    await service.listForCandidate(ME);
    expect(interviewFindMany).toHaveBeenCalledTimes(1);
    expect(recFindMany).toHaveBeenCalledTimes(1);
    expect(resourceFindMany).toHaveBeenCalledTimes(1);
  });

  it('o catálogo é consultado por (fonte, chave externa), nunca por UUID de recurso', async () => {
    const { service, resourceFindMany } = makeService(
      [interviewRow('i1', 10)],
      [rec('i1', 1, 'CACHOLA', 'a'), rec('i1', 2, 'ORANGO', 'b')],
      [resource('a'), resource('b', { source: 'ORANGO' })],
    );
    await service.listForCandidate(ME);
    const args = (resourceFindMany.mock.calls as unknown as Array<[{ where: unknown }]>)[0][0];
    expect(args.where).toEqual({
      OR: [
        { source: 'CACHOLA', external_key: { in: ['a'] } },
        { source: 'ORANGO', external_key: { in: ['b'] } },
      ],
    });
    expect(JSON.stringify(args)).not.toMatch(/resource_id/);
  });

  it('X. o ranking não depende da fonte', async () => {
    const { service } = makeService(
      [interviewRow('i1', 10), interviewRow('i2', 11)],
      [
        rec('i1', 1, 'RH_CONNECT', RH_REAL),
        rec('i1', 2, 'ORANGO', 'o'),
        rec('i1', 3, 'CACHOLA', 'c'),
        rec('i2', 1, 'ORANGO', 'o'),
      ],
      [resource('o', { source: 'ORANGO' }), resource('c')],
    );
    expect((await service.listForCandidate(ME)).recommendations.map((entry) => entry.source)).toEqual([
      'ORANGO',
      'RH_CONNECT',
      'CACHOLA',
    ]);
  });

  it('Y. não usa o engine nem gera snapshot (sem deriveNeeds/recommendMaterials/lazy)', () => {
    for (const file of [
      'material-consolidated-recommendations.service.ts',
      'material-recommendation-consolidation.ts',
      'material-current-state.ts',
      'material-consolidated-recommendations.controller.ts',
    ]) {
      const text = readFileSync(join(__dirname, file), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      expect({ file, bad: /deriveNeeds|recommendMaterials|recommendation-engine|need-derivation|getOrCreateSnapshot|MaterialRecommendationSnapshotService|evaluation_mode|human-evaluation\.adapter/.test(text) }).toEqual({ file, bad: false });
    }
  });

  it('é somente leitura: só findMany, nada de create/update/delete/upsert', async () => {
    const { service } = makeService([interviewRow('i1', 10)], [rec('i1', 1, 'CACHOLA', 'a')], [resource('a')]);
    await service.listForCandidate(ME);
    const text = readFileSync(join(__dirname, 'material-consolidated-recommendations.service.ts'), 'utf8');
    expect(text).not.toMatch(/\.(create|createMany|update|updateMany|upsert|delete|deleteMany|\$transaction|\$executeRaw)\b/);
  });
});
