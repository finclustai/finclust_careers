# tools

`audit.mjs` loads every screen at 375 / 768 / 1440px in a real browser and
reports what a static build cannot catch: content wider than the viewport, tap
targets under 44px, text under 12px, and interactive elements with no
accessible name. Screenshots land in `tools/shots/`.

    pnpm dev          # in one terminal
    pnpm audit        # in another

`ROUTES` overrides the default page list; see the script.

End-to-end tests live in `e2e/`; see `e2e/README.md`.
