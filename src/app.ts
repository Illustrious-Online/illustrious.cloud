import cors from "@elysiajs/cors";
import swagger from "@elysiajs/swagger";
import { logger } from "@tqman/nice-logger";
import { Elysia } from "elysia";

import config from "./config";
import errorPlugin from "./plugins/error";
import authRoutes from "./routes/auth";

import invoiceRouter from "@/routes/invoice";
import orgRoutes from "@/routes/org";
import reportRouter from "@/routes/report";
import userRoutes from "@/routes/user";

import * as Sentry from "@sentry/bun";
import authPlugin from "./plugins/auth";

if (config.app.env === "production") {
  Sentry.init({
    dsn: config.app.sentryUrl,
    tracesSampleRate: 1.0,
  });
}

export const app = new Elysia()
  .use(cors())
  .use(
    logger({
      mode: "live",
      withTimestamp: true,
    }),
  )
  .use(errorPlugin)
  .use(authPlugin)
  .use(
    swagger({
      path: "/docs",
      documentation: {
        info: {
          title: "Illustrious Cloud API Docs",
          version: config.app.version,
        },
        security: [{ bearerAuth: [] }],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT",
            },
          },
        },
      },
      swaggerOptions: {
        persistAuthorization: true,
      },
    }),
  )
  .get("/", () => ({
    name: config.app.name,
    version: config.app.version,
  }))
  .use(authRoutes)
  .use(userRoutes)
  .use(orgRoutes)
  .use(reportRouter)
  .use(invoiceRouter)
  .listen(config.app.port, () => {
    console.log(`Environment: ${config.app.env}`);
    console.log(
      `Illustrious Cloud API is running at ${config.app.host}:${config.app.port}`,
    );
  });
