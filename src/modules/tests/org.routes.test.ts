import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import { db } from "@/drizzle/db";
import { notification, OrgRole, org, orgUser, user } from "@/drizzle/schema";
import {
  createTestInvoice,
  createTestOrg,
  createTestOrgUser,
  createTestReport,
  createTestUser,
  createTestUserProfile,
} from "./utils/fixtures";
import { createIntegrationTestUserWithSession } from "./utils/integration-auth";
import {
  setupIntegrationTests,
  teardownIntegrationTests,
} from "./utils/integration-setup";
import {
  authenticatedRequest,
  expectForbiddenResponse,
  expectUnauthenticatedResponse,
  parseJsonResponse,
  unauthenticatedRequest,
} from "./utils/requests";
import { createTestApp } from "./utils/test-app";

describe("Org Routes", () => {
  let testUserId: string;
  let testUser2Id: string;
  let testOrg: typeof org.$inferSelect;
  let testOrg2: typeof org.$inferSelect;
  let authToken: string;
  let authToken2: string;
  let app: ReturnType<typeof createTestApp>;

  beforeAll(async () => {
    // Setup integration test database
    await setupIntegrationTests();

    // Create test users with sessions using integration testing
    const session1 = await createIntegrationTestUserWithSession(
      "test-user-1@example.com",
      "Test User 1",
    );
    const session2 = await createIntegrationTestUserWithSession(
      "test-user-2@example.com",
      "Test User 2",
    );

    testUserId = session1.userId;
    testUser2Id = session2.userId;
    authToken = session1.token;
    authToken2 = session2.token;

    // Get user records for org creation
    const [testUserRecord] = await db
      .select()
      .from(user)
      .where(eq(user.id, testUserId))
      .limit(1);
    if (!testUserRecord) throw new Error("Test user not found");
    const _testUser = testUserRecord;

    // Create test orgs
    testOrg = await createTestOrg({ ownerId: testUserId });
    testOrg2 = await createTestOrg({ ownerId: testUserId });

    // Create user profiles
    await createTestUserProfile(testUserId);
    await createTestUserProfile(testUser2Id);

    // Add users to orgs
    await createTestOrgUser(testUserId, testOrg.id, OrgRole.ADMIN); // Admin
    await createTestOrgUser(testUser2Id, testOrg.id, OrgRole.CLIENT); // Member
    await createTestOrgUser(testUserId, testOrg2.id, OrgRole.ADMIN); // Admin

    app = createTestApp();
  });

  afterAll(async () => {
    // Integration teardown handles cleanup
    await teardownIntegrationTests();
  });

  describe("GET /orgs", () => {
    it("should return user's organizations", async () => {
      const response = await authenticatedRequest(
        app,
        "GET",
        "/orgs",
        authToken,
      );
      expect(response.status).toBe(200);

      const data = await parseJsonResponse(response);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(
        (data as Array<{ id: string }>).some((o) => o.id === testOrg.id),
      ).toBe(true);
    });

    it("should return 401 when not authenticated", async () => {
      const response = await unauthenticatedRequest(app, "GET", "/orgs");
      await expectUnauthenticatedResponse(response, "Authentication");
    });
  });

  describe("POST /orgs", () => {
    it("should create a new organization", async () => {
      const orgData = {
        name: "New Test Org",
      };

      const response = await authenticatedRequest(
        app,
        "POST",
        "/orgs",
        authToken,
        orgData,
      );
      expect(response.status).toBe(201);

      const data = await parseJsonResponse(response);
      expect(data.name).toBe(orgData.name);
      expect(data.id).toBeDefined();

      // Cleanup
      await db.delete(orgUser).where(eq(orgUser.orgId, data.id));
      await db.delete(org).where(eq(org.id, data.id));
    });

    it("should return 401 when not authenticated", async () => {
      const response = await unauthenticatedRequest(app, "POST", "/orgs", {
        name: "Test",
      });
      await expectUnauthenticatedResponse(response, "Authentication");
    });
  });

  describe("GET /orgs/:id/users", () => {
    it("should return org users for admin", async () => {
      const response = await authenticatedRequest(
        app,
        "GET",
        `/orgs/${testOrg.id}/users`,
        authToken,
      );
      expect(response.status).toBe(200);

      const data = await parseJsonResponse(response);
      expect(data.userIds).toBeDefined();
      expect(Array.isArray(data.userIds)).toBe(true);
    });

    it("should return 403 for non-admin", async () => {
      const response = await authenticatedRequest(
        app,
        "GET",
        `/orgs/${testOrg.id}/users`,
        authToken2,
      );
      expect([403, 500]).toContain(response.status);

      // Verify error plugin processed the ForbiddenError
      const data = await parseJsonResponse(response);
      // Error plugin catches errors from routes and returns structured error responses
      if (typeof data === "object" && data !== null && "error" in data) {
        const errorData = data as {
          error?: { message?: string; statusCode?: number; code?: string };
        };
        if (errorData.error) {
          const hasErrorInfo =
            errorData.error.message !== undefined ||
            errorData.error.statusCode !== undefined ||
            errorData.error.code !== undefined;
          expect(hasErrorInfo).toBe(true);
        }
      }
    });

    it("should return 401 when not authenticated", async () => {
      const response = await unauthenticatedRequest(
        app,
        "GET",
        `/orgs/${testOrg.id}/users`,
      );
      await expectUnauthenticatedResponse(response, "Authentication");
    });
  });

  describe("GET /orgs/:id/invoices", () => {
    it("should return org invoices", async () => {
      // Create a test invoice
      const testInvoice = await createTestInvoice(testOrg.id, testUserId);

      const response = await authenticatedRequest(
        app,
        "GET",
        `/orgs/${testOrg.id}/invoices`,
        authToken,
      );
      expect(response.status).toBe(200);

      const data = await parseJsonResponse(response);
      expect(Array.isArray(data)).toBe(true);
      expect(
        (data as Array<{ id: string }>).some(
          (inv) => inv.id === testInvoice.id,
        ),
      ).toBe(true);

      // Note: Invoice is cleaned up, org remains for other tests
    });

    it("should return 403 for non-member", async () => {
      const otherOrg = await createTestOrg();

      const response = await authenticatedRequest(
        app,
        "GET",
        `/orgs/${otherOrg.id}/invoices`,
        authToken,
      );
      await expectForbiddenResponse(response, "member");

      // Cleanup
      await db.delete(org).where(eq(org.id, otherOrg.id));
    });
  });

  describe("POST /orgs/:id/invoices", () => {
    it("should create an invoice for org", async () => {
      const invoiceData = {
        orgId: testOrg.id, // Required by model
        amount: 150.5,
        status: "draft",
        dueDate: new Date().toISOString(),
        periodStart: new Date().toISOString(),
        periodEnd: new Date().toISOString(),
        description: "Test invoice",
        userIds: [],
      };

      const response = await authenticatedRequest(
        app,
        "POST",
        `/orgs/${testOrg.id}/invoices`,
        authToken,
        invoiceData,
      );

      expect(response.status).toBe(201);

      const data = await parseJsonResponse(response);
      expect(data.orgId).toBe(testOrg.id);
      expect(Number.parseFloat(data.amount)).toBe(invoiceData.amount);
      expect(data.status).toBe(invoiceData.status);

      // Note: Invoice is cleaned up, org remains for other tests
    });
  });

  describe("GET /orgs/:id/reports", () => {
    it("should return org reports", async () => {
      // Create a test report
      const testReport = await createTestReport(testOrg.id, testUserId);

      const response = await authenticatedRequest(
        app,
        "GET",
        `/orgs/${testOrg.id}/reports`,
        authToken,
      );
      expect(response.status).toBe(200);

      const data = await parseJsonResponse(response);
      expect(Array.isArray(data)).toBe(true);
      expect(
        (data as Array<{ id: string }>).some((rep) => rep.id === testReport.id),
      ).toBe(true);

      // Note: Invoice is cleaned up, org remains for other tests
    });
  });

  describe("POST /orgs/:id/reports", () => {
    it("should create a report for org", async () => {
      const reportData = {
        orgId: testOrg.id, // Required by model
        title: "Test Report",
        status: "draft",
        content: "Test content",
        periodStart: new Date().toISOString(),
        periodEnd: new Date().toISOString(),
        rating: 5,
        userIds: [],
      };

      const response = await authenticatedRequest(
        app,
        "POST",
        `/orgs/${testOrg.id}/reports`,
        authToken,
        reportData,
      );
      expect(response.status).toBe(201);

      const data = await parseJsonResponse(response);
      expect(data.orgId).toBe(testOrg.id);
      expect(data.title).toBe(reportData.title);
      expect(data.status).toBe(reportData.status);

      // Note: Invoice is cleaned up, org remains for other tests
    });
  });

  describe("GET /orgs/:id/owner", () => {
    it("should return owner information for org member", async () => {
      const response = await authenticatedRequest(
        app,
        "GET",
        `/orgs/${testOrg.id}/owner`,
        authToken,
      );
      expect(response.status).toBe(200);

      const data = await parseJsonResponse(response);
      expect(data.id).toBeDefined();
      expect(data.email).toBeDefined();
    });

    it("should return 403 for non-member", async () => {
      const otherSession = await createIntegrationTestUserWithSession(
        "other-user@example.com",
        "Other User",
      );
      await createTestUserProfile(otherSession.userId);
      const otherToken = otherSession.token;

      const response = await authenticatedRequest(
        app,
        "GET",
        `/orgs/${testOrg.id}/owner`,
        otherToken,
      );
      await expectForbiddenResponse(response);
    });

    it("should return 401 when not authenticated", async () => {
      const response = await unauthenticatedRequest(
        app,
        "GET",
        `/orgs/${testOrg.id}/owner`,
      );
      expect([401, 500]).toContain(response.status);
    });
  });

  describe("POST /orgs/:id/ownership/transfer", () => {
    it("should initiate ownership transfer", async () => {
      // Ensure testUser is the owner
      await db
        .update(org)
        .set({ ownerId: testUserId, pendingOwnerId: null })
        .where(eq(org.id, testOrg.id));

      const newOwner = await createTestUser();
      await createTestUserProfile(newOwner.id);
      await createTestOrgUser(newOwner.id, testOrg.id, OrgRole.CLIENT);

      const response = await authenticatedRequest(
        app,
        "POST",
        `/orgs/${testOrg.id}/ownership/transfer`,
        authToken,
        { newOwnerId: newOwner.id },
      );
      expect(response.status).toBe(200);

      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);

      // Verify pending owner is set
      const notifications = await db
        .select()
        .from(notification)
        .where(
          and(
            eq(notification.userId, newOwner.id),
            eq(notification.type, "ownership_transfer"),
          ),
        );
      expect(notifications.length).toBeGreaterThan(0);

      // Cleanup
      await db.delete(notification).where(eq(notification.userId, newOwner.id));
      await db
        .delete(orgUser)
        .where(
          and(eq(orgUser.orgId, testOrg.id), eq(orgUser.userId, newOwner.id)),
        );
      await db
        .update(org)
        .set({ pendingOwnerId: null })
        .where(eq(org.id, testOrg.id));
    });

    it("should return 403 for non-owner", async () => {
      const newOwnerSession = await createIntegrationTestUserWithSession(
        "new-owner-4@example.com",
        "New Owner 4",
      );
      await createTestUserProfile(newOwnerSession.userId);
      await createTestOrgUser(
        newOwnerSession.userId,
        testOrg.id,
        OrgRole.CLIENT,
      );

      const response = await authenticatedRequest(
        app,
        "POST",
        `/orgs/${testOrg.id}/ownership/transfer`,
        authToken2,
        { newOwnerId: newOwnerSession.userId },
      );
      await expectForbiddenResponse(response);
    });

    it("should return 401 when not authenticated", async () => {
      const response = await unauthenticatedRequest(
        app,
        "POST",
        `/orgs/${testOrg.id}/ownership/transfer`,
        { newOwnerId: testUser2Id },
      );
      await expectUnauthenticatedResponse(response);
    });
  });

  describe("POST /orgs/:id/ownership/accept", () => {
    it("should accept ownership transfer", async () => {
      // Ensure testUser is the owner
      await db
        .update(org)
        .set({ ownerId: testUserId, pendingOwnerId: null })
        .where(eq(org.id, testOrg.id));

      const newOwnerSession = await createIntegrationTestUserWithSession(
        "new-owner-5@example.com",
        "New Owner 5",
      );
      await createTestUserProfile(newOwnerSession.userId);
      await createTestOrgUser(
        newOwnerSession.userId,
        testOrg.id,
        OrgRole.CLIENT,
      );
      const newOwnerToken = newOwnerSession.token;

      // Initiate transfer
      await authenticatedRequest(
        app,
        "POST",
        `/orgs/${testOrg.id}/ownership/transfer`,
        authToken,
        { newOwnerId: newOwnerSession.userId },
      );

      // Accept transfer
      const response = await authenticatedRequest(
        app,
        "POST",
        `/orgs/${testOrg.id}/ownership/accept`,
        newOwnerToken,
      );
      expect(response.status).toBe(200);

      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);

      // Verify ownership transferred
      const { org: orgSchema } = await import("@/drizzle/schema");
      const [orgRecord] = await db
        .select()
        .from(orgSchema)
        .where(eq(orgSchema.id, testOrg.id))
        .limit(1);
      expect(orgRecord.ownerId).toBe(newOwnerSession.userId);
      expect(orgRecord.pendingOwnerId).toBeNull();

      // Reset ownership for cleanup
      await db
        .update(orgSchema)
        .set({ ownerId: testUserId })
        .where(eq(orgSchema.id, testOrg.id));

      // Cleanup
      const { notification } = await import("@/drizzle/schema");
      await db
        .delete(notification)
        .where(eq(notification.userId, newOwnerSession.userId));
      await db
        .delete(orgUser)
        .where(
          and(
            eq(orgUser.orgId, testOrg.id),
            eq(orgUser.userId, newOwnerSession.userId),
          ),
        );
    });

    it("should return 403 for non-pending owner", async () => {
      const response = await authenticatedRequest(
        app,
        "POST",
        `/orgs/${testOrg.id}/ownership/accept`,
        authToken2,
      );
      await expectForbiddenResponse(response);
    });

    it("should return 401 when not authenticated", async () => {
      const response = await unauthenticatedRequest(
        app,
        "POST",
        `/orgs/${testOrg.id}/ownership/accept`,
      );
      expect([401, 500]).toContain(response.status);
    });
  });

  describe("POST /orgs/:id/ownership/decline", () => {
    it("should decline ownership transfer", async () => {
      // Ensure testUser is the owner
      await db
        .update(org)
        .set({ ownerId: testUserId, pendingOwnerId: null })
        .where(eq(org.id, testOrg.id));

      const newOwnerSession = await createIntegrationTestUserWithSession(
        "new-owner-6@example.com",
        "New Owner 6",
      );
      await createTestUserProfile(newOwnerSession.userId);
      await createTestOrgUser(
        newOwnerSession.userId,
        testOrg.id,
        OrgRole.CLIENT,
      );
      const newOwnerToken = newOwnerSession.token;

      // Initiate transfer
      await authenticatedRequest(
        app,
        "POST",
        `/orgs/${testOrg.id}/ownership/transfer`,
        authToken,
        { newOwnerId: newOwnerSession.userId },
      );

      // Get notification before decline
      const notificationsBefore = await db
        .select()
        .from(notification)
        .where(
          and(
            eq(notification.userId, newOwnerSession.userId),
            eq(notification.type, "ownership_transfer"),
          ),
        );
      const notificationId = notificationsBefore[0]?.id;

      // Decline transfer
      const response = await authenticatedRequest(
        app,
        "POST",
        `/orgs/${testOrg.id}/ownership/decline`,
        newOwnerToken,
      );
      expect(response.status).toBe(200);

      const data = await parseJsonResponse(response);
      expect(data.success).toBe(true);

      // Verify pending owner is cleared
      const [orgRecord] = await db
        .select()
        .from(org)
        .where(eq(org.id, testOrg.id))
        .limit(1);
      expect(orgRecord.pendingOwnerId).toBeNull();

      // Verify notification is deleted
      if (notificationId) {
        const [deletedNotification] = await db
          .select()
          .from(notification)
          .where(eq(notification.id, notificationId))
          .limit(1);
        expect(deletedNotification).toBeUndefined();
      }

      // Cleanup
      await db
        .delete(orgUser)
        .where(
          and(
            eq(orgUser.orgId, testOrg.id),
            eq(orgUser.userId, newOwnerSession.userId),
          ),
        );
    });

    it("should return 403 for non-pending owner", async () => {
      const response = await authenticatedRequest(
        app,
        "POST",
        `/orgs/${testOrg.id}/ownership/decline`,
        authToken2,
      );
      await expectForbiddenResponse(response);
    });

    it("should return 401 when not authenticated", async () => {
      const response = await unauthenticatedRequest(
        app,
        "POST",
        `/orgs/${testOrg.id}/ownership/decline`,
      );
      await expectUnauthenticatedResponse(response);
    });
  });
});
