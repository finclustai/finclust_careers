/**
 * Server-side calls go straight to the API. Browser calls go through the
 * Next.js rewrite at /api/* so they stay same-origin (ADR-0004).
 */
const SERVER_ORIGIN = process.env.API_ORIGIN ?? "http://127.0.0.1:3001";

type WorkMode = "ONSITE" | "HYBRID" | "REMOTE";
type EmploymentType = "FULL_TIME" | "CONTRACT" | "INTERNSHIP";

/** The fields every public job view shares: a card on the home page, a preview card. */
export interface PublicJob {
  jobId: string;
  title: string;
  client: string | null;
  location: string | null;
  workMode: WorkMode | null;
  employmentType: EmploymentType | null;
  minExperience: number | null;
  maxExperience: number | null;
  openedAt: string | null;
  closesAt: string | null;
  profile: { name: string };
}

export interface JobOpening extends PublicJob {
  description: string | null;
  requiredSkills: string[];
  candidateNoteEnabled: boolean;
  source: string;
}

export type OpeningResult =
  | { ok: true; job: JobOpening }
  | { ok: false; status: number; message: string };

export async function fetchOpening(jobId: string, source?: string): Promise<OpeningResult> {
  const query = source ? `?source=${encodeURIComponent(source)}` : "";
  const response = await fetch(
    `${SERVER_ORIGIN}/api/apply/${encodeURIComponent(jobId)}${query}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return {
      ok: false,
      status: response.status,
      message: body.message ?? "This opening could not be loaded.",
    };
  }
  return { ok: true, job: await response.json() };
}

/**
 * Open roles for the home page. Returns null when the roles could not be loaded,
 * which is deliberately different from an empty list: an API blip must never
 * tell a candidate "no open roles" when there are some.
 */
export async function fetchOpenJobs(): Promise<PublicJob[] | null> {
  try {
    const response = await fetch(`${SERVER_ORIGIN}/api/public/jobs`, {
      // At most one API call a minute across all visitors. The apply page
      // re-checks the specific job live, so a just-closed role cannot be applied to.
      next: { revalidate: 60 },
    });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

export function experienceBand(job: Pick<PublicJob, "minExperience" | "maxExperience">) {
  const { minExperience: min, maxExperience: max } = job;
  if (min !== null && max !== null) return `${min}–${max} years`;
  if (min !== null) return `${min}+ years`;
  if (max !== null) return `Up to ${max} years`;
  return null;
}

export const WORK_MODE_LABEL = {
  ONSITE: "On-site",
  HYBRID: "Hybrid",
  REMOTE: "Remote",
} as const;

export const EMPLOYMENT_LABEL = {
  FULL_TIME: "Full-time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
} as const;
