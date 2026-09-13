/**
 * Creates demo jobs and candidates by driving the real HTTP API, including
 * genuine PDF uploads straight to storage. Nothing is written to the database
 * directly, so a clean run is also proof that the whole path works: auth, job
 * creation, link generation, signed uploads, the PDF signature check, phone
 * normalisation, reference generation and status transitions.
 *
 *   pnpm dev        # in one terminal
 *   pnpm seed:demo  # in another
 */
import { readFileSync } from "node:fs";

const BASE = process.env.BASE ?? "http://127.0.0.1:3000";
const env = readFileSync(".env", "utf8");
// Credentials come from .env only; the repository is public.
const ADMIN_EMAIL = /^SEED_ADMIN_EMAIL="?(.*?)"?$/m.exec(env)?.[1];
const ADMIN_PASSWORD = /^SEED_ADMIN_PASSWORD="?(.*?)"?$/m.exec(env)?.[1];
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env first.");
  process.exit(1);
}

let cookie = "";
const pass = [];
const fail = [];

function check(label, ok, detail = "") {
  (ok ? pass : fail).push(label);
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
}

async function api(path, options = {}) {
  const response = await fetch(BASE + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}), ...options.headers },
  });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: response.status, body };
}

/** A small but genuinely valid single-page PDF. */
function pdfBytes(name) {
  const text = `FINCLUST demo CV - ${name}`;
  const body = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length ${text.length + 44}>>stream
BT /F1 18 Tf 60 760 Td (${text}) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>
%%EOF
`;
  return new Uint8Array(Buffer.from(body, "latin1"));
}

async function apply(jobId, source, candidate) {
  // Strip the fixture's own bookkeeping fields: the API rejects unknown
  // properties outright, which is exactly what stops a candidate posting
  // their own status.
  const { jobId: _j, source: _s, slug, ...payload } = candidate;
  const ticket = await api(`/api/apply/${jobId}/upload-url`, {
    method: "POST",
    body: JSON.stringify({ fileName: `${slug}.pdf` }),
  });
  if (ticket.status !== 200) return { status: ticket.status, body: ticket.body };

  const put = await fetch(ticket.body.signedUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/pdf" },
    body: pdfBytes(candidate.fullName),
  });
  if (!put.ok) return { status: put.status, body: "upload failed" };

  return api(`/api/apply/${jobId}?source=${source}`, {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      resumePath: ticket.body.path,
      resumeFileName: `${slug}.pdf`,
    }),
  });
}

// ── 1. Sign in ─────────────────────────────────────────────────────────────
console.log("\nSigning in");
const login = await api("/api/auth/login", {
  method: "POST",
  body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
});
check("admin login", login.status === 200, `HTTP ${login.status}`);
if (login.status !== 200) process.exit(1);

// ── 2. Job profiles ────────────────────────────────────────────────────────
const profiles = (await api("/api/job-profiles")).body;
const profileByName = Object.fromEntries(profiles.map((p) => [p.name, p.id]));
check("job profiles seeded", profiles.length >= 2, `${profiles.length} profiles`);

// ── 3. Two jobs ────────────────────────────────────────────────────────────
console.log("\nCreating jobs");
const JOBS = [
  {
    jobId: "EBS-FIN-001",
    title: "Oracle EBS Finance Consultant",
    profileId: profileByName["Oracle EBS Finance"],
    client: "Gulf Energy",
    location: "Bengaluru",
    workMode: "HYBRID",
    employmentType: "FULL_TIME",
    minExperience: 6,
    maxExperience: 10,
    openings: 3,
    requiredSkills: ["Oracle EBS", "General Ledger", "Accounts Payable", "R12"],
    description:
      "Implementation and support for Oracle EBS R12 Financials across GL, AP and AR.\nClient-facing role with occasional travel to Gulf sites.",
  },
  {
    jobId: "FUS-SCM-002",
    title: "Oracle Fusion SCM Functional Lead",
    profileId: profileByName["Oracle Fusion Finance"] ?? profiles[0].id,
    client: "Meridian Logistics",
    location: "Hyderabad",
    workMode: "REMOTE",
    employmentType: "CONTRACT",
    minExperience: 8,
    maxExperience: 14,
    openings: 1,
    requiredSkills: ["Oracle Fusion", "SCM", "Inventory", "Procurement"],
    description:
      "Lead the SCM workstream on a Fusion Cloud rollout.\nOwns requirement workshops, CRP cycles and cutover.",
  },
];

const created = [];
for (const job of JOBS) {
  const made = await api("/api/jobs", { method: "POST", body: JSON.stringify(job) });
  check(`create ${job.jobId}`, made.status === 201, `HTTP ${made.status}`);
  if (made.status !== 201) continue;
  const activated = await api(`/api/jobs/${made.body.id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status: "ACTIVE" }),
  });
  check(`activate ${job.jobId}`, activated.status === 200, `${activated.body.applicationLinks?.length ?? 0} links`);
  created.push({ ...job, id: made.body.id });
}

