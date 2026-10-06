-- CreateEnum
CREATE TYPE "academic_level" AS ENUM ('ENSINO_FUNDAMENTAL', 'ENSINO_MEDIO', 'TECNICO', 'TECNOLOGO', 'GRADUACAO', 'POS_GRADUACAO', 'MESTRADO', 'DOUTORADO');

-- CreateEnum
CREATE TYPE "contract_type" AS ENUM ('CLT', 'ESTAGIO', 'PJ', 'TEMPORARIO');

-- CreateEnum
CREATE TYPE "education_status" AS ENUM ('EM_ANDAMENTO', 'CONCLUIDO', 'TRANCADO', 'INTERROMPIDO');

-- CreateEnum
CREATE TYPE "professional_level" AS ENUM ('TRAINEE', 'JUNIOR', 'PLENO', 'SENIOR');

-- CreateEnum
CREATE TYPE "skill_type" AS ENUM ('TECHNICAL', 'BEHAVIORAL');

-- AlterTable
-- professional_title passa de VARCHAR(120) para VARCHAR(60). Se existir valor
-- com mais de 60 caracteres, o ALTER falha (nenhum fluxo gravava esse campo
-- até aqui) — nesse caso, ajuste os dados antes de reaplicar a migration.
ALTER TABLE "candidate_profile"
    ALTER COLUMN "professional_title" TYPE VARCHAR(60),
    ADD COLUMN "desired_position" VARCHAR(60),
    ADD COLUMN "professional_area" VARCHAR(50),
    ADD COLUMN "professional_subarea" VARCHAR(50),
    ADD COLUMN "professional_level" "professional_level",
    ADD COLUMN "contract_type" "contract_type",
    ADD COLUMN "professional_summary" VARCHAR(600),
    ADD COLUMN "courses_none_declared_at" TIMESTAMPTZ(6),
    ADD COLUMN "experience_none_declared_at" TIMESTAMPTZ(6),
    ADD COLUMN "technical_skills_none_declared_at" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "candidate_education" (
    "education_id" SERIAL NOT NULL,
    "candidate_profile_id" INTEGER NOT NULL,
    "degree" VARCHAR(80) NOT NULL,
    "education_institution" VARCHAR(80) NOT NULL,
    "academic_level" "academic_level" NOT NULL,
    "education_status" "education_status" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_education_pkey" PRIMARY KEY ("education_id")
);

-- CreateTable
CREATE TABLE "candidate_course" (
    "course_id" SERIAL NOT NULL,
    "candidate_profile_id" INTEGER NOT NULL,
    "course_name" VARCHAR(80) NOT NULL,
    "course_institution" VARCHAR(80),
    "workload_hours" INTEGER,
    "completed_at" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_course_pkey" PRIMARY KEY ("course_id")
);

-- CreateTable
CREATE TABLE "candidate_experience" (
    "experience_id" SERIAL NOT NULL,
    "candidate_profile_id" INTEGER NOT NULL,
    "company_name" VARCHAR(80) NOT NULL,
    "job_role" VARCHAR(60) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "description" VARCHAR(800),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_experience_pkey" PRIMARY KEY ("experience_id")
);

-- CreateTable
CREATE TABLE "candidate_skill" (
    "skill_id" SERIAL NOT NULL,
    "candidate_profile_id" INTEGER NOT NULL,
    "skill_type" "skill_type" NOT NULL,
    "skill_name" VARCHAR(60) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_skill_pkey" PRIMARY KEY ("skill_id")
);

-- CreateIndex
CREATE INDEX "idx_candidate_education_profile_id" ON "candidate_education"("candidate_profile_id");

-- CreateIndex
CREATE INDEX "idx_candidate_course_profile_id" ON "candidate_course"("candidate_profile_id");

-- CreateIndex
CREATE INDEX "idx_candidate_experience_profile_id" ON "candidate_experience"("candidate_profile_id");

-- CreateIndex
CREATE INDEX "idx_candidate_skill_profile_type" ON "candidate_skill"("candidate_profile_id", "skill_type");

