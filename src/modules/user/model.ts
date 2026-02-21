import { Elysia, t } from "elysia";

export const userModel = new Elysia().model({
  updateProfileBody: t.Object({
    firstName: t.Optional(t.String()),
    lastName: t.Optional(t.String()),
    phone: t.Optional(t.String()),
  }),
  userResponse: t.Object({
    id: t.String(),
    email: t.String(),
    name: t.Nullable(t.String()),
    image: t.Nullable(t.String()),
    emailVerified: t.Boolean(),
  }),
  userProfileResponse: t.Object({
    userId: t.String(),
    firstName: t.Nullable(t.String()),
    lastName: t.Nullable(t.String()),
    phone: t.Nullable(t.String()),
    managed: t.Boolean(),
    siteRole: t.Number(), // 0=Admin, 1=Moderator, 2=Normal User
  }),
  fullUserResponse: t.Object({
    id: t.String(),
    email: t.String(),
    name: t.Nullable(t.String()),
    image: t.Nullable(t.String()),
    emailVerified: t.Boolean(),
    profile: t.Optional(
      t.Object({
        firstName: t.Nullable(t.String()),
        lastName: t.Nullable(t.String()),
        phone: t.Nullable(t.String()),
        managed: t.Boolean(),
        siteRole: t.Number(), // 0=Admin, 1=Moderator, 2=Normal User
      }),
    ),
  }),
});
