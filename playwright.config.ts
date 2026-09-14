import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end suite: every flow on four screen sizes, against the real API and
 * website with a stand-in for Zoho. Run with `pnpm test:e2e` (builds first).
 *
 * Tests write temporary "E2E" records to the shared database and
 * e2e/global-teardown.ts erases them (see e2e/README.md).
 */
const FAKE_ZOHO = "http://127.0.0.1:4010";

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  outputDir: "e2e/.results",
  reporter: [["list"], ["html", { outputFolder: "e2e/.report", open: "never" }]],
  // Retrying would re-submit applications and trip the API's own rate limits.
  retries: 0,
  // The API rate-limits by IP; every test shares 127.0.0.1.
  workers: 3,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "android-360",
      use: { ...devices["Pixel 7"], viewport: { width: 360, height: 780 } },
    },
    { name: "iphone-390", use: { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } } },
    { name: "tablet-768", use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } } },
    { name: "desktop-1280", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
  ],
  webServer: [
    {
      command: "node e2e/fake-zoho.mjs",
      url: `${FAKE_ZOHO}/__health`,
      reuseExistingServer: false,
    },
    {
      command: "node dist/main.js",
      cwd: "apps/api",
      url: "http://127.0.0.1:3001/api/health",
      reuseExistingServer: false,
      timeout: 60_000,
      // Real process env wins over apps/api/.env, so the API talks to the fake.
      env: {
        ZOHO_ACCOUNTS_URL: FAKE_ZOHO,
        ZOHO_MAIL_API_URL: FAKE_ZOHO,
        ZOHO_CLIENT_ID: "e2e",
        ZOHO_CLIENT_SECRET: "e2e",
        ZOHO_REFRESH_TOKEN: "e2e",
      },
    },
    {
      command: "npx next start -p 3000",
      cwd: "apps/web",
      url: "http://127.0.0.1:3000/login",
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
