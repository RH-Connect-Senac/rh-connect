-- CreateEnum
CREATE TYPE "account_status" AS ENUM ('PENDING_VERIFICATION', 'INVITED', 'ACTIVE', 'BLOCKED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "document_type" AS ENUM ('TERMS_OF_USE', 'PRIVACY_POLICY');

-- CreateEnum
CREATE TYPE "evaluator_availability_status" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "token_purpose" AS ENUM ('EVALUATOR_INVITE', 'PASSWORD_RESET', 'EMAIL_VERIFICATION');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('CANDIDATE', 'EVALUATOR', 'ADMIN');

-- CreateTable
CREATE TABLE "account_activation_token" (
    "activation_token_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" INTEGER NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "token_purpose" "token_purpose" NOT NULL DEFAULT 'EVALUATOR_INVITE',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_activation_token_pkey" PRIMARY KEY ("activation_token_id")
);

-- CreateTable
CREATE TABLE "app_user" (
    "user_id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255),
    "user_role" "user_role" NOT NULL,
    "account_status" "account_status" NOT NULL DEFAULT 'ACTIVE',
    "onboarding_completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_user_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "candidate_profile" (
    "candidate_profile_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "professional_title" VARCHAR(120),
    "city" VARCHAR(100),
    "state" CHAR(2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_profile_pkey" PRIMARY KEY ("candidate_profile_id")
);

-- CreateTable
CREATE TABLE "evaluator_profile" (
    "evaluator_profile_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "area" VARCHAR(100),
    "specialization" VARCHAR(150),
    "availability_status" "evaluator_availability_status" NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluator_profile_pkey" PRIMARY KEY ("evaluator_profile_id")
);

-- CreateTable
CREATE TABLE "session" (
    "session_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" INTEGER NOT NULL,
    "refresh_token_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "session_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "terms_acceptance" (
    "acceptance_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "document_type" "document_type" NOT NULL,
    "document_version" VARCHAR(20) NOT NULL,
    "accepted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "terms_acceptance_pkey" PRIMARY KEY ("acceptance_id")
);

-- CreateIndex
CREATE INDEX "idx_activation_token_expires_at" ON "account_activation_token"("expires_at");

-- CreateIndex
CREATE INDEX "idx_activation_token_hash" ON "account_activation_token"("token_hash");

-- CreateIndex
CREATE INDEX "idx_activation_token_used_at" ON "account_activation_token"("used_at");

-- CreateIndex
CREATE INDEX "idx_activation_token_user_id" ON "account_activation_token"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "app_user_email_key" ON "app_user"("email");

-- CreateIndex
CREATE INDEX "idx_app_user_email" ON "app_user"("email");

-- CreateIndex
CREATE INDEX "idx_app_user_role" ON "app_user"("user_role");

-- CreateIndex
CREATE INDEX "idx_app_user_status" ON "app_user"("account_status");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_profile_user_id_key" ON "candidate_profile"("user_id");

-- CreateIndex
CREATE INDEX "idx_candidate_profile_user_id" ON "candidate_profile"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluator_profile_user_id_key" ON "evaluator_profile"("user_id");

-- CreateIndex
CREATE INDEX "idx_evaluator_profile_user_id" ON "evaluator_profile"("user_id");

-- CreateIndex
CREATE INDEX "idx_session_expires_at" ON "session"("expires_at");

-- CreateIndex
CREATE INDEX "idx_session_revoked_at" ON "session"("revoked_at");

-- CreateIndex
CREATE INDEX "idx_session_user_id" ON "session"("user_id");

-- CreateIndex
CREATE INDEX "idx_terms_user_id" ON "terms_acceptance"("user_id");

-- AddForeignKey
ALTER TABLE "account_activation_token" ADD CONSTRAINT "fk_account_activation_token_user" FOREIGN KEY ("user_id") REFERENCES "app_user"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "candidate_profile" ADD CONSTRAINT "fk_candidate_profile_user" FOREIGN KEY ("user_id") REFERENCES "app_user"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evaluator_profile" ADD CONSTRAINT "fk_evaluator_profile_user" FOREIGN KEY ("user_id") REFERENCES "app_user"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "fk_session_user" FOREIGN KEY ("user_id") REFERENCES "app_user"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "terms_acceptance" ADD CONSTRAINT "fk_terms_acceptance_user" FOREIGN KEY ("user_id") REFERENCES "app_user"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

