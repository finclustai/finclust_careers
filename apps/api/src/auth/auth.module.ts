import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller.js";
import { UsersController } from "./users.controller.js";
import { AuthService } from "./auth.service.js";
import { PrismaUserRepository } from "./prisma-user-repository.js";
import { UserRepository } from "./user-repository.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { env } from "../env.js";

@Module({
  imports: [
    JwtModule.register({
      secret: env.jwtSecret,
      signOptions: { expiresIn: `${env.sessionTtlHours}h` },
    }),
  ],
  controllers: [AuthController, UsersController],
  providers: [
    AuthService,
    PrismaService,
    // AuthService receives the port; only this line knows it is Prisma.
    { provide: UserRepository, useClass: PrismaUserRepository },
  ],
  exports: [JwtModule, PrismaService],
})
export class AuthModule {}
