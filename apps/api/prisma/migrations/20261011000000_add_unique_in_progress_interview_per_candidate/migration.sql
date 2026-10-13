-- Regra de produto V1: um candidato tem NO MÁXIMO UMA entrevista IN_PROGRESS.
-- Aditiva: só cria um índice único PARCIAL. Nenhum dado é alterado ou apagado.
--
-- ATENÇÃO: se já existir candidato com mais de uma IN_PROGRESS (ex.: bancos de
-- desenvolvimento com entrevistas de teste), a migration ABORTA com a lista dos
-- candidatos afetados, sem tocar em nenhuma linha. Normalize manualmente antes
-- (listar com a consulta de diagnóstico do relatório) e rode a migration de novo.
DO $$
DECLARE
    duplicated TEXT;
BEGIN
    SELECT string_agg(candidate_user_id::TEXT || ' (' || total || ' IN_PROGRESS)', ', ')
      INTO duplicated
      FROM (
          SELECT candidate_user_id, COUNT(*) AS total
            FROM "interview"
           WHERE "status" = 'IN_PROGRESS'
           GROUP BY candidate_user_id
          HAVING COUNT(*) > 1
      ) AS dup;

    IF duplicated IS NOT NULL THEN
        RAISE EXCEPTION 'Existem candidatos com mais de uma entrevista IN_PROGRESS: %. Normalize os dados manualmente antes de aplicar esta migration.', duplicated;
    END IF;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX "uq_interview_one_in_progress_per_candidate"
    ON "interview"("candidate_user_id")
    WHERE "status" = 'IN_PROGRESS';
