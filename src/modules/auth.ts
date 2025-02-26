import ConflictError from "@/domain/exceptions/ConflictError";
import ServerError from "@/domain/exceptions/ServerError";
import type SuccessResponse from "@/domain/types/generic/SuccessResponse";
import type { User } from "@/drizzle/schema";
import * as authService from "@/services/auth";
import type { Provider } from "@supabase/supabase-js";
import type { Context } from "elysia";

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

  redirect(data.url);
};

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

export const signOut = async (context: Context) => {
  await authService.signOut();
  return context.redirect("/");
};
