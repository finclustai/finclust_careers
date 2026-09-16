-- AlterTable
ALTER TABLE "job_openings" ADD COLUMN     "share_messages" JSONB NOT NULL DEFAULT '{}';

-- A post saved before channels were separate applied to WhatsApp and Telegram.
UPDATE "job_openings"
SET "share_messages" = jsonb_build_object('WHATSAPP', "share_message", 'TELEGRAM', "share_message")
WHERE "share_message" IS NOT NULL;
