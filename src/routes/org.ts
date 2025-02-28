import * as orgController from "@/modules/org";
import { type Elysia, t } from "elysia";
import authPlugin from "../plugins/auth";

/**
 * Registers routes for organization-related operations.
 *
 * @param {Elysia} app - The Elysia application instance.
 *
 * @route POST /org - Creates a new organization.
 * @route GET /org/:org - Fetches details of a specific organization.
 * @route GET /org/res/:org/:resource - Fetches resources of a specific organization.
 * @route PUT /org/:org - Updates an existing organization.
 * @route DELETE /org/:org - Deletes a specific organization.
 *
 * @middleware authPlugin - Middleware to handle authentication for all routes.
 * @controller orgController - Controller handling the organization operations.
 */
export default (app: Elysia) =>
  app
    .post("/org", authPlugin, orgController.postOrg)
    .get("/org/:org", authPlugin, orgController.getOrg)
    .get("/org/res/:org/:user?", orgController.getOrgResources)
    .put("/org/:org", authPlugin, orgController.updateOrg)
    .delete("/org/:org", authPlugin, orgController.deleteOrg);
