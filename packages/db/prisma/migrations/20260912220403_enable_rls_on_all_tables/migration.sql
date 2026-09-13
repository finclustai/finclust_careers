-- Enable RLS on every application table.
--
-- ADR-0007 describes two independent locks on the public schema: revoked
-- grants, and RLS denying by default. The first project happened to get RLS
-- for free because Supabase auto-enabled it on table creation; a project
-- created later did not, so the second lock was silently missing and the ADR
-- was describing something that was only true in one environment.
--
-- This costs nothing at runtime: the app connects as the table owner, and a
-- table owner bypasses RLS unless FORCE ROW LEVEL SECURITY is set, which it is
-- not. With no policies defined, any other role is denied everything.

ALTER TABLE "users"                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_profiles"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_openings"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "application_links"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "candidates"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "applications"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "resumes"                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "application_status_history" ENABLE ROW LEVEL SECURITY;
