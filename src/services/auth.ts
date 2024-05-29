import { eq } from "drizzle-orm";
import { NotFoundError } from "elysia";

import config from "../config";
import ConflictError from "../domain/exceptions/ConflictError";
import { db } from "../../drizzle/db";
import { User, users } from "../../drizzle/schema";
import ResponseError from "../domain/exceptions/ResponseError";

interface ResErrorObj {
  error: string,
  error_description: string
}

export async function getTokens(code: string): Promise<{
  accessToken: string;
  idToken: string;
  refreshToken: string;
}> {
  const headers = new Headers();
  headers.append("Content-Type", "application/x-www-form-urlencoded");
  headers.append("Accept", "application/json");

  const encoded = new URLSearchParams();
  encoded.append("grant_type", "authorization_code");
  encoded.append("client_id", config.auth.clientId);
  encoded.append("client_secret", config.auth.clientSecret);
  encoded.append("code", code);
  encoded.append("redirect_uri", `${config.app.url}/auth/success`);

  const requestOptions = {
    method: "POST",
    headers: headers,
    body: encoded,
  };

  const res = await fetch(`${config.auth.url}/oauth/token`, requestOptions);
  const json = await res.json();

  if (!res.ok) {
    const err = (json as ResErrorObj).error;
    const message = (json as ResErrorObj).error_description;
    throw new ResponseError(res.status, `${err}: ${message}`);
  }

  console.log('res json', json);
  const { access_token, id_token, refresh_token } = json;

  return {
    accessToken: access_token,
    idToken: id_token,
    refreshToken: refresh_token,
  };
}

/**
 * Fetches all users from the database.
 *
 * @returns {Promise<User[]>} A promise that resolves to an array of User objects.
 */
export function fetchAll(): Promise<User[]> {
  const x = db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users);
  return x;
}

/**
 * Fetches a user by id.
 *
 * @param {string} id The id of the user to fetch.
 * @returns {Promise<User>} A promise that resolves array User objects.
 */
export async function fetchById(id: string): Promise<User> {
  const result = await db.select().from(users).where(eq(users.id, id));

  if (result.length > 0) {
    return result[0];
  }

  throw new NotFoundError();
}
