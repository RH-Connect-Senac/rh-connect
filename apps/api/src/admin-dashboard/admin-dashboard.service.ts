import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CANDIDATE_USER_WHERE } from '../admin-candidates/candidate-rules';
import {
  ACTIVE_EVALUATOR_WHERE,
  PENDING_ASSIGNMENT_WHERE,
} from '../admin-interviews/admin-rules';
import { PrismaService } from '../prisma/prisma.service';

export const DASHBOARD_TIME_ZONE = 'America/Sao_Paulo';
export const DASHBOARD_MONTHS = 12;
export const DASHBOARD_ACTIVITY_LIMIT = 8;

const GENERIC_ERROR_MESSAGE =
  'Não foi possível carregar o dashboard. Tente novamente.';

export type DashboardActivityType =
  | 'candidate_registered'
  | 'interview_submitted'
  | 'interview_assigned'
  | 'evaluation_completed';

export interface DashboardActivity {
  id: string;
  type: DashboardActivityType;
  occurredAt: string;
  candidateName: string;
  jobTitle: string | null;
  evaluatorName: string | null;
  actorName: string | null;
  score: number | null;
}

export interface DashboardResponse {
  generatedAt: string;
  summary: {
    candidateCount: number;
    activeEvaluatorCount: number;
    pendingAssignmentCount: number;
    averageScore: number | null;
    averageScoreSample: number;
  };
  interviewsByMonth: Array<{ month: string; total: number }>;
  recentActivity: DashboardActivity[];
}

// Avaliação HUMAN realmente concluída. A nota entra na média só se
// overall_score existir (DRAFT e AI nunca entram).
export const COMPLETED_HUMAN_EVALUATION_WHERE = {
  status: 'COMPLETED',
  interview: { evaluation_mode: 'HUMAN', status: 'COMPLETED' },
} as const;

type Numeric = { toString(): string } | number | null | undefined;

// Decimal do Prisma (ou number) -> number com 1 casa; null se vazio/inválido.
export function toScore(value: Numeric): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === 'number' ? value : Number(value.toString());
  if (!Number.isFinite(parsed)) return null;
  return Math.round((parsed + Number.EPSILON) * 10) / 10;
}

const monthFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: DASHBOARD_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
});

// "YYYY-MM" do instante no fuso de São Paulo (e não em UTC).
export function monthKeyInSaoPaulo(date: Date): string {
  const parts = monthFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  return `${year}-${month}`;
}

// Os 12 meses (do mais antigo ao mais recente) terminando no mês atual de São Paulo.
export function buildMonthKeys(now: Date, months = DASHBOARD_MONTHS): string[] {
  const [yearText, monthText] = monthKeyInSaoPaulo(now).split('-');
  const year = Number(yearText);
  const month = Number(monthText) - 1; // 0..11
  return Array.from({ length: months }, (_, index) => {
    const offset = months - 1 - index;
    const total = year * 12 + month - offset;
    const y = Math.floor(total / 12);
    const m = (total % 12) + 1;
    return `${y}-${String(m).padStart(2, '0')}`;
  });
}

const TYPE_PRIORITY: Record<DashboardActivityType, number> = {
  evaluation_completed: 0,
  interview_assigned: 1,
  interview_submitted: 2,
  candidate_registered: 3,
};

// Mais recente primeiro; empate: tipo (prioridade fixa) e depois id (estável).
export function compareActivity(
  a: DashboardActivity,
  b: DashboardActivity,
): number {
  if (a.occurredAt !== b.occurredAt) {
    return a.occurredAt < b.occurredAt ? 1 : -1;
  }
  if (a.type !== b.type) return TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type];
  if (a.id === b.id) return 0;
  return a.id < b.id ? 1 : -1;
}

function activity(
  type: DashboardActivityType,
  key: string | number,
  occurredAt: Date,
  fields: Partial<
    Pick<
      DashboardActivity,
      'jobTitle' | 'evaluatorName' | 'actorName' | 'score'
    >
  > & { candidateName: string },
): DashboardActivity {
  return {
    id: `${type}:${key}`,
    type,
    occurredAt: occurredAt.toISOString(),
    candidateName: fields.candidateName,
    jobTitle: fields.jobTitle ?? null,
    evaluatorName: fields.evaluatorName ?? null,
    actorName: fields.actorName ?? null,
    score: fields.score ?? null,
  };
}

