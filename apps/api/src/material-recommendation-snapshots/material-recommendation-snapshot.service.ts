import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TOTAL_CRITERIA } from '../evaluator-interviews/evaluation-criteria';
import { normalizeHumanCriteria } from '../material-recommendations/adapters/human-evaluation.adapter';
import { MATERIAL_TAXONOMY_VERSION } from '../material-recommendations/material-catalog';
import { deriveNeeds } from '../material-recommendations/need-derivation';
import {
  RECOMMENDATION_ENGINE_VERSION,
  recommendMaterials,
} from '../material-recommendations/recommendation-engine';
import type { RecommendationMatchKind } from '../material-recommendations/recommendation-reasons';
import type {
  MaterialAreaKey,
  MaterialSource,
  NeedKey,
} from '../material-recommendations/recommendation.types';
import { PrismaService } from '../prisma/prisma.service';

// Leitura INTERNA do snapshot (não é DTO de endpoint): `materialRef` é a
// referência persistente da taxonomia e não deve sair numa resposta HTTP sem
// decisão explícita (R5B). Os campos de apresentação são a verdade histórica.
export interface MaterialSnapshotItem {
  position: number;
  source: MaterialSource;
  materialRef: string;
  title: string;
  resourceType: string;
  area: MaterialAreaKey;
  matchedNeed: NeedKey | null;
  matchKind: RecommendationMatchKind;
  reason: string;
}

export interface MaterialSnapshot {
  snapshotId: string;
  interviewId: string;
  engineVersion: string;
  taxonomyVersion: string;
  createdAt: Date;
  items: MaterialSnapshotItem[];
}

// Motivos pelos quais NÃO se gera snapshot (nada é gravado nesses casos).
export type SnapshotIneligibleReason =
  | 'INTERVIEW_NOT_FOUND'
  | 'NOT_HUMAN'
  | 'NOT_COMPLETED'
  | 'EVALUATION_MISSING'
  | 'EVALUATION_NOT_COMPLETED'
  | 'CRITERIA_INCOMPLETE';

export type SnapshotResult =
  | { kind: 'ready'; snapshot: MaterialSnapshot; created: boolean }
  | { kind: 'ineligible'; reason: SnapshotIneligibleReason };

const SNAPSHOT_SELECT = {
  snapshot_id: true,
  interview_id: true,
  engine_version: true,
  taxonomy_version: true,
  created_at: true,
  recommendations: {
    select: {
      position: true,
      source: true,
      material_ref: true,
      title_snapshot: true,
      resource_type_snapshot: true,
      area_snapshot: true,
      matched_need: true,
      match_kind: true,
      reason_snapshot: true,
    },
    orderBy: { position: 'asc' },
  },
} satisfies Prisma.interview_material_snapshotSelect;

type SnapshotRecord = Prisma.interview_material_snapshotGetPayload<{
  select: typeof SNAPSHOT_SELECT;
}>;

const ELIGIBILITY_SELECT = {
  interview_id: true,
  status: true,
  evaluation_mode: true,
  candidate_user_id: true,
  evaluation: { select: { status: true, criteria_scores: true } },
} satisfies Prisma.interviewSelect;

