export const APPLICATION_SOURCES = [
  "WHATSAPP",
  "LINKEDIN",
  "WEBSITE",
  "REFERRAL",
  "OTHER",
] as const;

export type ApplicationSource = (typeof APPLICATION_SOURCES)[number];

export function normaliseSource(raw: string | undefined | null): ApplicationSource {
  const candidate = raw?.trim().toUpperCase();
  return (APPLICATION_SOURCES as readonly string[]).includes(candidate ?? "")
    ? (candidate as ApplicationSource)
    : "OTHER";
}