-- AddForeignKey
ALTER TABLE "candidate_education" ADD CONSTRAINT "fk_candidate_education_profile" FOREIGN KEY ("candidate_profile_id") REFERENCES "candidate_profile"("candidate_profile_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "candidate_course" ADD CONSTRAINT "fk_candidate_course_profile" FOREIGN KEY ("candidate_profile_id") REFERENCES "candidate_profile"("candidate_profile_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "candidate_experience" ADD CONSTRAINT "fk_candidate_experience_profile" FOREIGN KEY ("candidate_profile_id") REFERENCES "candidate_profile"("candidate_profile_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "candidate_skill" ADD CONSTRAINT "fk_candidate_skill_profile" FOREIGN KEY ("candidate_profile_id") REFERENCES "candidate_profile"("candidate_profile_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- ---------------------------------------------------------------------------
-- Constraints e índices que o Prisma não expressa no schema (SQL manual).
-- Não aparecem no schema.prisma e não são removidos por `prisma migrate dev`.
-- ---------------------------------------------------------------------------

-- Unicidade case-insensitive de habilidade por perfil e tipo.
CREATE UNIQUE INDEX "uq_candidate_skill_profile_type_name" ON "candidate_skill"("candidate_profile_id", "skill_type", lower("skill_name"));

-- candidate_profile: textos opcionais, quando preenchidos, não podem ser vazios.
ALTER TABLE "candidate_profile"
    ADD CONSTRAINT "chk_candidate_profile_title_not_blank" CHECK ("professional_title" IS NULL OR char_length(btrim("professional_title")) > 0),
    ADD CONSTRAINT "chk_candidate_profile_position_not_blank" CHECK ("desired_position" IS NULL OR char_length(btrim("desired_position")) > 0),
    ADD CONSTRAINT "chk_candidate_profile_summary_not_blank" CHECK ("professional_summary" IS NULL OR char_length(btrim("professional_summary")) > 0),
    ADD CONSTRAINT "chk_candidate_profile_subarea_needs_area" CHECK ("professional_subarea" IS NULL OR "professional_area" IS NOT NULL);

-- candidate_education: texto obrigatório não vazio; datas sempre no dia 1
-- (mês/ano); conclusão não anterior ao início.
ALTER TABLE "candidate_education"
    ADD CONSTRAINT "chk_candidate_education_degree_not_blank" CHECK (char_length(btrim("degree")) > 0),
    ADD CONSTRAINT "chk_candidate_education_institution_not_blank" CHECK (char_length(btrim("education_institution")) > 0),
    ADD CONSTRAINT "chk_candidate_education_start_first_day" CHECK (EXTRACT(DAY FROM "start_date") = 1),
    ADD CONSTRAINT "chk_candidate_education_end_first_day" CHECK ("end_date" IS NULL OR EXTRACT(DAY FROM "end_date") = 1),
    ADD CONSTRAINT "chk_candidate_education_period" CHECK ("end_date" IS NULL OR "end_date" >= "start_date");

-- candidate_course: nome obrigatório; instituição opcional (não vazia se
-- informada); carga horária positiva; conclusão sempre no dia 1.
ALTER TABLE "candidate_course"
    ADD CONSTRAINT "chk_candidate_course_name_not_blank" CHECK (char_length(btrim("course_name")) > 0),
    ADD CONSTRAINT "chk_candidate_course_institution_not_blank" CHECK ("course_institution" IS NULL OR char_length(btrim("course_institution")) > 0),
    ADD CONSTRAINT "chk_candidate_course_workload_range" CHECK ("workload_hours" IS NULL OR ("workload_hours" > 0 AND "workload_hours" <= 10000)),
    ADD CONSTRAINT "chk_candidate_course_completed_first_day" CHECK ("completed_at" IS NULL OR EXTRACT(DAY FROM "completed_at") = 1);

-- candidate_experience: texto obrigatório não vazio; datas no dia 1; cargo
-- atual não tem data de término; cargo encerrado exige término >= início.
ALTER TABLE "candidate_experience"
    ADD CONSTRAINT "chk_candidate_experience_company_not_blank" CHECK (char_length(btrim("company_name")) > 0),
    ADD CONSTRAINT "chk_candidate_experience_role_not_blank" CHECK (char_length(btrim("job_role")) > 0),
    ADD CONSTRAINT "chk_candidate_experience_description_not_blank" CHECK ("description" IS NULL OR char_length(btrim("description")) > 0),
    ADD CONSTRAINT "chk_candidate_experience_start_first_day" CHECK (EXTRACT(DAY FROM "start_date") = 1),
    ADD CONSTRAINT "chk_candidate_experience_end_first_day" CHECK ("end_date" IS NULL OR EXTRACT(DAY FROM "end_date") = 1),
    ADD CONSTRAINT "chk_candidate_experience_current_vs_end" CHECK (("is_current" = true AND "end_date" IS NULL) OR ("is_current" = false AND "end_date" IS NOT NULL AND "end_date" >= "start_date"));

-- candidate_skill: nome não vazio.
ALTER TABLE "candidate_skill"
    ADD CONSTRAINT "chk_candidate_skill_name_not_blank" CHECK (char_length(btrim("skill_name")) > 0);