// ── 4. Candidates ──────────────────────────────────────────────────────────
console.log("\nSubmitting applications");
const CANDIDATES = [
  { jobId: "EBS-FIN-001", source: "whatsapp", slug: "priya-nair",
    fullName: "Priya Nair", phone: "+91 98765 43210", email: "priya.nair@example.com",
    location: "Bengaluru", totalExperience: 8, currentCompany: "Infosys",
    noticePeriod: "60 days", expectedSalary: "24 LPA", whatsappOptIn: true },
  { jobId: "EBS-FIN-001", source: "linkedin", slug: "rahul-menon",
    fullName: "Rahul Menon", phone: "9988776655", email: "rahul.menon@example.com",
    location: "Hyderabad", totalExperience: 6, currentCompany: "TCS",
    noticePeriod: "30 days", whatsappOptIn: false },
  { jobId: "EBS-FIN-001", source: "referral", slug: "asha-pillai",
    fullName: "Asha Pillai", phone: "09000011111", email: "asha.pillai@example.com",
    location: "Pune", totalExperience: 11, currentCompany: "Accenture",
    expectedSalary: "32 LPA", whatsappOptIn: true },
  { jobId: "FUS-SCM-002", source: "whatsapp", slug: "vikram-rao",
    fullName: "Vikram Rao", phone: "+919440012345", email: "vikram.rao@example.com",
    location: "Hyderabad", totalExperience: 12, currentCompany: "Deloitte",
    noticePeriod: "Immediate", whatsappOptIn: true },
  { jobId: "FUS-SCM-002", source: "website", slug: "meera-krishnan",
    fullName: "Meera Krishnan", phone: "9812345678", email: "meera.k@example.com",
    location: "Chennai", totalExperience: 9, currentCompany: "Capgemini",
    whatsappOptIn: false },
];

const references = {};
for (const c of CANDIDATES) {
  const result = await apply(c.jobId, c.source, c);
  const ok = result.status === 201 && !result.body.alreadyApplied;
  const why = Array.isArray(result.body?.message) ? result.body.message[0] : result.body?.message;
  check(`apply ${c.fullName} -> ${c.jobId}`, ok,
    result.body.applicationReference ?? `HTTP ${result.status} ${why ?? ""}`);
  if (ok) references[c.fullName] = result.body.applicationReference;
}

// ── 5. Behaviours worth proving ────────────────────────────────────────────
console.log("\nChecking behaviour");

const dup = await apply("EBS-FIN-001", "whatsapp", {
  ...CANDIDATES[0], phone: "098765 43210", slug: "priya-again",
});
check(
  "same person, different phone format, returns the same reference",
  dup.body.alreadyApplied === true && dup.body.applicationReference === references["Priya Nair"],
  dup.body.applicationReference,
);

