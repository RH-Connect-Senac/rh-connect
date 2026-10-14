import type { MaterialSnapshotItem } from './material-recommendation-snapshot.service';

// Consolidação PURA (sem banco, sem engine) das recomendações do candidato:
// recebe as entrevistas recentes já com os itens dos seus snapshots e devolve
// os materiais únicos, ranqueados. A lista consolidada é uma VISÃO dinâmica;
// os snapshots de origem nunca são alterados.

// Quantas entrevistas concluídas mais recentes (que tenham snapshot) entram.
export const RECENT_INTERVIEW_LIMIT = 5;

// Máximo de materiais únicos na lista consolidada ativa.
export const MAX_CONSOLIDATED_RECOMMENDATIONS = 9;

export interface RecentInterviewCandidate {
  interviewId: string;
  // `interview_evaluation.completed_at`: sinal principal de recência.
  completedAt: Date | null;
  // Fallback quando a entrevista não tem `completed_at` na avaliação (ex.: uma
  // avaliação futura sem essa linha): `interview.updated_at`.
  fallbackAt: Date;
}

// Entrevista mais recente primeiro. Desempate determinístico pelo id.
export function selectRecentInterviewIds(
  candidates: readonly RecentInterviewCandidate[],
  limit: number = RECENT_INTERVIEW_LIMIT,
): string[] {
  const stamp = (c: RecentInterviewCandidate) =>
    (c.completedAt ?? c.fallbackAt).getTime();
  return [...candidates]
    .sort(
      (a, b) =>
        stamp(b) - stamp(a) ||
        (a.interviewId < b.interviewId ? -1 : a.interviewId > b.interviewId ? 1 : 0),
    )
    .slice(0, limit)
    .map((candidate) => candidate.interviewId);
}

export interface InterviewSnapshotItems {
  interviewId: string;
  items: readonly MaterialSnapshotItem[];
}

export interface ConsolidatedMaterial {
  source: MaterialSnapshotItem['source'];
  materialRef: string;
  // Ocorrência MAIS RECENTE do material: todos os campos históricos exibidos
  // vêm de um único snapshot real (nunca misturados entre entrevistas).
  representative: MaterialSnapshotItem;
  // Em quantas entrevistas distintas (das consideradas) o material apareceu.
  recommendationCount: number;
}

const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

// `interviewsNewestFirst`: já ordenadas da mais recente para a mais antiga (a
// ordem do array É a recência). Identidade do material: (source, material_ref).
// Ranking determinístico, sem peso por fonte:
// 1. mais entrevistas distintas; 2. aparição na entrevista mais recente;
// 3. menor `position` histórica; 4. source e material_ref (ordem alfabética).
export function consolidateMaterials(
  interviewsNewestFirst: readonly InterviewSnapshotItems[],
  limit: number = RECENT_INTERVIEW_LIMIT,
): ConsolidatedMaterial[] {
  interface Acc {
    source: MaterialSnapshotItem['source'];
    materialRef: string;
    representative: MaterialSnapshotItem;
    newestIndex: number;
    bestPosition: number;
    interviews: Set<string>;
  }
  const byMaterial = new Map<string, Acc>();

  interviewsNewestFirst.slice(0, limit).forEach((interview, index) => {
    for (const item of interview.items) {
      const key = `${item.source}\u0000${item.materialRef}`;
      const acc = byMaterial.get(key);
      if (!acc) {
        byMaterial.set(key, {
          source: item.source,
          materialRef: item.materialRef,
          representative: item,
          newestIndex: index,
          bestPosition: item.position,
          interviews: new Set([interview.interviewId]),
        });
        continue;
      }
      // Entrevistas chegam da mais recente para a mais antiga: a primeira
      // ocorrência já é a representante; as demais só contam.
      acc.interviews.add(interview.interviewId);
      acc.bestPosition = Math.min(acc.bestPosition, item.position);
    }
  });

  return [...byMaterial.values()]
    .sort(
      (a, b) =>
        b.interviews.size - a.interviews.size ||
        a.newestIndex - b.newestIndex ||
        a.bestPosition - b.bestPosition ||
        compareText(a.source, b.source) ||
        compareText(a.materialRef, b.materialRef),
    )
    .map((acc) => ({
      source: acc.source,
      materialRef: acc.materialRef,
      representative: acc.representative,
      recommendationCount: acc.interviews.size,
    }));
}
