import { Body, ConflictException, Controller, Get, Post } from "@nestjs/common";
import { IsString, MaxLength, MinLength } from "class-validator";
import { Prisma } from "@finclust/db";
import { PrismaService } from "../prisma/prisma.service.js";
import { Roles } from "../auth/index.js";

export class CreateJobProfileDto {
  @IsString()
  @MinLength(2, { message: "Enter a profile name." })
  @MaxLength(120)
  name!: string;
}

/**
 * Lookup data the admin UI needs to populate dropdowns. Read-only and kept
 * deliberately thin: never widen these selects, they feed client bundles.
 */
@Controller()
export class ReferenceController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("job-profiles")
  profiles() {
    return this.prisma.client.jobProfile.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Lets an admin add a profile from the create-job form without leaving it.
   * Idempotent on name: asking for a profile that exists returns the existing
   * one rather than failing, so a race between two admins cannot 500.
   */
  @Post("job-profiles")
  @Roles("ADMIN")
  async createProfile(@Body() dto: CreateJobProfileDto) {
    const name = dto.name.trim();
    if (!name) throw new ConflictException("Enter a profile name.");

    try {
      return await this.prisma.client.jobProfile.create({
        data: { name },
        select: { id: true, name: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return this.prisma.client.jobProfile.findUniqueOrThrow({
          where: { name },
          select: { id: true, name: true },
        });
      }
      throw error;
    }
  }

  @Get("recruiters")
  @Roles("ADMIN")
  recruiters() {
    return this.prisma.client.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    });
  }
}