const badPhone = await apply("EBS-FIN-001", "whatsapp", {
  ...CANDIDATES[1], phone: "5876543210", slug: "bad-phone",
});
check("invalid mobile is refused", badPhone.status === 400,
  badPhone.status === 429 ? "HTTP 429 - rate limited, not a real result" : `HTTP ${badPhone.status}`);

// ── 6. Move some through the pipeline ──────────────────────────────────────
console.log("\nMoving applications through stages");
const list = (await api("/api/applications?pageSize=50")).body.items;
const byName = Object.fromEntries(list.map((a) => [a.candidate.name, a]));

const MOVES = [
  ["Priya Nair", ["SCREENING", "SHORTLISTED", "INTERVIEW", "SELECTED"]],
  ["Asha Pillai", ["SCREENING", "SHORTLISTED"]],
  ["Rahul Menon", ["SCREENING", "REJECTED"]],
  ["Vikram Rao", ["SCREENING", "SHORTLISTED", "INTERVIEW"]],
];
for (const [name, stages] of MOVES) {
  const app = byName[name];
  if (!app) { check(`move ${name}`, false, "not found"); continue; }
  let ok = true;
  for (const status of stages) {
    const r = await api(`/api/applications/${app.id}/status`, {
      method: "PUT", body: JSON.stringify({ status }),
    });
    if (r.status !== 200) ok = false;
  }
  check(`move ${name} to ${stages.at(-1)}`, ok, stages.join(" → "));
}

// ── 7. Verify everything reads back ────────────────────────────────────────
console.log("\nVerifying");
const jobsList = (await api("/api/jobs")).body;
check("jobs list", jobsList.items?.length === 2, `${jobsList.items?.length} jobs`);

const board = (await api(`/api/applications/board/${created[0].id}`)).body;
check("board loads", Array.isArray(board.cards), `${board.cards?.length} cards, counts ${JSON.stringify(board.counts)}`);

const priya = byName["Priya Nair"];
if (!priya) {
  console.log("\n  Priya Nair was not created; skipping the detail checks.");
  console.log(`\n${pass.length} passed, ${fail.length} failed`);
  process.exit(1);
}
const detail = (await api(`/api/applications/${priya.id}`)).body;
check("detail has history", detail.statusHistory?.length === 4, `${detail.statusHistory?.length} entries`);
check("detail has resume", Boolean(detail.resume), detail.resume?.originalFileName);

const urls = (await api(`/api/applications/${priya.id}/resume-url`)).body;
check("resume urls minted", Boolean(urls.previewUrl && urls.downloadUrl));

const preview = await fetch(urls.previewUrl);
const head = Buffer.from(await preview.clone().arrayBuffer()).subarray(0, 5).toString();
check("preview renders inline", preview.ok && !preview.headers.get("content-disposition") && head === "%PDF-",
  `${preview.headers.get("content-type")}, starts ${head}`);

const download = await fetch(urls.downloadUrl);
check("download is an attachment", (download.headers.get("content-disposition") ?? "").startsWith("attachment"));

const filtered = (await api("/api/applications?status=SELECTED")).body;
check("status filter", filtered.items?.length === 1 && filtered.items[0].candidate.name === "Priya Nair",
  `${filtered.items?.length} selected`);

const searched = (await api("/api/applications?search=9988776655")).body;
check("search by phone", searched.items?.length === 1 && searched.items[0].candidate.name === "Rahul Menon");

const share = (await api(`/api/jobs/${created[0].id}`)).body.share;
check("share kit", share?.links?.length === 5 && share.whatsappMessage.includes("EBS-FIN-001"));

// ── Summary ────────────────────────────────────────────────────────────────
console.log(`\n${pass.length} passed, ${fail.length} failed`);
if (fail.length) {
  console.log("failed:");
  for (const f of fail) console.log("  - " + f);
  process.exit(1);
}
console.log("\nDemo data ready. Sign in at " + BASE + "/login");
