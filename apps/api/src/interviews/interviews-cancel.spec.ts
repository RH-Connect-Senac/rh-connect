// InterviewQuestionsService (real, usado nos bloqueios pós-cancelamento) importa
// InterviewsAiService, que importa '@nestjs/config' — build ESM que o Jest deste
// projeto não transforma. O cancelamento não usa a IA (e `generate` é barrado
// antes de chamá-la), então só esse módulo é substituído por uma classe vazia,
// no mesmo padrão de interviews-flow.controller.spec.ts. Nada de config global.
jest.mock('../interviews-ai/interviews-ai.service', () => ({
  InterviewsAiService: class InterviewsAiService {},
}));

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ConflictException, NotFoundException } from '@nestjs/common';
import type { InterviewsAiService } from '../interviews-ai/interviews-ai.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { CreateInterviewDto } from './dto/create-interview.dto';
import { INTERVIEW_ERROR_CODES } from './interview-flow';
import { InterviewQuestionsService } from './interview-questions.service';
import { InterviewsService } from './interviews.service';

type IRow = {
  interview_id: string;
  candidate_user_id: number;
  status: string;
  evaluation_mode: string | null;
  job_title: string;
  job_company: string | null;
  job_summary: string | null;
  job_activities: unknown;
  job_requirements: unknown;
  job_location: string | null;
  job_contract_type: string | null;
  job_work_mode: string | null;
  job_source_url: string;
  evaluator_profile_id: number | null;
  submitted_at: Date | null;
  created_at: Date;
  updated_at: Date;
};
type QRow = {
  question_id: string;
  interview_id: string;
  position: number;
  question_type: string;
  question_text: string;
  answer_text: string | null;
  answered_at: Date | null;
  draft_text: string | null;
  draft_updated_at: Date | null;
  draft_version: number;
};

const OWNER = 7;
const OTHER = 8;
const IID = '11111111-1111-4111-8111-111111111111';
const T0 = new Date('2026-10-01T10:00:00.000Z');
const qid = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;

const interviewRow = (over: Partial<IRow> = {}): IRow => ({
  interview_id: IID,
  candidate_user_id: OWNER,
  status: 'IN_PROGRESS',
  evaluation_mode: 'AI',
  job_title: 'Dev',
  job_company: 'ACME',
  job_summary: null,
  job_activities: [],
  job_requirements: [],
  job_location: null,
  job_contract_type: null,
  job_work_mode: null,
  job_source_url: 'https://x/1',
  evaluator_profile_id: null,
  submitted_at: null,
  created_at: T0,
  updated_at: T0,
  ...over,
});
// Q1 respondida (oficial) + rascunho novo; Q2 só rascunho; Q3..5 vazias.
const questionRows = (interviewId = IID): QRow[] =>
  [1, 2, 3, 4, 5].map((n) => ({
    question_id: qid(n),
    interview_id: interviewId,
    position: n,
    question_type: 'TECHNICAL',
    question_text: `Pergunta ${n}`,
    answer_text: n === 1 ? 'resposta oficial 1' : null,
    answered_at: n === 1 ? T0 : null,
    draft_text: n <= 2 ? `rascunho ${n}` : null,
    draft_updated_at: n <= 2 ? T0 : null,
    draft_version: n <= 2 ? 3 : 0,
  }));

