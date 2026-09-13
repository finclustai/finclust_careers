# 10 — Deploy

Status: ready-for-agent
Blocked by: 06, 07, 08, 09

Two Vercel projects from the one repo, web rewriting `/api/*` to the API.
Supabase migrations run against the direct connection; the app connects through
the Supavisor transaction pooler with `connection_limit=1` (ADR-0004).

Service-role key set on the API project only. Verify no `NEXT_PUBLIC_` variable
carries a secret. Walk the section 42 end-to-end flow on a real phone.
