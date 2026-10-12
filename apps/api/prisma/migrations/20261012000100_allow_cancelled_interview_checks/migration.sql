-- Uma entrevista CANCELLED nunca foi enviada: não tem modalidade obrigatória nem
-- submitted_at. As duas CHECKs abaixo (criadas em 20261009000000_add_interview_domain)
-- exigiam isso para todo status diferente de IN_PROGRESS, então precisam aceitar
-- CANCELLED. Só relaxam a regra para o novo status; nenhuma linha existente muda
-- (não há linhas CANCELLED ainda).

ALTER TABLE "interview"
    DROP CONSTRAINT "chk_interview_mode_required",
    DROP CONSTRAINT "chk_interview_submitted_at_required";

ALTER TABLE "interview"
    ADD CONSTRAINT "chk_interview_mode_required" CHECK ("status" IN ('IN_PROGRESS', 'CANCELLED') OR "evaluation_mode" IS NOT NULL),
    ADD CONSTRAINT "chk_interview_submitted_at_required" CHECK ("status" IN ('IN_PROGRESS', 'CANCELLED') OR "submitted_at" IS NOT NULL),
    -- CANCELLED não é envio: nunca carrega submitted_at nem avaliador.
    ADD CONSTRAINT "chk_interview_cancelled_not_submitted" CHECK ("status" <> 'CANCELLED' OR ("submitted_at" IS NULL AND "evaluator_profile_id" IS NULL));
