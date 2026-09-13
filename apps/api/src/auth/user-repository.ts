import type { Role } from "@finclust/db";

export interface AuthUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: Role;
  isActive: boolean;
}

/**
 * Port. AuthService depends on this, never on Prisma, so credential logic is
 * testable without a database.
 */
export abstract class UserRepository {
  abstract findByEmail(email: string): Promise<AuthUser | null>;
}
