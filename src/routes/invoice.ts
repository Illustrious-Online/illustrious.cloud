import { Invoice } from "@/domain/models/invoice";
import * as invoiceController from "@/modules/invoice";
import { type Elysia, t } from "elysia";

/**
 * Sets up the routes for handling invoices.
 *
 * @param {Elysia} app - The Elysia application instance.
 *
 * @route POST /invoice
 * @summary Create a new invoice.
 * @param {Object} body - The request body.
 * @param {string} body.client - The client associated with the invoice.
 * @param {string} body.org - The organization associated with the invoice.
 * @param {Invoice} body.invoice - The invoice details.
 * @response 201 - Invoice created successfully.
 * @response 400 - Bad request.
 * @response 401 - Unauthorized.
 * @response 409 - The invoice already exists.
 *
 * @route GET /invoice/:invoice
 * @summary Retrieve an invoice by its identifier.
 * @param {Object} params - The request parameters.
 * @param {string} params.invoice - The invoice identifier.
 * @response 201 - Invoice retrieved successfully.
 * @response 400 - Bad request.
 * @response 401 - Unauthorized.
 * @response 404 - Invoice not found.
 *
 * @route PUT /invoice/:invoice
 * @summary Update an existing invoice by its identifier.
 * @param {Object} params - The request parameters.
 * @param {string} params.invoice - The invoice identifier.
 * @response 201 - Invoice updated successfully.
 * @response 400 - Bad request.
 * @response 401 - Unauthorized.
 * @response 404 - Invoice not found.
 * @response 503 - Failed to update the invoice.
 *
 * @route DELETE /invoice/:invoice
 * @summary Delete an invoice by its identifier.
 * @param {Object} params - The request parameters.
 * @param {string} params.invoice - The invoice identifier.
 * @response 201 - Invoice deleted successfully.
 * @response 400 - Bad request.
 * @response 401 - Unauthorized.
 * @response 404 - Invoice not found.
 */
export default (app: Elysia) =>
  app
    .post("/invoice", invoiceController.postInvoice, {
      body: t.Object({
        client: t.String(),
        org: t.String(),
        invoice: Invoice,
      }),
      response: {
        201: t.Object({
          message: t.String(),
          invoice: Invoice,
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
          message: t.String({ examples: ["The invoice already exists."] }),
        }),
      },
    })
    .get("/invoice/:invoice", invoiceController.getInvoice, {
      params: t.Object({
        invoice: t.String(),
      }),
      response: {
        201: t.Object({
          message: t.String(),
          invoice: Invoice,
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
    .put("/invoice/:invoice", invoiceController.putInvoice, {
      params: t.Object({
        invoice: t.String(),
      }),
      response: {
        201: t.Object({
          message: t.String(),
          invoice: Invoice,
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
          message: t.String({ examples: ["Failed to update the invoice."] }),
        }),
      },
    })
    .delete("/invoice/:invoice", invoiceController.deleteInvoice, {
      params: t.Object({
        invoice: t.String(),
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
