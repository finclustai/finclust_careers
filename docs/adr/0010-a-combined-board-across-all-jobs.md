# A combined board across all jobs

Supersedes the single-job restriction in ADR-0006. Admins get a board showing
applications from every open job, alongside the existing per-job board, because
recruiters handling several vacancies need one place to see all movement.

## Consequences

- Each card on the combined board names its job, since the column no longer
  implies it.
- The combined board filters by job and searches by name or phone, and columns
  still page, so a large pipeline stays usable.
- The per-job board remains the focused view for working a single vacancy.
