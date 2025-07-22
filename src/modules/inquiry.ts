import config from "@/config";
import BadRequestError from "@/domain/exceptions/BadRequestError";
import UnauthorizedError from "@/domain/exceptions/UnauthorizedError";
import type { AuthenticatedContext } from "@/domain/interfaces/auth";
import type {
  SubmitInquiry,
  UpdateInquiry,
} from "@/domain/interfaces/inquiries";
import type SuccessResponse from "@/domain/types/generic/SuccessResponse";
import type { Inquiry as InquiryType } from "@/drizzle/schema";
import { verifyRecaptcha } from "@/libs/recaptcha";
import * as inquiryService from "@/services/inquiry";

/**
 * Creates a new inquiry with Service Role Key authentication and reCAPTCHA verification.
 *
 * @param context - The request context containing headers and body.
 * @returns A promise that resolves to a success response.
 * @throws {UnauthorizedError} If the Service Role Key is invalid or missing.
 * @throws {BadRequestError} If reCAPTCHA verification fails.
 */
export const postInquiry = async (context: {
  headers: { authorization?: string };
  body: SubmitInquiry;
}): Promise<SuccessResponse<{ id: string }>> => {
  const { headers, body } = context;

  // Verify Service Role Key authentication
  const authHeader = headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Service Role Key required.");
  }

  const serviceRoleKey = authHeader.substring(7); // Remove "Bearer " prefix
  if (serviceRoleKey !== config.auth.supabaseServiceRoleKey) {
    throw new UnauthorizedError("Invalid Service Role Key.");
  }

  // Verify reCAPTCHA token
  const isRecaptchaValid = await verifyRecaptcha(body.recaptchaToken);
  if (!isRecaptchaValid) {
    throw new BadRequestError("reCAPTCHA verification failed.");
  }

  // Create the inquiry (without the recaptchaToken)
  const { recaptchaToken, ...inquiryData } = body;
  const inquiryObj = await inquiryService.createInquiry(inquiryData);

  return {
    data: { id: inquiryObj.id },
    message: "Inquiry submitted successfully!",
  };
};

// GET /inquiry/:inquiry
export const getInquiry = async (
  context: AuthenticatedContext & { params: { inquiry: string } },
): Promise<SuccessResponse<{ inquiry: InquiryType }>> => {
  const { params, permissions } = context;
  const { superAdmin, inquiry } = permissions;
  if (!superAdmin && !inquiry?.access) {
    throw new UnauthorizedError(
      "You do not have permission to access this inquiry.",
    );
  }
  const inquiryObj = await inquiryService.fetchInquiry(params.inquiry);
  return {
    data: { inquiry: inquiryObj },
    message: "Inquiry fetched successfully!",
  };
};

// PUT /inquiry/:inquiry
export const putInquiry = async (
  context: AuthenticatedContext & {
    params: { inquiry: string };
    body: UpdateInquiry;
  },
): Promise<SuccessResponse<{ inquiry: InquiryType }>> => {
  const { permissions, params, body } = context;
  const { superAdmin, inquiry } = permissions;
  if (!superAdmin && !inquiry?.edit) {
    throw new UnauthorizedError(
      "You do not have permission to update this inquiry.",
    );
  }
  const updatedInquiry = await inquiryService.updateInquiry({
    id: params.inquiry,
    status: body.status,
  });
  return {
    data: { inquiry: updatedInquiry },
    message: "Inquiry updated successfully!",
  };
};

// DELETE /inquiry/:inquiry
export const deleteInquiry = async (
  context: AuthenticatedContext & { params: { inquiry: string } },
): Promise<SuccessResponse<Record<string, never>>> => {
  const { permissions, params } = context;
  const { superAdmin, inquiry } = permissions;
  if (!superAdmin && !inquiry?.delete) {
    throw new UnauthorizedError(
      "You do not have permission to delete this inquiry.",
    );
  }
  await inquiryService.removeInquiry(params.inquiry);
  return {
    message: "Inquiry deleted successfully!",
    data: {},
  };
};
