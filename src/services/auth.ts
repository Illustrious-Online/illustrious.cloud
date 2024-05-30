import { eq } from "drizzle-orm";
import { NotFoundError } from "elysia";

import config from "../config";
import { db } from "../../drizzle/db";
import { UserAuthentication, authentications, userAuthentications } from "../../drizzle/schema";

import { AuthError, Tokens } from "../domain/models/auth.models";
import ResponseError from "../domain/exceptions/ResponseError";
import ConflictError from "../domain/exceptions/ConflictError";
import ServerError from "../domain/exceptions/ServerError";

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

  const response = await fetch(`${config.auth.url}/oauth/token`, requestOptions);
  const resJson = await response.json();
  const e = resJson as AuthError;

  if (!response.ok) {
    throw new ResponseError(response.status, `${e.error}: ${e.error_description}`);
  }

  return resJson as Tokens;
}

/**
 * Creates a new authentication & relationship.
 *
 * @param payload - The user data to be created.
 * @throws {ConflictError} If a user with the same data already exists.
 * @throws {Error} If an error occurs while creating the user.
 */
export async function create(payload: {
  userId: string;
  authId: string;
  sub: string;
}) {
  try {
    const { authId, userId, sub } = payload;
    const test = await db.insert(authentications).values({
      id: authId,
      sub
    });
    
    await db.insert(userAuthentications).values({
      userId,
      authId,
    });
  } catch (e) {
    const error = e as ServerError;

    if (error.name === "ServerError" && error.code === 11000) {
      throw new ConflictError("Authentication exists.");
    }

    throw error;
  }
}

/**
 * Fetches a user by id.
 *
 * @param {string} sub The id of the user to fetch.
 * @returns {Promise<UserAuthentication>} A promise that resolves array User objects.
 */
export async function fetchUserAuthBySub(sub: string): Promise<UserAuthentication> {
  const result = await db.select()
    .from(userAuthentications)
    .where(eq(userAuthentications.authId, sub));

  if (result.length > 0) {
    return result[0];
  }

  throw new NotFoundError();
}
