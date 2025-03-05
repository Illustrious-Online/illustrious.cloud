import { t } from "elysia";

/**
 * Represents an Invoice object with various properties.
 *
 * @property {string} id - The unique identifier for the invoice. Must be between 1 and 256 characters.
 * @property {boolean} paid - Indicates whether the invoice has been paid. Defaults to false.
 * @property {string} price - The price associated with the invoice.
 * @property {Date} start - The start date of the invoice period.
 * @property {Date} end - The end date of the invoice period.
 * @property {Date} due - The due date for the invoice payment.
 * @property {Date} createdAt - The date when the invoice was created.
 * @property {Date | null} updatedAt - The date when the invoice was last updated. Can be null.
 * @property {Date | null} deletedAt - The date when the invoice was deleted. Can be null.
 */
export const Invoice = t.Object({
  id: t.String({ minLength: 1, maxLength: 256 }),
  paid: t.Boolean({ default: false }),
  price: t.String(),
  start: t.Date(),
  end: t.Date(),
  due: t.Date(),
  createdAt: t.Date(),
  updatedAt: t.Nullable(t.Date()),
  deletedAt: t.Nullable(t.Date()),
});
