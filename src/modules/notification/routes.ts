import { Elysia, t } from "elysia";
import { getSessionFromHeader } from "@/lib/auth";
import { createAuthHelpers } from "../auth/middleware";
import { notificationModel } from "./model";
import {
  getUserNotifications,
  markNotificationRead,
  deleteNotification,
  getUnreadCount,
} from "./service";

export const notificationRoutes = new Elysia({ prefix: "/notifications" })
  .use(notificationModel)
  .derive(async ({ headers }) => {
    const { session, user } = await getSessionFromHeader(headers.authorization);
    return createAuthHelpers(session, user);
  })
  .get(
    "/",
    async ({ requireAuth, query }) => {
      const authContext = await requireAuth();
      const unreadOnly = query.unreadOnly === "true";
      const type = query.type;
      const limit = query.limit ? Number.parseInt(query.limit, 10) : 50;
      const offset = query.offset ? Number.parseInt(query.offset, 10) : 0;

      const notifications = await getUserNotifications(authContext.userId, {
        unreadOnly,
        type,
        limit,
        offset,
      });

      return notifications.map((n) => ({
        id: n.id,
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        metadata: n.metadata,
        read: n.read,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
        expiresAt: n.expiresAt,
      }));
    },
    {
      query: t.Object({
        unreadOnly: t.Optional(t.String()),
        type: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
      response: {
        200: "notificationListResponse",
      },
    },
  )
  .get(
    "/unread-count",
    async ({ requireAuth }) => {
      const authContext = await requireAuth();
      const count = await getUnreadCount(authContext.userId);
      return { count };
    },
    {
      response: {
        200: "unreadCountResponse",
      },
    },
  )
  .patch(
    "/:id/read",
    async ({ requireAuth, params }) => {
      const authContext = await requireAuth();
      const updated = await markNotificationRead(params.id, authContext.userId);
      return {
        id: updated.id,
        userId: updated.userId,
        type: updated.type,
        title: updated.title,
        message: updated.message,
        metadata: updated.metadata,
        read: updated.read,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        expiresAt: updated.expiresAt,
      };
    },
    {
      response: {
        200: "notificationResponse",
      },
    },
  )
  .delete(
    "/:id",
    async ({ requireAuth, params, set }) => {
      const authContext = await requireAuth();
      await deleteNotification(params.id, authContext.userId);
      set.status = 204;
      return;
    },
    {
      response: {
        204: t.Void(),
      },
    },
  );
