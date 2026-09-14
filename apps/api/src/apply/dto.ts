import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class ApplyDto {
  @IsString()
  @MinLength(2, { message: "Enter your full name." })
  @MaxLength(150)
  fullName!: string;

  @IsString()
  @MaxLength(30)
  phone!: string;

  // Storage path returned by the upload-url endpoint. Confirmed against storage
  // before it is trusted: a candidate is free to post any path here.
  @IsString()
  @MaxLength(300)
  resumePath!: string;

  @IsString()
  @MaxLength(200)
  resumeFileName!: string;

  @IsOptional()
  @IsEmail({}, { message: "Enter a valid email address." })
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  location?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(60)
  totalExperience?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  currentCompany?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  noticePeriod?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  expectedSalary?: string;

  @IsOptional()
  @IsUrl(
    { host_whitelist: [/(^|\.)linkedin\.com$/] },
    { message: "That does not look like a LinkedIn profile URL." },
  )
  @MaxLength(300)
  linkedinUrl?: string;

  // Stored from day one. Nothing reads it yet (ADR-0005), but consent cannot be
  // obtained retroactively from people who have already applied.
  @IsOptional()
  @IsBoolean()
  whatsappOptIn?: boolean;

  // Kept only when the job has the note box switched on (ApplyService.apply).
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: "Keep your note under 2,000 characters." })
  candidateNote?: string;
}

export class StatusLookupDto {
  @IsString()
  @MinLength(8, { message: "Enter your application reference." })
  @MaxLength(60)
  reference!: string;

  @IsString()
  @MaxLength(30)
  phone!: string;
}

export class UploadUrlDto {
  @IsString()
  @MaxLength(200)
  fileName!: string;
}
