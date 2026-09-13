import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it } from "vitest";
import { AuthService } from "./auth.service.js";
import type { AuthUser, UserRepository } from "./user-repository.js";

class InMemoryUserRepository implements UserRepository {
  constructor(private readonly users: AuthUser[] = []) {}
  async findByEmail(email: string): Promise<AuthUser | null> {
    return this.users.find((u) => u.email === email.toLowerCase()) ?? null;
  }
}

const PASSWORD = "correct-horse-battery";

function userWith(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: "u1",
    email: "recruiter@finclust.test",
    passwordHash: bcrypt.hashSync(PASSWORD, 4),
    name: "Test Recruiter",
    role: "RECRUITER",
    isActive: true,
    ...overrides,
  };
}

describe("AuthService.validateCredentials", () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService(new InMemoryUserRepository([userWith()]));
  });

  it("returns the user when the password is correct", async () => {
    const user = await service.validateCredentials("recruiter@finclust.test", PASSWORD);
    expect(user?.id).toBe("u1");
  });

  it("refuses a wrong password", async () => {
    expect(await service.validateCredentials("recruiter@finclust.test", "wrong")).toBeNull();
  });

  it("refuses an unknown email", async () => {
    expect(await service.validateCredentials("nobody@finclust.test", PASSWORD)).toBeNull();
  });

  it("refuses a deactivated user even with the correct password", async () => {
    const deactivated = new AuthService(
      new InMemoryUserRepository([userWith({ isActive: false })]),
    );
    expect(await deactivated.validateCredentials("recruiter@finclust.test", PASSWORD)).toBeNull();
  });
});
