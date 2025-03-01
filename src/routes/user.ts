import BadRequestError from "@/domain/exceptions/BadRequestError";
import { User } from "@/domain/models/user";
import * as userController from "@/modules/user";
import bearer from "@elysiajs/bearer";
import { Context, type Elysia, t } from "elysia";
import authPlugin from "../plugins/auth";
import auth from "./auth";

/**
 * Defines the user-related routes for the application.
 *
 * @param {Elysia} app - The Elysia application instance.
 *
 * @route GET /me - Retrieves the authenticated user's information.
 * @route GET /user/:user - Fetches information for a specific user.
 * @route PUT /user/:user - Updates information for a specific user.
 * @route DELETE /user/:user - Deletes a specific user.
 * @route POST /user/link/steam - Links the authenticated user's account with Steam.
 * @route POST /user/link/steam/auth - Handles the Steam authentication callback.
 *
 * All routes require authentication via the `authPlugin`.
 */
export default (app: Elysia) =>
  app
    .get("/me", userController.me) // Fetch current user profile & details (`include` optional)
    .get("/user/:user/:by?", userController.getUser) // Fetch user profile & details by ID/identifier/sub/email
    .put("/user/:user", userController.putUser) // Update user -> updateOrCreate service
    .delete("/user/:user", userController.deleteUser) // Remove user (soft) -> require removal of all invoices/reports/applications
    .post("/user/link/steam", userController.linkSteam) // Initiates processs to link steam with illustrious account
    .post("/user/link/steam/auth", userController.steamCallback); // Handles the Steam authentication callback
