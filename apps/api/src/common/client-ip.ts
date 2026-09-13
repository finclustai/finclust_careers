type Headers = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const candidate = raw?.split(",")[0]?.trim();
  return candidate || undefined;
}

/**
 * The address of the person making the request, not of whatever proxied it.
 *
 * On Vercel every request reaches the API through Vercel's own network, so the
 * socket address is Vercel's, not the candidate's. Rate limiting on it would put
 * every candidate in one bucket and lock them all out after five applications.
 *
 * Vercel overwrites both headers below at its edge with the real client address,
 * so a client cannot spoof them to dodge the limit. The socket fallback only
 * applies in local development, where there is no proxy.
 */
export function clientIp(headers: Headers, socketAddress: string): string {
  return first(headers["x-vercel-forwarded-for"]) ?? first(headers["x-forwarded-for"]) ?? socketAddress;
}
