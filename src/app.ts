import fs from "fs";
import bearer from "@elysiajs/bearer";
import cors from "@elysiajs/cors";
import swagger from "@elysiajs/swagger";
import * as Sentry from "@sentry/bun";
import { Elysia } from "elysia";

import config from "./config";
import errorPlugin from "./plugins/error";
import loggerPlugin from "./plugins/logger";
import authRoutes from "./routes/auth";
import protectedRoutes from "./routes/protected";

Sentry.init({
  dsn: "https://2c933d82dd3bc0ef8dea175540ec8f72@o4507144038907904.ingest.us.sentry.io/4507189633351680",
  // Performance Monitoring
  tracesSampleRate: 1.0, // Capture 100% of the transactions
});

export const app = new Elysia();

app
  .use(cors())
  .use(swagger())
  .use(bearer())
  .use(loggerPlugin)
  .use(errorPlugin)
  .use(
    swagger({
      path: "/docs",
      documentation: {
        info: {
          title: "Illustrious Cloud API Docs",
          version: config.app.version,
        },
      },
    }),
  )
  .get("/", () => ({
    name: config.app.name,
    version: config.app.version,
  }))
  .use(authRoutes)
  .use(protectedRoutes)
  .listen(config.app.port, () => {
    console.log(`Environment: ${config.app.env}`);
    console.log(
      `Illustrious Cloud API is running at ${app.server?.hostname}:${app.server?.port}`,
    );
  });
