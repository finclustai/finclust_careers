import type { IncomingMessage, ServerResponse } from "node:http";
import type { INestApplication } from "@nestjs/common";
import { createApp } from "./create-app.js";

// Built once per warm function instance and reused across invocations. Creating
// Nest on every request would repeat module initialisation and open a fresh
// database pool each time, which exhausts the pooler (ADR-0004).
let ready: Promise<INestApplication> | undefined;

async function app(): Promise<INestApplication> {
  ready ??= createApp().then(async (instance) => {
    await instance.init();
    return instance;
  });
  return ready;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const instance = await app();
  instance.getHttpAdapter().getInstance()(req, res);
}
