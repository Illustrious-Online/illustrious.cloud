import { type Elysia, t } from "elysia";
import * as invoiceController from "@/modules/invoice";

export default (app: Elysia) =>
  app
    .post("/invoice", invoiceController.create)
    .get("/invoice/:invoice", invoiceController.fetchOne)
    .put("/invoice", invoiceController.update)
    .delete("/invoice/:invoice", invoiceController.deleteOne);
