import { eq } from "drizzle-orm";
import { NotFoundError } from "elysia";
import { v4 as uuidv4 } from "uuid";

import ConflictError from "../domain/exceptions/ConflictError";
import ServerError from "../domain/exceptions/ServerError";
import { db } from "../../drizzle/db";
import {
  Invoice,
  UserInvoice,
  invoices,
  userInvoices,
} from "../../drizzle/schema";

/**
 * Creates a new user.
 *
 * @param payload - The user data to be created.
 * @returns {Promise<User>} A promise that resolves to the created user.
 * @throws {ConflictError} If a user with the same data already exists.
 * @throws {Error} If an error occurs while creating the user.
 */
export async function create(payload: Invoice) {
  try {
    const invoice = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, payload.id));

    if (invoice) {
      throw new ConflictError("Invoice already exists!");
    }

    await db.insert(userInvoices).values({
      orgUserId: uuidv4(),
      invoiceId: payload.id,
      userId: user.id,
    });

    const result = await db.insert(invoices).values(payload).returning();

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
export function fetchAll(): Promise<Invoice[]> {
  const x = db
    .select({
      id: invoices.id,
      paid: invoices.paid,
      value: invoices.value,
      start: invoices.start,
      end: invoices.end,
      due: invoices.due,
    })
    .from(invoices);
  return x;
}

/**
 * Fetches a user by id.
 *
 * @param {string} id The id of the user to fetch.
 * @returns {Promise<User>} A promise that resolves array User objects.
 */
export async function fetchById(id: string): Promise<Invoice> {
  const result = await db.select().from(invoices).where(eq(invoices.id, id));

  if (result.length > 0) {
    return result[0];
  }

  throw new NotFoundError();
}
