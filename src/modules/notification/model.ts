import { Elysia, t } from "elysia";

export const notificationModel = new Elysia().model({
  notificationResponse: t.Object({
    id: t.String(),
    userId: t.String(),
    type: t.String(),
    title: t.String(),
    message: t.String(),
    metadata: t.Nullable(t.String()),
    read: t.Boolean(),
    createdAt: t.Date(),
    updatedAt: t.Nullable(t.Date()),
    expiresAt: t.Nullable(t.Date()),
  }),
  notificationListResponse: t.Array(
    t.Object({
      id: t.String(),
      userId: t.String(),
      type: t.String(),
      title: t.String(),
      message: t.String(),
      metadata: t.Nullable(t.String()),
      read: t.Boolean(),
      createdAt: t.Date(),
      updatedAt: t.Nullable(t.Date()),
      expiresAt: t.Nullable(t.Date()),
    }),
  ),
  unreadCountResponse: t.Object({
    count: t.Number(),
  }),
});
