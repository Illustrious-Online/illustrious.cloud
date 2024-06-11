import { Elysia, t } from "elysia";
import { Invoice } from "../domain/models/invoice";
import * as invoiceController from "../modules/invoice";

export default (app: Elysia) =>
  app
    // @ts-expect-error
    .get("/invoices/:id", invoiceController.fetchOne, {
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
            data: Invoice,
          },
          {
            description: "Successfully gathered the requested invoice",
          },
        ),
        400: t.Object({
          code: t.Number({
            examples: [400],
          }),
          message: t.String({
            examples: ["Failed to find requested invoice"],
          }),
        }),
      },
    })
    // @ts-expect-error
    .post("/invoices", invoiceController.create, {
      body: Invoice,
      response: {
        200: t.Object(
          {
            message: t.String(),
            data: Invoice,
          },
          {
            description: "Successfully created new invoice",
          },
        ),
        400: t.Object(
          {
            code: t.Number({
              examples: [400],
            }),
            message: t.String({
              examples: ["Unable to find requested invoice"],
            }),
          },
          {
            description: "Unable to process with authorization from invoice",
          },
        ),
        409: t.Object(
          {
            code: t.Number({
              examples: [409],
            }),
            message: t.String({
              examples: ["Invoice already exists"],
            }),
          },
          {
            description: "There was a conflict when creating a new invoice",
          },
        ),
      },
    })
    // @ts-expect-error
    .put("/invoices/:id", invoiceController.update, {
      body: Invoice,
      response: {
        200: t.Object(
          {
            message: t.String(),
            data: Invoice,
          },
          {
            description: "Successfully updated the invoice",
          },
        ),
        400: t.Object(
          {
            code: t.Number({
              examples: [400],
            }),
            message: t.String({
              examples: ["Unable to find invoice to be updated"],
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
              examples: ["Invoice already exists"],
            }),
          },
          {
            description: "There was a conflict when updating the invoice",
          },
        ),
      },
    })
    // @ts-expect-error Swagger plugin disagrees when adding 200 response
    .delete("/invoices/:org/:id", invoiceController.deleteOne, {
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
            description: "Successfully deleted invoice & relations",
          },
        ),
        400: t.Object(
          {
            code: t.Number({
              examples: [400],
            }),
            message: t.String({
              examples: ["Failed to delete invoice"],
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
              examples: ["Unable to find invoice to processes delete"],
            }),
          },
          {
            description: "There was a conflict deleting the invoice",
          },
        ),
      },
    });
