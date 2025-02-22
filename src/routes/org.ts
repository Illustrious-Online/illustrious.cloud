import * as orgController from "@/modules/org";
import { type Elysia, t } from "elysia";

export default (app: Elysia) =>
  app
    .post("/org", orgController.create)
    .get("/org/:org", orgController.fetchOne)
    .get("/org/res/:org/:resource", orgController.fetchResources)
    .put("/org/:org", orgController.update)
    .delete("/org/:org", orgController.deleteOne);
