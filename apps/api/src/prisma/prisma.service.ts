import { Injectable } from "@nestjs/common";
import { prisma } from "@finclust/db";

/**
 * Thin wrapper so Nest can inject the shared singleton. The client itself is
 * created once per module load in @finclust/db, which is what keeps the
 * connection pooler from being exhausted under serverless (ADR-0004).
 */
@Injectable()
export class PrismaService {
  readonly client = prisma;
}
