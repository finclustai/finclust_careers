import { Module } from "@nestjs/common";
import { ApplyController } from "./apply.controller.js";
import { ApplyService } from "./apply.service.js";
import { StorageService } from "../storage/storage.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

@Module({
  controllers: [ApplyController],
  providers: [ApplyService, StorageService, PrismaService],
  exports: [StorageService],
})
export class ApplyModule {}
