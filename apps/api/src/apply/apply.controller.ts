import { Body, Controller, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApplyService } from "./apply.service.js";
import { ApplyDto, UploadUrlDto } from "./dto.js";
import { StorageService } from "../storage/storage.service.js";
import { Public } from "../auth/index.js";

/**
 * The only unauthenticated write surface in the system. Every route here is
 * rate limited: each one creates database rows or storage objects, so without a
 * limit this is a free way to fill both.
 */
@Public()
@Controller("apply")
export class ApplyController {
  constructor(
    private readonly apply: ApplyService,
    private readonly storage: StorageService,
  ) {}

  @Get(":jobId")
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  getOpening(@Param("jobId") jobId: string, @Query("source") source?: string) {
    return this.apply.getOpening(jobId, source);
  }

  @Post(":jobId/upload-url")
  @HttpCode(200)
  // Tighter than the form itself: each call reserves a storage slot.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async createUploadUrl(@Param("jobId") jobId: string, @Body() dto: UploadUrlDto) {
    return this.storage.createUploadUrl(jobId.trim().toUpperCase(), dto.fileName);
  }

  @Post(":jobId")
  @HttpCode(201)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  submit(
    @Param("jobId") jobId: string,
    @Body() dto: ApplyDto,
    @Query("source") source?: string,
  ) {
    return this.apply.apply(jobId, source, dto);
  }
}