// Dashboard Admin: projeção agregada e SOMENTE LEITURA. A identidade do Admin
// não é usada (nada é filtrado por usuário); o acesso é garantido pelo controller.
// Cada consulta usa `select` mínimo: sem e-mail, respostas, critérios, tokens ou senha.
@Injectable()
export class AdminDashboardService {
  private readonly logger = new Logger(AdminDashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(now: Date = new Date()): Promise<DashboardResponse> {
    try {
      const [
        candidateCount,
        activeEvaluatorCount,
        pendingAssignmentCount,
        score,
        monthRows,
        candidatesActivity,
        submittedActivity,
        assignedActivity,
        completedActivity,
      ] = await Promise.all([
        this.prisma.app_user.count({ where: CANDIDATE_USER_WHERE }),
        this.prisma.evaluator_profile.count({ where: ACTIVE_EVALUATOR_WHERE }),
        this.prisma.interview.count({ where: PENDING_ASSIGNMENT_WHERE }),
        this.prisma.interview_evaluation.aggregate({
          where: {
            ...COMPLETED_HUMAN_EVALUATION_WHERE,
            overall_score: { not: null },
          },
          _avg: { overall_score: true },
          _count: { overall_score: true },
        }),
        this.queryMonthlyTotals(now),
        this.prisma.app_user.findMany({
          where: CANDIDATE_USER_WHERE,
          select: { user_id: true, name: true, created_at: true },
          orderBy: [{ created_at: 'desc' }, { user_id: 'desc' }],
          take: DASHBOARD_ACTIVITY_LIMIT,
        }),
        this.prisma.interview.findMany({
          where: { submitted_at: { not: null } },
          select: {
            interview_id: true,
            job_title: true,
            submitted_at: true,
            candidate: { select: { name: true } },
          },
          orderBy: [{ submitted_at: 'desc' }, { interview_id: 'desc' }],
          take: DASHBOARD_ACTIVITY_LIMIT,
        }),
        this.prisma.interview.findMany({
          where: { assigned_at: { not: null }, evaluation_mode: 'HUMAN' },
          select: {
            interview_id: true,
            job_title: true,
            assigned_at: true,
            candidate: { select: { name: true } },
            evaluator_profile: {
              select: { app_user: { select: { name: true } } },
            },
            assigned_by: { select: { name: true } },
          },
          orderBy: [{ assigned_at: 'desc' }, { interview_id: 'desc' }],
          take: DASHBOARD_ACTIVITY_LIMIT,
        }),
        this.prisma.interview_evaluation.findMany({
          where: {
            ...COMPLETED_HUMAN_EVALUATION_WHERE,
            completed_at: { not: null },
          },
          select: {
            evaluation_id: true,
            overall_score: true,
            completed_at: true,
            interview: {
              select: {
                job_title: true,
                candidate: { select: { name: true } },
                evaluator_profile: {
                  select: { app_user: { select: { name: true } } },
                },
              },
            },
          },
          orderBy: [{ completed_at: 'desc' }, { evaluation_id: 'desc' }],
          take: DASHBOARD_ACTIVITY_LIMIT,
        }),
      ]);

      const sample = score._count?.overall_score ?? 0;
      const average = sample > 0 ? toScore(score._avg?.overall_score) : null;

      const events: DashboardActivity[] = [];
      for (const row of candidatesActivity) {
        events.push(
          activity('candidate_registered', row.user_id, row.created_at, {
            candidateName: row.name,
          }),
        );
      }
      for (const row of submittedActivity) {
        if (!row.submitted_at) continue;
        events.push(
          activity(
            'interview_submitted',
            row.interview_id,
            row.submitted_at,
            { candidateName: row.candidate.name, jobTitle: row.job_title },
          ),
        );
      }
      for (const row of assignedActivity) {
        if (!row.assigned_at) continue;
        events.push(
          activity('interview_assigned', row.interview_id, row.assigned_at, {
            candidateName: row.candidate.name,
            jobTitle: row.job_title,
            evaluatorName: row.evaluator_profile?.app_user.name ?? null,
            actorName: row.assigned_by?.name ?? null,
          }),
        );
      }
      for (const row of completedActivity) {
        if (!row.completed_at) continue;
        events.push(
          activity(
            'evaluation_completed',
            row.evaluation_id,
            row.completed_at,
            {
              candidateName: row.interview.candidate.name,
              jobTitle: row.interview.job_title,
              evaluatorName:
                row.interview.evaluator_profile?.app_user.name ?? null,
              score: toScore(row.overall_score),
            },
          ),
        );
      }
      events.sort(compareActivity);

      const totals = new Map(monthRows.map((row) => [row.month, row.total]));

      return {
        generatedAt: now.toISOString(),
        summary: {
          candidateCount,
          activeEvaluatorCount,
          pendingAssignmentCount,
          averageScore: average,
          averageScoreSample: average === null ? 0 : sample,
        },
        interviewsByMonth: buildMonthKeys(now).map((month) => ({
          month,
          total: totals.get(month) ?? 0,
        })),
        recentActivity: events.slice(0, DASHBOARD_ACTIVITY_LIMIT),
      };
    } catch (error) {
      // Detalhes (Prisma/SQL) ficam só no log do servidor; o cliente recebe uma mensagem genérica.
      this.logger.error(
        `Falha ao montar o dashboard: ${error instanceof Error ? error.message : 'erro desconhecido'}`,
      );
      throw new InternalServerErrorException(GENERIC_ERROR_MESSAGE);
    }
  }

  // Entrevistas ENVIADAS (submitted_at) por mês de São Paulo, na janela dos 12
  // meses. Parametrizado: o único valor dinâmico é `now`; o fuso é literal.
  private async queryMonthlyTotals(
    now: Date,
  ): Promise<Array<{ month: string; total: number }>> {
    const rows = await this.prisma.$queryRaw<
      Array<{ month: string; total: number | bigint }>
    >`
      SELECT to_char(date_trunc('month', submitted_at AT TIME ZONE 'America/Sao_Paulo'), 'YYYY-MM') AS month,
             COUNT(*)::int AS total
      FROM interview
      WHERE submitted_at IS NOT NULL
        AND submitted_at >= (date_trunc('month', ${now}::timestamptz AT TIME ZONE 'America/Sao_Paulo') - interval '11 months') AT TIME ZONE 'America/Sao_Paulo'
      GROUP BY 1
    `;
    return rows.map((row) => ({ month: row.month, total: Number(row.total) }));
  }
}
