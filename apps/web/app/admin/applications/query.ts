import type { ApplicationStatus } from "@/lib/status";

const FILTER_KEYS = [
  "jobOpeningId", "profileId", "recruiterId", "status", "source",
  "appliedFrom", "appliedTo", "search", "page",
] as const;

/** The API query for the list, from whatever is in the address bar. */
export function filterQuery(read: (key: string) => string | null | undefined): string {
  const query = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = read(key);
    if (value) query.set(key, value);
  }
  return query.toString();
}

export interface Row {
  id: string;
  applicationReference: string;
  status: ApplicationStatus;
  source: string;
  appliedAt: string;
  candidate: { id: string; name: string; phone: string; location: string | null; totalExperience: string | number | null };
  assignedRecruiter: { id: string; name: string } | null;
  jobOpening: { id: string; jobId: string; title: string };
}

export interface ResultsPage {
  items: Row[];
  total: number;
  page: number;
  pageSize: number;
}
