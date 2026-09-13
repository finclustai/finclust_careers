-- Public links are /apply/<job_id>?source=<source>, per requirement section 9.
-- The (job_opening_id, source) unique constraint is already the link's identity,
-- so the slug column carried no information.
DROP INDEX IF EXISTS "application_links_slug_key";
ALTER TABLE "application_links" DROP COLUMN IF EXISTS "slug";
