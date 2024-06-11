import { t } from "elysia";

export const Invoice = t.Object({
  id: t.String({ minLength: 1, maxLength: 256 }),
  paid: t.Boolean({ default: false }),
  value: t.Number(),
  start: t.String(),
  end: t.String(),
  due: t.String(),
});
