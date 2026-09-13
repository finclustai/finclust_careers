import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import type { Role } from "@finclust/db";

export const AUTH_COOKIE = "finclust_session";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

declare module "express" {
  interface Request {
    user?: SessionUser;
  }
}

export const PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(PUBLIC_KEY, true);

export const ROLES_KEY = "roles";
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, targets)) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = request.cookies?.[AUTH_COOKIE];
    if (!token) throw new UnauthorizedException("Sign in to continue.");

    try {
      request.user = await this.jwt.verifyAsync<SessionUser>(token);
    } catch {
      throw new UnauthorizedException("Your session has expired. Sign in again.");
    }

    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, targets);
    if (required?.length && !required.includes(request.user.role)) {
      throw new ForbiddenException("You do not have access to this.");
    }
    return true;
  }
}
