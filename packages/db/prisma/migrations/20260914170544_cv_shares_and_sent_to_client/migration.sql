-- AlterEnum
ALTER TYPE "ApplicationStatus" ADD VALUE 'SENT_TO_CLIENT' BEFORE 'INTERVIEW';

-- CreateTable
CREATE TABLE "cv_shares" (
    "id" UUID NOT NULL,
    "job_opening_id" UUID NOT NULL,
    "to_addresses" TEXT[],
    "cc_addresses" TEXT[],
    "subject" TEXT NOT NULL,
    "zoho_message_id" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cv_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cv_share_items" (
    "share_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,

    CONSTRAINT "cv_share_items_pkey" PRIMARY KEY ("share_id","application_id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "cv_shares_created_at_idx" ON "cv_shares"("created_at");

-- CreateIndex
CREATE INDEX "cv_share_items_application_id_idx" ON "cv_share_items"("application_id");

-- AddForeignKey
ALTER TABLE "cv_shares" ADD CONSTRAINT "cv_shares_job_opening_id_fkey" FOREIGN KEY ("job_opening_id") REFERENCES "job_openings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv_shares" ADD CONSTRAINT "cv_shares_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv_share_items" ADD CONSTRAINT "cv_share_items_share_id_fkey" FOREIGN KEY ("share_id") REFERENCES "cv_shares"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv_share_items" ADD CONSTRAINT "cv_share_items_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Same lock-down as every other table (ADR-0007): the app reaches these only
-- through the API, never through PostgREST.
ALTER TABLE "cv_shares" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cv_share_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;
