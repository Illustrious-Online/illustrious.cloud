import UnauthorizedError from "@/domain/exceptions/UnauthorizedError";
import type { AuthenticatedContext } from "@/domain/interfaces/auth";
import type { SubmitInvoice } from "@/domain/interfaces/invoices";
import type SuccessResponse from "@/domain/types/generic/SuccessResponse";
import type { Invoice } from "@/drizzle/schema";
import * as invoiceService from "@/services/invoice";

/**
 * Creates a new invoice.
 *
 * @param context - The authenticated context containing user and permissions information.
 * @returns A promise that resolves to a success response containing the created invoice.
 * @throws UnauthorizedError - If the user does not have permission to create an invoice.
 */
export const postInvoice = async (
  context: AuthenticatedContext,
): Promise<SuccessResponse<Invoice>> => {
  const { user, permissions } = context;
  const { superAdmin, invoice } = permissions;

  if (!superAdmin && !invoice?.create) {
    throw new UnauthorizedError(
      "You do not have permission to create an invoice in this organization.",
    );
  }

  const body = context.body as SubmitInvoice;
  const data = await invoiceService.createInvoice({
    client: body.client,
    creator: user.id,
    org: body.org,
    invoice: body.invoice,
  });

  return {
    data,
    message: "Invoice created successfully!",
  };
};

/**
 * Fetches a single invoice based on the provided context.
 *
 * @param {AuthenticatedContext} context - The context containing authentication and authorization information.
 * @returns {Promise<{ data: any; message: string }>} The fetched invoice data and a success message.
 * @throws {UnauthorizedError} If the user does not have permission to access the invoice.
 */
export const getInvoice = async (
  context: AuthenticatedContext,
): Promise<SuccessResponse<Invoice>> => {
  const { params, permissions } = context;
  const { invoice: invoiceId } = params;
  const { superAdmin, invoice } = permissions;

  if (!superAdmin && !invoice?.access) {
    throw new UnauthorizedError(
      "You do not have permission to access this invoice.",
    );
  }

  return {
    data: await invoiceService.fetchInvoice(invoiceId),
    message: "Invoice fetched successfully!",
  };
};

/**
 * Updates an invoice based on the provided context.
 *
 * @param context - The authenticated context containing the invoice data and user permissions.
 * @returns An object containing the updated invoice data and a success message.
 * @throws {UnauthorizedError} If the user does not have permission to update the invoice.
 */
export const putInvoice = async (
  context: AuthenticatedContext,
): Promise<SuccessResponse<Invoice>> => {
  const body = context.body as SubmitInvoice;
  const { permissions } = context;
  const { superAdmin, invoice } = permissions;

  if (!superAdmin && !invoice?.edit) {
    throw new UnauthorizedError(
      "You do not have permission to update this invoice.",
    );
  }

  return {
    data: await invoiceService.updateInvoice(body.invoice),
    message: "Invoice updated successfully!",
  };
};

/**
 * Deletes a single invoice based on the provided context.
 *
 * @param {AuthenticatedContext} context - The context containing authentication and authorization information.
 * @returns {Promise<{ message: string }>} A promise that resolves to an object containing a success message.
 * @throws {UnauthorizedError} If the user does not have permission to delete the invoice.
 */
export const deleteInvoice = async (
  context: AuthenticatedContext,
): Promise<SuccessResponse<string>> => {
  const { invoice: invoiceId } = context.params;
  const { permissions } = context;
  const { superAdmin, invoice } = permissions;

  if (!superAdmin && !invoice?.edit) {
    throw new UnauthorizedError(
      "You do not have permission to delete this invoice.",
    );
  }

  await invoiceService.removeInvoice(invoiceId);

  return {
    message: "Invoice deleted successfully!",
  };
};
