-- CreateTable
CREATE TABLE "external_resource_category" (
    "category_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source" VARCHAR(50) NOT NULL,
    "external_code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(150) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_resource_category_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "external_resource_category_link" (
    "link_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resource_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_resource_category_link_pkey" PRIMARY KEY ("link_id")
);

-- CreateIndex
CREATE INDEX "idx_external_resource_category_source" ON "external_resource_category"("source");

-- CreateIndex
CREATE UNIQUE INDEX "external_resource_category_source_external_code_key" ON "external_resource_category"("source", "external_code");

-- CreateIndex
CREATE UNIQUE INDEX "external_resource_category_source_slug_key" ON "external_resource_category"("source", "slug");

-- CreateIndex
CREATE INDEX "idx_external_resource_category_link_resource_id" ON "external_resource_category_link"("resource_id");

-- CreateIndex
CREATE INDEX "idx_external_resource_category_link_category_id" ON "external_resource_category_link"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "external_resource_category_link_resource_id_category_id_key" ON "external_resource_category_link"("resource_id", "category_id");

-- AddForeignKey
ALTER TABLE "external_resource_category_link" ADD CONSTRAINT "fk_external_resource_category_link_resource" FOREIGN KEY ("resource_id") REFERENCES "external_learning_resource"("resource_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "external_resource_category_link" ADD CONSTRAINT "fk_external_resource_category_link_category" FOREIGN KEY ("category_id") REFERENCES "external_resource_category"("category_id") ON DELETE CASCADE ON UPDATE NO ACTION;
