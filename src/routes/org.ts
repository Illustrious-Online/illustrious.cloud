import { Org } from "@/domain/models/org";
import { User } from "@/domain/models/user";
import * as orgController from "@/modules/org";
import { type Elysia, t } from "elysia";

/**
 * Defines the routes for organization-related operations.
 *
 * @param {Elysia} app - The Elysia application instance.
 * @returns {Elysia} The Elysia application instance with the defined routes.
 *
 * @route POST /org
 * @description Creates a new organization.
 * @body {Object} body - The request body containing the organization details.
 * @response {Object} 201 - The created organization and a success message.
 * @response {Object} 400 - Bad request error with a message.
 * @response {Object} 401 - Unauthorized error with a message.
 * @response {Object} 409 - Conflict error indicating the organization already exists.
 *
 * @route POST /org/:org/user
 * @description Adds a user to an organization.
 * @body {Object} body - The request body containing the user details.
 * @response {Object} 201 - The added user and a success message.
 * @response {Object} 400 - Bad request error with a message.
 * @response {Object} 401 - Unauthorized error with a message.
 * @response {Object} 409 - Conflict error indicating the user already exists.
 *
 * @route GET /org/:org
 * @description Retrieves details of an organization.
 * @params {Object} params - The request parameters containing the organization identifier.
 * @response {Object} 201 - The organization details and a success message.
 * @response {Object} 400 - Bad request error with a message.
 * @response {Object} 401 - Unauthorized error with a message.
 * @response {Object} 404 - Not found error indicating the organization does not exist.
 *
 * @route PUT /org/:org
 * @description Updates an organization.
 * @params {Object} params - The request parameters containing the organization identifier.
 * @response {Object} 201 - The updated organization and a success message.
 * @response {Object} 400 - Bad request error with a message.
 * @response {Object} 401 - Unauthorized error with a message.
 * @response {Object} 404 - Not found error indicating the organization does not exist.
 *
 * @route PUT /org/:org/user/:user
 * @description Updates a user in an organization.
 * @params {Object} params - The request parameters containing the organization and user identifiers.
 * @response {Object} 201 - The updated user and a success message.
 * @response {Object} 400 - Bad request error with a message.
 * @response {Object} 401 - Unauthorized error with a message.
 * @response {Object} 404 - Not found error indicating the user or organization does not exist.
 * @response {Object} 503 - Service unavailable error indicating the update failed.
 *
 * @route DELETE /org/:org
 * @description Deletes an organization.
 * @params {Object} params - The request parameters containing the organization identifier.
 * @response {Object} 201 - A success message indicating the organization was deleted.
 * @response {Object} 400 - Bad request error with a message.
 * @response {Object} 401 - Unauthorized error with a message.
 * @response {Object} 404 - Not found error indicating the organization does not exist.
 * @response {Object} 409 - Conflict error indicating the organization has invoices or reports.
 */
export default (app: Elysia) =>
  app
    .post("/org", orgController.postOrg, {
      body: Org,
      response: {
        201: t.Object({
          message: t.String(),
          org: Org,
        }),
        400: t.Object({
          code: t.Number({ examples: [400] }),
          message: t.String({ examples: ["Bad Request!"] }),
        }),
        401: t.Object({
          code: t.Number({ examples: [401] }),
          message: t.String({ examples: ["Unauthorized!"] }),
        }),
        409: t.Object({
          code: t.Number({ examples: [409] }),
          message: t.String({ examples: ["The org already exists."] }),
        }),
      },
    })
    .post("/org/:org/user", orgController.postOrgUser, {
      params: t.Object({
        org: t.String(),
      }),
      body: User,
      response: {
        201: t.Object({
          message: t.String(),
          user: Org,
        }),
        400: t.Object({
          code: t.Number({ examples: [400] }),
          message: t.String({ examples: ["Bad Request!"] }),
        }),
        401: t.Object({
          code: t.Number({ examples: [401] }),
          message: t.String({ examples: ["Unauthorized!"] }),
        }),
        409: t.Object({
          code: t.Number({ examples: [409] }),
          message: t.String({ examples: ["The user already exists."] }),
        }),
      },
    })
    .get("/org/:org", orgController.getOrg, {
      params: t.Object({
        org: t.String(),
      }),
      response: {
        201: t.Object({
          message: t.String(),
          org: Org,
          details: t.Object({}),
        }),
        400: t.Object({
          code: t.Number({ examples: [400] }),
          message: t.String({ examples: ["Bad Request!"] }),
        }),
        401: t.Object({
          code: t.Number({ examples: [401] }),
          message: t.String({ examples: ["Unauthorized!"] }),
        }),
        404: t.Object({
          code: t.Number({ examples: [404] }),
          message: t.String({ examples: ["Not Found!"] }),
        }),
      },
    })
    .put("/org/:org", orgController.putOrg, {
      params: t.Object({
        org: t.String(),
      }),
      response: {
        201: t.Object({
          message: t.String(),
          org: Org,
        }),
        400: t.Object({
          code: t.Number({ examples: [400] }),
          message: t.String({ examples: ["Bad Request!"] }),
        }),
        401: t.Object({
          code: t.Number({ examples: [401] }),
          message: t.String({ examples: ["Unauthorized!"] }),
        }),
        404: t.Object({
          code: t.Number({ examples: [404] }),
          message: t.String({ examples: ["Not Found!"] }),
        }),
      },
    })
    .put("/org/:org/user/:user", orgController.putOrgUser, {
      params: t.Object({
        org: t.String(),
        user: t.String(),
      }),
      response: {
        201: t.Object({
          message: t.String(),
          user: Org,
        }),
        400: t.Object({
          code: t.Number({ examples: [400] }),
          message: t.String({ examples: ["Bad Request!"] }),
        }),
        401: t.Object({
          code: t.Number({ examples: [401] }),
          message: t.String({ examples: ["Unauthorized!"] }),
        }),
        404: t.Object({
          code: t.Number({ examples: [404] }),
          message: t.String({ examples: ["Not Found!"] }),
        }),
        503: t.Object({
          code: t.Number({ examples: [503] }),
          message: t.String({ examples: ["Failed to update the org."] }),
        }),
      },
    })
    .delete("/org/:org", orgController.deleteOrg, {
      params: t.Object({
        org: t.String(),
      }),
      response: {
        201: t.Object({
          message: t.String(),
        }),
        400: t.Object({
          code: t.Number({ examples: [400] }),
          message: t.String({ examples: ["Bad Request!"] }),
        }),
        401: t.Object({
          code: t.Number({ examples: [401] }),
          message: t.String({ examples: ["Unauthorized!"] }),
        }),
        404: t.Object({
          code: t.Number({ examples: [404] }),
          message: t.String({ examples: ["Not Found!"] }),
        }),
        409: t.Object({
          code: t.Number({ examples: [409] }),
          message: t.String({
            examples: ["The User has invoices or reports."],
          }),
        }),
      },
    });
