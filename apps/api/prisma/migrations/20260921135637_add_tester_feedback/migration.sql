-- CreateTable
CREATE TABLE "tester_feedback" (
    "feedback_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "feature" VARCHAR(150) NOT NULL,
    "bug_found" TEXT,
    "steps_to_reproduce" TEXT,
    "improvement_suggestion" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tester_feedback_pkey" PRIMARY KEY ("feedback_id")
);

-- CreateIndex
CREATE INDEX "idx_tester_feedback_created_at" ON "tester_feedback"("created_at");
