import * as reportController from "@/modules/report";
import { type Elysia, t } from "elysia";
import authPlugin from "../plugins/auth";

export default (app: Elysia) =>
  app
    .post("/report", authPlugin, reportController.create)
    .get("/report/:report", authPlugin, reportController.fetchOne)
    .put("/report", authPlugin, reportController.update)
    .delete("/report/:report", authPlugin, reportController.deleteOne);
