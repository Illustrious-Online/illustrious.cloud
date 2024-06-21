import { t } from "elysia";

export const Report = t.Object({
  id: t.String({ minLength: 1, maxLength: 256 }),
  rating: t.Number(),
  notes: t.Nullable(t.String()),
});
