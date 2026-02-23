import cors from "@elysiajs/cors";
import { fromTypes, openapi } from "@elysiajs/openapi";
import { logger } from "@tqman/nice-logger";
import { Elysia } from "elysia";

import config from "./config";
import { auth } from "./lib/auth";
import { inquiryRoutes } from "./modules/inquiry/routes";
import { invoiceRoutes } from "./modules/invoice/routes";
import { notificationRoutes } from "./modules/notification/routes";
import { orgRoutes } from "./modules/org/routes";
import { reportRoutes } from "./modules/report/routes";
import { userRoutes } from "./modules/user/routes";
import errorPlugin from "./plugins/error";
import { initSentry } from "./utils/sentry";

// Initialize Sentry before creating the app
initSentry();

export const app = new Elysia()
  // CORS Configuration for Cross-Domain
  .use(
    cors({
      origin: config.betterAuth.trustedOrigins,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      exposeHeaders: ["Set-Cookie"],
    }),
  )
  // Logger
  .use(
    logger({
      mode: "live",
      withTimestamp: true,
    }),
  )
  // Error handling
  .use(errorPlugin)
  // Health check and info endpoints
  .get("/", () => ({
    name: config.app.name,
    version: config.app.version,
  }))
  .get("/health", () => ({ ok: true }))
  // Mount Better-Auth routes
  // Handles: /api/auth/sign-in, /api/auth/sign-up, /api/auth/sign-out, etc.
  .all("/api/auth/*", ({ request }) => auth.handler(request))
  // Business routes
  .use(userRoutes)
  .use(orgRoutes)
  .use(inquiryRoutes)
  .use(invoiceRoutes)
  .use(reportRoutes)
  .use(notificationRoutes)
  // OpenAPI docs (must be after routes so spec includes all endpoints)
  .use(
    openapi({
      path: "/docs",
      provider: "scalar",
      // Embed spec in HTML so Scalar displays routes in production (avoids fetch/URL issues)
      embedSpec: config.app.env === "production",
      // fromTypes needs .d.ts in production; runtime schema is sufficient
      references:
        config.app.env === "production" ? undefined : fromTypes("src/app.ts"),
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
    }),
  )
  .listen({ hostname: "0.0.0.0", port: Number(config.app.port) }, () => {
    console.log(`Environment: ${config.app.env}`);
    console.log(
      `Illustrious Cloud API is running at ${config.app.host}:${config.app.port}`,
    );
  });

// Export app type for Eden Treaty
export type App = typeof app;
