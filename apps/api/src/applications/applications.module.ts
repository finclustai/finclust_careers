import { Module } from "@nestjs/common";
import { ApplicationsController } from "./applications.controller.js";
import { ApplicationsService } from "./applications.service.js";
import { StorageService } from "../storage/storage.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

@Module({
  controllers: [ApplicationsController],
  providers: [ApplicationsService, StorageService, PrismaService],
})
export class ApplicationsModule {}
