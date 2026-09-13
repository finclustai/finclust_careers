# Vercel and Supabase are the whole platform

Next.js and a NestJS API both deploy to Vercel; Supabase provides Postgres and
private object storage; Resend sends mail. The API is exposed through a Next.js
rewrite at `/api/*` rather than its own hostname, so the two deployments are
same-origin and the auth cookie works before a custom domain exists and
continues to work after one is bought.

## Considered Options

An always-on VPS running both processes was rejected for cost. A free
sleep-on-idle host was rejected because a ~50s cold start on the candidate-facing
apply form loses the candidate.

## Consequences

- Everything must fit serverless execution limits: no long-running jobs, no
  LibreOffice (ADR-0002), no in-process background work.
- **`connection_limit` is per runtime, not per project.** Serverless needs `1`,
  because many short-lived instances each hold their own pool and together they
  will exhaust the database. A long-running process needs roughly `10`: a pool
  of 1 serialises every query, so any page issuing parallel requests waits its
  way to the 10-second pool timeout. Local development and any container or VPS
  deployment therefore use `10`; only the Vercel environment sets `1`.
- Vercel's Hobby tier forbids commercial use and Supabase's free tier pauses an
  idle project after 7 days and caps storage at 1GB (~2,000 resumes). Both need
  paid tiers before this carries real hiring traffic.
