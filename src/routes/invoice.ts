import * as invoiceController from "@/modules/invoice";
import { type Elysia, t } from "elysia";
import authPlugin from "../plugins/auth";

export default (app: Elysia) =>
  app
    .post("/invoice", authPlugin, invoiceController.create)
    .get("/invoice/:invoice", authPlugin, invoiceController.fetchOne)
    .put("/invoice", authPlugin, invoiceController.update)
    .delete("/invoice/:invoice", authPlugin, invoiceController.deleteOne);
