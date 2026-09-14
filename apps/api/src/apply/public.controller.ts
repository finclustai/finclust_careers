import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApplyService } from "./apply.service.js";
import { StatusLookupDto } from "./dto.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { Public } from "../auth/index.js";

@Public()
@Controller()
export class PublicController {
  constructor(
    private readonly apply: ApplyService,
    private readonly prisma: PrismaService,
  ) {}

  /** Open roles for the careers home page. */
  @Get("public/jobs")
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  jobs() {
    return this.apply.listOpenJobs();
  }

  /**
   * Tight limit: reference plus phone is the only thing standing between a
   * guesser and someone's application status.
   */
  @Post("public/status")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  status(@Body() dto: StatusLookupDto) {
    return this.apply.lookupStatus(dto);
  }

  /**
   * Touches the database, not just the process. That is the point: an uptime
   * check hitting this keeps a free Supabase project from pausing after a
   * quiet week, and fails loudly when the database is actually unreachable.
   */
  @Get("health")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async health() {
    const started = Date.now();
    await this.prisma.client.$queryRaw`SELECT 1`;
    return { ok: true, database: "reachable", latencyMs: Date.now() - started };
  }
}
