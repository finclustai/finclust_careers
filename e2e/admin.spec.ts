import type { Page } from "@playwright/test";
import { ADMIN_STATE, expectCleanLayout, fakeDrafts, isPhone, run, seedApplication, tag, waitForHydration, expect, test } from "./support";

test.use({ storageState: ADMIN_STATE });
// One flow per device, in order: later steps build on earlier ones.
test.describe.configure({ mode: "serial" });

let t: string;
let alpha: Awaited<ReturnType<typeof seedApplication>>;
let beta: Awaited<ReturnType<typeof seedApplication>>;
let gamma: Awaited<ReturnType<typeof seedApplication>>;
let wordCv: Awaited<ReturnType<typeof seedApplication>>;

test.beforeAll(async ({}, info) => {
  t = tag(info);
  alpha = await seedApplication({ name: `Alpha ${t}`, note: "Can join <b>immediately</b>" });
  beta = await seedApplication({ name: `Beta ${t}`, status: "SCREENING" });
  gamma = await seedApplication({ name: `Gamma ${t}` });
  wordCv = await seedApplication({ name: `Word ${t}`, word: true });
});

const card = (page: Page, name: string) => page.locator("article").filter({ hasText: name });
const column = (page: Page, label: string) => page.getByRole("region", { name: new RegExp(`^${label},`) });

test("dashboard shows the numbers and the collecting job", async ({ page }, info) => {
  await page.goto("/admin");
  await expect(page.getByText("Awaiting review")).toBeVisible();
  await expect(page.getByRole("img", { name: /Applications per day/ })).toBeVisible();
  await expect(page.getByRole("link", { name: run().job.title }).first()).toBeVisible();
  await expectCleanLayout(page, info, "dashboard");
});

test("combined board: search, job filter, move and undo", async ({ page }, info) => {
  await page.goto("/admin/board");
  await page.getByPlaceholder("Name, phone or reference").fill(t);
  await expect(page.locator("article")).toHaveCount(4);
  await expect(card(page, alpha.candidate.name).getByText(run().job.jobId)).toBeVisible();
  await page.getByRole("combobox", { name: "Show one job" }).selectOption({ label: `${run().job.title} (${run().job.jobId})` });
  await expect(page.locator("article")).toHaveCount(4);
  await expectCleanLayout(page, info, "combined-board");

  await card(page, alpha.candidate.name).getByRole("combobox").selectOption("SHORTLISTED");
  await expect(page.getByRole("status").filter({ hasText: "moved to" })).toBeVisible();
  await expectCleanLayout(page, info, "board-undo-toast");
  await Promise.all([
    page.waitForResponse((r) => r.url().endsWith(`/api/applications/${alpha.id}/status`) && r.request().method() === "PUT"),
    page.getByRole("button", { name: "Undo" }).click(),
  ]);
  await expect(page.getByRole("status").filter({ hasText: "moved to" })).toBeHidden();
  await page.reload();
  await page.getByPlaceholder("Name, phone or reference").fill(t);
  await expect(column(page, "New").getByRole("link", { name: alpha.candidate.name, exact: true })).toBeVisible();
});

