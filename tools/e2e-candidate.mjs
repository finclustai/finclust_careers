/**
 * Candidate journey in a real browser at phone width: open roles, apply with a
 * Word CV, note box, success page, status lookup, and the admin view of a Word
 * CV. Runs against a temporary job with the note box on, unless JOB names a
 * real one. tools/e2e-admin.mjs continues from here and erases what this made.
 *
 *   python tools/make-test-docx.py && node tools/e2e-candidate.mjs
 */
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE ?? "http://127.0.0.1:3000";
const SHOTS = "tools/shots";
const env = readFileSync(".env", "utf8");
const ADMIN_EMAIL = /^SEED_ADMIN_EMAIL="?(.*?)"?$/m.exec(env)?.[1];
const ADMIN_PASSWORD = /^SEED_ADMIN_PASSWORD="?(.*?)"?$/m.exec(env)?.[1];

// The database is shared with the live site, so tests never touch real jobs.
async function createTestJob() {
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const call = async (method, path, body) =>
    (await fetch(`${BASE}/api${path}`, { method, headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify(body) })).json();
  const [profile] = await (await fetch(`${BASE}/api/job-profiles`, { headers: { cookie } })).json();
  const job = await call("POST", "/jobs", {
    jobId: `E2E-${String(Date.now()).slice(-6)}`,
    title: "E2E test role",
    profileId: profile.id,
    candidateNoteEnabled: true,
  });
  await call("PUT", `/jobs/${job.id}/status`, { status: "ACTIVE" });
  return job;
}
const testJob = process.env.JOB ? null : await createTestJob();
const JOB = process.env.JOB ?? testJob.jobId;

// A phone number no real candidate has, so the run always creates a fresh application.
const PHONE = `98${String(Date.now()).slice(-8)}`;
const pass = [];
const fail = [];
const check = (label, ok, detail = "") => {
  (ok ? pass : fail).push(label);
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
};

mkdirSync(SHOTS, { recursive: true });
// Made by the caller as a genuine ZIP-based .docx; see the command in the header.
const docx = `${SHOTS}/e2e-cv.docx`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });

console.log("\nHome");
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
const cards = await page.getByRole("link", { name: "View and apply" }).count();
check("open roles listed", cards > 0, `${cards} roles`);
check("trust line visible", await page.getByText("Official FINCLUST Careers page").isVisible());
await page.screenshot({ path: `${SHOTS}/e2e-home.png`, fullPage: true });

console.log("\nApply with a Word CV");
await page.goto(`${BASE}/apply/${JOB}?source=website`, { waitUntil: "networkidle" });
const noteBox = page.locator("#candidateNote");
const noteShown = await noteBox.isVisible().catch(() => false);
console.log(`  (note box on this job: ${noteShown ? "on" : "off"})`);

await page.fill("#fullName", "E2E Test Candidate");
await page.fill("#phone", PHONE);
await page.fill("#location", "Hyderabad");
await page.fill("#totalExperience", "4");
if (noteShown) {
  await noteBox.fill("Available to join in 15 days.");
  check("note box sits above the CV upload", await page.evaluate(() => {
    const note = document.querySelector("#candidateNote").getBoundingClientRect().top;
    const cv = document.querySelector("label[for=resume]").getBoundingClientRect().top;
    return note < cv;
  }));
}

// Watch the progress bar appear while the file uploads.
let sawProgress = false;
const progressWatch = page.waitForSelector('[role="progressbar"]', { timeout: 15000 })
  .then(() => { sawProgress = true; }).catch(() => {});
await page.setInputFiles("#resume", docx);
await progressWatch;
await page.waitForSelector("text=e2e-cv.docx", { timeout: 30000 });
check("Word file accepted by the form", await page.getByText("e2e-cv.docx").isVisible());
check("progress bar shown during upload", sawProgress, sawProgress ? "" : "(upload may have finished too fast to observe)");
await page.screenshot({ path: `${SHOTS}/e2e-apply-filled.png`, fullPage: true });

await Promise.all([
  page.waitForURL(/\/success\?/, { timeout: 30000 }),
  page.getByRole("button", { name: "Submit application" }).click(),
]);
const reference = await page.locator(".font-mono").first().innerText();
check("reached success page", page.url().includes("/success"), reference);
check("what happens next shown", await page.getByText("What happens next").isVisible());
check("save to WhatsApp offered", await page.getByRole("link", { name: "Save to my WhatsApp" }).isVisible());
await page.screenshot({ path: `${SHOTS}/e2e-success.png`, fullPage: true });

console.log("\nStatus lookup");
await page.goto(`${BASE}/status`, { waitUntil: "networkidle" });
await page.fill("#reference", reference.toLowerCase());
await page.fill("#phone", `+91 ${PHONE}`);
await page.getByRole("button", { name: "Check status" }).click();
await page.waitForSelector("text=Application received", { timeout: 15000 }).catch(() => {});
check("status found with lowercase ref and +91 phone", await page.getByText("Application received").isVisible());
await page.screenshot({ path: `${SHOTS}/e2e-status.png`, fullPage: true });

console.log("\nAdmin view of the Word CV");
const admin = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await admin.goto(`${BASE}/login`);
await admin.fill("#email", ADMIN_EMAIL);
await admin.fill("#password", ADMIN_PASSWORD);
await Promise.all([admin.waitForURL(/\/admin\//), admin.click("button[type=submit]")]);
const list = await admin.evaluate(async (ref) => {
  const r = await fetch(`/api/applications?search=${encodeURIComponent(ref)}`);
  return r.json();
}, reference);
const appId = list.items?.[0]?.id;
check("application visible to admin", Boolean(appId));
await admin.goto(`${BASE}/admin/applications/${appId}`, { waitUntil: "networkidle" });
await admin.waitForSelector("text=Word document", { timeout: 15000 }).catch(() => {});
check("Word CV shows download panel, not a broken preview", await admin.getByText("Word document").isVisible());
check("no inline iframe for the Word file", (await admin.locator("iframe").count()) === 0);
await admin.screenshot({ path: `${SHOTS}/e2e-admin-word.png` });

writeFileSync(`${SHOTS}/e2e-created.json`, JSON.stringify({ phone: `+91${PHONE}`, reference, jobId: JOB, testJobId: testJob?.id ?? null }));
console.log(`\n${pass.length} passed, ${fail.length} failed`);
await browser.close();
process.exit(fail.length ? 1 : 0);
