import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ConflictException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import {
  CANDIDATE_DETAIL_SELECT,
  HISTORY_LIST_SELECT,
  RESULT_SELECT,
} from './interview-history';
import { INTERVIEW_SELECT } from './interview-projection';
import { InterviewsService } from './interviews.service';

// Regressão da 6A.1: listagem, detalhe e resultado precisam concordar sobre a
// MESMA entrevista. O bug real: interview-history.ts importava INTERVIEW_SELECT
// de interviews.service (import circular); em produção o spread virava `{}`, o
// `status` nunca era lido e o detalhe devolvia completedAt null enquanto o
// /result respondia 409 para uma entrevista HUMAN concluída.

const INTERVIEW_ID = 'c465a3ca-2a31-4cd0-bd13-b1cadf50c626';
const CANDIDATE_ID = 7;
const created = new Date('2026-10-12T12:00:00.000Z');
const submitted = new Date('2026-10-12T13:00:00.000Z');
const assigned = new Date('2026-10-13T01:00:00.000Z');
const evaluationCompletedAt = new Date('2026-10-13T03:28:52.775Z');
// updated_at propositalmente DIFERENTE de completed_at: completedAt nunca vem dele.
const updatedAt = new Date('2026-10-13T03:30:00.000Z');

// Linha COMPLETA como o banco guardaria (inclui campos internos que o candidato
// nunca deve receber). O fake do Prisma aplica o `select` de verdade: um campo
// ausente do select some da linha, exatamente como em produção.
function dbRow() {
  return {
    interview_id: INTERVIEW_ID,
    candidate_user_id: CANDIDATE_ID,
    evaluator_profile_id: 'ev-1',
    status: 'COMPLETED',
    evaluation_mode: 'HUMAN',
    job_title: 'Desenvolvedor Front-end',
    job_company: 'ACME',
    job_summary: 'Resumo',
    job_activities: ['Criar telas'],
    job_requirements: ['React'],
    job_location: 'Brasília - DF',
    job_contract_type: 'CLT',
    job_work_mode: null,
    job_source_url: null,
    submitted_at: submitted,
    created_at: created,
    updated_at: updatedAt,
    assigned_at: assigned,
    evaluation: {
      status: 'COMPLETED',
      criteria_scores: {
        clarity: 8,
        coherence: 7,
        objectivity: 9,
        domain_knowledge: 6,
        organization: 8,
        requirements_alignment: 7,
        examples: 5,
      },
      summary: 'Bom desempenho.',
      overall_score: { toString: () => '5.6' },
      completed_at: evaluationCompletedAt,
      assigned_by: 'interno',
    },
    questions: [
      {
        question_id: 'q-1',
        position: 1,
        question_type: 'TECHNICAL',
        question_text: 'Fale de React.',
        answer_text: 'Uso há 3 anos.',
        answered_at: created,
        draft_text: 'rascunho interno',
      },
    ],
  };
}

type Row = Record<string, unknown>;

async function conflictBody(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ConflictException);
    return (error as ConflictException).getResponse() as Record<string, unknown>;
  }
  throw new Error('esperava 409');
}

function project(row: Row, select: Record<string, unknown>): Row {
  const out: Row = {};
  for (const [key, spec] of Object.entries(select)) {
    if (key === '_count') {
      out._count = { questions: (row.questions as unknown[]).length };
      continue;
    }
    const value = row[key];
    if (spec === true) {
      out[key] = value;
    } else if (spec && typeof spec === 'object' && 'select' in spec) {
      const inner = (spec as { select: Record<string, unknown> }).select;
      out[key] = Array.isArray(value)
        ? value.map((item) => project(item as Row, inner))
        : value
          ? project(value as Row, inner)
          : value;
    }
  }
  return out;
}

function makeService(row: Row) {
  const prisma = {
    interview: {
      findMany: jest.fn(({ select }: { select: Record<string, unknown> }) =>
        Promise.resolve([project(row, select)]),
      ),
      count: jest.fn(() => Promise.resolve(1)),
      findFirst: jest.fn(({ select }: { select: Record<string, unknown> }) =>
        Promise.resolve(project(row, select)),
      ),
    },
  };
  return new InterviewsService(prisma as unknown as PrismaService);
}

