# Phase 1 — Core vertical slice

Status: ready-for-agent

## Goal

One Application travels the full path end to end: an Admin creates a Job Opening,
shares its Application Link, a Candidate applies from a phone with a PDF Resume,
receives an Application Reference, and a Recruiter moves that Application across
the pipeline board and downloads the Resume.

Vocabulary is defined in `CONTEXT.md`. Decisions are in `docs/adr/`. Visual rules
are in `design-system/finclust/MASTER.md`.

## In scope

- Admin login, two roles: `ADMIN`, `RECRUITER`
- Job Opening create, edit, list, close
- Application Link per Job Opening and per Source, with click counting
- Public apply form, mobile-first, PDF Resume upload
- Application Reference generation and success screen
- Pipeline board for one Job Opening, drag plus keyboard
- Cross-job Applications table with search and combinable filters
- Application detail with Resume download
- Status changes recorded to history

## Out of scope

Everything in Phase 2 and 3 of the requirement document: WhatsApp sending
(ADR-0005), email of any kind, Excel export, bulk operations, charts, reports,
link analytics, Resume versions, notes, duplicate merging, audit log UI, AI
parsing. Resume format conversion is out permanently (ADR-0002).

## Acceptance

1. An Admin creates a Job Opening and gets an Application Link per Source.
2. Opening that link records a click and shows the job on a phone at 375px.
3. A Candidate submits name, mobile, profile and a PDF, and never types a Job ID.
4. A non-PDF upload, or one over 10MB, is refused with a message stating the fix.
5. Submission returns an Application Reference of the form `FIN-<JOB_ID>-NNNNNN`.
6. Re-submitting to the same Job Opening returns the same Reference, not a duplicate.
7. The Application appears on that job's board in the New column with no manual entry.
8. Dragging a card to a legal column persists; an illegal column refuses the drop.
9. The same move is achievable by keyboard alone.
10. Every status change writes previous status, new status, user and timestamp.
11. The cross-job table filters by job, source, status and date range, combinable.
12. A Recruiter downloads the original PDF through a short-lived signed URL.
13. A Recruiter sees only Applications assigned to them; an Admin sees all.
14. Resume bytes never pass through the API (ADR-0003).

## Non-negotiables

- `canTransition` is a pure function, shared by API and UI, tested without a database.
- Public apply endpoint is rate limited and validated with `forbidNonWhitelisted`.
- Supabase service-role key never reaches the browser bundle.
- Prisma connects through the Supavisor transaction pooler, `connection_limit=1`.
- No hard deletes on Candidate or Application.
