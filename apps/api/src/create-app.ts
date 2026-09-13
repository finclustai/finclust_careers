import "reflect-metadata";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module.js";

/**
 * Builds and configures the application without starting a server, so the same
 * setup runs both as a local long-lived process (main.ts) and as a Vercel
 * function (serverless.ts). Configuration lives only here, so the two cannot
 * drift apart.
 */
export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { logger: ["error", "warn", "log"] });

  app.setGlobalPrefix("api");
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      // Unknown fields are rejected outright rather than stripped silently, so
      // a client sending status or role on the public apply form gets a 400.
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  return app;
}
