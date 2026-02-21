import { Elysia } from "elysia";
import { auth } from "@/lib/auth";
import { inquiryRoutes } from "@/modules/inquiry/routes";
import { invoiceRoutes } from "@/modules/invoice/routes";
import { notificationRoutes } from "@/modules/notification/routes";
import { orgRoutes } from "@/modules/org/routes";
import { reportRoutes } from "@/modules/report/routes";
import { userRoutes } from "@/modules/user/routes";
import errorPlugin from "@/plugins/error";

/**
 * Creates a test Elysia app with all routes but without
 * external dependencies like CORS, Swagger, Sentry, etc.
 * Includes auth routes for integration tests that need to create real sessions.
 */
export function createTestApp() {
  return new Elysia()
    .use(errorPlugin)
    .get("/", () => ({ name: "test", version: "1.0.0" }))
    .get("/health", () => ({ ok: true }))
    .all("/api/auth/*", ({ request }) => auth.handler(request))
    .use(userRoutes)
    .use(orgRoutes)
    .use(invoiceRoutes)
    .use(reportRoutes)
    .use(inquiryRoutes)
    .use(notificationRoutes);
}
