import { Report } from "@/domain/models/report";
import * as reportController from "@/modules/report";
import { type Elysia, t } from "elysia";

/**
 * Sets up the report routes for the application.
 *
 * @param {Elysia} app - The Elysia application instance.
 *
 * @route POST /report
 * @description Creates a new report.
 * @body {Object} body - The request body.
 * @body {string} body.client - The client identifier.
 * @body {string} body.org - The organization identifier.
 * @body {Report} body.report - The report data.
 * @response {201} - Report created successfully.
 * @response {400} - Bad request.
 * @response {401} - Unauthorized.
 * @response {409} - Report already exists.
 *
 * @route GET /report/:report
 * @description Retrieves a report by its identifier.
 * @param {Object} params - The request parameters.
 * @param {string} params.report - The report identifier.
 * @response {201} - Report retrieved successfully.
 * @response {400} - Bad request.
 * @response {401} - Unauthorized.
 * @response {404} - Report not found.
 *
 * @route PUT /report/:report
 * @description Updates a report by its identifier.
 * @param {Object} params - The request parameters.
 * @param {string} params.report - The report identifier.
 * @response {201} - Report updated successfully.
 * @response {400} - Bad request.
 * @response {401} - Unauthorized.
 * @response {404} - Report not found.
 * @response {503} - Service unavailable.
 *
 * @route DELETE /report/:report
 * @description Deletes a report by its identifier.
 * @param {Object} params - The request parameters.
 * @param {string} params.report - The report identifier.
 * @response {201} - Report deleted successfully.
 * @response {400} - Bad request.
 * @response {401} - Unauthorized.
 * @response {404} - Report not found.
 */
export default (app: Elysia) =>
  app
    .post("/report", reportController.postReport, {
      body: t.Object({
        client: t.String(),
        org: t.String(),
        report: Report,
      }),
      response: {
        201: t.Object({
          message: t.String(),
          report: Report,
        }),
        400: t.Object({
          code: t.Number({ examples: [400] }),
          message: t.String({ examples: ["Bad Request!"] }),
        }),
        401: t.Object({
          code: t.Number({ examples: [401] }),
          message: t.String({ examples: ["Unauthorized!"] }),
        }),
        409: t.Object({
          code: t.Number({ examples: [409] }),
          message: t.String({ examples: ["The report already exists."] }),
        }),
      },
    })
    .get("/report/:report", reportController.getReport, {
      params: t.Object({
        report: t.String(),
      }),
      response: {
        201: t.Object({
          message: t.String(),
          report: Report,
        }),
        400: t.Object({
          code: t.Number({ examples: [400] }),
          message: t.String({ examples: ["Bad Request!"] }),
        }),
        401: t.Object({
          code: t.Number({ examples: [401] }),
          message: t.String({ examples: ["Unauthorized!"] }),
        }),
        404: t.Object({
          code: t.Number({ examples: [404] }),
          message: t.String({ examples: ["Not Found!"] }),
        }),
      },
    })
    .put("/report/:report", reportController.putReport, {
      params: t.Object({
        report: t.String(),
      }),
      response: {
        201: t.Object({
          message: t.String(),
          report: Report,
        }),
        400: t.Object({
          code: t.Number({ examples: [400] }),
          message: t.String({ examples: ["Bad Request!"] }),
        }),
        401: t.Object({
          code: t.Number({ examples: [401] }),
          message: t.String({ examples: ["Unauthorized!"] }),
        }),
        404: t.Object({
          code: t.Number({ examples: [404] }),
          message: t.String({ examples: ["Not Found!"] }),
        }),
        503: t.Object({
          code: t.Number({ examples: [503] }),
          message: t.String({ examples: ["The invoice already exists."] }),
        }),
      },
    })
    .delete("/report/:report", reportController.deleteReport, {
      params: t.Object({
        report: t.String(),
      }),
      response: {
        201: t.Object({
          message: t.String(),
        }),
        400: t.Object({
          code: t.Number({ examples: [400] }),
          message: t.String({ examples: ["Bad Request!"] }),
        }),
        401: t.Object({
          code: t.Number({ examples: [401] }),
          message: t.String({ examples: ["Unauthorized!"] }),
        }),
        404: t.Object({
          code: t.Number({ examples: [404] }),
          message: t.String({ examples: ["Not Found!"] }),
        }),
      },
    });
