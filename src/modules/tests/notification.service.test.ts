import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { db } from "@/drizzle/db";
import { notification, user, userProfile } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import {
  NotificationType,
  createNotification,
  deleteNotification,
  getUnreadCount,
  getUserNotifications,
  markNotificationRead,
} from "../notification/service";
import {
  createTestNotification,
  createTestUser,
  createTestUserProfile,
} from "./utils/fixtures";

describe("Notification Service", () => {
  let testUser: typeof user.$inferSelect;
  let testUser2: typeof user.$inferSelect;

  beforeAll(async () => {
    testUser = await createTestUser();
    testUser2 = await createTestUser();
    await createTestUserProfile(testUser.id);
    await createTestUserProfile(testUser2.id);
  });

  afterAll(async () => {
    // Cleanup notifications
    await db.delete(notification).where(eq(notification.userId, testUser.id));
    await db.delete(notification).where(eq(notification.userId, testUser2.id));
    // Cleanup profiles and users
    await db.delete(userProfile).where(eq(userProfile.userId, testUser.id));
    await db.delete(userProfile).where(eq(userProfile.userId, testUser2.id));
    await db.delete(user).where(eq(user.id, testUser.id));
    await db.delete(user).where(eq(user.id, testUser2.id));
  });

  describe("createNotification", () => {
    it("should create a notification for a user", async () => {
      const notif = await createNotification({
        userId: testUser.id,
        type: NotificationType.INVITATION,
        title: "Test Notification",
        message: "This is a test notification",
        metadata: JSON.stringify({ orgId: "test-org" }),
        read: false,
      });

      expect(notif).toBeDefined();
      expect(notif.userId).toBe(testUser.id);
      expect(notif.type).toBe(NotificationType.INVITATION);
      expect(notif.title).toBe("Test Notification");
      expect(notif.read).toBe(false);

      // Cleanup
      await db.delete(notification).where(eq(notification.id, notif.id));
    });

    it("should throw NotFoundError for non-existent user", async () => {
      await expect(
        createNotification({
          userId: "non-existent-id",
          type: NotificationType.INVITATION,
          title: "Test",
          message: "Test",
          read: false,
        }),
      ).rejects.toThrow("User not found");
    });
  });

  describe("getUserNotifications", () => {
    let testNotification1: typeof notification.$inferSelect;
    let testNotification2: typeof notification.$inferSelect;

    beforeAll(async () => {
      testNotification1 = await createTestNotification(testUser.id, {
        type: NotificationType.OWNERSHIP_TRANSFER,
        read: false,
      });
      testNotification2 = await createTestNotification(testUser.id, {
        type: NotificationType.INVITATION,
        read: true,
      });
    });

    afterAll(async () => {
      await db
        .delete(notification)
        .where(eq(notification.id, testNotification1.id));
      await db
        .delete(notification)
        .where(eq(notification.id, testNotification2.id));
    });

    it("should return all notifications for a user", async () => {
      const notifications = await getUserNotifications(testUser.id);
      expect(notifications.length).toBeGreaterThanOrEqual(2);
      expect(notifications.some((n) => n.id === testNotification1.id)).toBe(
        true,
      );
      expect(notifications.some((n) => n.id === testNotification2.id)).toBe(
        true,
      );
    });

    it("should filter by unreadOnly", async () => {
      const notifications = await getUserNotifications(testUser.id, {
        unreadOnly: true,
      });
      expect(notifications.every((n) => !n.read)).toBe(true);
      expect(notifications.some((n) => n.id === testNotification1.id)).toBe(
        true,
      );
      expect(notifications.some((n) => n.id === testNotification2.id)).toBe(
        false,
      );
    });

    it("should filter by type", async () => {
      const notifications = await getUserNotifications(testUser.id, {
        type: NotificationType.OWNERSHIP_TRANSFER,
      });
      expect(
        notifications.every(
          (n) => n.type === NotificationType.OWNERSHIP_TRANSFER,
        ),
      ).toBe(true);
    });

    it("should respect limit and offset", async () => {
      const notifications = await getUserNotifications(testUser.id, {
        limit: 1,
        offset: 0,
      });
      expect(notifications.length).toBeLessThanOrEqual(1);
    });
  });

  describe("markNotificationRead", () => {
    it("should mark notification as read", async () => {
      const testNotification = await createTestNotification(testUser.id, {
        read: false,
      });
      const updated = await markNotificationRead(
        testNotification.id,
        testUser.id,
      );
      expect(updated.read).toBe(true);
      expect(updated.updatedAt).toBeDefined();

      // Cleanup
      await db
        .delete(notification)
        .where(eq(notification.id, testNotification.id));
    });

    it("should throw NotFoundError for non-existent notification", async () => {
      await expect(
        markNotificationRead("non-existent-id", testUser.id),
      ).rejects.toThrow("Notification not found");
    });

    it("should throw NotFoundError for notification belonging to another user", async () => {
      const testNotification = await createTestNotification(testUser.id);
      await expect(
        markNotificationRead(testNotification.id, testUser2.id),
      ).rejects.toThrow("Notification not found");

      // Cleanup
      await db
        .delete(notification)
        .where(eq(notification.id, testNotification.id));
    });
  });

  describe("deleteNotification", () => {
    it("should delete notification", async () => {
      const testNotification = await createTestNotification(testUser.id);
      await deleteNotification(testNotification.id, testUser.id);

      const [deleted] = await db
        .select()
        .from(notification)
        .where(eq(notification.id, testNotification.id))
        .limit(1);

      expect(deleted).toBeUndefined();
    });

    it("should throw NotFoundError for non-existent notification", async () => {
      await expect(
        deleteNotification("non-existent-id", testUser.id),
      ).rejects.toThrow("Notification not found");
    });

    it("should throw NotFoundError for notification belonging to another user", async () => {
      const testNotification = await createTestNotification(testUser.id);
      await expect(
        deleteNotification(testNotification.id, testUser2.id),
      ).rejects.toThrow("Notification not found");

      // Cleanup
      await db
        .delete(notification)
        .where(eq(notification.id, testNotification.id));
    });
  });

  describe("getUnreadCount", () => {
    let unreadNotification1: typeof notification.$inferSelect;
    let unreadNotification2: typeof notification.$inferSelect;
    let readNotification: typeof notification.$inferSelect;

    beforeAll(async () => {
      unreadNotification1 = await createTestNotification(testUser.id, {
        read: false,
      });
      unreadNotification2 = await createTestNotification(testUser.id, {
        read: false,
      });
      readNotification = await createTestNotification(testUser.id, {
        read: true,
      });
    });

    afterAll(async () => {
      if (unreadNotification1) {
        await db
          .delete(notification)
          .where(eq(notification.id, unreadNotification1.id));
      }
      if (unreadNotification2) {
        await db
          .delete(notification)
          .where(eq(notification.id, unreadNotification2.id));
      }
      if (readNotification) {
        await db
          .delete(notification)
          .where(eq(notification.id, readNotification.id));
      }
    });

    it("should return count of unread notifications", async () => {
      const count = await getUnreadCount(testUser.id);
      expect(count).toBeGreaterThanOrEqual(2);
    });

    it("should return 0 for user with no unread notifications", async () => {
      const count = await getUnreadCount(testUser2.id);
      expect(count).toBe(0);
    });
  });

  describe("expiration handling", () => {
    it("should filter expired notifications", async () => {
      const expiredNotification = await createTestNotification(testUser.id, {
        expiresAt: new Date(Date.now() - 1000), // Expired
      });

      const notifications = await getUserNotifications(testUser.id);
      expect(notifications.some((n) => n.id === expiredNotification.id)).toBe(
        false,
      );

      // Cleanup
      await db
        .delete(notification)
        .where(eq(notification.id, expiredNotification.id));
    });

    it("should include non-expired notifications", async () => {
      const futureNotification = await createTestNotification(testUser.id, {
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      });

      const notifications = await getUserNotifications(testUser.id);
      expect(notifications.some((n) => n.id === futureNotification.id)).toBe(
        true,
      );

      // Cleanup
      await db
        .delete(notification)
        .where(eq(notification.id, futureNotification.id));
    });
  });
});