test("share two CVs from a job board as a Zoho draft", async ({ page }, info) => {
  const to = `client-${t}@example.test`;
  await page.goto(`/admin/jobs/${run().job.id}/board`);
  await page.getByPlaceholder("Name, phone or reference").fill(t);
  await page.getByRole("button", { name: "Select to share" }).click();
  await card(page, alpha.candidate.name).getByRole("checkbox").check();
  await card(page, gamma.candidate.name).getByRole("checkbox").check();
  await expect(page.getByText("2 selected")).toBeVisible();
  await expectCleanLayout(page, info, "board-selecting");

  await page.getByRole("button", { name: "Share CVs" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("hr@e2e.test")).toBeVisible();
  await expectCleanLayout(page, info, "share-dialog");
  await dialog.getByLabel("To").fill(`${to}, Second-${t}@Example.test`);
  await dialog.getByLabel(/CC/).fill("not-an-email");
  await dialog.getByRole("button", { name: "Create draft in Zoho Mail" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Not an email address: not-an-email");
  await dialog.getByLabel(/CC/).fill("");
  await dialog.getByRole("button", { name: "Create draft in Zoho Mail" }).click();
  await expect(dialog.getByRole("link", { name: "Open drafts in Zoho Mail" })).toBeVisible({ timeout: 45_000 });
  await expect(dialog).toContainText("2 moved to Sent to client");
  await expectCleanLayout(page, info, "share-done");

  const draft = (await fakeDrafts()).find((d) => d.toAddress.includes(to));
  expect(draft, "draft reached Zoho").toBeTruthy();
  expect(draft!.toAddress).toBe(`${to},second-${t}@example.test`);
  expect(draft!.subject).toBe(`Profiles for ${run().job.title} (${run().job.jobId}) – 2 candidates`);
  expect(draft!.attachments).toHaveLength(2);
  expect(draft!.attachments.every((a) => a.head === "%PDF-" && a.bytes > 100)).toBe(true);
  expect(draft!.content).toContain(alpha.candidate.name);
  expect(draft!.content).toContain("<table");

  // Closing reloads the board so the moved cards show in their new column.
  await Promise.all([page.waitForEvent("load"), dialog.getByRole("button", { name: "Done" }).click()]);
  await waitForHydration(page);
  await page.getByPlaceholder("Name, phone or reference").fill(t);
  await expect(column(page, "Sent to client").locator("article")).toHaveCount(2);
  await expect(column(page, "Screening").getByRole("link", { name: beta.candidate.name, exact: true })).toBeVisible();
});

test("application page: note, share history, team notes, reason on reject", async ({ page }, info) => {
  page.on("dialog", (d) => d.accept());
  let downloads = 0;
  page.on("download", () => downloads++);
  await page.goto(`/admin/applications/${alpha.id}`);
  await expect(page.getByRole("heading", { name: alpha.candidate.name })).toBeVisible();
  // Either the CV shows inline, or (no PDF viewer, e.g. Android Chrome) an Open
  // button does. Never a surprise download just for opening the page.
  await expect(page.locator("iframe[title^='CV:']").or(page.getByRole("link", { name: "Open CV" }))).toBeVisible();
  // Checked where it matters: Chromium, the engine of Android Chrome. Playwright's
  // Windows WebKit has no PDF viewer, unlike Safari on a real iPhone.
  if (info.project.use.defaultBrowserType !== "webkit") expect(downloads).toBe(0);
  // Typed by the candidate: shown as text, never as markup.
  await expect(page.getByText("Can join <b>immediately</b>")).toBeVisible();
  await expect(page.getByText(`client-${t}@example.test`).first()).toBeVisible();
  await expect(page.getByText(/CV shared with client-/)).toBeVisible();
  await expect(page.locator("#assignee")).toBeVisible();
  await expectCleanLayout(page, info, "application");

  await page.fill("#note", `Called ${t}`);
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByText(`Called ${t}`)).toBeVisible();

  await page.getByRole("button", { name: "Rejected", exact: true }).click();
  await expect(page.locator("#reason")).toBeVisible();
  await expectCleanLayout(page, info, "reject-reason");
  await page.fill("#reason", `Reason ${t}`);
  await page.getByRole("button", { name: "Move to Rejected" }).click();
  await expect(page.getByText(`Reason ${t}`)).toBeVisible();

  await page.getByRole("button", { name: "Share CV by email" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expectCleanLayout(page, info, "share-single");
  await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  if (!isPhone(info)) {
    const before = page.url();
    await page.keyboard.press("j");
    await expect(page).not.toHaveURL(before);
  }

  // Regression: going up from an application to the list used to hang for
  // good in Chrome (see apps/web/app/admin/applications/loading.tsx).
  await page.getByRole("link", { name: "All applications" }).click();
  await expect(page.getByRole("heading", { name: "Applications", exact: true })).toBeVisible();
  await expect(page.getByText(/matching/)).toBeVisible();
});

test("jobs: list, new job defaults, clone, job page with QR and WhatsApp post", async ({ page }, info) => {
  const { job } = run();
  await page.goto("/admin/jobs");
  await expect(page.getByText(job.title).first()).toBeVisible();
  await expectCleanLayout(page, info, "jobs");

  await page.goto("/admin/jobs/new");
  await expect(page.locator("input[name=candidateNoteEnabled]")).toBeChecked();
  await expect(page.locator("input[name=closesAt]")).toHaveAttribute("type", "date");
  await expectCleanLayout(page, info, "job-new");

  await page.goto(`/admin/jobs/new?from=${job.id}`);
  await expect(page.locator("#title")).toHaveValue(job.title);
  await expect(page.locator("#jobId")).toHaveValue("");
  await expect(page.getByRole("heading", { name: `Copy of ${job.title}` })).toBeVisible();

  await page.goto(`/admin/jobs/${job.id}`);
  await expect(page.getByRole("img", { name: /QR code/ })).toBeVisible();
  const preview = page.getByLabel(/post preview$/);
  await expect(preview).toContainText("Hello everyone,");
  await expect(preview).toContainText("*Location:* Hyderabad (Hybrid)");
  await expect(preview).toContainText("source=whatsapp");
  // Every source has its own post; outside WhatsApp the bold stars are dropped.
  for (const channel of ["Telegram", "LinkedIn", "Website", "Referral", "Other"]) {
    await page.getByRole("tab", { name: new RegExp(`^${channel}`) }).click();
    await expect(preview).toContainText(`source=${channel.toLowerCase()}`);
    await expect(preview).not.toContainText("*");
  }
  await page.getByRole("tab", { name: /^LinkedIn/ }).click();
  await expect(page.getByRole("link", { name: "Open LinkedIn" })).toBeVisible();
  await expectCleanLayout(page, info, "job-detail");

  await page.goto(`/admin/jobs/${job.id}/edit`);
  await expectCleanLayout(page, info, "job-edit");
});

test("share post: edit one channel's message, facts follow job edits, reset", async ({ page }, info) => {
  // Its own job, so devices running in parallel never edit the same message.
  const profiles = await (await page.request.get("/api/job-profiles")).json();
  const created = await page.request.post("/api/jobs", {
    data: { jobId: `E2E-POST-${t.toUpperCase()}`, title: `Post Role ${t}`, profileId: profiles[0].id, location: "Chennai", minExperience: 2, maxExperience: 5 },
  });
  expect(created.ok()).toBe(true);
  const job = await created.json();
  await page.request.put(`/api/jobs/${job.id}/status`, { data: { status: "ACTIVE" } });

  await page.goto(`/admin/jobs/${job.id}`);
  const preview = page.getByLabel(/post preview$/);
  await page.getByRole("tab", { name: /^LinkedIn/ }).click();
  await expect(preview).toContainText("Location: Chennai");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.fill("#share-template", "Now hiring {title} in {location}\n\nApply: {link}");
  // The preview follows the typing, before anything is saved.
  await expect(preview).toContainText(`Now hiring Post Role ${t} in Chennai`);
  await expect(preview).toContainText(`/apply/${job.jobId}?source=linkedin`);
  await expectCleanLayout(page, info, "share-edit");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("LinkedIn uses this job's own wording.")).toBeVisible();

  // Only LinkedIn changed.
  await page.getByRole("tab", { name: /^WhatsApp/ }).click();
  await expect(preview).toContainText("Hello everyone,");

  // Editing the job changes the saved message's facts without touching the wording.
  await page.goto(`/admin/jobs/${job.id}/edit`);
  await page.fill("input[name=location]", "Kochi");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/jobs/${job.id}$`));
  await page.getByRole("tab", { name: /^LinkedIn/ }).click();
  await expect(page.getByLabel(/post preview$/)).toContainText(`Now hiring Post Role ${t} in Kochi`);

  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: "Use default" }).click();
  await expect(page.getByText("LinkedIn uses the default wording.")).toBeVisible();
  await expect(page.getByLabel(/post preview$/)).toContainText("Hello everyone,");
});

test("applications: job filter is always visible and filters", async ({ page }, info) => {
  const { job } = run();
  await page.goto("/admin/applications");
  const jobFilter = page.getByRole("combobox", { name: "Filter by job" });
  await expect(jobFilter).toBeVisible();
  await jobFilter.selectOption({ label: `${job.title} (${job.jobId})` });
  await expect(page).toHaveURL(new RegExp(`jobOpeningId=${job.id}`));
  await expect(page.getByRole("link", { name: gamma.candidate.name, exact: true }).filter({ visible: true })).toBeVisible();

  // Search follows typing, no button to press.
  await page.getByRole("searchbox", { name: "Search applications" }).fill(gamma.candidate.name);
  await expect(page).toHaveURL(/search=/);
  await expect(page.getByText(/^1\s*matching$/)).toBeVisible();

  await page.getByRole("button", { name: /^More filters/ }).click();
  // On hold is shown as Future.
  await page.getByRole("combobox", { name: "Status" }).selectOption({ label: "Future" });
  await expect(page.getByRole("button", { name: "More filters (1)" })).toBeVisible();
  await expectCleanLayout(page, info, "applications-job-filter");
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page).toHaveURL(/\/admin\/applications$/);
});

test("board card: notes and CV side panel", async ({ page }, info) => {
  await page.goto(`/admin/jobs/${run().job.id}/board`);
  await page.getByPlaceholder("Name, phone or reference").fill(t);
  const alphaCard = card(page, alpha.candidate.name);
  // The count is team notes only: alpha has one from the earlier test, and the
  // candidate's own note does not count.
  const notesButton = alphaCard.getByRole("button", { name: /^Notes for / });
  await expect(notesButton).toHaveAccessibleName(`Notes for ${alpha.candidate.name}, 1`);
  await notesButton.click();

  const panel = page.getByRole("dialog");
  await expect(panel.getByRole("heading", { name: alpha.candidate.name })).toBeVisible();
  await expect(panel.getByText("Can join <b>immediately</b>")).toBeVisible();
  await expect(panel.getByText(`Called ${t}`)).toBeVisible();
  await expectCleanLayout(page, info, "board-notes-panel");
  await panel.locator("#note").fill(`Panel note ${t}`);
  await panel.getByRole("button", { name: "Add note" }).click();
  await expect(panel.getByText(`Panel note ${t}`)).toBeVisible();

  await panel.getByRole("tab", { name: "CV" }).click();
  await expect(panel.locator("iframe[title^='CV:']").or(panel.getByRole("link", { name: "Open CV" }))).toBeVisible();
  await expectCleanLayout(page, info, "board-cv-panel");
  await panel.getByRole("button", { name: "Close" }).click();
  await expect(panel).toBeHidden();
  await expect(notesButton).toHaveAccessibleName(`Notes for ${alpha.candidate.name}, 2`);
  await expect(alphaCard.getByRole("link", { name: /on WhatsApp$/ })).toBeVisible();
});

test("Word CV previews through Microsoft's viewer; PDF preview can go full screen", async ({ page }, info) => {
  await page.goto(`/admin/applications/${wordCv.id}`);
  const frame = page.locator("iframe[title^='CV:']");
  await expect(frame).toHaveAttribute("src", /^https:\/\/view\.officeapps\.live\.com\/op\/embed\.aspx\?src=https%3A%2F%2F/);
  expect(decodeURIComponent((await frame.getAttribute("src"))!.split("src=")[1])).toContain(".docx?token=");

  await page.goto(`/admin/applications/${gamma.id}`);
  await page.getByRole("button", { name: "Full screen" }).click();
  const box = await page.getByRole("region", { name: /^CV:/ }).boundingBox();
  const viewport = page.viewportSize()!;
  expect(box!.width).toBeGreaterThanOrEqual(viewport.width - 1);
  expect(box!.height).toBeGreaterThanOrEqual(viewport.height - 1);
  await expectCleanLayout(page, info, "cv-full-screen");
  await page.getByRole("button", { name: "Exit full screen" }).click();
});

test("users page", async ({ page }, info) => {
  await page.goto("/admin/users");
  await expect(page.getByText("(you)")).toBeVisible();
  await expectCleanLayout(page, info, "users");
  await page.getByRole("button", { name: "Add a user" }).click();
  await expectCleanLayout(page, info, "users-add");

  // Account changes are shared state: exercised once, on desktop.
  if (info.project.name !== "desktop-1280") return;
  const email = `added-${t}@e2e.test`;
  await page.locator("input[name=name]").fill(`E2E Added ${t}`);
  await page.locator("input[name=email]").fill(email);
  await page.locator("input[name=password]").fill("e2e-password-1");
  await page.getByRole("button", { name: "Add user", exact: true }).click();
  const row = page.locator("li").filter({ hasText: email });
  await expect(row).toBeVisible();
  page.once("dialog", (d) => d.accept("e2e-password-2"));
  await row.getByRole("button", { name: "Reset password" }).click();
  await expect(row.getByText(/Password changed/)).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await row.getByRole("button", { name: "Deactivate" }).click();
  await expect(row.getByText("Deactivated")).toBeVisible();
});

test("settings: template preview follows edits", async ({ page }, info) => {
  await page.goto("/admin/settings");
  await expect(page.getByText("hr@e2e.test")).toBeVisible();
  await page.fill("#template-subject", `Subject ${t} {job_id}`);
  await expect(page.getByText(`Subject ${t} BAX-EBS-01`)).toBeVisible();
  await expectCleanLayout(page, info, "settings");

  if (info.project.name !== "desktop-1280") return;
  await page.reload();
  const original = { subject: await page.inputValue("#template-subject"), body: await page.inputValue("#template-body") };
  await page.fill("#template-subject", `Saved ${t}`);
  await page.getByRole("button", { name: "Save template" }).click();
  await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();
  await page.reload();
  await expect(page.locator("#template-subject")).toHaveValue(`Saved ${t}`);
  const restore = await page.request.put("/api/shares/template", { data: original });
  expect(restore.ok()).toBe(true);
});

test("trash: delete a candidate, restore, then delete forever", async ({ page }, info) => {
  page.on("dialog", (d) => d.accept());
  await page.goto(`/admin/applications/${beta.id}`);
  await page.getByRole("button", { name: "Delete candidate" }).click();
  // A client-side navigation: no load event to wait for, so poll the URL.
  await expect(page).toHaveURL(/\/admin\/applications$/, { timeout: 30_000 });
  expect((await (await page.request.get(`/api/applications?search=${encodeURIComponent(beta.candidate.name)}`)).json()).total).toBe(0);

  await page.goto("/admin/trash");
  const row = page.locator("li").filter({ hasText: beta.candidate.name });
  await expect(row).toBeVisible();
  await expectCleanLayout(page, info, "trash");
  await row.getByRole("button", { name: "Restore" }).click();
  await expect(row).toBeHidden();
  expect((await (await page.request.get(`/api/applications?search=${encodeURIComponent(beta.candidate.name)}`)).json()).total).toBe(1);

  await page.request.delete(`/api/candidates/${beta.candidateId}`);
  await page.reload();
  await row.getByRole("button", { name: "Delete forever" }).click();
  await expect(row).toBeHidden();
  expect((await page.request.get(`/api/applications/${beta.id}`)).status()).toBe(404);
});
