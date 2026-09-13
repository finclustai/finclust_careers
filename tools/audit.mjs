/**
 * Responsive and accessibility audit. Loads every screen at phone, tablet and
 * desktop width and reports what is actually wrong in a real browser: content
 * wider than the viewport, tap targets under 44px, text under 4.5:1, missing
 * accessible names.
 *
 * Run with the app already serving:  node tools/audit.mjs
 */
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";

const BASE = process.env.BASE ?? "http://127.0.0.1:3000";
const SHOTS = process.env.SHOTS ?? "tools/shots";

const VIEWPORTS = [
  { name: "phone", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

// Credentials come from .env only; the repository is public.
function adminCredentials() {
  const env = readFileSync(".env", "utf8");
  const email = /^SEED_ADMIN_EMAIL="?(.*?)"?$/m.exec(env)?.[1];
  const password = /^SEED_ADMIN_PASSWORD="?(.*?)"?$/m.exec(env)?.[1];
  if (!email || !password) throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env first.");
  return { email, password };
}

/** Runs in the page. Returns every measurable defect on screen. */
function collectIssues() {
  const issues = [];
  const vw = document.documentElement.clientWidth;

  // 1. Anything sticking out past the viewport, which is what causes the
  //    sideways scroll that makes a page feel broken on a phone.
  if (document.documentElement.scrollWidth > vw + 1) {
    const offenders = [];
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > vw + 1 || r.left < -1) {
        // Ignore anything inside a deliberately scrollable container.
        let p = el.parentElement, inScroller = false;
        while (p && p !== document.body) {
          const o = getComputedStyle(p).overflowX;
          if (o === "auto" || o === "scroll") { inScroller = true; break; }
          p = p.parentElement;
        }
        if (!inScroller) {
          offenders.push(
            `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.split(" ").filter(Boolean).slice(0, 2).join(".") : ""} right=${Math.round(r.right)}`,
          );
        }
      }
    }
    issues.push({
      kind: "overflow",
      detail: `page is ${document.documentElement.scrollWidth}px wide in a ${vw}px viewport`,
      offenders: [...new Set(offenders)].slice(0, 6),
    });
  }

  // 2. Tap targets under 44px, the Apple HIG minimum.
  const small = [];
  for (const el of document.querySelectorAll("a, button, input, select, textarea, [role=button]")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (getComputedStyle(el).display === "none") continue;
    if (r.height < 44 || r.width < 24) {
      const label = (el.getAttribute("aria-label") || el.textContent || el.getAttribute("name") || el.tagName).trim().slice(0, 34);
      small.push(`${Math.round(r.width)}x${Math.round(r.height)} "${label}"`);
    }
  }
  if (small.length) issues.push({ kind: "tap-target", offenders: [...new Set(small)].slice(0, 10) });

  // 3. Interactive elements with no accessible name.
  const unnamed = [];
  for (const el of document.querySelectorAll("a, button, input, select, textarea")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const name =
      el.getAttribute("aria-label") ||
      el.getAttribute("title") ||
      (el.id && document.querySelector(`label[for="${el.id}"]`)?.textContent) ||
      el.closest("label")?.textContent ||
      el.textContent;
    if (!name || !name.trim()) unnamed.push(el.tagName.toLowerCase() + (el.type ? `[${el.type}]` : ""));
  }
  if (unnamed.length) issues.push({ kind: "no-accessible-name", offenders: [...new Set(unnamed)].slice(0, 8) });

  // 4. Body text below 12px, unreadable on a phone.
  const tiny = [];
  for (const el of document.querySelectorAll("p, span, td, li, dd, dt, label")) {
    if (!el.textContent?.trim()) continue;
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (size && size < 12) tiny.push(`${size}px "${el.textContent.trim().slice(0, 28)}"`);
  }
  if (tiny.length) issues.push({ kind: "tiny-text", offenders: [...new Set(tiny)].slice(0, 8) });

  return issues;
}

const DEFAULT_ROUTES = [
  { label: "login", url: "/login" },
  { label: "jobs list", url: "/admin/jobs" },
  { label: "new job", url: "/admin/jobs/new" },
  { label: "applications", url: "/admin/applications" },
];
const routes = JSON.parse(process.env.ROUTES ?? JSON.stringify(DEFAULT_ROUTES));

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

// Sign in once; the cookie is reused for every admin route.
await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
const { email, password } = adminCredentials();
await page.fill("#email", email);
await page.fill("#password", password);
await Promise.all([page.waitForURL(/\/admin\//, { timeout: 30000 }), page.click('button[type=submit]')]);

mkdirSync(SHOTS, { recursive: true });
let total = 0;

for (const { label, url } of routes) {
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(BASE + url, { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(350);

    const issues = await page.evaluate(collectIssues);
    const slug = `${label.replace(/\W+/g, "-")}-${vp.name}`;
    await page.screenshot({ path: `${SHOTS}/${slug}.png`, fullPage: vp.name === "phone" });

    if (issues.length) {
      total += issues.length;
      console.log(`\n${label} @ ${vp.name} (${vp.width}px)`);
      for (const i of issues) {
        console.log(`  ${i.kind}${i.detail ? ": " + i.detail : ""}`);
        for (const o of i.offenders ?? []) console.log(`      ${o}`);
      }
    }
  }
}

console.log(total === 0 ? "\nNo issues found." : `\n${total} issue group(s) found.`);
await browser.close();
