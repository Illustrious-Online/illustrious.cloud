import { and, eq } from "drizzle-orm/sql";
import config from "../config";

import { db } from "../../drizzle/db";
import { authentications, userAuthentications } from "../../drizzle/schema";
import BadRequestError from "../domain/exceptions/BadRequestError";
import ConflictError from "../domain/exceptions/ConflictError";
import ResponseError from "../domain/exceptions/ResponseError";
import { CreateAuth, FetchAuth } from "../domain/interfaces/auth";
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
  console.log("this is a test");
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

  return resJson;
}

/**
 * Creates a new authentication & relationship.
 *
 * @param payload - The authentication & user identifiers.
 * @throws {ConflictError} If an authentication with the same data already exists.
 * @throws {Error} If an error occurs while creating the authentication.
 */
export async function create(payload: CreateAuth) {
  try {
    const { authId, userId, sub } = payload;

    await db.insert(authentications).values({
      id: authId,
      sub,
    });

    await db.insert(userAuthentications).values({
      userId,
      authId,
    });
  } catch (e) {
    throw new ConflictError("Authentication exists.");
  }
}

/**
 * Creates a new authentication & relationship.
 *
 * @param payload - The authentication ID or sub value.
 * @throws {ConflictError} If an authentication with the same data already exists.
 * @throws {Error} If an error occurs while creating the authentication.
 */
export async function fetchOne(payload: FetchAuth) {
  const { id, sub } = payload;
  const param = id ? id : sub ? sub : undefined;

  if (!param) {
    throw new BadRequestError("An ID or sub value are required.");
  }

  const result = await db
    .select()
    .from(authentications)
    .where(eq(id ? authentications.id : authentications.sub, param));

  if (result.length === 0) {
    throw new ConflictError("Unable to find Authentication");
  }

  return result[0];
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
