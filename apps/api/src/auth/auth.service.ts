import { Injectable } from "@nestjs/common";
import bcrypt from "bcryptjs";
import type { AuthUser } from "./user-repository.js";
import { UserRepository } from "./user-repository.js";

// Compared against when no user matches, so an unknown email costs the same
// time as a wrong password. Without it, response latency tells an attacker
// which addresses are registered.
const DUMMY_HASH = bcrypt.hashSync("finclust-timing-equaliser", 10);

@Injectable()
export class AuthService {
  constructor(private readonly users: UserRepository) {}

  async validateCredentials(email: string, password: string): Promise<AuthUser | null> {
    const user = await this.users.findByEmail(email);

    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH);
      return null;
    }
    if (!(await bcrypt.compare(password, user.passwordHash))) return null;
    // Checked after the hash comparison, so a deactivated account is not
    // distinguishable from a wrong password by timing either.
    if (!user.isActive) return null;

    return user;
  }
}
