// Limites (em CARACTERES, como o VARCHAR(n) do Postgres) das colunas do
// snapshot de recomendações por entrevista. Fonte única: o schema do banco, a
// migration e os specs são conferidos contra esta constante. Cada campo do
// resultado do motor tem o seu limite aqui.
export const MATERIAL_SNAPSHOT_LIMITS = {
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
} as const;

export type MaterialSnapshotLimitKey = keyof typeof MATERIAL_SNAPSHOT_LIMITS;
