import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// Guard de desacoplamento: o núcleo da recomendação (tipos, derivação de
// necessidades, taxonomia e o motor, quando existir) não pode conhecer
// modalidade de avaliação, banco nem módulos de entrevista. Só a pasta
// `adapters/` fala com o formato de uma avaliação concreta.
const ROOT = __dirname;
const code = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

function listSources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return listSources(full);
    return name.endsWith('.ts') && !name.endsWith('.spec.ts') ? [full] : [];
  });
}

const sources = listSources(ROOT).map((file) => ({
  file,
  name: relative(ROOT, file).replace(/\\/g, '/'),
  text: code(readFileSync(file, 'utf8')),
}));
const core = sources.filter((source) => !source.name.startsWith('adapters/'));
const adapters = sources.filter((source) => source.name.startsWith('adapters/'));

const FORBIDDEN_IN_CORE = [
  /\bHUMAN\b/,
  /\bAI\b/,
  /evaluation_mode/i,
  /evaluationMode/,
  /prisma/i,
  /evaluator-interviews/,
  /\/interviews\//,
];

describe('núcleo da recomendação é agnóstico à modalidade', () => {
  it('o guard não é vazio: os arquivos do núcleo existem', () => {
    const names = core.map((source) => source.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'recommendation.types.ts',
        'need-derivation.ts',
        'rh-material-taxonomy.ts',
        'external-material-taxonomy.ts',
        'material-catalog.ts',
        'material-redundancy.ts',
        'professional-area.ts',
        'recommendation-reasons.ts',
        'recommendation-engine.ts',
      ]),
    );
  });

  it('nenhum arquivo do núcleo menciona modalidade, evaluation_mode, Prisma ou módulos de entrevista', () => {
    for (const source of core) {
      for (const pattern of FORBIDDEN_IN_CORE) {
        expect({ file: source.name, found: pattern.test(source.text) }).toEqual({
          file: source.name,
          found: false,
        });
      }
    }
  });

  it('o núcleo só importa arquivos da própria pasta (sem pacotes nem módulos externos)', () => {
    for (const source of core) {
      const imports = [...source.text.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
      for (const target of imports) {
        expect({ file: source.name, target, local: target.startsWith('./') }).toEqual({
          file: source.name,
          target,
          local: true,
        });
      }
    }
  });

  it('o motor está no mesmo guard e não usa fontes não determinísticas', () => {
    const engine = core.find((source) => source.name === 'recommendation-engine.ts');
    expect(engine).toBeDefined();
    for (const pattern of [/Math\.random/, /Date\.now/, /new Date/, /process\.env/, /localStorage/, /fetch\(/]) {
      expect({ pattern: String(pattern), found: pattern.test(engine!.text) }).toEqual({
        pattern: String(pattern),
        found: false,
      });
    }
    expect(existsSync(join(ROOT, 'recommendation-engine.ts'))).toBe(true);
  });

  it('adapters só leem a avaliação persistida: sem banco e sem tipos de entrevista', () => {
    expect(adapters.length).toBeGreaterThan(0);
    for (const source of adapters) {
      expect(/prisma/i.test(source.text)).toBe(false);
      expect(/\/interviews\//.test(source.text)).toBe(false);
    }
  });
});
