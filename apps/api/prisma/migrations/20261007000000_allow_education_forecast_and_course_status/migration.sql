-- Migration corretiva (as migrations anteriores já foram aplicadas e NÃO são
-- editadas).
--
-- 1) Formação EM_ANDAMENTO passa a aceitar previsão de conclusão (opcional,
--    pode ser futura). Remove a constraint que exigia end_date vazio nesse caso.
--    Permanecem: CONCLUIDO exige end_date (chk_candidate_education_concluded_has_end)
--    e end_date >= start_date (chk_candidate_education_period). A regra "conclusão
--    real não pode ser futura" depende da data atual e fica na API (CHECK não
--    pode usar now() de forma imutável).
ALTER TABLE "candidate_education"
    DROP CONSTRAINT "chk_candidate_education_in_progress_no_end";

-- 2) Situação do curso complementar.
CREATE TYPE "course_status" AS ENUM ('EM_ANDAMENTO', 'CONCLUIDO');

ALTER TABLE "candidate_course" ADD COLUMN "course_status" "course_status";

-- Cursos existentes: com data de conclusão => CONCLUIDO; sem data => EM_ANDAMENTO
-- (antes a data era opcional; assim nenhum registro viola a nova regra).
UPDATE "candidate_course"
SET "course_status" = CASE
    WHEN "completed_at" IS NULL THEN 'EM_ANDAMENTO'::"course_status"
    ELSE 'CONCLUIDO'::"course_status"
END;

ALTER TABLE "candidate_course" ALTER COLUMN "course_status" SET NOT NULL;

-- CONCLUIDO exige data de conclusão; EM_ANDAMENTO: data opcional (previsão).
ALTER TABLE "candidate_course"
    ADD CONSTRAINT "chk_candidate_course_concluded_has_date" CHECK ("course_status" <> 'CONCLUIDO' OR "completed_at" IS NOT NULL);
