import { Elysia, t } from "elysia";
import { Report } from "../domain/models/report";
import * as reportController from "../modules/report";

export default (app: Elysia) =>
  app
    // @ts-expect-error
    .get("/reports/:id", reportController.fetchOne, {
      headers: t.Object({
        authorization: t.String(),
      }),
      params: t.Object({
        id: t.String(),
      }),
      response: {
        200: t.Object(
          {
            message: t.String(),
            data: Report,
          },
          {
            description: "Successfully gathered the requested report",
          },
        ),
        400: t.Object({
          code: t.Number({
            examples: [400],
          }),
          message: t.String({
            examples: ["Failed to find requested report"],
          }),
        }),
      },
    })
    // @ts-expect-error
    .post("/reports", reportController.create, {
      body: t.Object({
        org: t.String(),
        report: Report,
      }),
      response: {
        200: t.Object(
          {
            message: t.String(),
            data: Report,
          },
          {
            description: "Successfully created new report",
          },
        ),
        400: t.Object(
          {
            code: t.Number({
              examples: [400],
            }),
            message: t.String({
              examples: ["Unable to find requested report"],
            }),
          },
          {
            description: "Unable to process with authorization from request",
          },
        ),
        409: t.Object(
          {
            code: t.Number({
              examples: [409],
            }),
            message: t.String({
              examples: ["Report already exists"],
            }),
          },
          {
            description: "There was a conflict when creating a new report",
          },
        ),
      },
    })
    // @ts-expect-error
    .put("/reports/:id", reportController.update, {
      body: t.Object({
        org: t.String(),
        report: Report,
      }),
      response: {
        200: t.Object(
          {
            message: t.String(),
            data: Report,
          },
          {
            description: "Successfully updated the report",
          },
        ),
        400: t.Object(
          {
            code: t.Number({
              examples: [400],
            }),
            message: t.String({
              examples: ["Unable to find report to be updated"],
            }),
          },
          {
            description: "Unable to process with authorization from request",
          },
        ),
        409: t.Object(
          {
            code: t.Number({
              examples: [409],
            }),
            message: t.String({
              examples: ["Report already exists"],
            }),
          },
          {
            description: "There was a conflict when updating the report",
          },
        ),
      },
    })
    // @ts-expect-error Swagger plugin disagrees when adding 200 response
    .delete("/reports/:org/:id", reportController.deleteOne, {
      params: t.Object({
        org: t.String(),
        id: t.String(),
      }),
      response: {
        200: t.Object(
          {
            message: t.String(),
          },
          {
            description: "Successfully deleted new report & relations",
          },
        ),
        400: t.Object(
          {
            code: t.Number({
              examples: [400],
            }),
            message: t.String({
              examples: ["Failed to delete report"],
            }),
          },
          {
            description: "Unable to process with authorization from request",
          },
        ),
        409: t.Object(
          {
            code: t.Number({
              examples: [409],
            }),
            message: t.String({
              examples: ["Unable to find report to processes delete"],
            }),
          },
          {
            description: "There was a conflict deleting the report",
          },
        ),
      },
    });
