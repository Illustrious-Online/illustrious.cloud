import { t } from "elysia";

export const User = t.Object({
  id: t.String({ minLength: 1, maxLength: 256 }),
  email: t.String({ format: "email", maxLength: 256 }),
  firstName: t.String({ minLength: 1, maxLength: 256 }),
  lastName: t.String({ minLength: 1, maxLength: 256 }),
  picture: t.String({ minLength: 0, maxLength: 256 }),
  phone: t.Nullable(t.String({ minLength: 0, maxLength: 256 })),
});
