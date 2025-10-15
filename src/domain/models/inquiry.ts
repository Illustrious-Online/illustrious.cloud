import { t } from "elysia";

/**
 * Represents an Inquiry object with various properties.
 *
 * @property {string} id - The unique identifier for the inquiry. Must be between 1 and 256 characters.
 * @property {string} name - The name of the person making the inquiry. Must be between 2 and 256 characters.
 * @property {string} email - The email address of the person making the inquiry. Must be a valid email format and up to 256 characters.
 * @property {string} phone - The phone number of the person making the inquiry. Must be between 1 and 256 characters.
 * @property {string} service - The service being inquired about. Must be between 1 and 256 characters.
 * @property {string} message - The message content of the inquiry. Must be between 10 and 2000 characters.
 * @property {string} recaptchaToken - The reCAPTCHA token for verification. Must be between 1 and 256 characters.
 * @property {string} createdAt - The timestamp when the inquiry was created.
 * @property {string | null} updatedAt - The timestamp when the inquiry was last updated. Can be null.
 * @property {string | null} deletedAt - The timestamp when the inquiry was deleted. Can be null.
 */
export const Inquiry = t.Object({
  id: t.String({ minLength: 1, maxLength: 256 }),
  name: t.String({ minLength: 2, maxLength: 256 }),
  email: t.String({ format: "email", maxLength: 256 }),
  phone: t.String({ minLength: 1, maxLength: 256 }),
  service: t.String({ minLength: 1, maxLength: 256 }),
  message: t.String({ minLength: 10, maxLength: 2000 }),
  recaptchaToken: t.String({ minLength: 1, maxLength: 256 }),
  createdAt: t.String({ format: "date-time" }),
  updatedAt: t.Nullable(t.String({ format: "date-time" })),
  deletedAt: t.Nullable(t.String({ format: "date-time" })),
});

/**
 * Schema for creating a new inquiry.
 * Validates the required fields for an inquiry submission.
 */
export const CreateInquiry = t.Object({
  name: t.String({ minLength: 2, maxLength: 256 }),
  email: t.String({ format: "email", maxLength: 256 }),
  phone: t.Optional(t.String({ minLength: 1, maxLength: 256 })),
  service: t.String({ minLength: 1, maxLength: 256 }),
  message: t.String({ minLength: 10, maxLength: 2000 }),
  recaptchaToken: t.String({ minLength: 1, maxLength: 256 }),
});

/**
 * Schema for updating an inquiry.
 * All fields are optional for partial updates.
 */
export const UpdateInquiry = t.Partial(CreateInquiry);

/**
 * Schema for inquiry query parameters.
 * Used for filtering and pagination.
 */
export const InquiryQuery = t.Object({
  page: t.Optional(t.Number({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Number({ minimum: 1, maximum: 100, default: 10 })),
  orgId: t.Optional(t.String({ minLength: 1, maxLength: 256 })),
  service: t.Optional(t.String({ minLength: 1, maxLength: 256 })),
  email: t.Optional(t.String({ format: "email", maxLength: 256 })),
});
