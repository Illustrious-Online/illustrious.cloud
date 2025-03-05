import { Invoice } from "@/domain/models/invoice";
import { Org } from "@/domain/models/org";
import { Report } from "@/domain/models/report";
import { User } from "@/domain/models/user";
import * as userController from "@/modules/user";
import { type Elysia, t } from "elysia";

/**
 * Defines the routes for user-related operations.
 *
 * @param {Elysia} app - The Elysia application instance.
 *
 * @route GET /me
 * @queryParam {string} include - Comma-separated list of related entities to include (e.g., "orgs", "invoices", "reports").
 * @response 201 - Successful response containing user data and related entities.
 * @response 400 - Bad request.
 * @response 401 - Unauthorized access.
 * @response 409 - Conflict, such as an existing invoice.
 *
 * @route GET /user/:user/:by?
 * @param {string} user - The user identifier.
 * @queryParam {string} by - The method to identify the user (e.g., "id", "email", "identifier").
 * @response 201 - Successful response containing user data.
 * @response 400 - Bad request.
 * @response 401 - Unauthorized access.
 * @response 404 - User not found.
 *
 * @route PUT /user/:user
 * @param {string} user - The user identifier.
 * @response 201 - Successful response containing updated user data.
 * @response 400 - Bad request.
 * @response 401 - Unauthorized access.
 * @response 404 - User not found.
 * @response 503 - Service unavailable, failed to update the user.
 *
 * @route DELETE /user/:user
 * @param {string} user - The user identifier.
 * @response 201 - Successful response indicating user deletion.
 * @response 400 - Bad request.
 * @response 401 - Unauthorized access.
 * @response 404 - User not found.
 * @response 409 - Conflict, such as user having invoices or reports.
 *
 * @route POST /user/link/steam
 * @response 201 - Successful response indicating Steam link generation.
 * @response 400 - Bad request.
 * @response 401 - Unauthorized access.
 * @response 500 - Internal server error, failed to generate Steam link URL.
 *
 * @route POST /user/link/steam/auth
 * @response 201 - Successful response indicating Steam authentication.
 * @response 400 - Bad request.
 * @response 401 - Unauthorized access.
 */
export default (app: Elysia) =>
  app
    .get("/me", userController.me, {
      query: t.Object({
        include: t.Optional(
          t.String({
            examples: ["orgs", "invoices", "reports", "orgs,invoices,reports"],
          }),
        ),
      }),
      response: {
        201: t.Object({
          message: t.String(),
          data: t.Object({
            user: User,
            orgs: t.Array(Org),
            invoices: t.Array(Invoice),
            reports: t.Array(Report),
          }),
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
          message: t.String({ examples: ["The invoice already exists."] }),
        }),
      },
    })
    .get("/user/:user", userController.getUser, {
      params: t.Object({
        user: t.String(),
      }),
      query: t.Object({
        by: t.Optional(
          t.String({
            examples: ["id", "email", "identifier"],
          }),
        ),
      }),
      response: {
        201: t.Object({
          message: t.String(),
          data: User,
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
    .put("/user/:user", userController.putUser, {
      params: t.Object({
        user: t.String(),
      }),
      response: {
        201: t.Object({
          message: t.String(),
          data: User,
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
          message: t.String({ examples: ["Failed to update the user."] }),
        }),
      },
    })
    .delete("/user/:user", userController.deleteUser, {
      params: t.Object({
        user: t.String(),
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
    })
    .post("/user/link/steam", userController.linkSteam, {
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
        500: t.Object({
          code: t.Number({ examples: [500] }),
          message: t.String({
            examples: ["Failed to generate Steam link URL."],
          }),
        }),
      },
    })
    .post("/user/link/steam/auth", userController.steamCallback, {
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
      },
    });
