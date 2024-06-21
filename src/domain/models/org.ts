import { t } from "elysia";

export const Org = t.Object({
  id: t.String({ minLength: 1, maxLength: 256 }),
  name: t.String({ minLength: 1, maxLength: 256 }),
  contact: t.String({ format: "email", maxLength: 256 }),
});
