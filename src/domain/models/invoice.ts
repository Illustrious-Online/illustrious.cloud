import { t } from "elysia";

export const Invoice = t.Object({
  id: t.String({ minLength: 1, maxLength: 256 }),
  paid: t.Boolean({ default: false }),
  value: t.String(),
  start: t.Date(),
  end: t.Date(),
  due: t.Date(),
});
