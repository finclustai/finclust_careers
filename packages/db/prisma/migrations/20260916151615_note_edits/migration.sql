-- AlterTable
ALTER TABLE "candidate_notes" ADD COLUMN     "edited_at" TIMESTAMP(3),
ADD COLUMN     "edited_by" UUID;

-- AddForeignKey
ALTER TABLE "candidate_notes" ADD CONSTRAINT "candidate_notes_edited_by_fkey" FOREIGN KEY ("edited_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
