import ServerError from "@/domain/exceptions/ServerError";
import * as authController from "@/modules/auth";
import type { Provider } from "@supabase/supabase-js";
import type { Elysia } from "elysia";

/**
 * Sets up authentication routes for the application.
 *
 * @param {Elysia} app - The Elysia application instance.
 *
 * @returns {Elysia} The Elysia application instance with authentication routes configured.
 *
 * The following routes are configured:
 * - `GET /auth/:provider` - Initiates OAuth sign-in with the specified provider.
 * - `GET /auth/callback` - Handles the OAuth callback after sign-in.
 * - `GET /signout` - Signs the user out of the application.
 */
export default (app: Elysia) =>
  app
    .get("/auth/:provider", authController.signInWithOAuth)
    .get("/auth/callback", authController.oauthCallback)
    .get("/signout", authController.signOut);
