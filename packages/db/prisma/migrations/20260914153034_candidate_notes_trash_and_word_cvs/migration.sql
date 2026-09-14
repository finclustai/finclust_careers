-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "candidate_note" TEXT;

-- AlterTable
ALTER TABLE "job_openings" ADD COLUMN     "candidate_note_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "resumes" ADD COLUMN     "mime_type" TEXT NOT NULL DEFAULT 'application/pdf';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "last_seen_applications_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "candidate_notes" (
    "id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "candidate_notes_candidate_id_created_at_idx" ON "candidate_notes"("candidate_id", "created_at");

-- AddForeignKey
ALTER TABLE "candidate_notes" ADD CONSTRAINT "candidate_notes_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_notes" ADD CONSTRAINT "candidate_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Every application table gets RLS (ADR-0007). With no policies it denies all
-- roles except the table owner the app connects as.
ALTER TABLE "candidate_notes" ENABLE ROW LEVEL SECURITY;
