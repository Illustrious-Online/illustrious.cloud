import type { Invoice } from "../../drizzle/schema";

export interface SubmitInvoice {
  client: string;
  org: string;
  invoice: Invoice;
}

export interface CreateInvoice extends SubmitInvoice {
  creator: string;
}
