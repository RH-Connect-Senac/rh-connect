-- Limite editorial do título de material externo: VARCHAR(400) -> VARCHAR(200).
-- Maior título atual dos seeds (Cachola e Orango): 103 caracteres.
--
-- NÃO trunca nada: se existir título com mais de 200 caracteres, a migration
-- ABORTA antes do ALTER, listando os casos (até 20), sem tocar em nenhuma linha.
-- Corrija os dados manualmente e rode a migration de novo. A contagem é em
-- caracteres (char_length), a mesma unidade do VARCHAR(n).
DO $$
DECLARE
    total_too_long INTEGER;
    sample TEXT;
BEGIN
    SELECT COUNT(*)
      INTO total_too_long
      FROM "external_learning_resource"
     WHERE char_length("title") > 200;

    IF total_too_long > 0 THEN
        SELECT string_agg(
                   "source" || ':' || "external_key" || ' (' || char_length("title") || ' caracteres)',
                   ', '
                   ORDER BY char_length("title") DESC, "external_key"
               )
          INTO sample
          FROM (
              SELECT "source", "external_key", "title"
                FROM "external_learning_resource"
               WHERE char_length("title") > 200
               ORDER BY char_length("title") DESC, "external_key"
               LIMIT 20
          ) AS longest;

        RAISE EXCEPTION 'Existem % recurso(s) externo(s) com título acima de 200 caracteres (até 20 listados): %. Corrija os dados manualmente antes de aplicar esta migration.', total_too_long, sample;
    END IF;
END $$;

-- AlterTable
ALTER TABLE "external_learning_resource" ALTER COLUMN "title" SET DATA TYPE VARCHAR(200);
