# End-to-end tests

    pnpm test:e2e           # build, then run everything
    npx playwright test     # run again without rebuilding
    pnpm test:e2e:report    # open the HTML report (screenshots, videos of failures)

Every flow runs on four screens: 360px Android, 390px iPhone (WebKit), 768px
tablet and 1280px desktop. Each page is also checked for content that pokes past
the screen edge and, on phones, for buttons and fields under 44px.

Playwright starts the API, the website and `fake-zoho.mjs`, a stand-in for Zoho
Mail, so sharing CVs is tested without leaving drafts in the real mailbox.

**Data.** The database is shared with the live site. Tests only create records
prefixed `E2E` (a temporary job, candidates, a recruiter with an `@e2e.test`
email) and `global-teardown.ts` erases them, CVs included. Setup also erases
leftovers from any earlier run that crashed. The temporary job is visible on
careers.finclust.ai while the tests run.

Needs the root `.env` (database, storage and `SEED_ADMIN_*` credentials).
