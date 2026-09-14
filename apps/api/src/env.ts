import { config } from "dotenv";

// Loaded here rather than in main.ts: this module is imported by AppModule at
// decoration time, which runs before any statement in main.ts. Loading it
// anywhere else makes correctness depend on import order.
config();

/**
 * Validated once at boot. A missing secret should kill the process at start,
 * not surface as a confusing 500 on the first login attempt.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  jwtSecret: required("JWT_SECRET"),
  sessionTtlHours: Number(process.env.SESSION_TTL_HOURS ?? 12),
  supabaseUrl: required("SUPABASE_URL"),
  supabaseSecretKey: required("SUPABASE_SECRET_KEY"),
  resumeBucket: process.env.SUPABASE_RESUME_BUCKET ?? "resumes",
  isProduction: process.env.NODE_ENV === "production",
  // Optional: without these, sharing CVs by email is switched off, not broken.
  zoho: process.env.ZOHO_REFRESH_TOKEN
    ? {
        accountsUrl: process.env.ZOHO_ACCOUNTS_URL ?? "https://accounts.zoho.in",
        mailApiUrl: process.env.ZOHO_MAIL_API_URL ?? "https://mail.zoho.in",
        clientId: required("ZOHO_CLIENT_ID"),
        clientSecret: required("ZOHO_CLIENT_SECRET"),
        refreshToken: process.env.ZOHO_REFRESH_TOKEN,
      }
    : null,
};
