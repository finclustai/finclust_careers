import type { ApplicationStatus } from "./application-status.js";

export type CandidateStage = "received" | "in_review" | "shortlisted" | "interview" | "selected" | "closed";

export interface CandidateStatusView {
  stage: CandidateStage;
  label: string;
  detail: string;
  tone: "neutral" | "positive" | "closed";
}

const VIEWS: Record<ApplicationStatus, CandidateStatusView> = {
  NEW: {
    stage: "received",
    label: "Application received",
    detail: "We have your CV. Our recruitment team will review it soon.",
    tone: "neutral",
  },
  SCREENING: {
    stage: "in_review",
    label: "Under review",
    detail: "A recruiter is reviewing your profile against the role.",
    tone: "neutral",
  },
  // An internal pause is not the candidate's concern and reads as a setback.
  ON_HOLD: {
    stage: "in_review",
    label: "Under review",
    detail: "A recruiter is reviewing your profile against the role.",
    tone: "neutral",
  },
  SHORTLISTED: {
    stage: "shortlisted",
    label: "Shortlisted",
    detail: "Your profile has been shortlisted. We will contact you about next steps.",
    tone: "neutral",
  },
  // Being put in front of a client is internal detail; to the candidate it is
  // still a shortlist.
  SENT_TO_CLIENT: {
    stage: "shortlisted",
    label: "Shortlisted",
    detail: "Your profile has been shortlisted. We will contact you about next steps.",
    tone: "neutral",
  },
  INTERVIEW: {
    stage: "interview",
    label: "Interview stage",
    detail: "You are in the interview stage. Watch for a message from our team.",
    tone: "neutral",
  },
  SELECTED: {
    stage: "selected",
    label: "Selected",
    detail: "Congratulations, you have been selected. Our team will be in touch.",
    tone: "positive",
  },
  OFFER: {
    stage: "selected",
    label: "Selected",
    detail: "Congratulations, you have been selected. Our team will be in touch.",
    tone: "positive",
  },
  JOINED: {
    stage: "selected",
    label: "Selected",
    detail: "Congratulations, you have been selected. Our team will be in touch.",
    tone: "positive",
  },
  REJECTED: {
    stage: "closed",
    label: "Not taken forward this time",
    detail:
      "Thank you for applying. We are not taking your application forward for this role, but we may contact you about future openings.",
    tone: "closed",
  },
};

/**
 * What a candidate sees when they check their status. Deliberately coarser than
 * the recruiter pipeline: internal distinctions such as on hold, offer and
 * joined mean nothing useful to a candidate and only prompt follow-up messages.
 */
export function candidateFacingStatus(status: ApplicationStatus): CandidateStatusView {
  return VIEWS[status];
}
