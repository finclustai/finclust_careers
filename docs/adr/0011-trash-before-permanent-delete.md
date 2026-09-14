# Trash before permanent delete

Candidates and job openings can be deleted. Delete moves the record to Trash by
setting `deleted_at`; it disappears from every screen and can be restored. Only
an admin can then delete permanently, which erases the rows and the CV files.

The two steps exist for different reasons. Trash makes a mis-click recoverable.
Permanent delete makes it possible to honour a person's request to have their
data removed, which a hide-only design cannot.

## Consequences

- Every list and lookup excludes rows with `deleted_at` set.
- Trashing a job hides its applications with it, and restoring brings them back.
  A trashed job's links tell candidates the opening is closed.
- Permanent delete removes status history, resumes and their storage objects,
  and notes, in one transaction. A candidate is removed only when they have no
  remaining applications.
