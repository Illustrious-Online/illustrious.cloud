import { eq } from "drizzle-orm";
import { NotFoundError } from "elysia";

import ConflictError from "../domain/exceptions/ConflictError";
import ServerError from "../domain/exceptions/ServerError";
import { db } from "../../drizzle/db";
import { User, users } from "../../drizzle/schema";

/**
 * Creates a new user.
 *
 * @param payload - The user data to be created.
 * @returns {Promise<User>} A promise that resolves to the created user.
 * @throws {ConflictError} If a user with the same data already exists.
 * @throws {Error} If an error occurs while creating the user.
 */
export async function create(payload: User) {
  try {
    const user = await db.select().from(users).where(eq(users.id, payload.id));

    if (user) {
      throw new ConflictError("User already exists!");
    }

    const result = await db.insert(users).values(payload).returning();

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
