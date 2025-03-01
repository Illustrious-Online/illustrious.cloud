import * as orgController from "@/modules/org";
import { type Elysia, t } from "elysia";

/**
 * Registers the organization-related routes with the provided Elysia application instance.
 *
 * @param {Elysia} app - The Elysia application instance.
 * @returns {Elysia} The Elysia application instance with the registered routes.
 *
 * The following routes are registered:
 * - POST /org: Creates a new organization.
 * - POST /org/user: Adds a user to an organization.
 * - GET /org/:org: Retrieves information about a specific organization.
 * - GET /org/:org/res/:user?: Retrieves resources for a specific organization, optionally filtered by user.
 * - PUT /org/:org: Updates information about a specific organization.
 * - DELETE /org/:org: Deletes a specific organization.
 */
export default (app: Elysia) =>
  app
    .post("/org", orgController.postOrg)
    .post("/org/user", orgController.postOrgUser)
    .get("/org/:org", orgController.getOrg)
    .get("/org/:org/res/:user?", orgController.getOrgResources)
    .put("/org/:org", orgController.updateOrg)
    .delete("/org/:org", orgController.deleteOrg);
