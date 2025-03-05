import type { Invoice } from "@/drizzle/schema";

/**
 * Interface representing the data required to submit an invoice.
 */
export interface SubmitInvoice {
  client: string;
  org: string;
  invoice: Invoice;
}

/**
 * Interface representing the structure for creating an invoice.
 * Extends the `SubmitInvoice` interface.
 *
 * @interface CreateInvoice
 * @extends SubmitInvoice
 *
 * @property {string} creator - The creator of the invoice.
 */
export interface CreateInvoice extends SubmitInvoice {
  creator: string;
}
