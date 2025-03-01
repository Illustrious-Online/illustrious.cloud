import * as invoiceController from "@/modules/invoice";
import { type Elysia, t } from "elysia";

/**
 * Registers the invoice routes with the provided Elysia application instance.
 *
 * @param {Elysia} app - The Elysia application instance.
 *
 * The following routes are registered:
 * - POST /invoice: Creates a new invoice.
 * - GET /invoice/:invoice: Retrieves an invoice by its ID.
 * - PUT /invoice/:invoice: Updates an existing invoice by its ID.
 * - DELETE /invoice/:invoice: Deletes an invoice by its ID.
 */
export default (app: Elysia) =>
  app
    .post("/invoice", invoiceController.postInvoice)
    .get("/invoice/:invoice", invoiceController.getInvoice)
    .put("/invoice/:invoice", invoiceController.putInvoice)
    .delete("/invoice/:invoice", invoiceController.deleteInvoice);
