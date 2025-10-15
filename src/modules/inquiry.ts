import type { Context } from "elysia";
import BadRequestError from "@/domain/exceptions/BadRequestError";
import ServerError from "@/domain/exceptions/ServerError";
import type {
  CreateInquiryInput,
  UpdateInquiryInput,
} from "@/domain/interfaces/inquiries";
// import { Inquiry } from "@/domain/models/inquiry";
import type SuccessResponse from "@/domain/types/generic/SuccessResponse";
import type { Inquiry as InquiryType } from "@/drizzle/schema";
import * as inquiryService from "@/services/inquiry";

/**
 * Creates a new inquiry and sends notification emails.
 *
 * @param context - The context object containing the request body and headers.
 * @returns A promise that resolves to a success response containing the created inquiry.
 * @throws {BadRequestError} If the organization ID is not provided in headers.
 * @throws {ServerError} If the inquiry creation fails.
 */
export const createInquiry = async (
  context: Context,
): Promise<SuccessResponse<InquiryType>> => {
  const { body, headers } = context;

  // Extract organization ID from headers
  const orgId = headers["x-org-id"] || headers["X-Org-Id"];

  if (!orgId) {
    throw new BadRequestError("Organization ID is required");
  }

  const data = await inquiryService.createInquiry(
    body as CreateInquiryInput,
    orgId,
  );

  return {
    data: data,
    message: "Inquiry created successfully",
  };
};

/**
 * Retrieves an inquiry by its ID.
 *
 * @param context - The context object containing the inquiry ID parameter.
 * @returns A promise that resolves to a success response containing the inquiry.
 * @throws {ServerError} If the inquiry retrieval fails.
 */
export const getInquiryById = async (
  context: Context,
): Promise<SuccessResponse<InquiryType>> => {
  const { params } = context;

  const data = await inquiryService.getInquiryById(params.id);

  if (!data) {
    throw new ServerError("Inquiry not found", 404);
  }

  return {
    data: data,
    message: "Inquiry retrieved successfully",
  };
};

/**
 * Retrieves inquiries with optional filtering and pagination.
 *
 * @param context - The context object containing query parameters.
 * @returns A promise that resolves to a success response containing the inquiries.
 * @throws {ServerError} If the inquiry retrieval fails.
 */
export const getInquiries = async (
  context: Context,
): Promise<SuccessResponse<InquiryType[]>> => {
  const { query } = context;

  const data = await inquiryService.getInquiries(query);

  return {
    data: data,
    message: "Inquiries retrieved successfully",
  };
};

/**
 * Updates an existing inquiry.
 *
 * @param context - The context object containing the inquiry ID and update data.
 * @returns A promise that resolves to a success response containing the updated inquiry.
 * @throws {ServerError} If the inquiry update fails.
 */
export const updateInquiry = async (
  context: Context,
): Promise<SuccessResponse<InquiryType>> => {
  const { params, body } = context;

  const data = await inquiryService.updateInquiry(
    params.id,
    body as UpdateInquiryInput,
  );

  if (!data) {
    throw new ServerError("Inquiry not found", 404);
  }

  return {
    data: data,
    message: "Inquiry updated successfully",
  };
};

/**
 * Soft deletes an inquiry.
 *
 * @param context - The context object containing the inquiry ID parameter.
 * @returns A promise that resolves to a success response indicating deletion.
 * @throws {ServerError} If the inquiry deletion fails.
 */
export const deleteInquiry = async (
  context: Context,
): Promise<SuccessResponse<null>> => {
  const { params } = context;

  const deleted = await inquiryService.deleteInquiry(params.id);

  if (!deleted) {
    throw new ServerError("Inquiry not found", 404);
  }

  return {
    data: null,
    message: "Inquiry deleted successfully",
  };
};
