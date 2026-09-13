import { Prisma, PrismaClient } from "@prisma/client";

export * from "@prisma/client";

// Serverless reuses the module across invocations; a new client per invocation
// exhausts the pooler (ADR-0004).
const globalForPrisma = globalThis as unknown as { prisma?: ExtendedPrismaClient };

/**
 * P1001 is "can't reach database server". It means the query never left the
 * client, so re-running it cannot duplicate a write -- which is what makes a
 * blind retry safe here, unlike P1017 (connection closed mid-flight), which is
 * deliberately not retried.
 *
 * This exists because the database sits a long way from the app: round trips
 * run 600-950ms and a small fraction of connection attempts simply fail. Without
 * this, each one surfaces as a 500 on whatever the recruiter happened to click.
 * Moving the database closer is the real fix; this stops it being visible.
 */
const RETRYABLE = "P1001";
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [150, 500];

// "Can't reach database server" arrives in two different shapes depending on
// whether the pool already had a connection. As a KnownRequestError it carries
// code P1001; as an InitializationError it carries no code at all -- errorCode
// is undefined -- so the message is the only thing left to match on. Verified
// against Prisma 6.19; if a future version starts setting errorCode, the first
// branch will catch it and the string match becomes dead weight rather than a
// bug.
const UNREACHABLE = "can't reach database server";

function isRetryable(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) return error.code === RETRYABLE;
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return (
      error.errorCode === RETRYABLE || error.message.toLowerCase().includes(UNREACHABLE)
    );
  }
  return false;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function createClient() {
  return new PrismaClient({ log: ["warn", "error"] }).$extends({
    query: {
      async $allOperations({ args, query, model, operation }) {
        let lastError: unknown;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          try {
            return await query(args);
          } catch (error) {
            lastError = error;
            if (!isRetryable(error) || attempt === MAX_ATTEMPTS) throw error;

            console.warn(
              `[db] ${model ?? "raw"}.${operation} could not reach the database ` +
                `(attempt ${attempt}/${MAX_ATTEMPTS}), retrying`,
            );
            await sleep(BACKOFF_MS[attempt - 1] ?? 500);
          }
        }

        throw lastError;
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof createClient>;

export const prisma: ExtendedPrismaClient = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
