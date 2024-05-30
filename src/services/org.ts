import { NotFoundError } from "elysia";

import { eq } from "drizzle-orm";
import { db } from "../../drizzle/db";
import { Org, orgs } from "../../drizzle/schema";
import ConflictError from "../domain/exceptions/ConflictError";
import ServerError from "../domain/exceptions/ServerError";

/**
 * Creates a new user.
 *
 * @param payload - The user data to be created.
 * @returns {Promise<User>} A promise that resolves to the created user.
 * @throws {ConflictError} If a user with the same data already exists.
 * @throws {Error} If an error occurs while creating the user.
 */
export async function create(payload: Org) {
  try {
    const user = await db.select().from(orgs).where(eq(orgs.id, payload.id));

    if (user) {
      throw new ConflictError("User already exists!");
    }

    const result = await db.insert(orgs).values(payload).returning();

    return result[0];
  } catch (e) {
    const error = e as ServerError;

    if (error.name === "ServerError" && error.code === 11000) {
      throw new ConflictError("User exists.");
    }

    throw error;
  }
}

/**
 * Fetches all users from the database.
 *
 * @returns {Promise<User[]>} A promise that resolves to an array of User objects.
 */
export function fetchAll(): Promise<Org[]> {
  const x = db
    .select({ id: orgs.id, contact: orgs.contact, name: orgs.name })
    .from(orgs);
  return x;
}

/**
 * Fetches a user by id.
 *
 * @param {string} id The id of the user to fetch.
 * @returns {Promise<User>} A promise that resolves array User objects.
 */
export async function fetchById(id: string): Promise<Org> {
  const result = await db.select().from(orgs).where(eq(orgs.id, id));

  if (result.length > 0) {
    return result[0];
  }

  throw new NotFoundError();
}
