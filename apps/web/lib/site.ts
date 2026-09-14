/**
 * Absolute origin of the public site. WhatsApp and every other link preview
 * require absolute image URLs, so metadata cannot use relative paths.
 */
export const SITE_URL = (process.env.SITE_URL ?? "https://careers.finclust.ai").replace(/\/$/, "");

export const BRAND = {
  name: "FINCLUST",
  site: "FINCLUST Careers",
  mainSite: "https://finclust.ai",
  mainSiteLabel: "finclust.ai",
} as const;
