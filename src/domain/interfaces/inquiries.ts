import type { Inquiry } from "../../drizzle/schema";

/**
 * Interface for inquiry service operations.
 * Defines the contract for inquiry-related business logic.
 */
export interface IInquiryService {
  /**
   * Creates a new inquiry and sends notification emails.
   * @param inquiryData - The inquiry data to create.
   * @param orgId - The organization ID to associate with the inquiry.
   * @returns Promise resolving to the created inquiry.
   */
  createInquiry(
    inquiryData: CreateInquiryInput,
    orgId: string,
  ): Promise<Inquiry>;

  /**
   * Retrieves an inquiry by its ID.
   * @param id - The inquiry ID.
   * @returns Promise resolving to the inquiry or null if not found.
   */
  getInquiryById(id: string): Promise<Inquiry | null>;

  /**
   * Retrieves inquiries with optional filtering and pagination.
   * @param query - Query parameters for filtering and pagination.
   * @returns Promise resolving to an array of inquiries.
   */
  getInquiries(query: InquiryQuery): Promise<Inquiry[]>;

  /**
   * Updates an inquiry.
   * @param id - The inquiry ID.
   * @param updateData - The data to update.
   * @returns Promise resolving to the updated inquiry or null if not found.
   */
  updateInquiry(
    id: string,
    updateData: UpdateInquiryInput,
  ): Promise<Inquiry | null>;

  /**
   * Soft deletes an inquiry.
   * @param id - The inquiry ID.
   * @returns Promise resolving to true if deleted, false if not found.
   */
  deleteInquiry(id: string): Promise<boolean>;
}

/**
 * Interface for email service operations.
 * Defines the contract for sending inquiry-related emails.
 */
export interface IEmailService {
  /**
   * Sends a confirmation email to the customer.
   * @param inquiry - The inquiry data.
   * @param organizationName - The name of the organization.
   * @returns Promise resolving when email is sent.
   */
  sendCustomerConfirmation(
    inquiry: Inquiry,
    organizationName: string,
  ): Promise<void>;

  /**
   * Sends a notification email to the organization.
   * @param inquiry - The inquiry data.
   * @param orgEmail - The organization's email address.
   * @param organizationName - The name of the organization.
   * @returns Promise resolving when email is sent.
   */
  sendOwnerNotification(
    inquiry: Inquiry,
    orgEmail: string,
    organizationName: string,
  ): Promise<void>;
}

// Type definitions for the inquiry service
export type CreateInquiryInput = {
  name: string;
  email: string;
  phone?: string;
  service: string;
  message: string;
  recaptchaToken: string;
};

export type UpdateInquiryInput = Partial<CreateInquiryInput>;

export type InquiryQuery = {
  page?: number;
  limit?: number;
  orgId?: string;
  service?: string;
  email?: string;
};
