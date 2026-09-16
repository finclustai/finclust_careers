-- Every job that already has application links gets a Telegram one too.
-- A separate migration: Postgres cannot use an enum value in the same
-- transaction that added it.
INSERT INTO "application_links" ("id", "job_opening_id", "source")
SELECT gen_random_uuid(), "job_opening_id", 'TELEGRAM'
FROM "application_links"
GROUP BY "job_opening_id"
ON CONFLICT ("job_opening_id", "source") DO NOTHING;
