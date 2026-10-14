import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EXTERNAL_MATERIAL_TAXONOMY } from './external-material-taxonomy';
import { RH_MATERIAL_TAXONOMY } from './rh-material-taxonomy';

// Proteção do limite editorial de título de material (VARCHAR(200)).
// O Postgres conta VARCHAR(n) em CARACTERES (code points), não em bytes nem em
// unidades UTF-16; por isso a contagem aqui usa `[...texto].length`.
const MATERIAL_TITLE_MAX_LENGTH = 200;

const charCount = (text: string) => [...text].length;

const PRISMA_DIR = join(__dirname, '..', '..', 'prisma');
const SEED_DIR = join(PRISMA_DIR, 'seed-data');
const readSeed = <T>(file: string) =>
  JSON.parse(readFileSync(join(SEED_DIR, file), 'utf8')) as T;

type TitledSeed = { titulo: string };

function tooLong(titles: readonly string[]): string[] {
  return titles
    .map((title) => ({ title, size: charCount(title.trim()) }))
    .filter((item) => item.size > MATERIAL_TITLE_MAX_LENGTH)
    .map((item) => `${item.size} caracteres: ${item.title.trim()}`);
}

describe('limite de título de material (VARCHAR(200))', () => {
  it('conta por caracteres (code points), não por unidades UTF-16', () => {
    expect('😀'.length).toBe(2);
    expect(charCount('😀')).toBe(1);
    expect(charCount('ç')).toBe(1);
    expect(charCount('a'.repeat(MATERIAL_TITLE_MAX_LENGTH))).toBe(MATERIAL_TITLE_MAX_LENGTH);
  });

  it('títulos dos seeds da Cachola e da Orango cabem no limite', () => {
    const cachola = readSeed<TitledSeed[]>('cachola-recursos.json');
    const orango = readSeed<TitledSeed[]>('orango-cursos.json');
    expect(cachola.length).toBeGreaterThan(0);
    expect(orango.length).toBeGreaterThan(0);
    const titles = [...cachola, ...orango].map((item) => item.titulo);
    expect(titles.every((title) => title.trim().length > 0)).toBe(true);
    expect(tooLong(titles)).toEqual([]);
  });

  it('títulos da taxonomia do RH Connect cabem no limite', () => {
    expect(RH_MATERIAL_TAXONOMY.length).toBeGreaterThan(0);
    expect(tooLong(RH_MATERIAL_TAXONOMY.map((entry) => entry.title))).toEqual([]);
  });

  it('títulos da curadoria externa cabem no limite', () => {
    expect(EXTERNAL_MATERIAL_TAXONOMY.length).toBeGreaterThan(0);
    expect(tooLong(EXTERNAL_MATERIAL_TAXONOMY.map((entry) => entry.title))).toEqual([]);
  });

  it('o limite do teste está sincronizado com o schema.prisma', () => {
    const schema = readFileSync(join(PRISMA_DIR, 'schema.prisma'), 'utf8');
    const block = schema.match(/model external_learning_resource\s*\{([\s\S]*?)\r?\n\}/);
    expect(block).not.toBeNull();
    const column = (block as RegExpMatchArray)[1].match(
      /^\s*title\s+String\s+@db\.VarChar\((\d+)\)/m,
    );
    expect(column).not.toBeNull();
    expect(Number((column as RegExpMatchArray)[1])).toBe(MATERIAL_TITLE_MAX_LENGTH);
  });

  it('a migration de redução usa o mesmo limite, sem truncar dados', () => {
    const migrationsDir = join(PRISMA_DIR, 'migrations');
    expect(existsSync(migrationsDir)).toBe(true);
    const folder = readdirSync(migrationsDir).find((name) =>
      name.endsWith('_limit_external_learning_resource_title'),
    );
    expect(folder).toBeDefined();
    const sql = readFileSync(join(migrationsDir, folder as string, 'migration.sql'), 'utf8');
    expect(sql).toContain(`char_length("title") > ${MATERIAL_TITLE_MAX_LENGTH}`);
    expect(sql).toContain('RAISE EXCEPTION');
    expect(sql).toContain(`SET DATA TYPE VARCHAR(${MATERIAL_TITLE_MAX_LENGTH})`);
    expect(sql).not.toMatch(/\b(UPDATE|substr|left\()/i);
  });
});
