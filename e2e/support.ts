import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { test as base, expect, type Page, type TestInfo } from "@playwright/test";
import { prisma } from "@finclust/db";
import { buildApplicationReference } from "@finclust/domain";
import { createClient } from "@supabase/supabase-js";

config({ path: join(__dirname, "..", ".env") });

export const STATE = join(__dirname, ".state");
export const ADMIN_STATE = join(STATE, "admin.json");
export const RECRUITER_STATE = join(STATE, "recruiter.json");
export const FIXTURES = join(__dirname, "fixtures");
export const FAKE_ZOHO = "http://127.0.0.1:4010";
export const PREFIX = "E2E";

export { prisma, expect };

/**
 * Waits until React has attached its handlers to every control on the page.
 * The network going quiet is not enough: under load, hydration can still be
 * running, and a tap before it lands does nothing.
 */
export async function waitForHydration(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll("button, input, select, textarea")].every((el) =>
        Object.keys(el).some((key) => key.startsWith("__reactProps")),
      ),
    null,
    { timeout: 30_000 },
  );
}

/** Navigation in tests waits for the page to be usable, like a person would. */
export const test = base.extend({
  page: async ({ page }, use) => {
    const goto = page.goto.bind(page);
    const reload = page.reload.bind(page);
    page.goto = async (url, options) => {
      const response = await goto(url, options);
      await waitForHydration(page);
      return response;
    };
    page.reload = async (options) => {
      const response = await reload(options);
      await waitForHydration(page);
      return response;
    };
    await use(page);
  },
});

const storage = () =>
  createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } }).storage.from(
    process.env.SUPABASE_RESUME_BUCKET ?? "resumes",
  );

export interface RunState {
  job: { id: string; jobId: string; title: string };
  recruiter: { id: string; name: string; email: string; password: string };
}

export const run = (): RunState => JSON.parse(readFileSync(join(STATE, "run.json"), "utf8"));

/** Short, unique per project, so parallel projects never touch each other's data. */
export const tag = (info: TestInfo) =>
  `${info.project.name.replace(/[^a-z0-9]/gi, "")}${Math.random().toString(36).slice(2, 6)}`;

/** A candidate with a stored PDF CV applied to the run's job, straight into the database. */
export async function seedApplication(opts: {
  name: string;
  status?: "NEW" | "SCREENING" | "SHORTLISTED" | "REJECTED";
  assignTo?: string;
  note?: string;
  word?: boolean;
}) {
  const { job } = run();
  const ext = opts.word ? "docx" : "pdf";
  const mimeType = opts.word ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/pdf";
  const path = `${job.jobId}/${randomUUID()}.${ext}`;
  const pdf = readFileSync(join(FIXTURES, `cv.${ext}`));
  const { error } = await storage().upload(path, pdf, { contentType: mimeType });
  if (error) throw new Error(`seed upload failed: ${error.message}`);

  const phone = `+919${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`;
  const { applicationCounter } = await prisma.jobOpening.update({
    where: { id: job.id },
    data: { applicationCounter: { increment: 1 } },
    select: { applicationCounter: true },
  });
  const candidate = await prisma.candidate.create({
    data: { name: `${PREFIX} ${opts.name}`, phone, location: "Hyderabad", totalExperience: 6, noticePeriod: "30 days" },
  });
  return prisma.application.create({
    data: {
      applicationReference: buildApplicationReference(job.jobId, applicationCounter),
      candidateId: candidate.id,
      jobOpeningId: job.id,
      source: "WHATSAPP",
      status: opts.status ?? "NEW",
      assignedRecruiterId: opts.assignTo,
      candidateNote: opts.note,
      resume: {
        create: { candidateId: candidate.id, originalFileName: `cv.${ext}`, fileSize: pdf.length, storagePath: path, mimeType },
      },
    },
    include: { candidate: true },
  });
}

