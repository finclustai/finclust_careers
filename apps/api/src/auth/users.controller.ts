import {
  BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, Put,
} from "@nestjs/common";
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import bcrypt from "bcryptjs";
import { Prisma } from "@finclust/db";
import { PrismaService } from "../prisma/prisma.service.js";
import { CurrentUser, Roles, type SessionUser } from "./index.js";

const ROLES = ["ADMIN", "RECRUITER"] as const;

class PasswordDto {
  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters." })
  @MaxLength(200)
  password!: string;
}

class CreateUserDto extends PasswordDto {
  @IsString() @MinLength(2, { message: "Enter a name." }) @MaxLength(120) name!: string;
  @IsEmail({}, { message: "Enter a valid email address." }) @MaxLength(255) email!: string;
  @IsEnum(ROLES) role!: (typeof ROLES)[number];
}

class UpdateUserDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsEnum(ROLES) role?: (typeof ROLES)[number];
  @IsOptional() @IsBoolean() isActive?: boolean;
}

const USER_FIELDS = {
  id: true, name: true, email: true, role: true, isActive: true, createdAt: true,
  _count: { select: { assignedApplications: { where: { deletedAt: null } } } },
} satisfies Prisma.UserSelect;

/**
 * Admins manage logins here. There is no email service, so a forgotten password
 * is reset by an admin who then tells the person the new one.
 */
@Controller("users")
@Roles("ADMIN")
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.client.user.findMany({
      select: USER_FIELDS,
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    try {
      return await this.prisma.client.user.create({
        data: {
          name: dto.name.trim(),
          email: dto.email.trim().toLowerCase(),
          role: dto.role,
          passwordHash: await bcrypt.hash(dto.password, 12),
        },
        select: USER_FIELDS,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Someone already signs in with that email.");
      }
      throw error;
    }
  }

  @Put(":id")
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() me: SessionUser,
  ) {
    // Otherwise the last admin can lock everyone out of this page.
    if (id === me.id && (dto.isActive === false || dto.role === "RECRUITER")) {
      throw new BadRequestException("You cannot deactivate or demote your own account.");
    }
    await this.exists(id);
    return this.prisma.client.user.update({
      where: { id },
      data: { name: dto.name?.trim(), role: dto.role, isActive: dto.isActive },
      select: USER_FIELDS,
    });
  }

  @Put(":id/password")
  async resetPassword(@Param("id", ParseUUIDPipe) id: string, @Body() dto: PasswordDto) {
    await this.exists(id);
    await this.prisma.client.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(dto.password, 12) },
    });
    return { ok: true };
  }

  private async exists(id: string) {
    const user = await this.prisma.client.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) throw new NotFoundException("That user does not exist.");
  }
}
