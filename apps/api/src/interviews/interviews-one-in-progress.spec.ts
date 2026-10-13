import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import type { CreateInterviewDto } from './dto/create-interview.dto';
import { INTERVIEW_ERROR_CODES } from './interview-flow';
import { InterviewsService } from './interviews.service';

const dto: CreateInterviewDto = {
  sourceUrl: 'https://empregare.example/vaga/1',
  title: 'Desenvolvedor Front-end',
  company: 'ACME',
  requirements: ['React'],
};

type Row = { interview_id: string; candidate_user_id: number; status: string; created_at: Date };

// Banco em memória que IMITA o índice único parcial do PostgreSQL:
// (candidate_user_id) WHERE status = 'IN_PROGRESS'. O INSERT é atômico (sem await
// entre checar e gravar), como no banco; o SELECT pode ser atrasado para forçar a corrida.
function makeFake(seed: Row[] = [], opts: { delayFind?: boolean } = {}) {
  const rows = [...seed];
  let next = rows.length;
  const gate: { release: () => void; promise: Promise<void> } = (() => {
    let release!: () => void;
    const promise = new Promise<void>((resolve) => (release = resolve));
    return { release, promise };
  })();
  const interview = {
    findFirst: jest.fn(async (args: { where: { candidate_user_id: number; status: string } }) => {
      const snapshot = rows
        .filter((r) => r.candidate_user_id === args.where.candidate_user_id && r.status === args.where.status)
        .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0];
      if (opts.delayFind) await gate.promise;
      return snapshot ? { interview_id: snapshot.interview_id } : null;
    }),
    create: jest.fn(async (args: { data: { candidate_user_id: number; status: string } }) => {
      const clash = rows.some(
        (r) => r.candidate_user_id === args.data.candidate_user_id && r.status === 'IN_PROGRESS' && args.data.status === 'IN_PROGRESS',
      );
      if (clash) {
        throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
          meta: { target: 'uq_interview_one_in_progress_per_candidate' },
        });
      }
      next += 1;
      const row: Row = {
        interview_id: `00000000-0000-4000-8000-${String(next).padStart(12, '0')}`,
        candidate_user_id: args.data.candidate_user_id,
        status: args.data.status,
        created_at: new Date(2026, 9, 11, 12, next),
      };
      rows.push(row);
      return {
        interview_id: row.interview_id, status: row.status, evaluation_mode: null, job_title: 'T', job_company: null,
        job_summary: null, job_activities: [], job_requirements: [], job_location: null, job_contract_type: null,
        job_work_mode: null, job_source_url: 'u', submitted_at: null, created_at: row.created_at, updated_at: row.created_at,
      };
    }),
  };
  const service = new InterviewsService({ interview } as unknown as PrismaService);
  return { service, interview, rows, openGate: gate.release };
}

const row = (id: string, candidate: number, status: string): Row => ({
  interview_id: id, candidate_user_id: candidate, status, created_at: new Date('2026-10-01T10:00:00Z'),
});
const EXISTING = '11111111-1111-4111-8111-111111111111';

async function conflictOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error as ConflictException;
  }
  throw new Error('esperava 409');
}

