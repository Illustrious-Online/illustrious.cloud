import * as invoiceController from "@/modules/invoice";
import { type Elysia, t } from "elysia";

/**
 * Registers the invoice routes with the provided Elysia application instance.
 *
 * @param {Elysia} app - The Elysia application instance.
 *
 * @remarks
 * This function sets up the following routes:
 * - POST /invoice: Creates a new invoice. Requires authentication.
 * - GET /invoice/:invoice: Fetches a specific invoice by its identifier. Requires authentication.
 * - PUT /invoice: Updates an existing invoice. Requires authentication.
 * - DELETE /invoice/:invoice: Deletes a specific invoice by its identifier. Requires authentication.
 *
 * Each route uses the `authPlugin` middleware to ensure the user is authenticated before accessing the route.
 * The `invoiceController` handles the logic for each route.
 */
export default (app: Elysia) =>
  app
    .post("/invoice", invoiceController.postInvoice)
    .get("/invoice/:invoice", invoiceController.getInvoice)
    .put("/invoice/:invoice", invoiceController.putInvoice)
    .delete("/invoice/:invoice", invoiceController.deleteInvoice);
