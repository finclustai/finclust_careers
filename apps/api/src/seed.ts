import bcrypt from "bcryptjs";
import { prisma } from "@finclust/db";

/**
 * Seeds the first Admin and the job profiles from the requirement document.
 * Idempotent: safe to run against an existing database.
 */
async function main() {
  // Both come from the environment only. The repository is public, so a default
  // here would publish the admin username.
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD before seeding.");
  }

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: process.env.SEED_ADMIN_NAME ?? "FINCLUST Admin",
      passwordHash: await bcrypt.hash(password, 12),
      role: "ADMIN",
    },
  });

  for (const name of [
    "Oracle EBS Finance",
    "Oracle Fusion Finance",
    "Oracle EPM",
    "Oracle APEX",
  ]) {
    await prisma.jobProfile.upsert({ where: { name }, update: {}, create: { name } });
  }

  console.log(`admin ready: ${admin.email}`);
  console.log(`job profiles: ${await prisma.jobProfile.count()}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
