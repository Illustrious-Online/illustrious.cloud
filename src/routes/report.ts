import * as reportController from "@/modules/report";
import { type Elysia, t } from "elysia";

/**
 * Registers the report routes with the provided Elysia application instance.
 *
 * @param app - The Elysia application instance to register the routes with.
 *
 * The following routes are registered:
 * - POST /report: Creates a new report.
 * - GET /report/:report: Retrieves a specific report by its identifier.
 * - PUT /report/:report: Updates a specific report by its identifier.
 * - DELETE /report/:report: Deletes a specific report by its identifier.
 */
export default (app: Elysia) =>
  app
    .post("/report", reportController.postReport)
    .get("/report/:report", reportController.getReport)
    .put("/report/:report", reportController.putReport)
    .delete("/report/:report", reportController.deleteReport);
