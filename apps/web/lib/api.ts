/**
 * Server-side calls go straight to the API. Browser calls go through the
 * Next.js rewrite at /api/* so they stay same-origin (ADR-0004).
 */
const SERVER_ORIGIN = process.env.API_ORIGIN ?? "http://127.0.0.1:3001";

export interface JobOpening {
  jobId: string;
  title: string;
  description: string | null;
  client: string | null;
  location: string | null;
  workMode: "ONSITE" | "HYBRID" | "REMOTE" | null;
  employmentType: "FULL_TIME" | "CONTRACT" | "INTERNSHIP" | null;
  minExperience: number | null;
  maxExperience: number | null;
  requiredSkills: string[];
  closesAt: string | null;
  profile: { name: string };
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

export function experienceBand(job: Pick<JobOpening, "minExperience" | "maxExperience">) {
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
