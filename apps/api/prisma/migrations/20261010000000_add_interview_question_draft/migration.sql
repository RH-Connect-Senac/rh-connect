-- AlterTable
-- Rascunho do candidato por pergunta, SEPARADO da resposta oficial.
-- Aditiva: answer_text / answered_at não mudam. Perguntas existentes ficam com
-- draft_text/draft_updated_at NULL e draft_version 0 (nenhum comportamento antigo muda).
ALTER TABLE "interview_question"
    ADD COLUMN "draft_text" VARCHAR(1000),
    ADD COLUMN "draft_updated_at" TIMESTAMPTZ(6),
    ADD COLUMN "draft_version" INTEGER NOT NULL DEFAULT 0;
