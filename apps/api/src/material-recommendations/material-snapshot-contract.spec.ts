import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MATERIAL_CATALOG, MATERIAL_TAXONOMY_VERSION } from './material-catalog';
import { MATERIAL_SNAPSHOT_LIMITS } from './material-snapshot-limits';
import type { MaterialSnapshotLimitKey } from './material-snapshot-limits';
import { recommendMaterials, RECOMMENDATION_ENGINE_VERSION } from './recommendation-engine';
import type { RecommendedMaterial } from './recommendation-engine';
import { buildRecommendationReason } from './recommendation-reasons';
import type { RecommendationMatchKind } from './recommendation-reasons';
import { NEED_KEYS } from './recommendation.types';
import type { DevelopmentNeed, MaterialAreaKey } from './recommendation.types';

// Contrato do snapshot de recomendações (R4): os dados que o motor produz
// precisam caber nas colunas, e o schema e a migration precisam bater com os
// limites aprovados. O Postgres conta VARCHAR(n) em CARACTERES (code points),
// por isso a contagem usa `[...texto].length`.
const L = MATERIAL_SNAPSHOT_LIMITS;
const charCount = (text: string) => [...text].length;

const PRISMA_DIR = join(__dirname, '..', '..', 'prisma');
const AREAS: readonly MaterialAreaKey[] = ['TI', 'RH', 'SECRETARIADO', 'GERAL'];
const KINDS: readonly RecommendationMatchKind[] = ['primary', 'secondary', 'general_preparation'];
const PROFESSIONAL_AREAS = [undefined, 'information-technology', 'hr-management', 'secretariat'];

function fits(field: MaterialSnapshotLimitKey, value: string, min = 1): string | null {
  const size = charCount(value);
  return size >= min && size <= L[field] ? null : `${field}: ${size} caracteres (${value})`;
}

// Saída real do motor em muitos cenários (cada necessidade isolada e todas
// juntas, por área, e a preparação geral sem necessidades).
function engineOutputs(): RecommendedMaterial[] {
  const outputs: RecommendedMaterial[] = [];
  const severity = (index: number) => 0.3 + (index % 7) / 10;
  const scenarios: DevelopmentNeed[][] = [
    [],
    ...NEED_KEYS.map<DevelopmentNeed[]>((key, index) => [
      { key, score: 3, severity: severity(index), kind: 'gap' },
    ]),
    NEED_KEYS.map<DevelopmentNeed>((key, index) => ({ key, score: 3, severity: severity(index), kind: 'gap' })),
  ];
  for (const needs of scenarios) {
    for (const professionalArea of PROFESSIONAL_AREAS) {
      outputs.push(...recommendMaterials({ needs, professionalArea }, { fillWithGeneralPreparation: true }));
    }
  }
  return outputs;
}

