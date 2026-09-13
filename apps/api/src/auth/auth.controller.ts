import { Body, Controller, Get, HttpCode, Post, Res, UnauthorizedException } from "@nestjs/common";
import type { Response } from "express";
import { Throttle } from "@nestjs/throttler";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "./auth.service.js";
import { LoginDto } from "./dto.js";
import { AUTH_COOKIE, CurrentUser, Public, type SessionUser } from "./index.js";
import { env } from "../env.js";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly jwt: JwtService,
  ) {}

  @Public()
  @Post("login")
  @HttpCode(200)
  // Credential stuffing protection: 5 attempts per minute per IP.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.validateCredentials(dto.email, dto.password);
    // Deliberately identical for unknown email, wrong password and deactivated
    // account. Telling them apart is a user-enumeration gift.
    if (!user) throw new UnauthorizedException("Email or password is incorrect.");

    const session: SessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    res.cookie(AUTH_COOKIE, await this.jwt.signAsync(session), {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: env.sessionTtlHours * 3600_000,
    });
    return session;
  }

  @Public()
  @Post("logout")
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(AUTH_COOKIE, { path: "/" });
  }

  @Get("me")
  me(@CurrentUser() user: SessionUser): SessionUser {
    return user;
  }
}
