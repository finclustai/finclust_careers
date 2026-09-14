import { cleanup, prisma } from "./support";

export default async function globalTeardown() {
  await cleanup();
  await prisma.$disconnect();
}
