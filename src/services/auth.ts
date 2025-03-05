import { supabaseClient } from "@/app";
import config from "@/config";
import ServerError from "@/domain/exceptions/ServerError";
import type { User } from "@/drizzle/schema";
import * as userService from "@/services/user";
import type { Provider } from "@supabase/auth-js";
import { v4 as uuidv4 } from "uuid";

/**
 * Signs in a user using OAuth with the specified provider.
 *
 * @param {Provider} provider - The OAuth provider to use for sign-in.
 * @returns {Promise<{ provider: Provider; url: string }>} A promise that resolves to an object containing the provider and the URL for redirection.
 * @throws {ServerError} If there is an error during the sign-in process.
 */
export async function signInWithOAuth(provider: Provider): Promise<{
  provider: Provider;
  url: string;
}> {
  const { data, error } = await supabaseClient.auth.signInWithOAuth({
    provider: provider,
    options: {
      redirectTo: `${config.app.url}/auth/callback`,
    },
  });

  if (error) {
    throw new ServerError(error.message, 500);
  }

  return data;
}

/**
 * Handles the OAuth callback by retrieving the user information using the provided bearer token.
 * If the user does not exist, it creates a new user with the provided information.
 *
 * @param {string} bearer - The bearer token used to authenticate and retrieve the user information.
 * @returns {Promise<User>} - A promise that resolves to the user object.
 * @throws {ServerError} - Throws a ServerError if there is an error retrieving the user information.
 */
export async function oauthCallback(bearer: string): Promise<User> {
  const { data, error } = await supabaseClient.auth.getUser(bearer);

  if (error) {
    throw new ServerError(error.message, 500);
  }

  let user: User | null;

  try {
    user = await userService.fetchUser({ id: data?.user.id });
  } catch (e) {
    user = await userService.updateOrCreate({
      id: uuidv4(),
      identifier: data?.user.id,
      email: !data?.user.email ? null : data?.user.email,
      phone: data?.user.user_metadata?.phone,
      firstName: data?.user.user_metadata?.full_name.split(" ")[0],
      lastName: data?.user.user_metadata?.full_name.split(" ")[1],
      picture: data?.user.user_metadata?.avatar_url,
      managed: false,
      superAdmin: false,
    });
  }

  return user;
}

/**
 * Signs the user out from the application.
 *
 * This function uses the Supabase client to sign the user out. If an error occurs during the sign-out process,
 * a `ServerError` is thrown with the error message and a status code of 500.
 *
 * @throws {ServerError} If there is an error during the sign-out process.
 * @returns {Promise<void>} A promise that resolves when the sign-out process is complete.
 */
export async function signOut(): Promise<void> {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    throw new ServerError(error.message, 500);
  }

  return;
}
