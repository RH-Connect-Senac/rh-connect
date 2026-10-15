-- Claim/lease e histórico de tentativas do executor da avaliação por IA (R3.3a-4a).
-- ADITIVA: só adiciona colunas anuláveis (ou com DEFAULT constante), uma tabela
-- nova, CHECKs e um índice parcial. Nenhum status, linha ou coluna existente é
-- alterado ou apagado, e o enum interview_status NÃO muda (a falha terminal do
-- executor é registrada em colunas e a entrevista continua PENDING_AI_EVALUATION).
--
-- Decisões:
--   * ai_claim_token é o token de posse (fencing): toda escrita do executor sobre a
--     entrevista é condicionada a ele. Token e lease andam juntos (CHECK).
--   * ai_attempts conta CLAIMS (inícios de tentativa), não chamadas à Groq: uma
--     tentativa pode terminar sem chamar a IA. O histórico fica em
--     ai_evaluation_attempt (ai_requested_at e ai_calls_upper_bound).
--   * ai_terminal_at/ai_terminal_reason: falha terminal; a entrevista deixa de ser
--     reivindicada, mas NUNCA vira COMPLETED por causa disso.
--   * Entrevistas já existentes ficam com ai_attempts = 0 e demais colunas nulas:
--     continuam elegíveis exatamente como antes.
--   * ai_first_claimed_at registra o início da PRIMEIRA tentativa. A idade máxima
--     do executor é contada a partir dele, nunca de submitted_at: entrevistas
--     antigas (anteriores à ativação do executor) NÃO expiram por terem esperado;
--     o prazo só começa quando o executor as reivindica pela primeira vez.
--   * ON DELETE CASCADE: apagar a entrevista apaga o histórico de tentativas.
--
-- As partes de CreateTable/AlterTable/CreateIndex/AddForeignKey abaixo são a saída
-- do `prisma migrate diff` entre o schema anterior e o atual (sem drift); os
-- CHECKs e o índice parcial ao final o Prisma não expressa.

-- AlterTable
ALTER TABLE "interview" ADD COLUMN     "ai_attempts" SMALLINT NOT NULL DEFAULT 0,
ADD COLUMN     "ai_claim_token" UUID,
ADD COLUMN     "ai_first_claimed_at" TIMESTAMPTZ(6),
ADD COLUMN     "ai_last_error_code" VARCHAR(40),
ADD COLUMN     "ai_lease_until" TIMESTAMPTZ(6),
ADD COLUMN     "ai_next_attempt_at" TIMESTAMPTZ(6),
ADD COLUMN     "ai_terminal_at" TIMESTAMPTZ(6),
ADD COLUMN     "ai_terminal_reason" VARCHAR(40);

-- CreateTable
CREATE TABLE "ai_evaluation_attempt" (
    "attempt_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "interview_id" UUID NOT NULL,
    "claim_token" UUID NOT NULL,
    "attempt_number" SMALLINT NOT NULL,
    "worker_id" VARCHAR(80),
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lease_until" TIMESTAMPTZ(6) NOT NULL,
    "ai_requested_at" TIMESTAMPTZ(6),
    "ai_calls_upper_bound" SMALLINT,
    "ai_duration_ms" INTEGER,
    "finished_at" TIMESTAMPTZ(6),
    "outcome" VARCHAR(40),
    "error_code" VARCHAR(40),

    CONSTRAINT "ai_evaluation_attempt_pkey" PRIMARY KEY ("attempt_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_ai_evaluation_attempt_claim_token" ON "ai_evaluation_attempt"("claim_token");

-- CreateIndex
CREATE INDEX "idx_ai_evaluation_attempt_started_at" ON "ai_evaluation_attempt"("started_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ai_evaluation_attempt_interview_number" ON "ai_evaluation_attempt"("interview_id", "attempt_number");

-- AddForeignKey
ALTER TABLE "ai_evaluation_attempt" ADD CONSTRAINT "fk_ai_evaluation_attempt_interview" FOREIGN KEY ("interview_id") REFERENCES "interview"("interview_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- CHECKs (o Prisma não os expressa). Todos null-safe e satisfeitos por linhas
-- existentes (colunas novas nulas e ai_attempts = 0).
ALTER TABLE "interview"
    ADD CONSTRAINT "chk_interview_ai_attempts_non_negative" CHECK ("ai_attempts" >= 0),
    -- Token e lease existem juntos ou não existem.
    ADD CONSTRAINT "chk_interview_ai_claim_lease_pair" CHECK (("ai_claim_token" IS NULL) = ("ai_lease_until" IS NULL)),
    -- Só entrevistas de IA têm claim.
    ADD CONSTRAINT "chk_interview_ai_claim_only_ai" CHECK ("ai_claim_token" IS NULL OR "evaluation_mode" = 'AI'),
    -- Falha terminal e seu motivo existem juntos.
    ADD CONSTRAINT "chk_interview_ai_terminal_pair" CHECK (("ai_terminal_at" IS NULL) = ("ai_terminal_reason" IS NULL));

ALTER TABLE "ai_evaluation_attempt"
    ADD CONSTRAINT "chk_ai_evaluation_attempt_number" CHECK ("attempt_number" >= 1),
    ADD CONSTRAINT "chk_ai_evaluation_attempt_duration" CHECK ("ai_duration_ms" IS NULL OR "ai_duration_ms" >= 0),
    ADD CONSTRAINT "chk_ai_evaluation_attempt_calls" CHECK ("ai_calls_upper_bound" IS NULL OR "ai_calls_upper_bound" >= 0),
    ADD CONSTRAINT "chk_ai_evaluation_attempt_finished_order" CHECK ("finished_at" IS NULL OR "finished_at" >= "started_at"),
    -- Tentativa aberta não tem desfecho; tentativa encerrada sempre tem.
    ADD CONSTRAINT "chk_ai_evaluation_attempt_outcome_pair" CHECK (("finished_at" IS NULL) = ("outcome" IS NULL)),
    ADD CONSTRAINT "chk_ai_evaluation_attempt_texts" CHECK (("outcome" IS NULL OR "outcome" <> '') AND ("error_code" IS NULL OR "error_code" <> ''));

-- Índice PARCIAL de elegibilidade: o executor só olha entrevistas de IA pendentes
-- e sem falha terminal, em ordem de próxima tentativa e de envio.
CREATE INDEX "idx_interview_ai_eligible"
    ON "interview"("ai_next_attempt_at", "submitted_at")
    WHERE "status" = 'PENDING_AI_EVALUATION' AND "evaluation_mode" = 'AI' AND "ai_terminal_at" IS NULL;
