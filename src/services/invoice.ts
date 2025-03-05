import { NotFoundError } from "elysia";

import ConflictError from "@/domain/exceptions/ConflictError";
import ServerError from "@/domain/exceptions/ServerError";
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
 * Creates a new invoice in the database.
 *
 * @param payload - The payload containing the invoice details and associated entities.
 * @param payload.client - The client associated with the invoice.
 * @param payload.creator - The creator of the invoice.
 * @param payload.org - The organization associated with the invoice.
 * @param payload.invoice - The invoice details.
 * @returns A promise that resolves to the created invoice.
 * @throws {ConflictError} If an invoice with the same ID already exists.
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

  payloadInvoice.createdAt = payloadInvoice.createdAt
    ? new Date(payloadInvoice.createdAt)
    : new Date();
  payloadInvoice.start = new Date(payloadInvoice.start);
  payloadInvoice.end = new Date(payloadInvoice.end);
  payloadInvoice.due = new Date(payloadInvoice.due);
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
 * Fetches an invoice by its ID.
 *
 * @param id - The unique identifier of the invoice to fetch.
 * @returns A promise that resolves to the fetched invoice.
 * @throws NotFoundError if the invoice is not found.
 */
export async function fetchInvoice(id: string): Promise<Invoice> {
  const data = await db.select().from(invoice).where(eq(invoice.id, id));

  if (data.length === 0) {
    throw new NotFoundError("Invoice not found.");
  }

  return data[0];
}

/**
 * Updates an existing invoice in the database.
 *
 * @param payload - The invoice data to update.
 * @returns A promise that resolves to the updated invoice.
 * @throws {NotFoundError} If the invoice with the given ID is not found.
 * @throws {ServerError} If the database update operation fails.
 */
export async function updateInvoice(payload: Invoice): Promise<Invoice> {
  const { id, paid, price, start, end, due, updatedAt } = payload;
  const foundInvoice = await db
    .select()
    .from(invoice)
    .where(eq(invoice.id, id));

  if (!foundInvoice) {
    throw new NotFoundError("Could not find the invoice.");
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
    throw new ServerError("Failed to update the database.", 503);
  }

  return result[0];
}

/**
 * Removes an invoice from the database by its ID.
 *
 * This function deletes the invoice from three different tables:
 * - `userInvoice`
 * - `orgInvoice`
 * - `invoice`
 *
 * @param invoiceId - The ID of the invoice to be removed.
 * @returns A promise that resolves when the invoice has been removed.
 */
export async function removeInvoice(invoiceId: string): Promise<void> {
  await db.delete(userInvoice).where(eq(userInvoice.invoiceId, invoiceId));
  await db.delete(orgInvoice).where(eq(orgInvoice.invoiceId, invoiceId));
  await db.delete(invoice).where(eq(invoice.id, invoiceId));
}
