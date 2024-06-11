import { NotFoundError } from "elysia";

import { and, eq } from "drizzle-orm";
import { db } from "../../drizzle/db";
import {
  Invoice,
  invoices,
  orgInvoices,
  orgUsers,
  userInvoices,
} from "../../drizzle/schema";
import ConflictError from "../domain/exceptions/ConflictError";
import ServerError from "../domain/exceptions/ServerError";
import UnauthorizedError from "../domain/exceptions/UnauthorizedError";
import { CreateInvoice } from "../domain/interfaces/invoices";
import { Roles } from "../domain/interfaces/roles";

/**
 * Creates a new user.
 *
 * @param payload - The user data to be created.
 * @returns {Promise<User>} A promise that resolves to the created user.
 * @throws {ConflictError} If a user with the same data already exists.
 * @throws {Error} If an error occurs while creating the user.
 */
export async function create(payload: CreateInvoice) {
  try {
    const { user, org, invoice } = payload;
    const foundInvoice = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoice.id));

    if (foundInvoice) {
      throw new ConflictError("Report already exists!");
    }

    const result = await db.insert(invoices).values(invoice).returning();

    await db.insert(userInvoices).values({
      userId: user,
      invoiceId: invoice.id,
    });

    await db.insert(orgInvoices).values({
      orgId: org,
      invoiceId: invoice.id,
    });

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
 * Fetches a user by id.
 *
 * @param {string} id The id of the user to fetch.
 * @returns {Promise<User>} A promise that resolves array User objects.
 */
export async function fetchById(payload: {
  id: string;
  userId?: string;
}): Promise<Invoice> {
  const { userId, id } = payload;

  if (!userId || !id) {
    throw new ConflictError("Unable to continue: Missing search criteria!");
  }

  const usersInvoice = await db
    .select()
    .from(userInvoices)
    .where(
      and(eq(userInvoices.userId, userId), eq(userInvoices.invoiceId, id)),
    );

  if (usersInvoice.length === 0) {
    const invoiceOrg = await db
      .select()
      .from(orgInvoices)
      .where(eq(orgInvoices.invoiceId, id));

    if (invoiceOrg.length === 0) {
      throw new ConflictError("Unable to find org associated with the invoice");
    }

    const userOrg = await db
      .select()
      .from(orgUsers)
      .where(
        and(
          eq(orgUsers.userId, userId),
          eq(orgUsers.orgId, invoiceOrg[0].orgId),
        ),
      );

    if (userOrg.length === 0) {
      throw new ConflictError("Unable to find org associated with the user");
    }

    const roleIndex = Object.keys(Roles).indexOf(userOrg[0].role);

    if (roleIndex !== Roles.ADMIN && roleIndex !== Roles.OWNER) {
      throw new UnauthorizedError(
        "Unable to continue: User is not have sufficient permissions",
      );
    }
  }

  const data = await db.select().from(invoices).where(eq(invoices.id, id));

  if (data.length === 0) {
    throw new NotFoundError();
  }

  return data[0];
}

export async function update(payload: Invoice): Promise<Invoice> {
  const { id, owner, paid, value, start, end, due } = payload;
  const result = await db
    .update(invoices)
    .set({
      owner,
      paid,
      value,
      start,
      end,
      due,
    })
    .where(eq(invoices.id, id))
    .returning();

  return result[0];
}

export async function deleteOne(invoiceId: string): Promise<void> {
  db.delete(invoices).where(eq(invoices.id, invoiceId));
  db.delete(userInvoices).where(eq(userInvoices.invoiceId, invoiceId));

  throw new ConflictError("Failed to delete the invoices");
}
