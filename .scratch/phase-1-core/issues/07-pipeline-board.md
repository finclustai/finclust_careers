# 07 — Pipeline board

Status: ready-for-human
Blocked by: 05, 02

The primary surface (ADR-0006). One Job Opening, nine stage columns, cards
dragged between them with `@dnd-kit`.

- Illegal columns dim to 40% and refuse the drop, driven by `canTransition`
- Every card also carries a status control, so drag is never the only path
- Keyboard drag works end to end
- Drops are optimistic and roll back visibly on failure
- Columns paginate at 50 cards
- Only the outcome columns carry a tint

`PUT /api/applications/:id/status` validates with the same `canTransition` and
writes a history row in the same transaction.
