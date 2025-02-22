import * as reportController from "@/modules/report";
import { type Elysia, t } from "elysia";

export default (app: Elysia) =>
  app
    .post("/report", reportController.create)
    .get("/report/:report", reportController.fetchOne)
    .put("/report", reportController.update)
    .delete("/report/:report", reportController.deleteOne);
