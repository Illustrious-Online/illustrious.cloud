import { Elysia, t } from "elysia";

export const orgModel = new Elysia().model({
  createOrgBody: t.Object({
    name: t.String({ minLength: 1 }),
  }),
  orgResponse: t.Object({
    id: t.String(),
    name: t.String(),
    contact: t.String(),
  }),
  orgListResponse: t.Array(
    t.Object({
      id: t.String(),
      name: t.String(),
      contact: t.String(),
    }),
  ),
  transferOwnershipBody: t.Object({
    newOwnerId: t.String(),
  }),
  orgOwnerResponse: t.Object({
    id: t.String(),
    name: t.Nullable(t.String()),
    email: t.String(),
  }),
});
