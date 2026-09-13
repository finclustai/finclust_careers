import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import type { AuthUser } from "./user-repository.js";
import { UserRepository } from "./user-repository.js";

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<AuthUser | null> {
    // Emails are stored lowercase; normalising here means a user typing
    // "Admin@Finclust.com" on a phone keyboard still logs in.
    return this.prisma.client.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, email: true, passwordHash: true, name: true, role: true, isActive: true },
    });
  }
}
