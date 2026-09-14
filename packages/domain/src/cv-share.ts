import type { ApplicationStatus } from "./application-status.js";

/**
 * The default email for sharing CVs. Admins can change it; these placeholders
 * are filled in: {job_title} {job_id} {count} {candidates} {sender_name}.
 * {candidates} becomes the summary table.
 */
export const DEFAULT_SHARE_TEMPLATE = {
  subject: "Profiles for {job_title} ({job_id}) – {count}",
  body: [
    "Hello,",
    "Please find {count} for the {job_title} ({job_id}) role. Their CVs are attached.",
    "{candidates}",
    "Let us know which profiles you would like to take forward.",
    "Regards,\n{sender_name}\nFINCLUST",
  ].join("\n\n"),
};

export interface ShareTemplate {
  subject: string;
  body: string;
}

export interface ShareCandidate {
  name: string;
  totalExperience: string | number | null;
  location: string | null;
  noticePeriod: string | null;
  expectedSalary: string | null;
}

const MOVES_ON_SHARE: ApplicationStatus[] = ["NEW", "SCREENING", "SHORTLISTED", "ON_HOLD"];

/** Where sharing a CV moves an Application, or null to leave it alone. */
export function stageAfterSharing(status: ApplicationStatus): ApplicationStatus | null {
  return MOVES_ON_SHARE.includes(status) ? "SENT_TO_CLIENT" : null;
}

// ponytail: a pragmatic shape check, not RFC 5322. Zoho rejects anything
// stranger, and that error is shown to the user.
const EMAIL = /^[^\s@,;<>]+@[^\s@,;<>]+\.[a-z]{2,}$/i;

export function parseEmailList(input: string) {
  const parts = [...new Set(input.split(/[\s,;]+/).map((p) => p.trim().toLowerCase()).filter(Boolean))];
  return { valid: parts.filter((p) => EMAIL.test(p)), invalid: parts.filter((p) => !EMAIL.test(p)) };
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const CELL = 'style="border:1px solid #d9d4c7;padding:6px 10px;text-align:left;vertical-align:top"';

function candidateTable(candidates: ShareCandidate[]) {
  const dash = (value: string | number | null) => (value === null || value === "" ? "–" : escapeHtml(String(value)));
  const head = ["#", "Name", "Experience", "Location", "Notice period", "Expected salary"]
    .map((h) => `<th ${CELL}>${h}</th>`)
    .join("");
  const rows = candidates
    .map((c, i) =>
      [
        String(i + 1),
        escapeHtml(c.name),
        c.totalExperience === null || c.totalExperience === "" ? "–" : `${escapeHtml(String(c.totalExperience))} yrs`,
        dash(c.location),
        dash(c.noticePeriod),
        dash(c.expectedSalary),
      ]
        .map((v) => `<td ${CELL}>${v}</td>`)
        .join(""),
    )
    .map((cells) => `<tr>${cells}</tr>`)
    .join("");
  return `<table style="border-collapse:collapse;font-size:14px"><thead><tr style="background:#f9f6ee">${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

export function buildShareEmail(
  template: ShareTemplate,
  job: { jobId: string; title: string },
  candidates: ShareCandidate[],
  senderName: string,
) {
  const count = `${candidates.length} candidate${candidates.length === 1 ? "" : "s"}`;
  const values: Record<string, string> = {
    job_title: job.title,
    job_id: job.jobId,
    count,
    sender_name: senderName,
  };
  const fill = (text: string, escape: (s: string) => string) =>
    text.replace(/\{(job_title|job_id|count|sender_name)\}/g, (_, key: string) => escape(values[key]));

  const table = candidateTable(candidates);
  let placedTable = false;
  const paragraphs = template.body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((paragraph) => {
      if (paragraph === "{candidates}") {
        placedTable = true;
        return table;
      }
      const html = fill(escapeHtml(paragraph), escapeHtml).replace(/\n/g, "<br>");
      if (!html.includes("{candidates}")) return `<p>${html}</p>`;
      placedTable = true;
      return `<p>${html.replace("{candidates}", `</p>${table}<p>`)}</p>`.replace("<p></p>", "");
    });
  if (!placedTable) paragraphs.push(table);

  return {
    subject: fill(template.subject, (s) => s).replace(/\s+/g, " ").trim(),
    html: paragraphs.join(""),
  };
}
