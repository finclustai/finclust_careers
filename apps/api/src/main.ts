import { createApp } from "./create-app.js";

// Local development: a long-running server. Vercel uses serverless.ts instead.
async function bootstrap() {
  const app = await createApp();
  await app.listen(process.env.PORT ?? 3001);
}

void bootstrap();
