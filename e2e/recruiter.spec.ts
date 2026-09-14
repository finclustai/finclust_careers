import { RECRUITER_STATE, expectCleanLayout, run, seedApplication, tag, expect, test } from "./support";

test.use({ storageState: RECRUITER_STATE });
test.describe.configure({ mode: "serial" });

let t: string;
let mine: Awaited<ReturnType<typeof seedApplication>>;
let theirs: Awaited<ReturnType<typeof seedApplication>>;

test.beforeAll(async ({}, info) => {
  t = tag(info);
  mine = await seedApplication({ name: `Mine ${t}`, assignTo: run().recruiter.id });
  theirs = await seedApplication({ name: `Theirs ${t}` });
});

test("a recruiter sees only what is assigned to them", async ({ page }, info) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: /Hello, E2E/ })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Sections" });
  await expect(nav.getByRole("link", { name: "Board", exact: true })).toBeVisible();
  for (const hidden of ["Users", "Settings", "Trash"]) await expect(nav.getByRole("link", { name: hidden, exact: true })).toHaveCount(0);
  await expectCleanLayout(page, info, "recruiter-dashboard");

  await page.goto(`/admin/applications?search=${encodeURIComponent(t)}`);
  // The list renders cards on phones and a table on wider screens; one is hidden.
  await expect(page.getByRole("link", { name: mine.candidate.name, exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText(theirs.candidate.name)).toHaveCount(0);
  await expectCleanLayout(page, info, "recruiter-applications");

  await page.goto("/admin/board");
  await page.getByPlaceholder("Name, phone or reference").fill(t);
  await expect(page.locator("article")).toHaveCount(1);

  await page.goto(`/admin/applications/${mine.id}`);
  await expect(page.getByRole("heading", { name: mine.candidate.name })).toBeVisible();
  await expect(page.getByRole("button", { name: "Share CV by email" })).toBeVisible();
  await expect(page.locator("#assignee")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Delete candidate" })).toHaveCount(0);
  await expectCleanLayout(page, info, "recruiter-application");
});

test("a recruiter cannot reach admin pages or other people's applications", async ({ page }) => {
  for (const path of ["/admin/users", "/admin/settings", "/admin/trash"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/admin$/);
  }

  await page.goto(`/admin/jobs/${run().job.id}`);
  await expect(page.getByRole("heading", { name: run().job.title })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Edit" })).toHaveCount(0);

  // Not 403: a recruiter must not learn that the application exists at all.
  expect((await page.request.get(`/api/applications/${theirs.id}`)).status()).toBe(404);
  expect((await page.request.get("/api/users")).status()).toBe(403);
  expect((await page.request.get("/api/trash")).status()).toBe(403);
  expect((await page.request.put(`/api/applications/${mine.id}/assignee`, { data: { recruiterId: null } })).status()).toBe(403);
  expect((await page.request.put("/api/shares/template", { data: { subject: "xxx", body: "yyy" } })).status()).toBe(403);
  expect((await page.request.delete(`/api/jobs/${run().job.id}`)).status()).toBe(403);
});
