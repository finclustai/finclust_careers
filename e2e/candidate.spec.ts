import { join } from "node:path";
import { FIXTURES, expectCleanLayout, run, tag, expect, test } from "./support";

test("a candidate finds the role, applies with a Word CV and checks their status", async ({ page }, info) => {
  const { job } = run();
  const name = `E2E Applicant ${tag(info)}`;
  const phone = `98${String(Date.now() + info.parallelIndex * 7919).slice(-8)}`;

  await test.step("home page lists the open role", async () => {
    // The open-roles list is cached for a minute, so a fresh role can take a
    // reload or two to show.
    await expect(async () => {
      await page.goto("/");
      await expect(page.getByRole("link", { name: new RegExp(job.title, "i") })).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 45_000 });
    await expectCleanLayout(page, info, "home");
  });

  await test.step("apply form puts the note and optional details above the CV upload", async () => {
    await page.goto(`/apply/${job.jobId}?source=website`);
    await expect(page.getByRole("heading", { name: job.title })).toBeVisible();
    const top = async (locator: ReturnType<typeof page.locator>) => (await locator.boundingBox())!.y;
    const note = await top(page.locator("#candidateNote"));
    const details = await top(page.getByRole("button", { name: "Add more detail (optional)" }));
    const cv = await top(page.locator("label[for=resume]"));
    expect(note).toBeLessThan(details);
    expect(details).toBeLessThan(cv);
    await expectCleanLayout(page, info, "apply-empty");
  });

  await test.step("required fields are enforced", async () => {
    await page.getByRole("button", { name: "Submit application" }).click();
    await expect(page.locator(".error").first()).toBeVisible();
  });

  await test.step("fill in, upload a Word CV and submit", async () => {
    await page.fill("#fullName", name);
    await page.fill("#phone", phone);
    await page.fill("#location", "Hyderabad");
    await page.fill("#totalExperience", "4");
    await page.fill("#candidateNote", "Available in 15 days.");
    await page.getByRole("button", { name: "Add more detail (optional)" }).click();
    await page.fill("input[name=noticePeriod]", "15 days");
    await page.setInputFiles("#resume", join(FIXTURES, "cv.docx"));
    await expect(page.getByText("cv.docx")).toBeVisible({ timeout: 30_000 });
    await expectCleanLayout(page, info, "apply-filled");
    await Promise.all([
      page.waitForURL(/\/success\?/, { timeout: 30_000 }),
      page.getByRole("button", { name: "Submit application" }).click(),
    ]);
  });

  const reference = await test.step("success page gives a reference", async () => {
    await expect(page.getByText("What happens next")).toBeVisible();
    const ref = (await page.locator(".font-mono").first().innerText()).trim();
    expect(ref).toMatch(new RegExp(`^FIN-${job.jobId}-\\d{6}$`));
    await expectCleanLayout(page, info, "success");
    return ref;
  });

  await test.step("status lookup finds it, forgiving case and +91", async () => {
    await page.goto("/status");
    await page.fill("#reference", reference.toLowerCase());
    await page.fill("#phone", `+91 ${phone}`);
    await page.getByRole("button", { name: "Check status" }).click();
    await expect(page.getByText("Application received")).toBeVisible();
    await expectCleanLayout(page, info, "status");
  });
});
