export const APPLICATION_STATUSES = [
  "NEW",
  "SCREENING",
  "SHORTLISTED",
  "SENT_TO_CLIENT",
  "INTERVIEW",
  "SELECTED",
  "OFFER",
  "JOINED",
  "REJECTED",
  "ON_HOLD",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/**
 * An Application may move between any two stages, in either direction.
 *
 * This deliberately replaced a forward-only state machine. Recruitment has no
 * genuinely illegal states, only unusual ones: a candidate dragged into the
 * wrong column, or rejected by mistake, has to be recoverable. Forcing the
 * correction to travel back through every intermediate stage would write
 * history rows claiming transitions that never happened, which is worse for the
 * audit trail than the free movement it was trying to prevent.
 *
 * The one rule left is that a stage cannot transition to itself: that records a
 * change where nothing changed.
 *
 * Kept as a function rather than inlined so the rule lives in one place. The API
 * validates with it and the board offers destinations from it, so the two can
 * never disagree, and tightening it later is a single-file change.
 */
export function canTransition(from: ApplicationStatus, to: ApplicationStatus): boolean {
  return from !== to;
}