describe('6A.1 — lista, detalhe e resultado concordam (HUMAN + COMPLETED)', () => {
  it('a mesma entrevista concluída: resultAvailable true, mesmo completedAt, /result sem 409', async () => {
    const service = makeService(dbRow());

    const history = await service.listHistory(CANDIDATE_ID);
    const item = history.interviews[0];
    const detail = await service.getOwned(CANDIDATE_ID, INTERVIEW_ID);
    const result = await service.getResult(CANDIDATE_ID, INTERVIEW_ID);

    expect(item.id).toBe(INTERVIEW_ID);
    expect(item.status).toBe('COMPLETED');
    expect(item.resultAvailable).toBe(true);
    expect(item.overallScore).toBe(5.6);
    expect(item.completedAt).toEqual(evaluationCompletedAt);

    expect(detail.id).toBe(INTERVIEW_ID);
    expect(detail.status).toBe('COMPLETED');
    expect(detail.completedAt).toEqual(evaluationCompletedAt);
    expect(detail.completedAt).toEqual(item.completedAt);
    expect(detail.completedAt).not.toEqual(updatedAt);

    expect(result.interview.status).toBe('COMPLETED');
    expect(result.interview.completedAt).toEqual(evaluationCompletedAt);
    expect(result.evaluation.overallScore).toBe(5.6);
    expect(result.evaluation.completedAt).toEqual(evaluationCompletedAt);
    expect(result.questions).toHaveLength(1);
  });

  it('não vaza campos internos nem rascunho por nenhum dos três caminhos', async () => {
    const service = makeService(dbRow());
    const json = JSON.stringify([
      await service.listHistory(CANDIDATE_ID),
      await service.getOwned(CANDIDATE_ID, INTERVIEW_ID),
      await service.getResult(CANDIDATE_ID, INTERVIEW_ID),
    ]);
    expect(json).not.toContain('candidate_user_id');
    expect(json).not.toContain('evaluator_profile_id');
    expect(json).not.toContain('assigned_by');
    expect(json).not.toContain('rascunho interno');
  });

  it('avaliação ainda DRAFT: lista e detalhe sem completedAt e /result continua 409', async () => {
    const row = dbRow();
    row.evaluation = { ...row.evaluation, status: 'DRAFT' };
    const service = makeService(row);

    const item = (await service.listHistory(CANDIDATE_ID)).interviews[0];
    const detail = await service.getOwned(CANDIDATE_ID, INTERVIEW_ID);

    expect(item.resultAvailable).toBe(false);
    expect(item.completedAt).toBeNull();
    expect(detail.completedAt).toBeNull();
    const body = await conflictBody(service.getResult(CANDIDATE_ID, INTERVIEW_ID));
    expect(body.code).toBe('INTERVIEW_RESULT_NOT_AVAILABLE');
  });

  it('modo AI continua sem resultado, mesmo com avaliação COMPLETED', async () => {
    const row = dbRow();
    row.evaluation_mode = 'AI';
    const service = makeService(row);

    const item = (await service.listHistory(CANDIDATE_ID)).interviews[0];
    expect(item.resultAvailable).toBe(false);
    const body = await conflictBody(service.getResult(CANDIDATE_ID, INTERVIEW_ID));
    expect(body.code).toBe('INTERVIEW_RESULT_NOT_AVAILABLE');
  });

  it('entrevista em andamento: 409 com a mensagem específica do status (não a genérica)', async () => {
    const row = dbRow();
    row.status = 'IN_PROGRESS';
    row.evaluation = null as never;
    const service = makeService(row);

    const body = await conflictBody(service.getResult(CANDIDATE_ID, INTERVIEW_ID));
    expect(body.code).toBe('INTERVIEW_RESULT_NOT_AVAILABLE');
    expect(body.interviewStatus).toBe('IN_PROGRESS');
    expect(body.message).not.toBe('O resultado desta entrevista ainda não está disponível.');
  });
});

describe('6A.1 — selects completos (guarda contra o spread vazio por import circular)', () => {
  const baseKeys = Object.keys(INTERVIEW_SELECT);

  it('INTERVIEW_SELECT existe e traz status e interview_id', () => {
    expect(baseKeys.length).toBeGreaterThan(10);
    expect(baseKeys).toEqual(
      expect.arrayContaining(['interview_id', 'status', 'evaluation_mode']),
    );
  });

  it.each([
    ['CANDIDATE_DETAIL_SELECT', CANDIDATE_DETAIL_SELECT],
    ['RESULT_SELECT', RESULT_SELECT],
  ])('%s contém todas as chaves de INTERVIEW_SELECT', (_name, select) => {
    expect(Object.keys(select)).toEqual(expect.arrayContaining(baseKeys));
  });

  it.each([
    ['CANDIDATE_DETAIL_SELECT', CANDIDATE_DETAIL_SELECT],
    ['HISTORY_LIST_SELECT', HISTORY_LIST_SELECT],
    ['RESULT_SELECT', RESULT_SELECT],
  ])('%s lê status da entrevista e da avaliação', (_name, select) => {
    expect(select).toHaveProperty('status', true);
    expect(select.evaluation.select).toHaveProperty('status', true);
    expect(select.evaluation.select).toHaveProperty('completed_at', true);
  });

  it('interview-history.ts não importa de interviews.service (evita o ciclo)', () => {
    const source = readFileSync(join(__dirname, 'interview-history.ts'), 'utf8');
    expect(source).not.toMatch(/from\s+['"]\.\/interviews\.service['"]/);
    expect(source).toMatch(/from\s+['"]\.\/interview-projection['"]/);
  });

  it('interview-projection.ts não depende de service/history (sem ciclo possível)', () => {
    const source = readFileSync(join(__dirname, 'interview-projection.ts'), 'utf8');
    expect(source).not.toMatch(/from\s+['"]\.\/(interviews\.service|interview-history)['"]/);
  });
});
