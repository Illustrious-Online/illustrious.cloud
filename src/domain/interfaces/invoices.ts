import { Invoice } from "../../../drizzle/schema";

export interface CreateInvoice {
  user: string;
  org: string;
  invoice: Invoice;
}

export interface SubmitInvoice {
  org: string;
  invoice: Invoice;
}

export interface FetchInvoice {
  id: string;
  userId?: string;
}

export interface FetchAllInvoices {
  type: string;
  id: string;
}
