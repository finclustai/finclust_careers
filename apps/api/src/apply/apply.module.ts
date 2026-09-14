import { Module } from "@nestjs/common";
import { ApplyController } from "./apply.controller.js";
import { PublicController } from "./public.controller.js";
import { ApplyService } from "./apply.service.js";
import { StorageService } from "../storage/storage.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

@Module({
  controllers: [ApplyController, PublicController],
  providers: [ApplyService, StorageService, PrismaService],
  exports: [StorageService],
})
export class ApplyModule {}
