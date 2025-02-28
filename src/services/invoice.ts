import { NotFoundError } from "elysia";

import ConflictError from "@/domain/exceptions/ConflictError";
import type { CreateInvoice } from "@/domain/interfaces/invoices";
import { db } from "@/drizzle/db";
import {
  type Invoice,
  invoice,
  orgInvoice,
  userInvoice,
} from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";

/**
 * Creates a new Invoice.
 *
 * @param payload - The Invoice data to be created.
 * @returns {Promise<Invoice>} A promise that resolves to the created Invoice.
 * @throws {ConflictError} If an Invoice with the same data already exists.
 * @throws {Error} If an error occurs while creating the Invoice.
 */
export async function createInvoice(payload: CreateInvoice): Promise<Invoice> {
  const { client, creator, org, invoice: payloadInvoice } = payload;
  const foundInvoice = await db
    .select()
    .from(invoice)
    .where(eq(invoice.id, payloadInvoice.id));

  if (foundInvoice.length > 0) {
    throw new ConflictError("The invoice already exists.");
  }

  const result = await db.insert(invoice).values(payloadInvoice).returning();

  for (const role of [client, creator]) {
    await db.insert(userInvoice).values({
      userId: role,
      invoiceId: payloadInvoice.id,
    });
  }

  await db.insert(orgInvoice).values({
    orgId: org,
    invoiceId: payloadInvoice.id,
  });

  return result[0] as Invoice;
}

/**
 * Fetches an Invoice by id.
 *
 * @param payload - The id of the Invoice to fetch; optional userId to validate relationship.
 * @returns {Promise<Invoice>} A promise that resolves the Invoice object.
 */
export async function fetchInvoice(id: string): Promise<Invoice> {
  const data = await db.select().from(invoice).where(eq(invoice.id, id));

  if (data.length === 0) {
    throw new NotFoundError("Invoice not found.");
  }

  return data[0];
}

/**
 * Updates an invoice.
 *
 * @param payload - The new Invoice data to update.
 * @returns {Promise<Invoice>} A promise that resolves to an Invoice object.
 */
export async function updateInvoice(payload: Invoice): Promise<Invoice> {
  const { id, paid, price, start, end, due, updatedAt } = payload;
  const foundInvoice = await db
    .select()
    .from(invoice)
    .where(eq(invoice.id, id));

  if (!foundInvoice) {
    throw new ConflictError("Could not find the report.");
  }

  const result = await db
    .update(invoice)
    .set({
      paid,
      price,
      start,
      end,
      due,
      updatedAt,
    })
    .where(eq(invoice.id, id))
    .returning();

  if (result.length === 0) {
    throw new ConflictError("Failed to return response on update.");
  }

  return result[0];
}

/**
 * Removes an invoice and relationships.
 *
 * @param invoiceId - The Invoice ID to be removed.
 * @throws {ConflictError} If a user with the same data already exists.
 */
export async function removeInvoice(invoiceId: string): Promise<void> {
  await db.delete(userInvoice).where(eq(userInvoice.invoiceId, invoiceId));
  await db.delete(orgInvoice).where(eq(orgInvoice.invoiceId, invoiceId));
  await db.delete(invoice).where(eq(invoice.id, invoiceId));
}
