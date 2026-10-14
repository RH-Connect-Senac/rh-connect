import { Logger } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { MaterialRecommendationResultService } from './material-recommendation-result.service';
import type { MaterialRecommendationSnapshotService } from './material-recommendation-snapshot.service';
import type {
  MaterialSnapshot,
  MaterialSnapshotItem,
  SnapshotResult,
} from './material-recommendation-snapshot.service';

const ID = '11111111-1111-4111-8111-111111111111';
const CACHOLA_KEY = '352c172a38592288cb5406c7e7aff3c7';
const ORANGO_KEY = 'ORANGO|99';
const CACHOLA_KEY_2 = 'db7cf13bec46a94bb0483e7a802152b2';

type Row = Record<string, unknown>;

function item(overrides: Partial<MaterialSnapshotItem> = {}): MaterialSnapshotItem {
  return {
    position: 1,
    source: 'RH_CONNECT',
    materialRef: 'como-se-apresentar-em-entrevistas',
    title: 'Título histórico',
    resourceType: 'Leitura',
    area: 'GERAL',
    matchedNeed: 'clarity',
    matchKind: 'primary',
    reason: 'Motivo histórico.',
    ...overrides,
  };
}

function snapshot(items: MaterialSnapshotItem[]): MaterialSnapshot {
  return {
    snapshotId: 'snap-interno-uuid',
    interviewId: ID,
    engineVersion: 'engine-1',
    taxonomyVersion: 'rh-1+ext-1',
    createdAt: new Date('2026-10-14T12:00:00.000Z'),
    items,
  };
}

const ready = (items: MaterialSnapshotItem[], created = false): SnapshotResult => ({
  kind: 'ready',
  snapshot: snapshot(items),
  created,
});

function resource(overrides: Row = {}): Row {
  return {
    source: 'CACHOLA',
    external_key: CACHOLA_KEY,
    // Dados ATUAIS divergentes do histórico, de propósito.
    title: 'TÍTULO NOVO DO CATÁLOGO',
    resource_type: 'Curso',
    url: 'https://exemplo.test/material',
    cover_url: 'https://exemplo.test/capa.webp',
    direct_link_available: true,
    is_active: true,
    ...overrides,
  };
}

function makeService(outcome: SnapshotResult | Error, resources: Row[] = []) {
  const findMany = jest.fn((args: { where: { OR: Array<Row> } }) => {
    void args;
    return Promise.resolve(resources);
  });
  const prisma = { external_learning_resource: { findMany } };
  const getOrCreateSnapshot = jest.fn(() =>
    outcome instanceof Error ? Promise.reject(outcome) : Promise.resolve(outcome),
  );
  const service = new MaterialRecommendationResultService(
    prisma as unknown as PrismaService,
    { getOrCreateSnapshot } as unknown as MaterialRecommendationSnapshotService,
  );
  return { service, findMany, getOrCreateSnapshot };
}

let errorSpy: jest.SpyInstance;
let warnSpy: jest.SpyInstance;
beforeEach(() => {
  errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
});
afterEach(() => jest.restoreAllMocks());

