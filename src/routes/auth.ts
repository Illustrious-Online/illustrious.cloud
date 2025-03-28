import * as authController from "@/modules/auth";
import { type Elysia, t } from "elysia";

/**
 * Sets up authentication routes for the application.
 *
 * @param {Elysia} app - The Elysia application instance.
 * @returns {Elysia} The Elysia application instance with authentication routes configured.
 *
 * The following routes are configured:
 * - `GET /auth/:provider`: Initiates OAuth sign-in with the specified provider.
 *   - `params`: An object containing the OAuth provider name.
 *     - `provider`: A string representing the OAuth provider (e.g., "discord", "github", "google").
 * - `GET /auth/callback`: Handles the OAuth callback.
 *   - `query`: An object containing the OAuth authorization code.
 *     - `code`: A string representing the OAuth authorization code.
 * - `GET /signout`: Signs the user out.
 *   - `response`: An object containing the response message.
 *     - `201`: An object containing the sign-out message.
 *       - `message`: A string representing the sign-out message.
 */
export default (app: Elysia): Elysia =>
  app
    .get("/auth/:provider", authController.signInWithOAuth, {
      params: t.Object({
        provider: t.String({
          examples: ["discord", "github", "google"],
        }),
      }),
    })
    .get("/auth/callback", authController.oauthCallback, {
      query: t.Object({
        code: t.String(),
      }),
    })
    .get("/signout", authController.signOut, {
      response: {
        201: t.Object({
          message: t.String(),
        }),
      },
    });
