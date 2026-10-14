import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createCacholaExternalKey } from '../../prisma/cachola-external-key';
import { createOrangoExternalKey } from '../../prisma/seed-orango';
import { EXTERNAL_MATERIAL_TAXONOMY } from './external-material-taxonomy';

// Sincronia da curadoria com os seeds reais. A chave da Cachola e a da Orango
// são calculadas pelas MESMAS funções usadas no seed (sem duplicar a fórmula).
// Se um título/tipo do seed mudar, a chave muda e este spec acusa a curadoria.
const SEED_DIR = join(__dirname, '..', '..', 'prisma', 'seed-data');
const readSeed = <T>(file: string) =>
  JSON.parse(readFileSync(join(SEED_DIR, file), 'utf8')) as T;

type CacholaSeed = { titulo: string; tipo: string };
type OrangoSeed = { id: number; titulo: string };

const cacholaSeed = readSeed<CacholaSeed[]>('cachola-recursos.json');
const orangoSeed = readSeed<OrangoSeed[]>('orango-cursos.json');

// Mesmo valor fixo que o seed da Orango grava em `resource_type`.
const ORANGO_RESOURCE_TYPE = 'Curso';

describe('curadoria externa x seeds reais', () => {
  it('seeds carregados (o spec não é vazio)', () => {
    expect(cacholaSeed.length).toBeGreaterThan(0);
    expect(orangoSeed.length).toBeGreaterThan(0);
  });

  it('as chaves da Cachola no seed são únicas (a chave identifica um único recurso)', () => {
    const keys = cacholaSeed.map((item) => createCacholaExternalKey(item));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('cada item da Cachola existe no seed, com título e tipo idênticos aos da curadoria', () => {
    const entries = EXTERNAL_MATERIAL_TAXONOMY.filter((entry) => entry.source === 'CACHOLA');
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      const match = cacholaSeed.find(
        (item) => createCacholaExternalKey(item) === entry.externalKey,
      );
      expect({ key: entry.externalKey, found: Boolean(match) }).toEqual({
        key: entry.externalKey,
        found: true,
      });
      expect(match?.titulo.trim()).toBe(entry.title);
      expect(match?.tipo.trim()).toBe(entry.resourceType);
    }
  });

  it('cada item da Orango existe no seed, com a chave formada pelo id nativo e o mesmo título', () => {
    const entries = EXTERNAL_MATERIAL_TAXONOMY.filter((entry) => entry.source === 'ORANGO');
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      const match = orangoSeed.find(
        (item) => createOrangoExternalKey(String(item.id)) === entry.externalKey,
      );
      expect({ key: entry.externalKey, found: Boolean(match) }).toEqual({
        key: entry.externalKey,
        found: true,
      });
      expect(match?.titulo.trim()).toBe(entry.title);
      expect(entry.resourceType).toBe(ORANGO_RESOURCE_TYPE);
    }
  });

  it('a curadoria é um recorte pequeno dos seeds (não replica o catálogo)', () => {
    expect(EXTERNAL_MATERIAL_TAXONOMY.length).toBeLessThan(
      (cacholaSeed.length + orangoSeed.length) / 5,
    );
  });
});
