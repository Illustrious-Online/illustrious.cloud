import { t } from "elysia";

/**
 * Represents an organization with an ID, name, and contact email.
 *
 * @constant
 * @type {Object}
 * @property {string} id - The unique identifier for the organization. Must be between 1 and 256 characters.
 * @property {string} name - The name of the organization. Must be between 1 and 256 characters.
 * @property {string} contact - The contact email for the organization. Must be a valid email format and up to 256 characters.
 */
export const Org = t.Object({
  id: t.String({ minLength: 1, maxLength: 256 }),
  name: t.String({ minLength: 1, maxLength: 256 }),
  contact: t.String({ format: "email", maxLength: 256 }),
});
