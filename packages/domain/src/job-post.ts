import type { ApplicationSource } from "./application-source.js";

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
 * The post recruiters paste into WhatsApp and Telegram groups (ADR-0005). A job
 * can save its own version; the facts stay as fill-ins, so editing the job
 * updates the post. Fill-ins: {title} {location} {experience} {employment}
 * {openings} {skills} {about} {link}.
 *
 * The client is deliberately not a fill-in: naming them invites candidates and
 * other agencies to approach the client directly.
 */
export const DEFAULT_JOB_POST = [
  "Hello everyone,",
  "FINCLUST is hiring for the role of\n*{title}*",
  "*Location:* {location}\n*Experience:* {experience}\n*Employment:* {employment}\n*Openings:* {openings}\n*Key skills:* {skills}",
  "*About the role*\n{about}",
  "If you are interested, apply here with your CV (takes about a minute):\n{link}",
  "Know someone who fits? Please share this post.",
  "Regards,\nFINCLUST Recruitment",
].join("\n\n");

/**
 * The starting post for a channel. Only WhatsApp renders *stars* as bold;
 * everywhere else they would show literally, so the others start plain.
 */
export function defaultPostFor(source: ApplicationSource): string {
  return source === "WHATSAPP" ? DEFAULT_JOB_POST : DEFAULT_JOB_POST.replace(/\*/g, "");
}

const PLACEHOLDER = /\{(title|location|experience|employment|openings|skills|about|link)\}/g;
const HAS_PLACEHOLDER = new RegExp(PLACEHOLDER.source);

/**
 * Fills a post template. A line whose fact the job lacks is dropped, and a
 * paragraph whose facts are all missing is dropped whole, so a sparse job
 * never shows "Location: " or an empty "About the role".
 */
export function buildJobPost(job: PostableJob, applyUrl: string, template?: string | null): string {
  const mode = job.workMode ? WORK_MODE[job.workMode] : null;
  const values: Record<string, string> = {
    title: job.title,
    location: job.location ? `${job.location}${mode ? ` (${mode})` : ""}` : (mode ?? ""),
    experience: experienceBand(job.minExperience, job.maxExperience) ?? "",
    employment: job.employmentType ? EMPLOYMENT[job.employmentType] : "",
    openings: job.openings > 1 ? String(job.openings) : "",
    skills: job.requiredSkills.join(", "),
    about: summarise(job.description) ?? "",
    link: applyUrl,
  };

  return (template?.trim() ? template : DEFAULT_JOB_POST)
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((paragraph) => {
      const lines = paragraph.split("\n").filter((line) => {
        const keys = [...line.matchAll(PLACEHOLDER)].map((m) => m[1]);
        return keys.every((key) => values[key] !== "");
      });
      if (HAS_PLACEHOLDER.test(paragraph) && !lines.some((line) => HAS_PLACEHOLDER.test(line))) return "";
      return lines.map((line) => line.replace(PLACEHOLDER, (_, key: string) => values[key])).join("\n");
    })
    .filter((paragraph) => paragraph.trim() !== "")
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