describe('lazy no resultado', () => {
  it('A: snapshot existente é usado como está', async () => {
    const { service, getOrCreateSnapshot } = makeService(ready([item()]));

    const views = await service.listForInterview(ID);

    expect(getOrCreateSnapshot).toHaveBeenCalledWith(ID);
    expect(views).toHaveLength(1);
    expect(views[0]).toMatchObject({
      position: 1,
      source: 'RH_CONNECT',
      title: 'Título histórico',
      resourceType: 'Leitura',
      area: 'GERAL',
      matchedNeed: 'clarity',
      matchKind: 'primary',
      reason: 'Motivo histórico.',
    });
  });

  it('B: sem snapshot, o lazy gera e as recomendações geradas voltam', async () => {
    const { service, getOrCreateSnapshot } = makeService(
      ready([item({ position: 1 }), item({ position: 2, materialRef: 'outro', title: 'Outro' })], true),
    );

    const views = await service.listForInterview(ID);

    expect(getOrCreateSnapshot).toHaveBeenCalledTimes(1);
    expect(views.map((view) => view.title)).toEqual(['Título histórico', 'Outro']);
  });

  it('C: snapshot vazio devolve [] sem erro, sem consulta ao catálogo e sem log', async () => {
    const { service, findMany } = makeService(ready([]));

    await expect(service.listForInterview(ID)).resolves.toEqual([]);

    expect(findMany).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('D: a segunda leitura de um snapshot vazio não gera de novo (quem gera é o serviço de snapshot, que devolve created:false)', async () => {
    const { service, getOrCreateSnapshot } = makeService(ready([], false));

    await service.listForInterview(ID);
    await service.listForInterview(ID);

    // O resultado só pede "obter ou criar"; nunca força regeneração.
    expect(getOrCreateSnapshot).toHaveBeenCalledTimes(2);
    expect(getOrCreateSnapshot.mock.calls.every((call) => (call as unknown[]).length === 1)).toBe(true);
  });
});

describe('resiliência', () => {
  it('G: erro inesperado no snapshot devolve [] e registra log (sem lançar)', async () => {
    const { service } = makeService(new Error('banco fora'));

    await expect(service.listForInterview(ID)).resolves.toEqual([]);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(String(errorSpy.mock.calls[0][0])).toContain(ID);
    expect(String(errorSpy.mock.calls[0][0])).not.toContain('banco fora');
  });

  it('inelegível no lazy devolve [] com aviso, sem erro novo', async () => {
    const { service } = makeService({
      kind: 'ineligible',
      reason: 'CRITERIA_INCOMPLETE',
    });

    await expect(service.listForInterview(ID)).resolves.toEqual([]);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0][0])).toContain('CRITERIA_INCOMPLETE');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('falha técnica ao consultar o catálogo: itens históricos mantidos, UNKNOWN, sem link e com log', async () => {
    const { service, findMany } = makeService(
      ready([
        item({ position: 1, source: 'CACHOLA', materialRef: CACHOLA_KEY, resourceType: 'Podcast' }),
        item({ position: 2 }),
      ]),
    );
    findMany.mockRejectedValue(new Error('timeout'));

    const views = await service.listForInterview(ID);

    expect(views.map((view) => view.title)).toEqual(['Título histórico', 'Título histórico']);
    expect(views[0]).toMatchObject({
      availability: 'UNKNOWN',
      internalSlug: null,
      directLinkAvailable: false,
      url: null,
      coverUrl: null,
      resourceType: 'Podcast',
    });
    expect(views[1]).toMatchObject({
      availability: 'IN_APP',
      internalSlug: 'como-se-apresentar-em-entrevistas',
    });
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(String(errorSpy.mock.calls[0][0])).toContain(ID);
  });
});

describe('contrato (nada interno vaza)', () => {
  const FIELDS = [
    'area',
    'availability',
    'coverUrl',
    'directLinkAvailable',
    'internalSlug',
    'matchKind',
    'matchedNeed',
    'position',
    'reason',
    'resourceType',
    'source',
    'title',
    'url',
  ];

  it('H: só as chaves do contrato; sem material_ref, external_key nem ids internos', async () => {
    const { service } = makeService(
      ready([
        item({ position: 1 }),
        item({ position: 2, source: 'CACHOLA', materialRef: CACHOLA_KEY }),
        item({ position: 3, source: 'ORANGO', materialRef: ORANGO_KEY }),
      ]),
      [
        resource(),
        resource({ source: 'ORANGO', external_key: ORANGO_KEY, url: 'https://orango.test/x' }),
      ],
    );

    const views = await service.listForInterview(ID);

    for (const view of views) expect(Object.keys(view).sort()).toEqual(FIELDS);
    const json = JSON.stringify(views);
    for (const forbidden of [
      'materialRef',
      'material_ref',
      'externalKey',
      'external_key',
      'snapshotId',
      'snapshot_id',
      'recommendationId',
      'recommendation_id',
      'snap-interno-uuid',
      CACHOLA_KEY,
      ORANGO_KEY,
    ]) {
      expect({ forbidden, leaked: json.includes(forbidden) }).toEqual({
        forbidden,
        leaked: false,
      });
    }
  });

  it('internalSlug: só RH_CONNECT o recebe; externos têm null e a chave externa não aparece', async () => {
    const { service } = makeService(
      ready([
        item({ position: 1 }),
        item({ position: 2, source: 'CACHOLA', materialRef: CACHOLA_KEY }),
        item({ position: 3, source: 'ORANGO', materialRef: ORANGO_KEY }),
      ]),
      [
        resource(),
        resource({ source: 'ORANGO', external_key: ORANGO_KEY }),
      ],
    );

    const views = await service.listForInterview(ID);

    expect(views.map((view) => view.internalSlug)).toEqual([
      'como-se-apresentar-em-entrevistas',
      null,
      null,
    ]);
    // O slug é o único lugar onde a referência do RH Connect aparece.
    const json = JSON.stringify(views);
    expect(json.split('como-se-apresentar-em-entrevistas')).toHaveLength(2);
    expect(json).not.toContain(CACHOLA_KEY);
    expect(json).not.toContain(ORANGO_KEY);
  });

  it('I: sai sempre em position ASC, sem reordenar pela disponibilidade', async () => {
    const { service } = makeService(
      ready([
        item({ position: 3, source: 'CACHOLA', materialRef: CACHOLA_KEY, title: 'Terceiro' }),
        item({ position: 1, source: 'ORANGO', materialRef: ORANGO_KEY, title: 'Primeiro' }),
        item({ position: 2, title: 'Segundo' }),
      ]),
      // O 3º está ativo e o 1º foi removido: a ordem continua a histórica.
      [resource()],
    );

    const views = await service.listForInterview(ID);

    expect(views.map((view) => [view.position, view.title])).toEqual([
      [1, 'Primeiro'],
      [2, 'Segundo'],
      [3, 'Terceiro'],
    ]);
    expect(views.map((view) => view.availability)).toEqual([
      'UNAVAILABLE',
      'IN_APP',
      'AVAILABLE',
    ]);
  });
});

describe('histórico x catálogo atual', () => {
  const historical = item({
    position: 1,
    source: 'CACHOLA',
    materialRef: CACHOLA_KEY,
    title: 'Título histórico',
    resourceType: 'Podcast',
    area: 'GERAL',
    matchedNeed: 'organization',
    matchKind: 'secondary',
    reason: 'Motivo histórico.',
  });

  it('J: título, tipo, motivo e demais campos históricos vencem o catálogo divergente', async () => {
    const { service } = makeService(ready([historical]), [resource()]);

    const [view] = await service.listForInterview(ID);

    expect(view).toMatchObject({
      title: 'Título histórico',
      resourceType: 'Podcast',
      area: 'GERAL',
      matchedNeed: 'organization',
      matchKind: 'secondary',
      reason: 'Motivo histórico.',
      position: 1,
      source: 'CACHOLA',
    });
    expect(JSON.stringify(view)).not.toContain('TÍTULO NOVO DO CATÁLOGO');
  });

  it('K: externo ativo com link: URL, capa e directLinkAvailable true', async () => {
    const { service } = makeService(ready([historical]), [resource()]);

    const [view] = await service.listForInterview(ID);

    expect(view).toMatchObject({
      availability: 'AVAILABLE',
      directLinkAvailable: true,
      url: 'https://exemplo.test/material',
      coverUrl: 'https://exemplo.test/capa.webp',
    });
  });

  it('externo ativo cujo link não é direto ou não existe: sem directLinkAvailable', async () => {
    const notDirect = makeService(ready([historical]), [
      resource({ direct_link_available: false }),
    ]);
    expect((await notDirect.service.listForInterview(ID))[0]).toMatchObject({
      availability: 'AVAILABLE',
      directLinkAvailable: false,
      url: 'https://exemplo.test/material',
    });

    const noUrl = makeService(ready([historical]), [
      resource({ url: '  ', cover_url: null, direct_link_available: true }),
    ]);
    expect((await noUrl.service.listForInterview(ID))[0]).toMatchObject({
      availability: 'AVAILABLE',
      directLinkAvailable: false,
      url: null,
      coverUrl: null,
    });
  });

  it('L: externo inativo permanece, sem link utilizável, com o histórico intacto', async () => {
    const { service } = makeService(ready([historical]), [
      resource({ is_active: false }),
    ]);

    const [view] = await service.listForInterview(ID);

    expect(view).toMatchObject({
      title: 'Título histórico',
      reason: 'Motivo histórico.',
      availability: 'UNAVAILABLE',
      directLinkAvailable: false,
      url: null,
      coverUrl: null,
    });
  });

  it('UNKNOWN só na falha técnica; recurso inativo ou removido continua UNAVAILABLE', async () => {
    const refs = [
      item({ position: 1, source: 'CACHOLA', materialRef: CACHOLA_KEY }),
      item({ position: 2, source: 'CACHOLA', materialRef: CACHOLA_KEY_2 }),
    ];
    // Consulta OK: um inativo e um removido => UNAVAILABLE (comprovado).
    const proven = makeService(ready(refs), [resource({ is_active: false })]);
    expect(
      (await proven.service.listForInterview(ID)).map((view) => view.availability),
    ).toEqual(['UNAVAILABLE', 'UNAVAILABLE']);
    expect(errorSpy).not.toHaveBeenCalled();

    // Consulta falhou => UNKNOWN para os dois.
    const failed = makeService(ready(refs));
    failed.findMany.mockRejectedValue(new Error('conexão perdida'));
    expect(
      (await failed.service.listForInterview(ID)).map((view) => view.availability),
    ).toEqual(['UNKNOWN', 'UNKNOWN']);
  });

  it('M: externo removido do catálogo permanece, indisponível', async () => {
    const { service } = makeService(ready([historical]), []);

    const views = await service.listForInterview(ID);

    expect(views).toHaveLength(1);
    expect(views[0]).toMatchObject({
      title: 'Título histórico',
      availability: 'UNAVAILABLE',
      directLinkAvailable: false,
      url: null,
      coverUrl: null,
    });
  });

  it('N: RH Connect aparece só com o histórico, sem consultar o catálogo externo', async () => {
    const { service, findMany } = makeService(ready([item()]));

    const [view] = await service.listForInterview(ID);

    expect(view).toMatchObject({
      source: 'RH_CONNECT',
      title: 'Título histórico',
      availability: 'IN_APP',
      directLinkAvailable: false,
      url: null,
      coverUrl: null,
    });
    expect(findMany).not.toHaveBeenCalled();
  });

  it('um recurso com a mesma chave em OUTRA fonte não é confundido', async () => {
    const { service } = makeService(ready([historical]), [
      resource({ source: 'ORANGO' }),
    ]);

    const [view] = await service.listForInterview(ID);

    expect(view.availability).toBe('UNAVAILABLE');
  });
});

describe('consultas (sem N+1)', () => {
  it('O: vários externos de fontes diferentes resolvem em UMA consulta, por (fonte, chave)', async () => {
    const { service, findMany } = makeService(
      ready([
        item({ position: 1, source: 'CACHOLA', materialRef: CACHOLA_KEY }),
        item({ position: 2, source: 'ORANGO', materialRef: ORANGO_KEY }),
        item({ position: 3, source: 'CACHOLA', materialRef: CACHOLA_KEY_2 }),
      ]),
      [
        resource(),
        resource({ source: 'ORANGO', external_key: ORANGO_KEY, url: 'https://orango.test/x' }),
        resource({ external_key: CACHOLA_KEY_2, is_active: false }),
      ],
    );

    const views = await service.listForInterview(ID);

    expect(findMany).toHaveBeenCalledTimes(1);
    const where = (findMany.mock.calls[0][0] as { where: { OR: Row[] } }).where;
    expect(where.OR).toEqual([
      { source: 'CACHOLA', external_key: { in: [CACHOLA_KEY, CACHOLA_KEY_2] } },
      { source: 'ORANGO', external_key: { in: [ORANGO_KEY] } },
    ]);
    expect(views.map((view) => view.availability)).toEqual([
      'AVAILABLE',
      'AVAILABLE',
      'UNAVAILABLE',
    ]);
    expect(views[1].url).toBe('https://orango.test/x');
  });

  it('só RH Connect: nenhuma consulta ao catálogo externo', async () => {
    const { service, findMany } = makeService(
      ready([item({ position: 1 }), item({ position: 2, materialRef: 'b' })]),
    );

    await service.listForInterview(ID);

    expect(findMany).not.toHaveBeenCalled();
  });

  it('não usa UUID de recurso entre ambientes: a consulta é só por fonte + chave', async () => {
    const { service, findMany } = makeService(
      ready([item({ source: 'CACHOLA', materialRef: CACHOLA_KEY })]),
      [resource()],
    );

    await service.listForInterview(ID);

    const args = findMany.mock.calls[0][0] as { where: object; select?: Row };
    expect(JSON.stringify(args.where)).not.toContain('resource_id');
  });
});
