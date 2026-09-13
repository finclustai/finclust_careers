# 01 — Monorepo scaffold and Prisma schema

Status: ready-for-human

pnpm workspace with `apps/web` (Next.js), `apps/api` (NestJS), `packages/db`
(Prisma schema + client) and `packages/domain` (pure logic shared by both).

Schema covers the eight Phase 1 tables: users, job_profiles, job_openings,
application_links, candidates, applications, resumes, application_status_history.
Source is a Prisma enum, role is a Prisma enum, no lookup tables for either.

- `applications` carries `status`, `assigned_recruiter_id`, `application_reference`
- `job_openings` carries `application_counter` for reference generation
- unique on `(candidate_id, job_opening_id)` so re-application is idempotent
- indexes: `(status, job_opening_id, applied_at)`, and pg_trgm GIN on candidate name
- no hard deletes: `deleted_at` on candidates and applications

`apps/web` rewrites `/api/*` to the API deployment so the two are same-origin
(ADR-0004).
