import * as invoiceController from "@/modules/invoice";
import { type Elysia, t } from "elysia";

export default (app: Elysia) =>
  app
    .post("/invoice", invoiceController.create)
    .get("/invoice/:invoice", invoiceController.fetchOne)
    .put("/invoice", invoiceController.update)
    .delete("/invoice/:invoice", invoiceController.deleteOne);
