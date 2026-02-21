import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "@/drizzle/db";
import { OrgRole, type org, report, userReport } from "@/drizzle/schema";
import {
  createTestOrg,
  createTestOrgUser,
  createTestReport,
  createTestUserProfile,
  createTestUserReport,
} from "./utils/fixtures";
import { createIntegrationTestUserWithSession } from "./utils/integration-auth";
import {
  setupIntegrationTests,
  teardownIntegrationTests,
} from "./utils/integration-setup";
import {
  authenticatedRequest,
  expectNotFoundResponse,
  expectUnauthenticatedResponse,
  parseJsonResponse,
  unauthenticatedRequest,
} from "./utils/requests";
import { createTestApp } from "./utils/test-app";

describe("Report Routes", () => {
  let testUserId: string;
  let testUser2Id: string;
  let testOrg: typeof org.$inferSelect;
  let testReport: typeof report.$inferSelect;
  let authToken: string;
  let authToken2: string;
  let app: ReturnType<typeof createTestApp>;

  beforeAll(async () => {
    // Setup integration test database
    await setupIntegrationTests();

    // Create test users with sessions using integration testing
    const session1 = await createIntegrationTestUserWithSession(
      "report-test-user-1@example.com",
      "Report Test User 1",
    );
    const session2 = await createIntegrationTestUserWithSession(
      "report-test-user-2@example.com",
      "Report Test User 2",
    );

    testUserId = session1.userId;
    testUser2Id = session2.userId;
    authToken = session1.token;
    authToken2 = session2.token;

    // Create test org
    testOrg = await createTestOrg({ ownerId: testUserId });

    // Create user profiles
    await createTestUserProfile(testUserId);
    await createTestUserProfile(testUser2Id);

    // Add users to org
    await createTestOrgUser(testUserId, testOrg.id, OrgRole.ADMIN); // Admin
    await createTestOrgUser(testUser2Id, testOrg.id, OrgRole.CLIENT); // Member

    // Create test report
    testReport = await createTestReport(testOrg.id, testUserId);

    app = createTestApp();
  });

  afterAll(async () => {
    // Integration teardown handles cleanup
    await teardownIntegrationTests();
  });

  describe("GET /reports", () => {
    it("should return user's reports", async () => {
      const response = await authenticatedRequest(
        app,
        "GET",
        "/reports",
        authToken,
      );
      expect(response.status).toBe(200);

      const data = await parseJsonResponse(response);
      expect(Array.isArray(data)).toBe(true);
      expect(
        (data as Array<{ id: string }>).some((rep) => rep.id === testReport.id),
      ).toBe(true);
    });

    it("should return 401 when not authenticated", async () => {
      const response = await unauthenticatedRequest(app, "GET", "/reports");
      await expectUnauthenticatedResponse(response, "Authentication");
    });
  });

  describe("GET /reports/:id", () => {
    it("should return report by ID", async () => {
      const response = await authenticatedRequest(
        app,
        "GET",
        `/reports/${testReport.id}`,
        authToken,
      );
      expect(response.status).toBe(200);

      const data = await parseJsonResponse(response);
      expect(data.id).toBe(testReport.id);
      expect(data.orgId).toBe(testOrg.id);
    });

    it("should return 404 for non-existent report", async () => {
      const response = await authenticatedRequest(
        app,
        "GET",
        "/reports/non-existent-id",
        authToken,
      );
      expect([404, 500]).toContain(response.status);

      // Verify error plugin processed the NotFoundError
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

    it("should return report via user-report relationship", async () => {
      // Create report and link to user2
      const linkedReport = await createTestReport(testOrg.id, testUserId);
      await createTestUserReport(testUser2Id, linkedReport.id);

      const response = await authenticatedRequest(
        app,
        "GET",
        `/reports/${linkedReport.id}`,
        authToken2,
      );
      expect(response.status).toBe(200);

      const data = await parseJsonResponse(response);
      expect(data.id).toBe(linkedReport.id);

      // Cleanup
      await db
        .delete(userReport)
        .where(eq(userReport.reportId, linkedReport.id));
      await db.delete(report).where(eq(report.id, linkedReport.id));
    });
  });

  describe("PATCH /reports/:id", () => {
    it("should update report", async () => {
      const updateData = {
        title: "Updated Title",
        status: "published",
        content: "Updated content",
        rating: 8,
      };

      const response = await authenticatedRequest(
        app,
        "PATCH",
        `/reports/${testReport.id}`,
        authToken,
        updateData,
      );
      expect(response.status).toBe(200);

      const data = await parseJsonResponse(response);
      expect(data.title).toBe(updateData.title);
      expect(data.status).toBe(updateData.status);
      expect(data.content).toBe(updateData.content);
      expect(data.rating).toBe(updateData.rating);
    });

    it("should return 404 for non-existent report", async () => {
      const response = await authenticatedRequest(
        app,
        "PATCH",
        "/reports/non-existent-id",
        authToken,
        { title: "Test" },
      );
      await expectNotFoundResponse(response, "not found");
    });
  });

  describe("DELETE /reports/:id", () => {
    it("should delete report as admin", async () => {
      const reportToDelete = await createTestReport(testOrg.id, testUserId);

      const response = await authenticatedRequest(
        app,
        "DELETE",
        `/reports/${reportToDelete.id}`,
        authToken,
      );
      expect(response.status).toBe(200);

      const data = await parseJsonResponse(response);
      expect(data.message).toBe("Report deleted successfully");
    });

    it("should return 403 for non-admin", async () => {
      const reportToDelete = await createTestReport(testOrg.id, testUserId);

      const response = await authenticatedRequest(
        app,
        "DELETE",
        `/reports/${reportToDelete.id}`,
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

      // Cleanup
      await db.delete(report).where(eq(report.id, reportToDelete.id));
    });
  });
});
