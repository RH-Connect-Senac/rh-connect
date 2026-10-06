-- Migration corretiva (a 20261006200000_add_candidate_professional_profile já
-- foi aplicada e NÃO é editada). Alinha o banco às regras finais (rígidas) do
-- Fluxo 02 para formação acadêmica. Experiência profissional não muda: as
-- constraints originais já exigem término quando is_current = false.
--
-- Formação: nível, situação, instituição e início obrigatórios (já são NOT NULL).
--   - degree: obrigatório, exceto em ENSINO_FUNDAMENTAL e ENSINO_MEDIO;
--   - end_date: obrigatório quando CONCLUIDO, vazio quando EM_ANDAMENTO,
--     nunca anterior ao início (chk_candidate_education_period, já existente).
--
-- ATENÇÃO: registros de teste já existentes que violem as novas regras
-- (CONCLUIDO sem término) farão a migration falhar; corrija-os ou limpe o
-- banco de desenvolvimento antes de aplicar.

-- degree passa a aceitar NULL (opcional no Ensino Fundamental/Médio).
ALTER TABLE "candidate_education"
    ALTER COLUMN "degree" DROP NOT NULL;

-- Se informado, degree não pode ser vazio.
ALTER TABLE "candidate_education"
    DROP CONSTRAINT "chk_candidate_education_degree_not_blank";

-- Formação EM_ANDAMENTO não tem data de conclusão. Antes a API aceitava uma
-- "previsão" de conclusão; esse valor é limpo aqui (só afeta registros
-- EM_ANDAMENTO com end_date preenchido).
UPDATE "candidate_education"
SET "end_date" = NULL
WHERE "education_status" = 'EM_ANDAMENTO' AND "end_date" IS NOT NULL;

ALTER TABLE "candidate_education"
    ADD CONSTRAINT "chk_candidate_education_degree_not_blank" CHECK ("degree" IS NULL OR char_length(btrim("degree")) > 0),
    ADD CONSTRAINT "chk_candidate_education_degree_required_by_level" CHECK (
        "academic_level" IN ('ENSINO_FUNDAMENTAL', 'ENSINO_MEDIO')
        OR "degree" IS NOT NULL
    ),
    ADD CONSTRAINT "chk_candidate_education_in_progress_no_end" CHECK ("education_status" <> 'EM_ANDAMENTO' OR "end_date" IS NULL),
    ADD CONSTRAINT "chk_candidate_education_concluded_has_end" CHECK ("education_status" <> 'CONCLUIDO' OR "end_date" IS NOT NULL);
