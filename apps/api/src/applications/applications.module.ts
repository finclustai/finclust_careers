import { Module } from "@nestjs/common";
import { ApplicationsController } from "./applications.controller.js";
import { ApplicationsService } from "./applications.service.js";
import { TrashController } from "./trash.controller.js";
import { StorageService } from "../storage/storage.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

@Module({
  controllers: [ApplicationsController, TrashController],
  providers: [ApplicationsService, StorageService, PrismaService],
})
export class ApplicationsModule {}