// Banco em memória com a semântica que o código usa: UPDATE condicional atômico
// (WHERE id + dono + status) e $transaction com ROLLBACK se o callback lançar.
function makeDb(interviews: IRow[], questions: QRow[]) {
  const state = { interviews, questions };
  const parentOf = (q: QRow) => state.interviews.find((i) => i.interview_id === q.interview_id);

  const matchI = (row: IRow, where: Record<string, unknown>): boolean =>
    Object.entries(where).every(([key, cond]) => {
      if (key === 'questions') {
        const qs = state.questions.filter((q) => q.interview_id === row.interview_id);
        const c = cond as { some?: object; none?: { answer_text: null } };
        if (c.some && qs.length === 0) return false;
        if (c.none && qs.some((q) => q.answer_text === null)) return false;
        return true;
      }
      return (row as Record<string, unknown>)[key] === cond;
    });
  const matchQ = (row: QRow, where: Record<string, unknown>): boolean =>
    Object.entries(where).every(([key, cond]) => {
      if (key === 'interview') {
        const parent = parentOf(row);
        return !!parent && matchI(parent, cond as Record<string, unknown>);
      }
      return (row as Record<string, unknown>)[key] === cond;
    });
  const applyData = (row: Record<string, unknown>, data: Record<string, unknown>) => {
    for (const [k, v] of Object.entries(data)) {
      if (v && typeof v === 'object' && 'increment' in (v as object)) {
        row[k] = (row[k] as number) + (v as { increment: number }).increment;
      } else row[k] = v;
    }
  };
  const failNextQuestionUpdate = { on: false };
  const gates: { findManyQuestions?: Promise<void> } = {};
  const withInterview = (q: QRow) => ({ ...q, interview: { status: parentOf(q)?.status } });

  const api = {
    interview: {
      findFirst: jest.fn(async (args: { where: Record<string, unknown> }) => {
        const found = state.interviews.find((r) => matchI(r, args.where));
        return found ? { ...found } : null;
      }),
      findMany: jest.fn(async (args: { where: Record<string, unknown> }) =>
        state.interviews
          .filter((r) => matchI(r, args.where))
          .map((r) => ({ ...r, questions: state.questions.filter((q) => q.interview_id === r.interview_id) })),
      ),
      updateMany: jest.fn(async (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const rows = state.interviews.filter((r) => matchI(r, args.where));
        rows.forEach((r) => applyData(r as unknown as Record<string, unknown>, args.data));
        return { count: rows.length };
      }),
      create: jest.fn(async (args: { data: Record<string, unknown> }) => {
        const clash = state.interviews.some(
          (r) => r.candidate_user_id === args.data.candidate_user_id && r.status === 'IN_PROGRESS' && args.data.status === 'IN_PROGRESS',
        );
        if (clash) throw new Error('unique violation');
        const row = interviewRow({
          interview_id: `99999999-9999-4999-8999-${String(state.interviews.length + 1).padStart(12, '0')}`,
          ...(args.data as Partial<IRow>),
          evaluation_mode: null,
        });
        state.interviews.push(row);
        return { ...row };
      }),
    },
    interview_question: {
      findMany: jest.fn(async (args: { where: Record<string, unknown> }) => {
        if (gates.findManyQuestions) await gates.findManyQuestions;
        return state.questions.filter((q) => matchQ(q, args.where)).sort((a, b) => a.position - b.position).map((q) => ({ ...q }));
      }),
      findFirst: jest.fn(async (args: { where: Record<string, unknown> }) => {
        const found = state.questions.find((q) => matchQ(q, args.where));
        return found ? withInterview(found) : null;
      }),
      updateMany: jest.fn(async (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        if (failNextQuestionUpdate.on) {
          failNextQuestionUpdate.on = false;
          throw new Error('falha na limpeza');
        }
        const rows = state.questions.filter((q) => matchQ(q, args.where));
        rows.forEach((q) => applyData(q as unknown as Record<string, unknown>, args.data));
        return { count: rows.length };
      }),
      createMany: jest.fn(async () => ({ count: 0 })),
    },
    $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      const snapshot = JSON.stringify(state);
      try {
        return await fn(api);
      } catch (error) {
        const restored = JSON.parse(snapshot) as typeof state;
        const revive = <T extends Record<string, unknown>>(rows: T[]) =>
          rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v) ? new Date(v) : v]))) as unknown as T[];
        state.interviews.splice(0, state.interviews.length, ...revive<IRow>(restored.interviews as never));
        state.questions.splice(0, state.questions.length, ...revive<QRow>(restored.questions as never));
        throw error;
      }
    }),
  };
  return { api, state, failNextQuestionUpdate, gates };
}

