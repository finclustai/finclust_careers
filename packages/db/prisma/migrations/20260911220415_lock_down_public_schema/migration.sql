-- Revoke PostgREST access to every application table.
--
-- Supabase grants anon and authenticated full privileges on new tables in the
-- public schema, and exposes that schema over PostgREST. Our tables are reached
-- only by Prisma over a direct Postgres connection as the table owner, so those
-- roles need nothing. Without this, the sole barrier between the internet and
-- every Candidate's phone, email and Resume path is the absence of an RLS
-- policy -- one permissive policy added later would expose all of it.
--
-- Defence in depth: RLS stays enabled (deny-by-default) AND the grants go.

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

-- Stop future Prisma migrations from re-granting. Applies to objects created by
-- the role running migrations, which is the role executing this statement.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
