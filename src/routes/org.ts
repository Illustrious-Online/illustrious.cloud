import * as orgController from "@/modules/org";
import { type Elysia, t } from "elysia";
import authPlugin from "../plugins/auth";

export default (app: Elysia) =>
  app
    .post("/org", authPlugin, orgController.create)
    .get("/org/:org", authPlugin, orgController.fetchOne)
    .get("/org/res/:org/:resource", authPlugin, orgController.fetchResources)
    .put("/org/:org", authPlugin, orgController.update)
    .delete("/org/:org", authPlugin, orgController.deleteOne);
