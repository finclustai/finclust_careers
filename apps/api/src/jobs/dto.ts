import { Type } from "class-transformer";
import {
  IsArray, IsEnum, IsInt, IsISO8601, IsOptional, IsString,
  Matches, Max, MaxLength, Min, MinLength,
} from "class-validator";

const JOB_ID = /^[A-Z0-9]+(-[A-Z0-9]+)*$/;

export class CreateJobOpeningDto {
  // Appears in every public link and Application Reference, so it is constrained
  // to URL-safe uppercase segments: EBS-FIN-001.
  @Matches(JOB_ID, {
    message: "Job ID must be uppercase letters, digits and hyphens, e.g. EBS-FIN-001.",
  })
  @MaxLength(40)
  jobId!: string;

  @IsString() @MinLength(3) @MaxLength(200)
  title!: string;

  @IsString()
  profileId!: string;

  @IsOptional() @IsString() @MaxLength(20000)
  description?: string;

  @IsOptional() @IsArray() @IsString({ each: true }) @MaxLength(60, { each: true })
  requiredSkills?: string[];

  @IsOptional() @IsString() @MaxLength(200) client?: string;
  @IsOptional() @IsString() @MaxLength(200) location?: string;

  @IsOptional() @IsEnum(["ONSITE", "HYBRID", "REMOTE"]) workMode?: "ONSITE" | "HYBRID" | "REMOTE";
  @IsOptional() @IsEnum(["FULL_TIME", "CONTRACT", "INTERNSHIP"])
  employmentType?: "FULL_TIME" | "CONTRACT" | "INTERNSHIP";

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(60) minExperience?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(60) maxExperience?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(999) openings?: number;

  @IsOptional() @IsISO8601() closesAt?: string;
}

export class UpdateJobOpeningDto extends CreateJobOpeningDto {
  // jobId is immutable once created: it is baked into every Application
  // Reference already issued and into links recruiters have shared.
  @IsOptional() @Matches(JOB_ID) declare jobId: string;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(200) declare title: string;
  @IsOptional() @IsString() declare profileId: string;
}

export class ChangeJobStatusDto {
  @IsEnum(["DRAFT", "ACTIVE", "ON_HOLD", "CLOSED", "CANCELLED"])
  status!: "DRAFT" | "ACTIVE" | "ON_HOLD" | "CLOSED" | "CANCELLED";
}

export class ListJobsQueryDto {
  @IsOptional() @IsEnum(["DRAFT", "ACTIVE", "ON_HOLD", "CLOSED", "CANCELLED"])
  status?: "DRAFT" | "ACTIVE" | "ON_HOLD" | "CLOSED" | "CANCELLED";

  @IsOptional() @IsString() @MaxLength(200) search?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  // Capped: an uncapped page size is a free full-table scan for any caller.
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
}
