import { t } from "elysia";

/**
 * Represents a User object with various properties.
 *
 * @property {string} id - The unique identifier for the user. Must be between 1 and 256 characters.
 * @property {string} email - The email address of the user. Must be a valid email format and up to 256 characters.
 * @property {string} firstName - The first name of the user. Must be between 1 and 256 characters.
 * @property {string} lastName - The last name of the user. Must be between 1 and 256 characters.
 * @property {string} picture - The URL or path to the user's picture. Can be empty but must not exceed 256 characters.
 * @property {boolean} managed - Indicates if the user is managed.
 * @property {boolean} passwordRest - Indicates if the user has a password reset.
 * @property {boolean} superAdmin - Indicates if the user has super admin privileges.
 * @property {string | null} phone - The phone number of the user. Can be null or a string up to 256 characters.
 */
export const User = t.Object({
  id: t.String({ minLength: 1, maxLength: 256 }),
  identifier: t.String({ minLength: 1, maxLength: 256 }),
  email: t.Nullable(t.String({ format: "email", maxLength: 256 })),
  firstName: t.Nullable(t.String({ minLength: 1, maxLength: 256 })),
  lastName: t.Nullable(t.String({ minLength: 1, maxLength: 256 })),
  picture: t.Nullable(t.String({ minLength: 0, maxLength: 256 })),
  phone: t.Nullable(t.String({ minLength: 0, maxLength: 256 })),
  managed: t.Boolean(),
  passwordReset: t.Nullable(t.Boolean()),
  superAdmin: t.Boolean(),
});
