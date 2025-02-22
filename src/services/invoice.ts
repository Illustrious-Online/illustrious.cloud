import { NotFoundError } from "elysia";

import ConflictError from "@/domain/exceptions/ConflictError";
import type { CreateInvoice } from "@/domain/interfaces/invoices";
import { and, eq } from "drizzle-orm";
import { db } from "../drizzle/db";
import {
  type Invoice,
  invoices,
  orgInvoices,
  userInvoices,
} from "../drizzle/schema";

/**
 * Creates a new Invoice.
 *
 * @param payload - The Invoice data to be created.
 * @returns {Promise<Invoice>} A promise that resolves to the created Invoice.
 * @throws {ConflictError} If an Invoice with the same data already exists.
 * @throws {Error} If an error occurs while creating the Invoice.
 */
export async function create(payload: CreateInvoice): Promise<Invoice> {
  const { client, creator, org, invoice } = payload;
  const foundInvoice = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoice.id));

  if (foundInvoice.length > 0) {
    throw new ConflictError("Invoice already exists!");
  }

  const result = await db.insert(invoices).values(invoice).returning();

  for (const role of [client, creator]) {
    await db.insert(userInvoices).values({
      userId: role,
      invoiceId: invoice.id,
    });
  }

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
export async function fetchById(id: string): Promise<Invoice> {
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
  const { id, paid, value, start, end, due, updatedAt } = payload;
  const result = await db
    .update(invoices)
    .set({
      paid,
      value,
      start,
      end,
      due,
      updatedAt,
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
  await db.delete(userInvoices).where(eq(userInvoices.invoiceId, invoiceId));
  await db.delete(orgInvoices).where(eq(orgInvoices.invoiceId, invoiceId));
  await db.delete(invoices).where(eq(invoices.id, invoiceId));
}

export async function validatePermissions(userId: string, invoiceId: string) {
  return await db
    .select()
    .from(userInvoices)
    .where(
      and(
        eq(userInvoices.userId, userId),
        eq(userInvoices.invoiceId, invoiceId),
      ),
    );
}
