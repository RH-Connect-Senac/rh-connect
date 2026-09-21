-- CreateTable
CREATE TABLE "external_learning_resource" (
    "resource_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source" VARCHAR(50) NOT NULL,
    "external_key" VARCHAR(128) NOT NULL,
    "title" VARCHAR(400) NOT NULL,
    "resource_type" VARCHAR(50) NOT NULL,
    "section" VARCHAR(200),
    "area" VARCHAR(120),
    "url" TEXT,
    "cover_url" TEXT,
    "direct_link_available" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_learning_resource_pkey" PRIMARY KEY ("resource_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "external_learning_resource_external_key_key" ON "external_learning_resource"("external_key");

-- CreateIndex
CREATE INDEX "idx_external_learning_resource_source" ON "external_learning_resource"("source");

-- CreateIndex
CREATE INDEX "idx_external_learning_resource_area" ON "external_learning_resource"("area");

-- CreateIndex
CREATE INDEX "idx_external_learning_resource_type" ON "external_learning_resource"("resource_type");

-- CreateIndex
CREATE INDEX "idx_external_learning_resource_active" ON "external_learning_resource"("is_active");
