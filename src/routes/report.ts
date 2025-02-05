import { type Elysia, t } from "elysia";
import * as reportController from "@/modules/report";

export default (app: Elysia) =>
  app
    .post("/report", reportController.create)
    .get("/report/:report", reportController.fetchOne)
    .put("/report", reportController.update)
    .delete("/report/:report", reportController.deleteOne);
