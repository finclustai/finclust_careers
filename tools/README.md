# tools

`audit.mjs` loads every screen at 375 / 768 / 1440px in a real browser and
reports what a static build cannot catch: content wider than the viewport, tap
targets under 44px, text under 12px, and interactive elements with no
accessible name. Screenshots land in `tools/shots/`.

    pnpm dev          # in one terminal
    pnpm audit        # in another

`ROUTES` overrides the default page list; see the script.

`e2e-candidate.mjs` then `e2e-admin.mjs` walk both journeys end to end: apply
with a Word CV, check status, then the dashboard, boards, notes, users and
Trash. The database is shared with the live site, so they run on a temporary
job and erase everything they created at the end.

    python tools/make-test-docx.py
    node tools/e2e-candidate.mjs && node tools/e2e-admin.mjs
