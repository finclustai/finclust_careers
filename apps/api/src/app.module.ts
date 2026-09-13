import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { ClientIpThrottlerGuard } from "./common/client-ip-throttler.guard.js";
import { AuthModule } from "./auth/auth.module.js";
import { AuthGuard } from "./auth/auth.guard.js";
import { JobsModule } from "./jobs/jobs.module.js";
import { ApplyModule } from "./apply/apply.module.js";
import { ApplicationsModule } from "./applications/applications.module.js";

@Module({
  imports: [
    // Baseline limit. The public apply endpoint tightens this further.
    // ponytail: in-memory store, so on Vercel each warm function instance
    // counts separately and a cold start resets the count. Adequate as a spam
    // deterrent at current volume; move to a shared store (e.g. Upstash Redis)
    // if abuse ever gets through.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    AuthModule,
    JobsModule,
    ApplyModule,
    ApplicationsModule,
  ],
  providers: [
    // Keyed on the real client IP, not the proxy in front of us.
    { provide: APP_GUARD, useClass: ClientIpThrottlerGuard },
    // Authentication is on by default; @Public() is the deliberate exception.
    // The inverse (opt-in guards) is how an endpoint ends up unprotected.
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
