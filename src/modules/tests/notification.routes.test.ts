import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { db } from "@/drizzle/db";
import { notification, user, userProfile } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import {
  createIntegrationTestUserWithSession,
} from "./utils/integration-auth";
import {
  setupIntegrationTests,
  teardownIntegrationTests,
} from "./utils/integration-setup";
import {
  createTestNotification,
  createTestUserProfile,
} from "./utils/fixtures";
import {
  authenticatedRequest,
  expectUnauthenticatedResponse,
  parseJsonResponse,
  unauthenticatedRequest,
} from "./utils/requests";
import { createTestApp } from "./utils/test-app";

describe("Notification Routes", () => {
  let testUserId: string;
  let authToken: string;
  let app: ReturnType<typeof createTestApp>;

  beforeAll(async () => {
    await setupIntegrationTests();

    const session = await createIntegrationTestUserWithSession(
      "notification-test@example.com",
      "Notification Test User"
    );
    testUserId = session.userId;
    authToken = session.token;

    await createTestUserProfile(testUserId);
    app = createTestApp();
  });

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  describe("GET /notifications", () => {
    it("should return user's notifications", async () => {
      const testNotif = await createTestNotification(testUserId, {
        type: "invitation",
        title: "Test Invitation",
        read: false,
      });

      const response = await authenticatedRequest(
        app,
        "GET",
        "/notifications",
        authToken,
      );
      expect(response.status).toBe(200);

      const data = await parseJsonResponse(response);
      expect(Array.isArray(data)).toBe(true);
      expect(
        (data as Array<{ id: string }>).some((n) => n.id === testNotif.id),
      ).toBe(true);

      await db.delete(notification).where(eq(notification.id, testNotif.id));
    });

    it("should filter by unreadOnly", async () => {
      const response = await authenticatedRequest(
        app,
        "GET",
        "/notifications?unreadOnly=true",
        authToken,
      );
      expect(response.status).toBe(200);

      const data = await parseJsonResponse(response);
      expect(Array.isArray(data)).toBe(true);
      expect((data as Array<{ read: boolean }>).every((n) => !n.read)).toBe(
        true,
      );
    });

    it("should filter by type", async () => {
      const response = await authenticatedRequest(
        app,
        "GET",
        "/notifications?type=ownership_transfer",
        authToken,
      );
      expect(response.status).toBe(200);

      const data = await parseJsonResponse(response);
      expect(Array.isArray(data)).toBe(true);
    });

    it("should respect limit and offset", async () => {
      const response = await authenticatedRequest(
        app,
        "GET",
        "/notifications?limit=5&offset=0",
        authToken,
      );
      expect(response.status).toBe(200);

      const data = await parseJsonResponse(response);
      expect(Array.isArray(data)).toBe(true);
      expect((data as unknown[]).length).toBeLessThanOrEqual(5);
    });

    it("should return 401 when not authenticated", async () => {
      const response = await unauthenticatedRequest(
        app,
        "GET",
        "/notifications",
      );
      await expectUnauthenticatedResponse(response);
    });
  });

  describe("GET /notifications/unread-count", () => {
    it("should return unread count", async () => {
      const response = await authenticatedRequest(
        app,
        "GET",
        "/notifications/unread-count",
        authToken,
      );
      expect(response.status).toBe(200);

      const data = await parseJsonResponse(response);
      expect(typeof data.count).toBe("number");
      expect(data.count).toBeGreaterThanOrEqual(0);
    });

    it("should return 401 when not authenticated", async () => {
      const response = await unauthenticatedRequest(
        app,
        "GET",
        "/notifications/unread-count",
      );
      await expectUnauthenticatedResponse(response);
    });
  });

  describe("PATCH /notifications/:id/read", () => {
    it("should mark notification as read", async () => {
      const testNotif = await createTestNotification(testUserId, {
        read: false,
      });

      const response = await authenticatedRequest(
        app,
        "PATCH",
        `/notifications/${testNotif.id}/read`,
        authToken,
      );
      expect(response.status).toBe(200);

      const data = await parseJsonResponse(response);
      expect(data.id).toBe(testNotif.id);
      expect(data.read).toBe(true);

      await db.delete(notification).where(eq(notification.id, testNotif.id));
    });

    it("should return 401 when not authenticated", async () => {
      const testNotif = await createTestNotification(testUserId, {
        read: false,
      });

      const response = await unauthenticatedRequest(
        app,
        "PATCH",
        `/notifications/${testNotif.id}/read`,
      );
      await expectUnauthenticatedResponse(response);

      await db.delete(notification).where(eq(notification.id, testNotif.id));
    });
  });

  describe("DELETE /notifications/:id", () => {
    it("should delete notification", async () => {
      const testNotif = await createTestNotification(testUserId);

      const response = await authenticatedRequest(
        app,
        "DELETE",
        `/notifications/${testNotif.id}`,
        authToken,
      );
      expect(response.status).toBe(204);

      const [deleted] = await db
        .select()
        .from(notification)
        .where(eq(notification.id, testNotif.id))
        .limit(1);
      expect(deleted).toBeUndefined();
    });

    it("should return 401 when not authenticated", async () => {
      const testNotif = await createTestNotification(testUserId);

      const response = await unauthenticatedRequest(
        app,
        "DELETE",
        `/notifications/${testNotif.id}`,
      );
      await expectUnauthenticatedResponse(response);

      await db.delete(notification).where(eq(notification.id, testNotif.id));
    });
  });
});
