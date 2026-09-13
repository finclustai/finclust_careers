# The public schema is not exposed via PostgREST

Supabase grants `anon` and `authenticated` full privileges on every new table in
`public` and serves that schema over PostgREST. Verified live: before the fix,
`GET /rest/v1/candidates` with the publishable key returned **HTTP 200**. Only
the absence of an RLS policy kept the rows back. We revoked all table, sequence
and function privileges from both roles and altered default privileges so future
migrations cannot re-grant. The same request now returns **HTTP 401**.

## Consequences

- Nothing may be built on PostgREST or `supabase-js` data access. Every read and
  write goes through the NestJS API over Prisma, as the table owner.
- RLS is enabled by migration, not left to chance. Supabase auto-enabled it on
  our first project but not on a later one, so the "second lock" was real in one
  environment and absent in another. `enable_rls_on_all_tables` makes it explicit
  everywhere. Neither protection is load-bearing alone: a permissive policy added
  later cannot expose anything while the grants are gone, and the grants cannot
  expose anything while RLS denies by default.
- Enabling RLS costs the app nothing: it connects as the table owner, and an
  owner bypasses RLS unless FORCE ROW LEVEL SECURITY is set, which it is not.
- Supabase Storage is unaffected — it has its own privilege model, and resume
  access stays on short-lived signed URLs minted by the API (ADR-0003).
