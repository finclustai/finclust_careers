/**
 * Admin journey in a real browser: dashboard, combined board (search, job
 * filter, move + undo), application detail (Prev/Next, candidate note, team
 * note, reason on reject), clone, QR, users, and Trash. Works on the test
 * application tools/e2e-candidate.mjs created, and ends by deleting that
 * candidate for good through Trash, which is also the cleanup.
 *
 *   node tools/e2e-candidate.mjs && node tools/e2e-admin.mjs
 */
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const BASE = process.env.BASE ?? "http://127.0.0.1:3000";
const SHOTS = "tools/shots";
const env = readFileSync(".env", "utf8");
const ADMIN_EMAIL = /^SEED_ADMIN_EMAIL="?(.*?)"?$/m.exec(env)?.[1];
const ADMIN_PASSWORD = /^SEED_ADMIN_PASSWORD="?(.*?)"?$/m.exec(env)?.[1];
const { reference, jobId, testJobId } = JSON.parse(readFileSync(`${SHOTS}/e2e-created.json`, "utf8"));

const fail = [];
let passed = 0;
const check = (label, ok, detail = "") => {
  ok ? passed++ : fail.push(label);
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
};
const noSideScroll = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("dialog", (dialog) => dialog.accept());

await page.goto(`${BASE}/login`);
await page.fill("#email", ADMIN_EMAIL);
await page.fill("#password", ADMIN_PASSWORD);
await Promise.all([page.waitForURL(/\/admin/), page.click("button[type=submit]")]);

console.log("\nDashboard");
await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
check("key numbers shown", await page.getByText("Awaiting review").isVisible());
check("14-day chart shown", await page.getByRole("img", { name: /Applications per day/ }).isVisible());
check("test application in latest list", await page.getByText("E2E Test Candidate").first().isVisible());
await page.screenshot({ path: `${SHOTS}/admin-dashboard.png`, fullPage: true });

console.log("\nCombined board");
await page.goto(`${BASE}/admin/board`, { waitUntil: "networkidle" });
const allCards = await page.locator("article").count();
await page.fill("input[type=search]", "E2E Test");
const filtered = await page.locator("article").count();
check("search narrows the board", filtered >= 1 && filtered < allCards, `${allCards} → ${filtered}`);
check("card shows its job", await page.locator("article").first().getByText(jobId).isVisible());
const card = page.locator("article").filter({ hasText: "E2E Test Candidate" }).first();
await card.locator("select").selectOption("SCREENING");
await page.getByRole("status").filter({ hasText: "moved to" }).waitFor({ timeout: 10000 });
check("undo offered after a move", await page.getByRole("button", { name: "Undo" }).isVisible());
await page.getByRole("button", { name: "Undo" }).click();
await page.waitForTimeout(1500);
await page.reload({ waitUntil: "networkidle" });
await page.fill("input[type=search]", "E2E Test");
check(
  "undo put the card back in New",
  (await page.getByRole("region", { name: /^New,/ }).getByText("E2E Test Candidate").count()) > 0,
);
await page.setViewportSize({ width: 375, height: 812 });
check("board has no page side-scroll on phone", await noSideScroll(page));
await page.setViewportSize({ width: 1280, height: 900 });

console.log("\nApplication detail");
const appId = await page.evaluate(async (ref) => {
  const r = await fetch(`/api/applications?search=${encodeURIComponent(ref)}`);
  return (await r.json()).items[0]?.id;
}, reference);
await page.goto(`${BASE}/admin/applications/${appId}`, { waitUntil: "networkidle" });
check("candidate's own note shown", await page.getByText("Note from the candidate").isVisible());
check("Prev/Next present", await page.getByText("Older").isVisible());
await page.fill("#note", "E2E team note");
await page.getByRole("button", { name: "Add note" }).click();
await page.getByText("E2E team note").waitFor({ timeout: 10000 });
check("team note added", await page.getByText("E2E team note").isVisible());
check("assign dropdown for admin", await page.locator("#assignee").isVisible());
await page.getByRole("button", { name: "Rejected" }).click();
check("reason asked on reject", await page.locator("#reason").isVisible());
await page.fill("#reason", "E2E reason");
await page.getByRole("button", { name: "Move to Rejected" }).click();
await page.getByText("E2E reason").waitFor({ timeout: 10000 });
check("reason saved in history", await page.getByText("E2E reason").isVisible());
await page.screenshot({ path: `${SHOTS}/admin-application.png`, fullPage: true });
await page.setViewportSize({ width: 375, height: 812 });
check("detail has no side-scroll on phone", await noSideScroll(page));
await page.setViewportSize({ width: 1280, height: 900 });

console.log("\nJobs");
await page.goto(`${BASE}/admin/jobs`, { waitUntil: "networkidle" });
const jobHref = await page.locator('a[href^="/admin/jobs/"][href$="/board"]').first().getAttribute("href");
const jobUuid = jobHref.split("/")[3];
await page.goto(`${BASE}/admin/jobs/new?from=${jobUuid}`, { waitUntil: "networkidle" });
check("clone prefills the title", (await page.locator("#title").inputValue()).length > 0);
check("clone leaves Job ID blank", (await page.locator("#jobId").inputValue()) === "");
await page.goto(`${BASE}/admin/jobs/${jobUuid}`, { waitUntil: "networkidle" });
const qrCount = await page.getByRole("img", { name: /QR code/ }).count();
check("QR code on a collecting job", qrCount === 1 || !(await page.getByText("Accepting applications").isVisible()));

console.log("\nUsers");
await page.goto(`${BASE}/admin/users`, { waitUntil: "networkidle" });
check("users page lists you", await page.getByText("(you)").isVisible());

console.log("\nTrash (and cleanup)");
await page.goto(`${BASE}/admin/applications/${appId}`, { waitUntil: "networkidle" });
await Promise.all([
  page.waitForURL(/\/admin\/applications$/),
  page.getByRole("button", { name: "Delete candidate" }).click(),
]);
const stillListed = await page.evaluate(async (ref) => {
  const r = await fetch(`/api/applications?search=${encodeURIComponent(ref)}`);
  return (await r.json()).total;
}, reference);
check("deleted candidate hidden from applications", stillListed === 0);
await page.goto(`${BASE}/admin/trash`, { waitUntil: "networkidle" });
const row = page.locator("li").filter({ hasText: "E2E Test Candidate" });
check("candidate waiting in Trash", (await row.count()) === 1);
await page.screenshot({ path: `${SHOTS}/admin-trash.png`, fullPage: true });
await row.getByRole("button", { name: "Delete forever" }).click();
await row.waitFor({ state: "detached", timeout: 15000 });
check("deleted forever", (await page.locator("li").filter({ hasText: "E2E Test Candidate" }).count()) === 0);

if (testJobId) {
  await page.evaluate(async (id) => {
    await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    await fetch(`/api/jobs/${id}/permanent`, { method: "DELETE" });
  }, testJobId);
  const gone = await page.evaluate(async (id) => (await fetch(`/api/jobs/${id}`)).status, testJobId);
  check("temporary test job erased", gone === 404);
}

for (const path of ["/admin", "/admin/jobs", "/admin/users", "/admin/trash"]) {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  check(`${path} has no side-scroll on phone`, await noSideScroll(page));
}
await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
await page.screenshot({ path: `${SHOTS}/admin-dashboard-phone.png`, fullPage: true });

console.log(`\n${passed} passed, ${fail.length} failed`);
await browser.close();
process.exit(fail.length ? 1 : 0);
