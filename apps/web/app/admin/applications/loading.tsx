// A loading boundary for this folder, not just the one for all of /admin.
// Without it, going from an application up to a long list hung for good on
// Next 15.5: the /admin boundary was already on screen, so the navigation
// waited for the whole new page and never committed (7-9 of 9 attempts in
// Chrome; 0 of 36 with this boundary). The same applies to jobs.
export { default } from "../loading";
