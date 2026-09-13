# An Application may move between any two stages

Supersedes the forward-only pipeline in ADR-0006. `canTransition` now permits
every pair except a stage to itself, in both directions, with no skipping rule.

Recruitment has no genuinely illegal states, only unusual ones. A candidate
dropped in the wrong column, or rejected by mistake, has to be recoverable by
the recruiter who did it. Forcing that correction back through every
intermediate stage writes history rows claiming transitions that never happened
-- worse for the audit trail than the free movement the rule was protecting.

## Consequences

- Board columns no longer dim during a drag; every column accepts every card
  except the one it came from. The dimming behaviour described in ADR-0006 is
  withdrawn.
- The status dropdown on a card lists all nine stages minus the current one.
- History becomes the only safeguard, so it matters more, not less: every move
  still records previous status, new status, who and when, in the same
  transaction as the change.
- `canTransition` is kept rather than inlined. It is trivial now, but it is the
  single place the rule lives, and reintroducing any restriction is a one-file
  change rather than a hunt through the API and the UI.