function toSnapshot(record: SnapshotRecord): MaterialSnapshot {
  return {
    snapshotId: record.snapshot_id,
    interviewId: record.interview_id,
    engineVersion: record.engine_version,
    taxonomyVersion: record.taxonomy_version,
    createdAt: record.created_at,
    items: record.recommendations.map((item) => ({
      position: item.position,
      source: item.source as MaterialSource,
      materialRef: item.material_ref,
      title: item.title_snapshot,
      resourceType: item.resource_type_snapshot,
      area: item.area_snapshot as MaterialAreaKey,
      matchedNeed: item.matched_need as NeedKey | null,
      matchKind: item.match_kind as RecommendationMatchKind,
      reason: item.reason_snapshot,
    })),
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

// Snapshot imutável das recomendações de materiais de uma entrevista HUMAN
// concluída. Ele nunca atualiza nem regenera um snapshot existente: o que foi
// gravado é a verdade histórica. A âncora de concorrência é o UNIQUE
// (interview_id) do cabeçalho.
@Injectable()
export class MaterialRecommendationSnapshotService {
  constructor(private readonly prisma: PrismaService) {}

  // Somente leitura: nunca gera. `null` = ainda não existe snapshot.
  async getSnapshot(interviewId: string): Promise<MaterialSnapshot | null> {
    const record = await this.prisma.interview_material_snapshot.findUnique({
      where: { interview_id: interviewId },
      select: SNAPSHOT_SELECT,
    });
    return record ? toSnapshot(record) : null;
  }

  // Devolve o snapshot existente (sem chamar o motor) ou gera e persiste um
  // novo se, e somente se, a entrevista for HUMAN, COMPLETED e com avaliação
  // concluída. Erros de banco se propagam; quem chama decide o que fazer.
  async getOrCreateSnapshot(interviewId: string): Promise<SnapshotResult> {
    const existing = await this.getSnapshot(interviewId);
    if (existing) return { kind: 'ready', snapshot: existing, created: false };

    const generated = await this.generate(interviewId);
    if (generated.kind === 'ineligible') return generated;

    return this.persist(interviewId, generated.items);
  }

  private async generate(
    interviewId: string,
  ): Promise<
    | { kind: 'ineligible'; reason: SnapshotIneligibleReason }
    | { kind: 'eligible'; items: ReturnType<typeof recommendMaterials> }
  > {
    const interview = await this.prisma.interview.findUnique({
      where: { interview_id: interviewId },
      select: ELIGIBILITY_SELECT,
    });

    if (!interview) return { kind: 'ineligible', reason: 'INTERVIEW_NOT_FOUND' };
    if (interview.evaluation_mode !== 'HUMAN') {
      return { kind: 'ineligible', reason: 'NOT_HUMAN' };
    }
    if (interview.status !== 'COMPLETED') {
      return { kind: 'ineligible', reason: 'NOT_COMPLETED' };
    }
    if (!interview.evaluation) {
      return { kind: 'ineligible', reason: 'EVALUATION_MISSING' };
    }
    if (interview.evaluation.status !== 'COMPLETED') {
      return { kind: 'ineligible', reason: 'EVALUATION_NOT_COMPLETED' };
    }

    // Pipeline único: avaliação persistida -> adapter HUMAN -> critérios
    // normalizados -> necessidades -> motor. Nada é recalculado aqui.
    const criteria = normalizeHumanCriteria(
      interview.evaluation.criteria_scores,
    );
    // Avaliação "concluída" sem os 7 critérios é inconsistente: não se grava
    // um histórico imutável a partir de dados incompletos.
    if (Object.keys(criteria).length < TOTAL_CRITERIA) {
      return { kind: 'ineligible', reason: 'CRITERIA_INCOMPLETE' };
    }

    const profile = await this.prisma.candidate_profile.findUnique({
      where: { user_id: interview.candidate_user_id },
      select: { professional_area: true },
    });

    const items = recommendMaterials({
      needs: deriveNeeds(criteria),
      // A área é repassada como está no perfil; o mapa central do núcleo
      // decide o que é reconhecido (desconhecida = só materiais gerais).
      professionalArea: profile?.professional_area ?? null,
    });
    return { kind: 'eligible', items };
  }

  // Cabeçalho + itens na MESMA transação; lista vazia grava só o cabeçalho.
  private async persist(
    interviewId: string,
    items: ReturnType<typeof recommendMaterials>,
  ): Promise<SnapshotResult> {
    const progress: { stage: 'header' | 'items' } = { stage: 'header' };
    try {
      await this.prisma.$transaction(async (tx) => {
        const header = await tx.interview_material_snapshot.create({
          data: {
            interview_id: interviewId,
            engine_version: RECOMMENDATION_ENGINE_VERSION,
            taxonomy_version: MATERIAL_TAXONOMY_VERSION,
          },
          select: { snapshot_id: true },
        });
        if (items.length === 0) return;
        progress.stage = 'items';
        await tx.interview_material_recommendation.createMany({
          data: items.map((item, index) => ({
            snapshot_id: header.snapshot_id,
            position: index + 1,
            source: item.source,
            material_ref: item.ref,
            title_snapshot: item.title,
            resource_type_snapshot: item.resourceType,
            area_snapshot: item.area,
            matched_need: item.matchedNeed,
            match_kind: item.matchKind,
            reason_snapshot: item.reason,
          })),
        });
      });
    } catch (error) {
      // Corrida: outra requisição criou o snapshot entre a leitura e o INSERT.
      // Só o P2002 do CABEÇALHO conta (nele o único conflito possível é
      // interview_id) e só se o snapshot vencedor existir na releitura.
      // P2002 dos itens, ou sem vencedor, é inconsistência real e propaga.
      if (progress.stage === 'header' && isUniqueViolation(error)) {
        const winner = await this.getSnapshot(interviewId);
        if (winner) return { kind: 'ready', snapshot: winner, created: false };
      }
      throw error;
    }

    const snapshot = await this.getSnapshot(interviewId);
    if (!snapshot) {
      throw new Error(
        `Snapshot de materiais não encontrado após a criação (entrevista ${interviewId}).`,
      );
    }
    return { kind: 'ready', snapshot, created: true };
  }
}
