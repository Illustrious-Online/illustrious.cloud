import { NotFoundError } from "elysia";

import { and, eq } from "drizzle-orm";
import { db } from "../../drizzle/db";
import {
  Invoice,
  invoices,
  orgInvoices,
  orgUsers,
  orgs,
  userInvoices,
} from "../../drizzle/schema";
import ConflictError from "../domain/exceptions/ConflictError";
import ServerError from "../domain/exceptions/ServerError";
import UnauthorizedError from "../domain/exceptions/UnauthorizedError";
import { CreateInvoice } from "../domain/interfaces/invoices";
import { UserRole } from "../domain/types/UserRole";

/**
 * Creates a new Invoice.
 *
 * @param payload - The Invoice data to be created.
 * @returns {Promise<Invoice>} A promise that resolves to the created Invoice.
 * @throws {ConflictError} If an Invoice with the same data already exists.
 * @throws {Error} If an error occurs while creating the Invoice.
 */
export async function create(payload: CreateInvoice): Promise<Invoice> {
  const { user, org, invoice } = payload;
  const foundInvoice = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoice.id));

  if (foundInvoice.length > 0) {
    throw new ConflictError("Invoice already exists!");
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

  return result[0] as Invoice;
}

/**
 * Fetches an Invoice by id.
 *
 * @param payload - The id of the Invoice to fetch; optional userId to validate relationship.
 * @returns {Promise<Invoice>} A promise that resolves the Invoice object.
 */
export async function fetchById(payload: {
  id: string;
  userId: string;
}): Promise<Invoice> {
  const { userId, id } = payload;
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
      throw new UnauthorizedError(
        "User does not have direct association this Invoice.",
      );
    }

    const users = await db
      .select()
      .from(orgUsers)
      .where(
        and(
          eq(orgUsers.userId, userId),
          eq(orgUsers.orgId, invoiceOrg[0].orgId),
        ),
      )
      .innerJoin(orgs, eq(orgs.id, invoiceOrg[0].orgId));

    if (users.length !== 1) {
      throw new UnauthorizedError(
        "User does not have and Org assocation this Invoice.",
      );
    }

    const orgUser = users[0].OrgUser;
    const clientIndex = Object.keys(UserRole).indexOf("CLIENT");
    const roleIndex = Object.keys(UserRole).indexOf(orgUser.role);

    if (roleIndex < clientIndex) {
      throw new UnauthorizedError(
        "User does not have permissions to access this Invoice.",
      );
    }
  }

  const data = await db.select().from(invoices).where(eq(invoices.id, id));

  if (data.length === 0) {
    throw new NotFoundError();
  }

  return data[0];
}

/**
 * Updates an invoice.
 *
 * @param payload - The new Invoice data to update.
 * @returns {Promise<Invoice>} A promise that resolves to an Invoice object.
 */
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

/**
 * Removes an invoice and relationships.
 *
 * @param invoiceId - The Invoice ID to be removed.
 * @throws {ConflictError} If a user with the same data already exists.
 */
export async function deleteOne(invoiceId: string): Promise<void> {
  db.delete(invoices).where(eq(invoices.id, invoiceId));
  db.delete(userInvoices).where(eq(userInvoices.invoiceId, invoiceId));
  db.delete(orgInvoices).where(eq(orgInvoices.invoiceId, invoiceId));
}
