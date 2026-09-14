export interface PostableJob {
  title: string;
  client: string | null;
  location: string | null;
  workMode: "ONSITE" | "HYBRID" | "REMOTE" | null;
  employmentType: "FULL_TIME" | "CONTRACT" | "INTERNSHIP" | null;
  minExperience: number | null;
  maxExperience: number | null;
  openings: number;
  requiredSkills: string[];
  description: string | null;
}

const WORK_MODE = { ONSITE: "On-site", HYBRID: "Hybrid", REMOTE: "Remote" } as const;
const EMPLOYMENT = { FULL_TIME: "Full-time", CONTRACT: "Contract", INTERNSHIP: "Internship" } as const;
const ABOUT_MAX = 300;

/**
 * The post a recruiter pastes into WhatsApp groups (ADR-0005). Written to read
 * like a person wrote it, with only the facts the job actually has.
 *
 * The client is deliberately never named: it invites candidates and other
 * agencies to approach the client directly.
 */
export function buildWhatsappPost(job: PostableJob, applyUrl: string): string {
  const facts: string[] = [];
  const mode = job.workMode ? WORK_MODE[job.workMode] : null;
  const where = job.location ? `${job.location}${mode ? ` (${mode})` : ""}` : mode;
  if (where) facts.push(`*Location:* ${where}`);
  const experience = experienceBand(job.minExperience, job.maxExperience);
  if (experience) facts.push(`*Experience:* ${experience}`);
  if (job.employmentType) facts.push(`*Employment:* ${EMPLOYMENT[job.employmentType]}`);
  if (job.openings > 1) facts.push(`*Openings:* ${job.openings}`);
  if (job.requiredSkills.length) facts.push(`*Key skills:* ${job.requiredSkills.join(", ")}`);

  const about = summarise(job.description);

  return [
    `Hello everyone,\n\nFINCLUST is hiring for the role of\n*${job.title}*`,
    facts.join("\n"),
    about && `*About the role*\n${about}`,
    `If you are interested, apply here with your CV (takes about a minute):\n${applyUrl}`,
    "Know someone who fits? Please share this post.",
    "Regards,\nFINCLUST Recruitment",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function experienceBand(min: number | null, max: number | null): string | null {
  if (min !== null && max !== null) return `${min}-${max} years`;
  if (min !== null) return `${min}+ years`;
  if (max !== null) return `up to ${max} years`;
  return null;
}

/** The description as one short paragraph: list items become sentences. */
function summarise(description: string | null): string | null {
  if (!description?.trim()) return null;
  const text = description
    .split("\n")
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim())
    .filter(Boolean)
    .map((line) => (/[.!?:;]$/.test(line) ? line : `${line}.`))
    .join(" ");
  if (text.length <= ABOUT_MAX) return text;
  const cut = text.slice(0, ABOUT_MAX);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s.,;:]+$/, "")}…`;
}
