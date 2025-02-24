import { NotFoundError } from "elysia";

import ConflictError from "@/domain/exceptions/ConflictError";
import type { CreateInvoice } from "@/domain/interfaces/invoices";
import { and, eq } from "drizzle-orm";
import { db } from "../drizzle/db";
import {
  type Invoice,
  invoice,
  orgInvoice,
  userInvoice,
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
  const { client, creator, org, invoice: payloadInvoice } = payload;
  const foundInvoice = await db
    .select()
    .from(invoice)
    .where(eq(invoice.id, payloadInvoice.id));

  if (foundInvoice.length > 0) {
    throw new ConflictError("Invoice already exists!");
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
export async function fetchById(id: string): Promise<Invoice> {
  const data = await db.select().from(invoice).where(eq(invoice.id, id));

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
  const { id, paid, price, start, end, due, updatedAt } = payload;
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

  return result[0];
}

/**
 * Removes an invoice and relationships.
 *
 * @param invoiceId - The Invoice ID to be removed.
 * @throws {ConflictError} If a user with the same data already exists.
 */
export async function deleteOne(invoiceId: string): Promise<void> {
  await db.delete(userInvoice).where(eq(userInvoice.invoiceId, invoiceId));
  await db.delete(orgInvoice).where(eq(orgInvoice.invoiceId, invoiceId));
  await db.delete(invoice).where(eq(invoice.id, invoiceId));
}

export async function validatePermissions(userId: string, invoiceId: string) {
  return await db
    .select()
    .from(userInvoice)
    .where(
      and(eq(userInvoice.userId, userId), eq(userInvoice.invoiceId, invoiceId)),
    );
}
