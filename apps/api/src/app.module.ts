import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./auth/auth.module.js";
import { AuthGuard } from "./auth/auth.guard.js";
import { JobsModule } from "./jobs/jobs.module.js";
import { ApplyModule } from "./apply/apply.module.js";
import { ApplicationsModule } from "./applications/applications.module.js";

@Module({
  imports: [
    // Baseline limit. The public apply endpoint tightens this further.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    AuthModule,
    JobsModule,
    ApplyModule,
    ApplicationsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Authentication is on by default; @Public() is the deliberate exception.
    // The inverse (opt-in guards) is how an endpoint ends up unprotected.
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
