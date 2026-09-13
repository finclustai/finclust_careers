# 02 — Application status state machine

Status: ready-for-human
Blocked by: 01

The one piece of real domain logic. Pure function in `packages/domain`, no
imports from Prisma, NestJS or React. Written test-first.

`canTransition(from: ApplicationStatus, to: ApplicationStatus): boolean`

Legal paths from requirement section 22:

- New to Screening to Shortlisted to Interview to Selected to Offer to Joined
- Rejected is reachable from New, Screening, Shortlisted and Interview
- On Hold is reachable from Screening, and returns to Screening
- No skipping forward, no moving backward except On Hold returning to Screening

Tests cover every legal edge, a sample of illegal ones, self-transition, and
that the transition table stays exhaustive over the enum.

Consumed by the API before persisting a change and by the board to dim illegal
columns during a drag. Never reimplemented in either place.
