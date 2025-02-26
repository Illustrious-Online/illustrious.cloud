import cors from "@elysiajs/cors";
import swagger from "@elysiajs/swagger";
import { Elysia } from "elysia";

import { createClient } from "@supabase/supabase-js";
import config from "./config";
import errorPlugin from "./plugins/error";
import loggerPlugin from "./plugins/logger";
import authRoutes from "./routes/auth";
import protectedRoutes from "./routes/protected";

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

export const supabaseClient = createClient(
  `https://${config.auth.supabaseId}.supabase.co`,
  config.auth.supabaseServiceRoleKey ?? "test",
);

export const app = new Elysia()
  .use(cors())
  .use(loggerPlugin)
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
