import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { Request } from "express";
import { clientIp } from "./client-ip.js";

/**
 * Rate limits per real client rather than per proxy. See clientIp for why the
 * default (the socket address) would lock out every candidate on Vercel.
 */
@Injectable()
export class ClientIpThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, unknown>): Promise<string> {
    const request = req as unknown as Request;
    return clientIp(request.headers, request.socket?.remoteAddress ?? "unknown");
  }
}
