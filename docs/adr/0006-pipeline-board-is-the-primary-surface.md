# The pipeline board is the primary surface, scoped to one Job Opening

> Partly superseded by ADR-0008: stage transitions are no longer restricted, so
> the dimming of illegal columns described below no longer applies.

Recruiters work a board of stage columns and drag an Application between them;
the cross-job table is the secondary view. A board is only ever rendered for a
**single Job Opening**, because pipeline stages are meaningless across vacancies
and an all-jobs board would accumulate thousands of cards.

## Considered Options

A dense table-first console was the cheaper build and scales further. It was
rejected because changing status there costs open-row-then-dropdown on every
candidate, where the board costs one drag.

## Consequences

- Status change must work without dragging. Every card carries a status control
  and columns are keyboard-reachable, so the board is operable by keyboard and
  screen reader.
- Legal transitions are enforced in the UI by the same pure `canTransition`
  function the API validates with, shared rather than reimplemented. Illegal
  columns dim during a drag and refuse the drop.
- Columns paginate at 50 cards. A vacancy with 800 applicants stays usable
  because the cross-job table, not the board, is where bulk work happens.
- Drops are optimistic and roll back visibly when the API rejects them.