describe('InterviewsService.create — no máximo uma IN_PROGRESS por candidato (V1)', () => {
  it('candidato sem IN_PROGRESS consegue criar', async () => {
    const { service, rows } = makeFake();
    const created = await service.create(7, dto);
    expect(created.status).toBe('IN_PROGRESS');
    expect(rows).toHaveLength(1);
  });

  it('candidato com IN_PROGRESS recebe 409 INTERVIEW_ALREADY_IN_PROGRESS com o id existente e nada é criado', async () => {
    const { service, interview, rows } = makeFake([row(EXISTING, 7, 'IN_PROGRESS')]);
    const error = await conflictOf(service.create(7, dto));
    expect(error).toBeInstanceOf(ConflictException);
    expect(error.getStatus()).toBe(409);
    expect(error.getResponse()).toEqual({
      statusCode: 409,
      error: 'Conflict',
      code: INTERVIEW_ERROR_CODES.alreadyInProgress,
      message: 'Você já possui uma entrevista em andamento.',
      interviewId: EXISTING,
    });
    expect(INTERVIEW_ERROR_CODES.alreadyInProgress).toBe('INTERVIEW_ALREADY_IN_PROGRESS');
    expect(interview.create).not.toHaveBeenCalled();
    expect(rows).toHaveLength(1);
  });

  it('a checagem filtra pelo dono do JWT e por IN_PROGRESS', async () => {
    const { service, interview } = makeFake();
    await service.create(7, dto);
    expect(interview.findFirst.mock.calls[0][0].where).toEqual({ candidate_user_id: 7, status: 'IN_PROGRESS' });
  });

  it('IN_PROGRESS de OUTRO candidato não bloqueia', async () => {
    const { service } = makeFake([row(EXISTING, 8, 'IN_PROGRESS')]);
    await expect(service.create(7, dto)).resolves.toMatchObject({ status: 'IN_PROGRESS' });
  });

  it.each(['PENDING_AI_EVALUATION', 'PENDING_ASSIGNMENT', 'ASSIGNED', 'COMPLETED'])(
    'entrevista %s do mesmo candidato não bloqueia',
    async (status) => {
      const { service, rows } = makeFake([row(EXISTING, 7, status)]);
      await expect(service.create(7, dto)).resolves.toMatchObject({ status: 'IN_PROGRESS' });
      expect(rows).toHaveLength(2);
    },
  );

  it('concorrência: duas criações simultâneas passam pelo SELECT, mas só UMA IN_PROGRESS existe (a outra vira 409 com o id da criada)', async () => {
    const { service, rows, openGate } = makeFake([], { delayFind: true });
    const a = service.create(7, dto).then((r) => ({ ok: true as const, r }), (e: ConflictException) => ({ ok: false as const, e }));
    const b = service.create(7, dto).then((r) => ({ ok: true as const, r }), (e: ConflictException) => ({ ok: false as const, e }));
    openGate(); // ambos já leram "nenhuma IN_PROGRESS"
    const results = await Promise.all([a, b]);
    expect(results.filter((x) => x.ok)).toHaveLength(1);
    expect(rows.filter((r) => r.status === 'IN_PROGRESS')).toHaveLength(1);
    const loser = results.find((x) => !x.ok);
    expect(loser && !loser.ok && (loser.e.getResponse() as { code: string; interviewId: string })).toMatchObject({
      code: 'INTERVIEW_ALREADY_IN_PROGRESS',
      interviewId: rows[0].interview_id,
    });
  });

  it('erro de banco que não é P2002 continua sendo propagado (não vira 409)', async () => {
    const { service, interview } = makeFake();
    interview.create.mockImplementationOnce(() => Promise.reject(new Error('db down')));
    await expect(service.create(7, dto)).rejects.toThrow('db down');
  });
});

describe('migration do índice único parcial', () => {
  const sql = readFileSync(
    join(__dirname, '..', '..', 'prisma', 'migrations', '20261011000000_add_unique_in_progress_interview_per_candidate', 'migration.sql'),
    'utf8',
  );
  const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');

  it('cria UNIQUE parcial por candidato WHERE status = IN_PROGRESS', () => {
    expect(code).toMatch(/CREATE UNIQUE INDEX "uq_interview_one_in_progress_per_candidate"\s+ON "interview"\("candidate_user_id"\)\s+WHERE "status" = 'IN_PROGRESS'/);
  });

  it('é aditiva: não apaga nem altera dados e aborta com mensagem se houver duplicatas', () => {
    expect(code).not.toMatch(/\b(DELETE|UPDATE|DROP|TRUNCATE|ALTER)\b/i);
    expect(code).toMatch(/RAISE EXCEPTION/);
    expect(code).toMatch(/HAVING COUNT\(\*\) > 1/);
  });
});
