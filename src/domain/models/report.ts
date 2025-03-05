import { t } from "elysia";

/**
 * Represents a report with an ID, rating, optional notes, and creation date.
 *
 * @property {string} id - The unique identifier for the report. Must be between 1 and 256 characters.
 * @property {number} rating - The rating associated with the report.
 * @property {string | null} notes - Optional notes for the report. Can be null.
 * @property {Date} createdAt - The date when the report was created.
 */
export const Report = t.Object({
  id: t.String({ minLength: 1, maxLength: 256 }),
  rating: t.Number(),
  notes: t.Nullable(t.String()),
  createdAt: t.Date(),
});
