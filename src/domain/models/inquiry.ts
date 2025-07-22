import { t } from "elysia";

/**
 * Represents an inquiry with all required fields for submission.
 *
 * @constant
 * @type {Object}
 * @property {string} orgId - The organization ID. Must be between 1 and 256 characters.
 * @property {string} name - The name of the inquirer. Must be between 1 and 256 characters.
 * @property {string} email - The email of the inquirer. Must be a valid email format and up to 256 characters.
 * @property {string} subject - The subject of the inquiry. Must be between 1 and 256 characters.
 * @property {string} message - The message body. Must be between 1 and 2000 characters.
 */
export const Inquiry = t.Object({
  status: t.Union([
    t.Literal("pending"),
    t.Literal("resolved"),
    t.Literal("closed"),
  ]),
  orgId: t.String({ minLength: 1, maxLength: 256 }),
  name: t.String({ minLength: 1, maxLength: 256 }),
  email: t.String({ format: "email", maxLength: 256 }),
  subject: t.String({ minLength: 1, maxLength: 256 }),
  message: t.String({ minLength: 1, maxLength: 2000 }),
  createdAt: t.Date(),
  updatedAt: t.Nullable(t.Date()),
  deletedAt: t.Nullable(t.Date()),
});
