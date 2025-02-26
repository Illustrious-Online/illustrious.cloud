import * as reportController from "@/modules/report";
import { type Elysia, t } from "elysia";

/**
 * Sets up the report routes for the application.
 *
 * @param {Elysia} app - The application instance.
 *
 * @route POST /report - Creates a new report.
 * @route GET /report/:report - Fetches a specific report by ID.
 * @route PUT /report - Updates an existing report.
 * @route DELETE /report/:report - Deletes a specific report by ID.
 *
 * @middleware authPlugin - Middleware to authenticate the user.
 * @controller reportController - Controller handling the report logic.
 */
export default (app: Elysia) =>
  app
    .post("/report", reportController.create)
    .get("/report/:report", reportController.fetchOne)
    .put("/report/:report", reportController.update)
    .delete("/report/:report", reportController.deleteOne);
