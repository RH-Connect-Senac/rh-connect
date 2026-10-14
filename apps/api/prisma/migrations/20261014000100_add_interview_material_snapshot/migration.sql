-- Snapshot imutável das recomendações de materiais por entrevista (R4).
-- Somente CRIA objetos novos: nenhuma tabela, coluna ou dado existente é alterado.
--
-- Decisões:
--   * 1 snapshot por entrevista (UNIQUE em interview_id). O cabeçalho existe
--     mesmo com lista vazia; é ele que torna a geração idempotente.
--   * Sem FK para external_learning_resource e sem resource_id: o item guarda
--     (source, material_ref) e a verdade histórica (título, tipo, área,
--     necessidade, tipo de correspondência e motivo). URL, capa e
--     disponibilidade são resolvidos na leitura, nunca copiados para cá.
--   * Sem updated_at: o snapshot não é editado depois de criado.
--   * ON DELETE CASCADE: apagar a entrevista (ou o snapshot) apaga os itens.
--   * resource_type_snapshot é VARCHAR sem lista de valores (conjunto aberto);
--     o CHECK só impede texto vazio.
--   * Sem índices extras: os UNIQUE já cobrem as buscas por entrevista e por
--     snapshot (ambos começam pela coluna consultada).

-- CreateTable
CREATE TABLE "interview_material_snapshot" (
    "snapshot_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "interview_id" UUID NOT NULL,
    "engine_version" VARCHAR(20) NOT NULL,
    "taxonomy_version" VARCHAR(40) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_material_snapshot_pkey" PRIMARY KEY ("snapshot_id")
);

-- CreateTable
CREATE TABLE "interview_material_recommendation" (
    "recommendation_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "snapshot_id" UUID NOT NULL,
    "position" SMALLINT NOT NULL,
    "source" VARCHAR(50) NOT NULL,
    "material_ref" VARCHAR(80) NOT NULL,
    "title_snapshot" VARCHAR(200) NOT NULL,
    "resource_type_snapshot" VARCHAR(30) NOT NULL,
    "area_snapshot" VARCHAR(20) NOT NULL,
    "matched_need" VARCHAR(40),
    "match_kind" VARCHAR(30) NOT NULL,
    "reason_snapshot" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_material_recommendation_pkey" PRIMARY KEY ("recommendation_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_interview_material_snapshot_interview" ON "interview_material_snapshot"("interview_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_interview_material_recommendation_position" ON "interview_material_recommendation"("snapshot_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "uq_interview_material_recommendation_ref" ON "interview_material_recommendation"("snapshot_id", "source", "material_ref");

-- AddForeignKey
ALTER TABLE "interview_material_snapshot" ADD CONSTRAINT "fk_interview_material_snapshot_interview" FOREIGN KEY ("interview_id") REFERENCES "interview"("interview_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "interview_material_recommendation" ADD CONSTRAINT "fk_interview_material_recommendation_snapshot" FOREIGN KEY ("snapshot_id") REFERENCES "interview_material_snapshot"("snapshot_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Constraints que o Prisma não expressa (CHECK).
ALTER TABLE "interview_material_recommendation"
    ADD CONSTRAINT "chk_interview_material_recommendation_position" CHECK ("position" >= 1),
    ADD CONSTRAINT "chk_interview_material_recommendation_match_kind" CHECK ("match_kind" IN ('primary', 'secondary', 'general_preparation')),
    ADD CONSTRAINT "chk_interview_material_recommendation_need_kind" CHECK (("match_kind" = 'general_preparation') = ("matched_need" IS NULL)),
    ADD CONSTRAINT "chk_interview_material_recommendation_type" CHECK (char_length(btrim("resource_type_snapshot")) > 0);
