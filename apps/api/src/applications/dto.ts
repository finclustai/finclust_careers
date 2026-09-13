import { Type } from "class-transformer";
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from "class-validator";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@finclust/domain";

const SOURCES = ["WHATSAPP", "LINKEDIN", "WEBSITE", "REFERRAL", "OTHER"] as const;

export class ChangeStatusDto {
  @IsEnum(APPLICATION_STATUSES, {
    message: `Status must be one of: ${APPLICATION_STATUSES.join(", ")}.`,
  })
  status!: ApplicationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

export class ListApplicationsQueryDto {
  @IsOptional() @IsUUID() jobOpeningId?: string;
  @IsOptional() @IsUUID() profileId?: string;
  @IsOptional() @IsUUID() recruiterId?: string;

  @IsOptional() @IsEnum(APPLICATION_STATUSES) status?: ApplicationStatus;
  @IsOptional() @IsEnum(SOURCES) source?: (typeof SOURCES)[number];

  @IsOptional() @IsISO8601() appliedFrom?: string;
  @IsOptional() @IsISO8601() appliedTo?: string;

  @IsOptional() @IsString() @MaxLength(200) search?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  // Capped: an uncapped page size is a free full-table scan for any caller.
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
}