/** Erases everything any E2E run created, including runs that crashed. */
export async function cleanup() {
  const e2eJob = { jobOpening: { jobId: { startsWith: `${PREFIX}-` } } };
  const e2eCandidate = { candidate: { name: { startsWith: `${PREFIX} ` } } };
  const resumes = await prisma.resume.findMany({
    where: { OR: [{ application: e2eJob }, e2eCandidate] },
    select: { storagePath: true },
  });
  await prisma.$transaction([
    prisma.resume.deleteMany({ where: { OR: [{ application: e2eJob }, e2eCandidate] } }),
    prisma.application.deleteMany({ where: { OR: [e2eJob, e2eCandidate] } }),
    prisma.jobOpening.deleteMany({ where: { jobId: { startsWith: `${PREFIX}-` } } }),
    prisma.candidate.deleteMany({ where: { name: { startsWith: `${PREFIX} ` } } }),
    prisma.cvShare.deleteMany({ where: { createdBy: { email: { endsWith: "@e2e.test" } } } }),
    prisma.candidateNote.deleteMany({ where: { author: { email: { endsWith: "@e2e.test" } } } }),
    prisma.user.deleteMany({ where: { email: { endsWith: "@e2e.test" } } }),
  ]);

  // CVs of those applications, plus uploads from apply forms that never submitted.
  const bucket = storage();
  const paths = new Set(resumes.map((r) => r.storagePath));
  const { data: folders } = await bucket.list("", { limit: 1000 });
  for (const folder of folders ?? []) {
    if (!folder.name.startsWith(`${PREFIX}-`)) continue;
    const { data: objects } = await bucket.list(folder.name, { limit: 1000 });
    for (const object of objects ?? []) paths.add(`${folder.name}/${object.name}`);
  }
  if (paths.size) await bucket.remove([...paths]);
}

export async function adminCredentials() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env");
  return { email, password };
}

export const isPhone = (info: TestInfo) => (info.project.use.viewport?.width ?? 1280) < 600;

/**
 * Layout defects a person on this screen would hit:
 * - anything poking out past the screen edge (the page slides sideways), unless
 *   it sits inside a container that is meant to scroll;
 * - on phones, buttons and form controls smaller than a 44px finger target.
 * Inline text links are exempt from the target size, as WCAG allows.
 */
export async function expectCleanLayout(page: Page, info: TestInfo, label: string) {
  await page.evaluate(() => document.fonts.ready);
  const issues = await page.evaluate((checkTargets) => {
    const vw = document.documentElement.clientWidth;
    const found: string[] = [];
    const describe = (el: Element) => {
      const text = (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40);
      return `<${el.tagName.toLowerCase()}> "${text}"`;
    };
    const inScroller = (el: Element) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const o = getComputedStyle(p).overflowX;
        if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") return true;
      }
      return false;
    };
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || getComputedStyle(el).position === "fixed") continue;
      if ((r.right > vw + 1 || r.left < -1) && !inScroller(el) && !el.closest("[aria-hidden=true], .sr-only, dialog:not([open])")) {
        found.push(`overflow: ${describe(el)} spans ${Math.round(r.left)}..${Math.round(r.right)} of ${vw}px`);
      }
    }
    if (checkTargets) {
      for (const el of document.querySelectorAll("button, select, input:not([type=hidden]), textarea, a.btn, a.action, [role=button]")) {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height || el.closest(".sr-only")) continue;
        const target = el.closest("label") ?? el;
        const t = target.getBoundingClientRect();
        if (Math.max(r.height, t.height) < 44 - 0.5) found.push(`small target: ${describe(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
    }
    return [...new Set(found)];
  }, isPhone(info));
  await info.attach(`${label}.png`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
  expect(issues, `${label} layout on ${info.project.name}`).toEqual([]);
}

export async function fakeDrafts(): Promise<
  { toAddress: string; ccAddress?: string; subject: string; content: string; attachments: { name: string; bytes: number; head: string }[] }[]
> {
  return (await fetch(`${FAKE_ZOHO}/__drafts`)).json();
}
