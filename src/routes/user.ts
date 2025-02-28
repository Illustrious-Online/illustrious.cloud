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
    .get("/me", userController.me)
    .get("/user/:user/:by?", userController.getUser)
    .put("/user/:user", userController.putUser)
    .delete("/user/:user", userController.deleteUser)
    .post("/user/link/steam", userController.linkSteam)
    .post("/user/link/steam/auth", userController.steamCallback);
