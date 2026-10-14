import { createHash } from 'crypto';

// Fórmula estável da chave externa da Cachola. Fica isolada em um módulo puro
// (sem Prisma e sem efeitos ao importar) para ser reutilizada pelo seed e pela
// validação da curadoria, mantendo uma única implementação.
export const CACHOLA_SOURCE = 'CACHOLA';

export function normalizeSeedText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function createCacholaExternalKey(resource: {
  titulo: string;
  tipo: string;
}) {
  const title = normalizeSeedText(resource.titulo).toLowerCase();
  const type = normalizeSeedText(resource.tipo).toLowerCase();

  return createHash('sha256')
    .update(`${CACHOLA_SOURCE}|${title}|${type}`)
    .digest('hex')
    .slice(0, 32);
}