function setup(over: Partial<IRow> = {}, extra: { otherInterviews?: IRow[] } = {}) {
  const db = makeDb([interviewRow(over), ...(extra.otherInterviews ?? [])], questionRows());
  const prisma = db.api as unknown as PrismaService;
  const ai = { generateQuestions: jest.fn() } as unknown as InterviewsAiService;
  return { ...db, interviews: new InterviewsService(prisma), questions: new InterviewQuestionsService(prisma, ai) };
}

async function expectNotInProgress(promise: Promise<unknown>, status: string) {
  let caught: unknown;
  try {
    await promise;
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(ConflictException);
  const body = (caught as ConflictException).getResponse() as Record<string, unknown>;
  expect(body.statusCode).toBe(409);
  expect(body.code).toBe(INTERVIEW_ERROR_CODES.notInProgress);
  expect(body.interviewStatus).toBe(status);
  return body;
}

const dto: CreateInterviewDto = { sourceUrl: 'https://x/2', title: 'Nova', company: 'ACME', requirements: [] };

describe('InterviewsService.cancel — IN_PROGRESS -> CANCELLED', () => {
  it('o dono cancela: status vira CANCELLED, sem submitted_at, e a resposta traz o novo status', async () => {
    const { interviews, state } = setup();
    const result = await interviews.cancel(OWNER, IID);
    expect(result.status).toBe('CANCELLED');
    expect(state.interviews[0].status).toBe('CANCELLED');
    expect(state.interviews[0].submitted_at).toBeNull();
  });

  it('preserva respostas oficiais, perguntas e contexto; nada é apagado', async () => {
    const { interviews, state } = setup();
    await interviews.cancel(OWNER, IID);
    expect(state.questions).toHaveLength(5);
    expect(state.questions[0].answer_text).toBe('resposta oficial 1');
    expect(state.questions[0].answered_at).toEqual(T0);
    expect(state.questions[1].answer_text).toBeNull();
    expect(state.interviews).toHaveLength(1);
    expect(state.interviews[0].job_title).toBe('Dev');
    expect(state.interviews[0].evaluation_mode).toBe('AI');
  });

  it('limpa os rascunhos e AVANÇA draft_version de todas as perguntas', async () => {
    const { interviews, state } = setup();
    await interviews.cancel(OWNER, IID);
    expect(state.questions.map((q) => q.draft_text)).toEqual([null, null, null, null, null]);
    expect(state.questions.map((q) => q.draft_updated_at)).toEqual([null, null, null, null, null]);
    expect(state.questions.map((q) => q.draft_version)).toEqual([4, 4, 1, 1, 1]);
  });

  it('outro candidato => 404 e nada muda', async () => {
    const { interviews, state } = setup();
    await expect(interviews.cancel(OTHER, IID)).rejects.toBeInstanceOf(NotFoundException);
    expect(state.interviews[0].status).toBe('IN_PROGRESS');
    expect(state.questions[0].draft_version).toBe(3);
  });

  it('id inexistente => 404', async () => {
    const { interviews } = setup();
    await expect(interviews.cancel(OWNER, '22222222-2222-4222-8222-222222222222')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('cancelar de novo é idempotente: 200 com CANCELLED e SEM nova alteração', async () => {
    const { interviews, state } = setup();
    await interviews.cancel(OWNER, IID);
    const before = JSON.stringify(state);
    const again = await interviews.cancel(OWNER, IID);
    expect(again.status).toBe('CANCELLED');
    expect(JSON.stringify(state)).toBe(before);
  });

  it.each(['PENDING_AI_EVALUATION', 'PENDING_ASSIGNMENT', 'ASSIGNED', 'COMPLETED'])(
    '%s não vira CANCELLED: 409 INTERVIEW_NOT_IN_PROGRESS com o status vigente, sem alterar nada',
    async (status) => {
      const { interviews, state } = setup({ status, submitted_at: T0 });
      const before = JSON.stringify(state);
      await expectNotInProgress(interviews.cancel(OWNER, IID), status);
      expect(JSON.stringify(state)).toBe(before);
    },
  );

  it('falha na limpeza dos rascunhos => ROLLBACK: continua IN_PROGRESS e com rascunhos', async () => {
    const { interviews, state, failNextQuestionUpdate } = setup();
    failNextQuestionUpdate.on = true;
    await expect(interviews.cancel(OWNER, IID)).rejects.toThrow('falha na limpeza');
    expect(state.interviews[0].status).toBe('IN_PROGRESS');
    expect(state.questions[0].draft_text).toBe('rascunho 1');
    expect(state.questions[0].draft_version).toBe(3);
  });
});

describe('após CANCELLED: nenhuma mutação é aceita (códigos estruturados)', () => {
  async function cancelled() {
    const ctx = setup();
    await ctx.interviews.cancel(OWNER, IID);
    return ctx;
  }

  it('submit => 409 INTERVIEW_NOT_IN_PROGRESS (CANCELLED), mesmo repetindo a modalidade, e não vira enviada', async () => {
    const { interviews, state } = await cancelled();
    const body = await expectNotInProgress(interviews.submit(OWNER, IID), 'CANCELLED');
    await expectNotInProgress(interviews.submit(OWNER, IID, 'AI'), 'CANCELLED');
    await expectNotInProgress(interviews.submit(OWNER, IID, 'HUMAN'), 'CANCELLED');
    expect(String(body.message)).toMatch(/cancelada/);
    expect(state.interviews[0].status).toBe('CANCELLED');
    expect(state.interviews[0].submitted_at).toBeNull();
  });

  it('PUT draft => 409 e nenhum rascunho é gravado', async () => {
    const { questions, state } = await cancelled();
    await expectNotInProgress(questions.saveDraft(OWNER, IID, qid(3), 'novo rascunho', 1), 'CANCELLED');
    expect(state.questions[2].draft_text).toBeNull();
  });

  it('PUT answer => 409 e a resposta não muda', async () => {
    const { questions, state } = await cancelled();
    await expectNotInProgress(questions.saveAnswer(OWNER, IID, qid(3), 'resposta', 1), 'CANCELLED');
    expect(state.questions[2].answer_text).toBeNull();
  });

  it('geração de perguntas e troca de modalidade => 409', async () => {
    const { questions, interviews, state } = await cancelled();
    await expectNotInProgress(questions.generate(OWNER, IID), 'CANCELLED');
    await expectNotInProgress(interviews.setEvaluationMode(OWNER, IID, 'HUMAN'), 'CANCELLED');
    expect(state.interviews[0].evaluation_mode).toBe('AI');
  });

  it('leitura continua possível para descobrir o estado (interviewStatus = CANCELLED)', async () => {
    const { questions, interviews } = await cancelled();
    expect((await questions.list(OWNER, IID)).interviewStatus).toBe('CANCELLED');
    expect((await interviews.getOwned(OWNER, IID)).status).toBe('CANCELLED');
  });

  it('CANCELLED não aparece em GET /interviews/in-progress', async () => {
    const { interviews } = await cancelled();
    expect(await interviews.listInProgress(OWNER)).toEqual([]);
  });

  it('slot da V1 liberado: o candidato cria uma nova entrevista logo após cancelar', async () => {
    const { interviews, state } = await cancelled();
    const created = await interviews.create(OWNER, dto);
    expect(created.status).toBe('IN_PROGRESS');
    expect(state.interviews.filter((i) => i.status === 'IN_PROGRESS')).toHaveLength(1);
    expect(state.interviews.filter((i) => i.status === 'CANCELLED')).toHaveLength(1);
  });
});

describe('concorrência submit × cancel: só uma transição vence', () => {
  function answeredAll(state: { questions: QRow[] }) {
    state.questions.forEach((q) => {
      q.answer_text = `r${q.position}`;
      q.answered_at = T0;
    });
  }

  it('cancel vence antes do UPDATE do submit (submit já tinha lido IN_PROGRESS) => submit 409 CANCELLED, nada enviado', async () => {
    const { interviews, state, gates } = setup();
    answeredAll(state);
    let release!: () => void;
    gates.findManyQuestions = new Promise<void>((resolve) => (release = resolve));
    const submitting = interviews.submit(OWNER, IID, 'AI').then(
      () => 'ok',
      (e: ConflictException) => e,
    );
    await interviews.cancel(OWNER, IID);
    release();
    const outcome = await submitting;
    expect(outcome).toBeInstanceOf(ConflictException);
    expect(((outcome as ConflictException).getResponse() as { interviewStatus: string }).interviewStatus).toBe('CANCELLED');
    expect(state.interviews[0].status).toBe('CANCELLED');
    expect(state.interviews[0].submitted_at).toBeNull();
  });

  it('submit vence primeiro => cancel 409 com o status de enviada, e as respostas/rascunhos do envio ficam como estavam', async () => {
    const { interviews, state } = setup();
    answeredAll(state);
    await interviews.submit(OWNER, IID, 'AI');
    const sent = JSON.stringify(state);
    await expectNotInProgress(interviews.cancel(OWNER, IID), 'PENDING_AI_EVALUATION');
    expect(JSON.stringify(state)).toBe(sent);
    expect(state.interviews[0].submitted_at).not.toBeNull();
  });

  it('disparados juntos: exatamente um vence e o estado final é consistente', async () => {
    const { interviews, state } = setup();
    answeredAll(state);
    const results = await Promise.allSettled([interviews.submit(OWNER, IID, 'AI'), interviews.cancel(OWNER, IID)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const final = state.interviews[0];
    if (final.status === 'CANCELLED') {
      expect(final.submitted_at).toBeNull();
    } else {
      expect(final.status).toBe('PENDING_AI_EVALUATION');
      expect(final.submitted_at).not.toBeNull();
    }
  });
});

describe('migrations do status CANCELLED', () => {
  const dir = join(__dirname, '..', '..', 'prisma', 'migrations');
  const enumSql = readFileSync(join(dir, '20261012000000_add_interview_status_cancelled', 'migration.sql'), 'utf8');
  const checksSql = readFileSync(join(dir, '20261012000100_allow_cancelled_interview_checks', 'migration.sql'), 'utf8');
  const code = (sql: string) => sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');

  it("adiciona só o valor 'CANCELLED' ao enum, sem tocar em dados e sem usá-lo na mesma migration", () => {
    expect(code(enumSql).trim()).toBe(`ALTER TYPE "interview_status" ADD VALUE 'CANCELLED';`);
  });

  it('as CHECKs que exigiam modalidade/submitted_at passam a aceitar CANCELLED, sem apagar dados', () => {
    const sql = code(checksSql);
    expect(sql).toMatch(/chk_interview_mode_required" CHECK \("status" IN \('IN_PROGRESS', 'CANCELLED'\) OR "evaluation_mode" IS NOT NULL\)/);
    expect(sql).toMatch(/chk_interview_submitted_at_required" CHECK \("status" IN \('IN_PROGRESS', 'CANCELLED'\) OR "submitted_at" IS NOT NULL\)/);
    expect(sql).toMatch(/chk_interview_cancelled_not_submitted" CHECK \("status" <> 'CANCELLED' OR \("submitted_at" IS NULL AND "evaluator_profile_id" IS NULL\)\)/);
    expect(sql).not.toMatch(/\b(DELETE|UPDATE|TRUNCATE|DROP TABLE|DROP COLUMN)\b/i);
  });

  it('o schema Prisma declara CANCELLED no enum interview_status', () => {
    const schema = readFileSync(join(dir, '..', 'schema.prisma'), 'utf8');
    const enumBlock = /enum interview_status \{([^}]*)\}/.exec(schema)?.[1] ?? '';
    expect(enumBlock).toMatch(/\bCANCELLED\b/);
  });
});