describe('limites do snapshot x dados reais do motor', () => {
  it('a contagem é por code points, não por unidades UTF-16', () => {
    expect('😀'.length).toBe(2);
    expect(charCount('😀')).toBe(1);
  });

  it('os limites aprovados estão fixados', () => {
    expect(L).toEqual({
      engineVersion: 20,
      taxonomyVersion: 40,
      source: 50,
      materialRef: 80,
      titleSnapshot: 200,
      resourceTypeSnapshot: 30,
      areaSnapshot: 20,
      matchedNeed: 40,
      matchKind: 30,
      reasonSnapshot: 100,
    });
  });

  it('todo material do catálogo cabe: source, material_ref, título, tipo (1..30) e área', () => {
    const problems = MATERIAL_CATALOG.flatMap((material) => [
      fits('source', material.source),
      fits('materialRef', material.ref),
      fits('titleSnapshot', material.title),
      fits('resourceTypeSnapshot', material.resourceType),
      fits('areaSnapshot', material.area),
    ]).filter((problem) => problem !== null);
    expect(problems).toEqual([]);
    expect(MATERIAL_CATALOG.every((material) => material.resourceType.trim().length > 0)).toBe(true);
  });

  it('todo motivo possível (tipo x necessidade x área) cabe em reason_snapshot', () => {
    const problems: string[] = [];
    for (const kind of KINDS) {
      for (const area of AREAS) {
        for (const need of [null, ...NEED_KEYS]) {
          const problem = fits('reasonSnapshot', buildRecommendationReason(kind, need, area));
          if (problem) problems.push(problem);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('necessidades, tipos de correspondência e áreas cabem nas colunas', () => {
    expect(NEED_KEYS.map((key) => fits('matchedNeed', key)).filter(Boolean)).toEqual([]);
    expect(KINDS.map((kind) => fits('matchKind', kind)).filter(Boolean)).toEqual([]);
    expect(AREAS.map((area) => fits('areaSnapshot', area)).filter(Boolean)).toEqual([]);
  });

  it('as versões do motor e da taxonomia cabem em engine_version e taxonomy_version', () => {
    expect(fits('engineVersion', RECOMMENDATION_ENGINE_VERSION)).toBeNull();
    expect(fits('taxonomyVersion', MATERIAL_TAXONOMY_VERSION)).toBeNull();
  });

  it('toda saída real do motor cabe em todas as colunas e respeita o CHECK de matched_need', () => {
    const outputs = engineOutputs();
    expect(outputs.length).toBeGreaterThan(0);
    const problems = outputs.flatMap((item) => [
      fits('source', item.source),
      fits('materialRef', item.ref),
      fits('titleSnapshot', item.title),
      fits('resourceTypeSnapshot', item.resourceType),
      fits('areaSnapshot', item.area),
      item.matchedNeed === null ? null : fits('matchedNeed', item.matchedNeed),
      fits('matchKind', item.matchKind),
      fits('reasonSnapshot', item.reason),
    ]);
    expect(problems.filter((problem) => problem !== null)).toEqual([]);
    for (const item of outputs) {
      expect({ ref: item.ref, coherent: (item.matchKind === 'general_preparation') === (item.matchedNeed === null) }).toEqual({
        ref: item.ref,
        coherent: true,
      });
    }
  });
});

type Column = { type: string; optional: boolean; size: number | null; line: string };

function modelBlock(schema: string, name: string): string {
  const match = schema.match(new RegExp(`model ${name} \\{([\\s\\S]*?)\\n\\}`));
  if (!match) throw new Error(`model ${name} não encontrado`);
  return match[1];
}

function columnsOf(block: string): Record<string, Column> {
  const columns: Record<string, Column> = {};
  for (const line of block.split('\n')) {
    const match = line.match(/^\s+([a-z_]+)\s+(\w+)(\?|\[\])?(\s.*)?$/);
    if (!match || line.trim().startsWith('@@') || line.trim().startsWith('//')) continue;
    const size = line.match(/@db\.VarChar\((\d+)\)/);
    columns[match[1]] = {
      type: match[2],
      optional: match[3] === '?',
      size: size ? Number(size[1]) : null,
      line: line.trim(),
    };
  }
  return columns;
}

const schema = readFileSync(join(PRISMA_DIR, 'schema.prisma'), 'utf8').replace(/\r\n/g, '\n');

describe('schema.prisma do snapshot', () => {
  const snapshot = columnsOf(modelBlock(schema, 'interview_material_snapshot'));
  const item = columnsOf(modelBlock(schema, 'interview_material_recommendation'));

  it('interview_material_snapshot: tipos, tamanhos e nulidade', () => {
    expect(snapshot.snapshot_id).toMatchObject({ type: 'String', optional: false });
    expect(snapshot.snapshot_id.line).toContain('@db.Uuid');
    expect(snapshot.interview_id.line).toContain('@db.Uuid');
    expect(snapshot.interview_id.line).toContain('@unique(map: "uq_interview_material_snapshot_interview")');
    expect(snapshot.engine_version).toMatchObject({ size: L.engineVersion, optional: false });
    expect(snapshot.taxonomy_version).toMatchObject({ size: L.taxonomyVersion, optional: false });
    expect(snapshot.created_at.line).toContain('@default(now()) @db.Timestamptz(6)');
    expect(Object.keys(snapshot)).not.toContain('updated_at');
    expect(snapshot.interview.line).toContain('onDelete: Cascade, onUpdate: NoAction');
    expect(snapshot.interview.line).toContain('map: "fk_interview_material_snapshot_interview"');
  });

  it('interview_material_recommendation: tipos, tamanhos e nulidade', () => {
    expect(item.recommendation_id.line).toContain('@db.Uuid');
    expect(item.snapshot_id.line).toContain('@db.Uuid');
    expect(item.position.line).toContain('Int');
    expect(item.position.line).toContain('@db.SmallInt');
    expect(item.source).toMatchObject({ size: L.source, optional: false });
    expect(item.material_ref).toMatchObject({ size: L.materialRef, optional: false });
    expect(item.title_snapshot).toMatchObject({ size: L.titleSnapshot, optional: false });
    expect(item.resource_type_snapshot).toMatchObject({ size: L.resourceTypeSnapshot, optional: false });
    expect(item.area_snapshot).toMatchObject({ size: L.areaSnapshot, optional: false });
    expect(item.matched_need).toMatchObject({ size: L.matchedNeed, optional: true });
    expect(item.match_kind).toMatchObject({ size: L.matchKind, optional: false });
    expect(item.reason_snapshot).toMatchObject({ size: L.reasonSnapshot, optional: false });
    expect(item.created_at.line).toContain('@db.Timestamptz(6)');
  });

  it('sem updated_at, sem resource_id e sem FK para external_learning_resource', () => {
    const blocks =
      modelBlock(schema, 'interview_material_snapshot') + modelBlock(schema, 'interview_material_recommendation');
    expect(blocks).not.toMatch(/updated_at/);
    expect(blocks).not.toMatch(/resource_id/);
    expect(blocks).not.toMatch(/external_learning_resource/);
  });

  it('FK em cascata, uniques com nome explícito e relação reversa em interview', () => {
    expect(item.snapshot.line).toContain('onDelete: Cascade, onUpdate: NoAction');
    expect(item.snapshot.line).toContain('map: "fk_interview_material_recommendation_snapshot"');
    const block = modelBlock(schema, 'interview_material_recommendation');
    expect(block).toContain('@@unique([snapshot_id, position], map: "uq_interview_material_recommendation_position")');
    expect(block).toContain('@@unique([snapshot_id, source, material_ref], map: "uq_interview_material_recommendation_ref")');
    expect(block).not.toMatch(/@@index/);
    const interview = columnsOf(modelBlock(schema, 'interview'));
    expect(interview.material_snapshot).toMatchObject({ type: 'interview_material_snapshot', optional: true });
  });
});

describe('migration do snapshot', () => {
  const migrationsDir = join(PRISMA_DIR, 'migrations');
  const names = readdirSync(migrationsDir).sort();
  const folder = names.find((name) => name.endsWith('_add_interview_material_snapshot'));
  const sql = folder
    ? readFileSync(join(migrationsDir, folder, 'migration.sql'), 'utf8').replace(/\r\n/g, '\n')
    : '';
  const code = sql.replace(/^\s*--.*$/gm, '');

  it('existe e é posterior à migration do limite de título', () => {
    expect(folder).toBeDefined();
    const titleLimit = names.find((name) => name.endsWith('_limit_external_learning_resource_title'));
    expect(titleLimit).toBeDefined();
    expect((folder as string) > (titleLimit as string)).toBe(true);
  });

  it('cria as duas tabelas com os tipos e tamanhos aprovados', () => {
    expect(code).toContain('CREATE TABLE "interview_material_snapshot"');
    expect(code).toContain('CREATE TABLE "interview_material_recommendation"');
    for (const column of [
      '"snapshot_id" UUID NOT NULL DEFAULT gen_random_uuid()',
      '"interview_id" UUID NOT NULL',
      `"engine_version" VARCHAR(${L.engineVersion}) NOT NULL`,
      `"taxonomy_version" VARCHAR(${L.taxonomyVersion}) NOT NULL`,
      '"recommendation_id" UUID NOT NULL DEFAULT gen_random_uuid()',
      '"position" SMALLINT NOT NULL',
      `"source" VARCHAR(${L.source}) NOT NULL`,
      `"material_ref" VARCHAR(${L.materialRef}) NOT NULL`,
      `"title_snapshot" VARCHAR(${L.titleSnapshot}) NOT NULL`,
      `"resource_type_snapshot" VARCHAR(${L.resourceTypeSnapshot}) NOT NULL`,
      `"area_snapshot" VARCHAR(${L.areaSnapshot}) NOT NULL`,
      `"matched_need" VARCHAR(${L.matchedNeed}),`,
      `"match_kind" VARCHAR(${L.matchKind}) NOT NULL`,
      `"reason_snapshot" VARCHAR(${L.reasonSnapshot}) NOT NULL`,
    ]) {
      expect({ column, found: code.includes(column) }).toEqual({ column, found: true });
    }
    expect(code.match(/"created_at" TIMESTAMPTZ\(6\) NOT NULL DEFAULT CURRENT_TIMESTAMP/g)).toHaveLength(2);
    expect(code).not.toMatch(/updated_at|resource_id/);
  });

  it('tem os uniques e as FKs em cascata', () => {
    expect(code).toContain('CREATE UNIQUE INDEX "uq_interview_material_snapshot_interview" ON "interview_material_snapshot"("interview_id")');
    expect(code).toContain('CREATE UNIQUE INDEX "uq_interview_material_recommendation_position" ON "interview_material_recommendation"("snapshot_id", "position")');
    expect(code).toContain('CREATE UNIQUE INDEX "uq_interview_material_recommendation_ref" ON "interview_material_recommendation"("snapshot_id", "source", "material_ref")');
    expect(code).toContain('FOREIGN KEY ("interview_id") REFERENCES "interview"("interview_id") ON DELETE CASCADE ON UPDATE NO ACTION');
    expect(code).toContain('FOREIGN KEY ("snapshot_id") REFERENCES "interview_material_snapshot"("snapshot_id") ON DELETE CASCADE ON UPDATE NO ACTION');
    expect(code).not.toMatch(/CREATE INDEX/);
    expect(code).not.toContain('external_learning_resource');
  });

  it('tem os quatro CHECKs aprovados', () => {
    expect(code).toContain('"chk_interview_material_recommendation_position" CHECK ("position" >= 1)');
    expect(code).toContain(`"chk_interview_material_recommendation_match_kind" CHECK ("match_kind" IN ('primary', 'secondary', 'general_preparation'))`);
    expect(code).toContain(`"chk_interview_material_recommendation_need_kind" CHECK (("match_kind" = 'general_preparation') = ("matched_need" IS NULL))`);
    expect(code).toContain('"chk_interview_material_recommendation_type" CHECK (char_length(btrim("resource_type_snapshot")) > 0)');
  });

  it('é somente aditiva: só cria objetos novos e só altera as duas tabelas novas', () => {
    expect(code.replace(/ON (DELETE|UPDATE) (CASCADE|NO ACTION)/g, '')).not.toMatch(
      /\b(DROP|UPDATE|DELETE|TRUNCATE|RENAME)\b/i,
    );
    const alters = [...code.matchAll(/ALTER TABLE "([^"]+)"/g)].map((m) => m[1]);
    expect(alters.length).toBeGreaterThan(0);
    for (const table of alters) {
      expect(['interview_material_snapshot', 'interview_material_recommendation']).toContain(table);
    }
  });
});
