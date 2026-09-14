import { ExecutionContext, Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { Request } from "express";
import { clientIp } from "./client-ip.js";
import { usesSharedLimit } from "./throttle-policy.js";
import { PUBLIC_KEY } from "../auth/auth.guard.js";

// Where @Throttle({ default: ... }) stores a route's own limit. Not exported by
// @nestjs/throttler, so named here.
const OWN_LIMIT_KEY = "THROTTLER:LIMITdefault";

/**
 * Rate limits per real client rather than per proxy. See clientIp for why the
 * default (the socket address) would lock out every candidate on Vercel, and
 * usesSharedLimit for which routes are limited at all.
 */
@Injectable()
export class ClientIpThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, unknown>): Promise<string> {
    const request = req as unknown as Request;
    return clientIp(request.headers, request.socket?.remoteAddress ?? "unknown");
  }

  protected override async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    return !usesSharedLimit({
      isPublic: Boolean(this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, targets)),
      hasOwnLimit: this.reflector.getAllAndOverride<number>(OWN_LIMIT_KEY, targets) !== undefined,
    });
  }
}
