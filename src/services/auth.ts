import { eq } from "drizzle-orm/sql";
import config from "../config";

import { db } from "../../drizzle/db";
import { authentications, userAuthentications } from "../../drizzle/schema";
import ConflictError from "../domain/exceptions/ConflictError";
import ResponseError from "../domain/exceptions/ResponseError";
import AuthError from "../domain/interfaces/authError";
import Tokens from "../domain/interfaces/tokens";

/**
 * Gets authorization tokens for authentication
 *
 * @param code - The authentication code from the provider.
 * @throws {ResponseError} If there is a failure from the authorization request.
 * @throws {Error} If an error occurs while gathering the tokens.
 * @returns {Tokens} A promise that resolves the authorization tokens.
 */
export async function getTokens(code: string): Promise<Tokens> {
  const headers = new Headers();
  headers.append("Content-Type", "application/x-www-form-urlencoded");
  headers.append("Accept", "application/json");

  const body = new URLSearchParams();
  body.append("grant_type", "authorization_code");
  body.append("client_id", config.auth.clientId);
  body.append("client_secret", config.auth.clientSecret);
  body.append("code", code);
  body.append("redirect_uri", `${config.app.url}/auth/success`);

  const requestOptions = {
    method: "POST",
    headers,
    body,
  };

  const response = await fetch(
    `${config.auth.url}/oauth/token`,
    requestOptions,
  );
  const resJson = await response.json();

  if (!response.ok) {
    const e = resJson as AuthError;
    throw new ResponseError(
      response.status,
      `${e.error}: ${e.error_description}`,
    );
  }

  return resJson as Tokens;
}

/**
 * Creates a new authentication & relationship.
 *
 * @param payload - The authentication & user identifiers.
 * @throws {ConflictError} If an authentication with the same data already exists.
 * @throws {Error} If an error occurs while creating the authentication.
 */
export async function create(payload: {
  userId: string;
  authId: string;
  sub: string;
}) {
  try {
    const { authId, userId, sub } = payload;

    await db.insert(userAuthentications).values({
      userId,
      authId,
    });
  } catch (e) {
    throw new ConflictError("Authentication exists.");
  }
}

/**
 * Logs out the current user from the oauth provider.
 *
 * @throws {Error} If an error occurs while logging out the user.
 */
export async function logout(): Promise<void> {
  const headers = new Headers();
  headers.append("Content-Type", "application/x-www-form-urlencoded");

  const body = new URLSearchParams();
  body.append("client_id", config.auth.clientId);
  body.append("returnTo", `${config.app.dashboardUrl}`);

  const requestOptions = {
    method: "GET",
    headers,
    body,
  };

  await fetch(`${config.auth.url}/v2/logout`, requestOptions);
}

/**
 * Removes authentication based on provided ID.
 *
 * @param id - The identifier of the authentication to be deleted.
 * @throws {Error} If an error occurs while removing the authentication.
 */
export async function deleteOne(id: string): Promise<void> {
  await db
    .delete(userAuthentications)
    .where(eq(userAuthentications.authId, id));
  await db.delete(authentications).where(eq(authentications.id, id));
}
