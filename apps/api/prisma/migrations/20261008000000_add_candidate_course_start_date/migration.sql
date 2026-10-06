-- Migration corretiva (as migrations anteriores já foram aplicadas e NÃO são
-- editadas). Adiciona a data de início (mês/ano) do curso complementar.
--
-- Opcional (aceita NULL): cursos existentes continuam válidos e nenhuma data é
-- preenchida artificialmente. Segue a convenção mês/ano: sempre dia 1.

ALTER TABLE "candidate_course" ADD COLUMN "start_date" DATE;

ALTER TABLE "candidate_course"
    ADD CONSTRAINT "chk_candidate_course_start_first_day" CHECK ("start_date" IS NULL OR EXTRACT(DAY FROM "start_date") = 1),
    -- Conclusão/previsão nunca anterior ao início (só vale quando ambas existem;
    -- um CHECK com resultado NULL é aceito).
    ADD CONSTRAINT "chk_candidate_course_period" CHECK ("start_date" IS NULL OR "completed_at" IS NULL OR "completed_at" >= "start_date");
