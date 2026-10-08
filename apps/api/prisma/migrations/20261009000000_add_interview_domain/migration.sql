-- Domínio de entrevistas (Fluxo Candidato -> Admin -> Avaliador -> Candidato).
-- Somente CRIA objetos novos: nenhuma tabela, coluna ou dado existente é alterado.
--
-- Decisões:
--   * interview_evaluation NÃO repete o avaliador: o avaliador humano é
--     interview.evaluator_profile_id (evita "atribuída ao A, avaliada pelo B").
--   * A quantidade de perguntas NÃO é restrição do banco (só position >= 1).
--   * "Em avaliação" não é status armazenado: deriva de interview_evaluation
--     com status DRAFT.
--   * ON DELETE: candidato CASCADE (padrão do projeto, remove a conta e o
--     histórico dela); filhas CASCADE; evaluator_profile RESTRICT (apagar o
--     avaliador não pode apagar o histórico dos candidatos nem deixar uma
--     entrevista ASSIGNED/COMPLETED sem avaliador; desative a conta em vez de
--     apagar); assigned_by_user_id SET NULL (dado de auditoria opcional).
--
-- CHECKs: todos null-safe (um CHECK com resultado NULL é aceito).

-- CreateEnum
CREATE TYPE "evaluation_mode" AS ENUM ('AI', 'HUMAN');

