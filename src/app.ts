import bearer from "@elysiajs/bearer";
import cors from "@elysiajs/cors";
import swagger from "@elysiajs/swagger";
import { Elysia } from "elysia";

import { createClient } from "@supabase/supabase-js";
import config from "./config";
import errorPlugin from "./plugins/error";
import loggerPlugin from "./plugins/logger";
import authRoutes from "./routes/auth";
import protectedRoutes from "./routes/protected";

import * as Sentry from "@sentry/bun";

if (config.app.env === "production") {
  Sentry.init({
    dsn: config.app.sentryUrl,
    tracesSampleRate: 1.0,
  });
}

export const supabaseClient = createClient(
  `https://${config.auth.supabaseId}.supabase.co`,
  config.auth.supabaseServiceRoleKey,
);

export const app = new Elysia()
  .use(cors())
  .use(
    swagger({
      path: "/docs",
      documentation: {
        info: {
          title: "Illustrious Cloud API Docs",
          version: config.app.version,
        },
        security: [{ JwtAuth: [] }],
        components: {
          securitySchemes: {
            JwtAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT",
              description: "Enter JWT Bearer token **_only_**",
            },
          },
        },
      },
      swaggerOptions: {
        persistAuthorization: true,
      },
    }),
  )
  .use(bearer())
  .use(loggerPlugin)
  .use(errorPlugin)
  .get("/", () => ({
    name: config.app.name,
    version: config.app.version,
  }))
  .use(authRoutes)
  .use(protectedRoutes)
  .listen(config.app.port, () => {
    console.log(`Environment: ${config.app.env}`);
    console.log(
      `Illustrious Cloud API is running at ${config.app.host}:${config.app.port}`,
    );
  });
