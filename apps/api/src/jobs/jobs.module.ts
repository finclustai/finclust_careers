import { Module } from "@nestjs/common";
import { JobsController } from "./jobs.controller.js";
import { ReferenceController } from "./reference.controller.js";
import { JobsService } from "./jobs.service.js";
import { PublicLinksService } from "./public-links.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

@Module({
  controllers: [JobsController, ReferenceController],
  providers: [JobsService, PublicLinksService, PrismaService],
  exports: [PublicLinksService],
})
export class JobsModule {}