-- CreateEnum
CREATE TYPE "interview_status" AS ENUM ('IN_PROGRESS', 'PENDING_AI_EVALUATION', 'PENDING_ASSIGNMENT', 'ASSIGNED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "evaluation_status" AS ENUM ('DRAFT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "interview_question_type" AS ENUM ('TECHNICAL', 'BEHAVIORAL', 'CAREER');

-- CreateEnum
CREATE TYPE "job_work_mode" AS ENUM ('REMOTE', 'HYBRID', 'ONSITE');

-- CreateTable
CREATE TABLE "interview" (
    "interview_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_user_id" INTEGER NOT NULL,
    "evaluation_mode" "evaluation_mode",
    "status" "interview_status" NOT NULL DEFAULT 'IN_PROGRESS',
    "job_title" VARCHAR(80) NOT NULL,
    "job_company" VARCHAR(80),
    "job_summary" VARCHAR(800),
    "job_activities" JSONB NOT NULL DEFAULT '[]',
    "job_requirements" JSONB NOT NULL DEFAULT '[]',
    "job_location" VARCHAR(60),
    "job_contract_type" VARCHAR(40),
    "job_work_mode" "job_work_mode",
    "job_source_url" TEXT NOT NULL,
    "evaluator_profile_id" INTEGER,
    "assigned_at" TIMESTAMPTZ(6),
    "assigned_by_user_id" INTEGER,
    "submitted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_pkey" PRIMARY KEY ("interview_id")
);

-- CreateTable
CREATE TABLE "interview_question" (
    "question_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "interview_id" UUID NOT NULL,
    "position" SMALLINT NOT NULL,
    "question_type" "interview_question_type" NOT NULL,
    "question_text" VARCHAR(500) NOT NULL,
    "answer_text" VARCHAR(1000),
    "answered_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_question_pkey" PRIMARY KEY ("question_id")
);

-- CreateTable
CREATE TABLE "interview_evaluation" (
    "evaluation_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "interview_id" UUID NOT NULL,
    "status" "evaluation_status" NOT NULL DEFAULT 'DRAFT',
    "criteria_scores" JSONB NOT NULL DEFAULT '{}',
    "overall_score" DECIMAL(3,1),
    "summary" TEXT,
    "strengths" JSONB,
    "improvements" JSONB,
    "recommendations" JSONB,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_evaluation_pkey" PRIMARY KEY ("evaluation_id")
);

-- CreateTable
CREATE TABLE "interview_question_evaluation" (
    "question_evaluation_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "evaluation_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "interview_id" UUID NOT NULL,
    "score" DECIMAL(3,1) NOT NULL,
    "reason" TEXT NOT NULL,
    "positives" JSONB NOT NULL DEFAULT '[]',
    "improvements" JSONB NOT NULL DEFAULT '[]',
    "suggestion" TEXT NOT NULL,

    CONSTRAINT "interview_question_evaluation_pkey" PRIMARY KEY ("question_evaluation_id")
);

-- CreateIndex
CREATE INDEX "idx_interview_candidate_created_at" ON "interview"("candidate_user_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_interview_status_submitted_at" ON "interview"("status", "submitted_at");

-- CreateIndex
CREATE INDEX "idx_interview_evaluator_status" ON "interview"("evaluator_profile_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "interview_question_interview_id_position_key" ON "interview_question"("interview_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "interview_evaluation_interview_id_key" ON "interview_evaluation"("interview_id");

-- CreateIndex
CREATE UNIQUE INDEX "interview_question_question_id_interview_id_key" ON "interview_question"("question_id", "interview_id");

-- CreateIndex
CREATE UNIQUE INDEX "interview_evaluation_evaluation_id_interview_id_key" ON "interview_evaluation"("evaluation_id", "interview_id");

-- CreateIndex
CREATE UNIQUE INDEX "interview_question_evaluation_evaluation_id_question_id_key" ON "interview_question_evaluation"("evaluation_id", "question_id");

-- AddForeignKey
ALTER TABLE "interview" ADD CONSTRAINT "fk_interview_candidate_user" FOREIGN KEY ("candidate_user_id") REFERENCES "app_user"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "interview" ADD CONSTRAINT "fk_interview_evaluator_profile" FOREIGN KEY ("evaluator_profile_id") REFERENCES "evaluator_profile"("evaluator_profile_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "interview" ADD CONSTRAINT "fk_interview_assigned_by_user" FOREIGN KEY ("assigned_by_user_id") REFERENCES "app_user"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "interview_question" ADD CONSTRAINT "fk_interview_question_interview" FOREIGN KEY ("interview_id") REFERENCES "interview"("interview_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "interview_evaluation" ADD CONSTRAINT "fk_interview_evaluation_interview" FOREIGN KEY ("interview_id") REFERENCES "interview"("interview_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
-- FKs COMPOSTAS que compartilham interview_id: garantem que a avaliação por
-- pergunta só liga uma avaliação e uma pergunta DA MESMA entrevista (FKs
-- simples aceitariam avaliação da entrevista A + pergunta da entrevista B).
-- interview_id aqui é uma cópia intencional, protegida pelas próprias FKs.
ALTER TABLE "interview_question_evaluation" ADD CONSTRAINT "fk_interview_question_evaluation_evaluation" FOREIGN KEY ("evaluation_id", "interview_id") REFERENCES "interview_evaluation"("evaluation_id", "interview_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "interview_question_evaluation" ADD CONSTRAINT "fk_interview_question_evaluation_question" FOREIGN KEY ("question_id", "interview_id") REFERENCES "interview_question"("question_id", "interview_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Constraints que o Prisma não expressa (CHECK). Cada uma vale em TODOS os
-- estados do ciclo de vida:
--   IA:     IN_PROGRESS -> PENDING_AI_EVALUATION -> COMPLETED
--   Humana: IN_PROGRESS -> PENDING_ASSIGNMENT -> ASSIGNED -> COMPLETED

-- Modalidade só pode ficar vazia enquanto a entrevista está em andamento
-- (ela é escolhida depois de gerar as perguntas).
ALTER TABLE "interview"
    ADD CONSTRAINT "chk_interview_mode_required" CHECK ("status" = 'IN_PROGRESS' OR "evaluation_mode" IS NOT NULL),
    -- Todo envio registra submitted_at (vale para AI e HUMAN, em qualquer status pós-envio).
    ADD CONSTRAINT "chk_interview_submitted_at_required" CHECK ("status" = 'IN_PROGRESS' OR "submitted_at" IS NOT NULL),
    -- Avaliação por IA nunca tem avaliador humano. Com modalidade ainda NULL
    -- (IN_PROGRESS) a regra não se aplica.
    ADD CONSTRAINT "chk_interview_ai_no_evaluator" CHECK ("evaluation_mode" IS DISTINCT FROM 'AI' OR "evaluator_profile_id" IS NULL),
    -- Humana: avaliador obrigatório a partir de ASSIGNED (inclui COMPLETED).
    -- PENDING_ASSIGNMENT ainda não tem avaliador e não é exigido aqui.
    ADD CONSTRAINT "chk_interview_human_evaluator_required" CHECK (
        "evaluation_mode" IS DISTINCT FROM 'HUMAN'
        OR "status" NOT IN ('ASSIGNED', 'COMPLETED')
        OR "evaluator_profile_id" IS NOT NULL
    );

ALTER TABLE "interview_question"
    ADD CONSTRAINT "chk_interview_question_position" CHECK ("position" >= 1);

ALTER TABLE "interview_evaluation"
    ADD CONSTRAINT "chk_interview_evaluation_overall_score" CHECK ("overall_score" IS NULL OR ("overall_score" >= 0 AND "overall_score" <= 10));

ALTER TABLE "interview_question_evaluation"
    ADD CONSTRAINT "chk_interview_question_evaluation_score" CHECK ("score" >= 0 AND "score" <= 10);
