import { APPLICATION_STATUSES, type ApplicationStatus } from "@finclust/domain";

export { APPLICATION_STATUSES, type ApplicationStatus };
export { APPLICATION_SOURCES } from "@finclust/domain";
export { canTransition } from "@finclust/domain";

/**
 * Six of the nine stages carry no colour: on a board the column already states
 * the stage, so colour there would be redundant. Progression is shown by ink
 * density instead, turning green only once an Application is won.
 *
 * Every entry is ink-on-tint, so contrast passes without per-stage checking.
 */
export const STATUS_STYLE: Record<
  ApplicationStatus,
  { label: string; chip: string; well: string; dot: string }
> = {
  NEW: {
    label: "New",
    chip: "bg-paper border-ink",
    well: "bg-sand",
    dot: "bg-mid",
  },
  SCREENING: {
    label: "Screening",
    chip: "bg-sand border-ink",
    well: "bg-sand",
    dot: "bg-mid",
  },
  SHORTLISTED: {
    label: "Shortlisted",
    chip: "bg-line border-ink",
    well: "bg-sand",
    dot: "bg-body",
  },
  // Out with the client: further along than a shortlist, short of an interview.
  SENT_TO_CLIENT: {
    label: "Sent to client",
    chip: "bg-body text-paper border-ink",
    well: "bg-sand",
    dot: "bg-body",
  },
  INTERVIEW: {
    label: "Interview",
    chip: "bg-ink text-paper border-ink",
    well: "bg-sand",
    dot: "bg-ink",
  },
  SELECTED: {
    label: "Selected",
    chip: "bg-green-tint border-ink",
    well: "bg-green-tint/40",
    dot: "bg-green",
  },
  OFFER: {
    label: "Offer",
    chip: "bg-green-tint border-ink",
    well: "bg-green-tint/40",
    dot: "bg-green",
  },
  JOINED: {
    label: "Joined",
    chip: "bg-green border-ink",
    well: "bg-green-tint/60",
    dot: "bg-ink",
  },
  REJECTED: {
    label: "Rejected",
    chip: "bg-red-tint border-ink",
    well: "bg-red-tint/40",
    dot: "bg-red",
  },
  ON_HOLD: {
    // The only dashed border in the system. Paused work looks provisional,
    // which is what it is, and it costs no colour.
    label: "On hold",
    chip: "bg-paper border-ink border-dashed opacity-70",
    well: "bg-sand",
    dot: "bg-mid",
  },
};

export const SOURCE_LABEL: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  TELEGRAM: "Telegram",
  LINKEDIN: "LinkedIn",
  WEBSITE: "Website",
  REFERRAL: "Referral",
  OTHER: "Other",
};

export function relativeTime(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
