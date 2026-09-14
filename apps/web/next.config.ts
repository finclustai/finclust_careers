import type { NextConfig } from "next";

const API_ORIGIN = process.env.API_ORIGIN ?? "http://127.0.0.1:3001";

const nextConfig: NextConfig = {
  // Link-preview images read bundled font files from disk. Declared explicitly
  // so the files are guaranteed to ship with those routes on Vercel.
  outputFileTracingIncludes: {
    "/opengraph-image": ["./assets/**/*.ttf"],
    "/apply/[jobId]/opengraph-image": ["./assets/**/*.ttf"],
  },
  // Same-origin proxy to the NestJS API (ADR-0004). The session cookie is
  // SameSite=Lax, so a cross-site API host would have it dropped by the browser.
  // Proxying here means local development behaves exactly like production.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` }];
  },
};

export default nextConfig;
