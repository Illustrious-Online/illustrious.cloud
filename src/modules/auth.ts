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

  console.log("Module signInWithOAuth redirect to: ", data.url);
  return redirect(data.url);
};

const setCookies = (
  context: Context,
  accessToken: string,
  refreshToken?: string,
) => {
  const {
    cookie: { access_token, refresh_token },
  } = context;

  access_token?.set({
    value: accessToken,
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 60 * 60,
    path: "/",
  });

  if (refreshToken) {
    refresh_token?.set({
      value: refreshToken,
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }
};

/**
 * Handles the OAuth callback by processing the authorization code received from the OAuth provider.
 *
 * @param context - The context object containing the query parameters.
 * @returns A promise that resolves to a success response containing the authenticated user.
 * @throws {ServerError} If the authorization code is not received from the OAuth provider.
 */
export const oauthCallback = async (
  request: Request,
  context: Context,
): Promise<SuccessResponse<User>> => {
  console.log("request", request);

  if (!request) {
    throw new ServerError(
      "Authorization token was not received from the OAuth provider.",
      500,
    );
  }

  const {
    user,
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  } = await authService.oauthCallback(access_token);
  setCookies(context, newAccessToken, newRefreshToken);

  return {
    data: user,
    message: "User authenticated successfully.",
  };
};

export const getSession = async (context: Context) => {
  const {
    cookie: { access_token, refresh_token },
  } = context;
  const accessToken = access_token?.value;
  const refreshToken = refresh_token?.value;

  if (!accessToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  const {
    user,
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  } = await authService.getSession(accessToken, refreshToken);
  setCookies(context, newAccessToken, newRefreshToken);

  return {
    data: {
      user,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    },
    message: "Session retrieved successfully.",
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
