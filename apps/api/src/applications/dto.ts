import { Type } from "class-transformer";
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from "class-validator";
import { APPLICATION_SOURCES, APPLICATION_STATUSES, type ApplicationSource, type ApplicationStatus } from "@finclust/domain";


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
  @IsOptional() @IsEnum(APPLICATION_SOURCES) source?: ApplicationSource;

  @IsOptional() @IsISO8601() appliedFrom?: string;
  @IsOptional() @IsISO8601() appliedTo?: string;

  @IsOptional() @IsString() @MaxLength(200) search?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  // Capped: an uncapped page size is a free full-table scan for any caller.
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
}

export class NoteDto {
  @IsString()
  @MinLength(1, { message: "Write a note first." })
  @MaxLength(4000)
  body!: string;
}

export class AssignDto {
  // null or absent unassigns.
  @IsOptional() @IsUUID() recruiterId?: string | null;
}
