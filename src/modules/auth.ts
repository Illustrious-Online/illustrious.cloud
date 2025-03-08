import ConflictError from "@/domain/exceptions/ConflictError";
import ServerError from "@/domain/exceptions/ServerError";
import type SuccessResponse from "@/domain/types/generic/SuccessResponse";
import type { User } from "@/drizzle/schema";
import * as authService from "@/services/auth";
import type { Provider } from "@supabase/supabase-js";
import type { Context } from "elysia";

/**
 * Signs in a user using OAuth authentication.
 *
 * @param context - The context object containing parameters and redirect function.
 * @throws {ConflictError} If the provider is not specified in the parameters.
 * @throws {ServerError} If the authentication URL is not found.
 */
export const signInWithOAuth = async (context: Context) => {
  const { params, redirect } = context;
  const { provider } = params;

  if (!provider) {
    throw new ConflictError("Provider is required to perform authentication.");
  }

  const data = await authService.signInWithOAuth(provider as Provider);

  if (!data) {
    throw new ServerError(
      "Authentication URL was not found appropriately.",
      500,
    );
  }

  return redirect(data.url);
};

/**
 * Handles the OAuth callback by processing the authorization code received from the OAuth provider.
 *
 * @param context - The context object containing the query parameters.
 * @returns A promise that resolves to a success response containing the authenticated user.
 * @throws {ServerError} If the authorization code is not received from the OAuth provider.
 */
export const oauthCallback = async (
  context: Context,
): Promise<SuccessResponse<User>> => {
  const { code } = context.query;

  if (!code) {
    throw new ServerError(
      "Authorization code was not received from the OAuth provider.",
      500,
    );
  }

  const data = await authService.oauthCallback(code);
  return {
    data: data,
    message: "User authenticated successfully.",
  };
};

/**
 * Signs the user out by calling the authService's signOut method and then redirects to the home page.
 *
 * @param context - The context object which contains information about the current request and response.
 * @returns A promise that resolves when the sign-out process and redirection are complete.
 */
export const signOut = async (context: Context) => {
  await authService.signOut();
  return context.redirect("/");
};
