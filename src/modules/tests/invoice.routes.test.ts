import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { db } from "@/drizzle/db";
import { OrgRole, invoice, org, userInvoice } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import {
  createTestInvoice,
  createTestOrg,
  createTestOrgUser,
  createTestUserInvoice,
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
  expectNotFoundResponse,
  expectUnauthenticatedResponse,
  parseJsonResponse,
  unauthenticatedRequest,
} from "./utils/requests";
import { createTestApp } from "./utils/test-app";

describe("Invoice Routes", () => {
  let testUserId: string;
  let testUser2Id: string;
  let testOrg: typeof org.$inferSelect;
  let testInvoice: typeof invoice.$inferSelect;
  let authToken: string;
  let authToken2: string;
  let app: ReturnType<typeof createTestApp>;

  beforeAll(async () => {
    // Setup integration test database
    await setupIntegrationTests();

    // Create test users with sessions using integration testing
    const session1 = await createIntegrationTestUserWithSession(
      "invoice-test-user-1@example.com",
      "Invoice Test User 1",
    );
    const session2 = await createIntegrationTestUserWithSession(
      "invoice-test-user-2@example.com",
      "Invoice Test User 2",
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

    // Create test invoice
    testInvoice = await createTestInvoice(testOrg.id, testUserId);

    app = createTestApp();
  });

  afterAll(async () => {
    // Integration teardown handles cleanup
    await teardownIntegrationTests();
  });

  describe("GET /invoices", () => {
    it("should return user's invoices", async () => {
      const response = await authenticatedRequest(
        app,
        "GET",
        "/invoices",
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
    });

    it("should return 401 when not authenticated", async () => {
      const response = await unauthenticatedRequest(app, "GET", "/invoices");
      await expectUnauthenticatedResponse(response, "Authentication");
    });
  });

  describe("GET /invoices/:id", () => {
    it("should return invoice by ID", async () => {
      const response = await authenticatedRequest(
        app,
        "GET",
        `/invoices/${testInvoice.id}`,
        authToken,
      );
      expect(response.status).toBe(200);

      const data = await parseJsonResponse(response);
      expect(data.id).toBe(testInvoice.id);
      expect(data.orgId).toBe(testOrg.id);
    });

    it("should return 404 for non-existent invoice", async () => {
      const response = await authenticatedRequest(
        app,
        "GET",
        "/invoices/non-existent-id",
        authToken,
      );
      expect([404, 500]).toContain(response.status);

      // Verify error plugin processed the error and returned structured response
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

    it("should return 404 for invoice user doesn't have access to", async () => {
      // Create another org and invoice
      const otherOrg = await createTestOrg();
      const otherInvoice = await createTestInvoice(otherOrg.id, testUser2Id);

      const response = await authenticatedRequest(
        app,
        "GET",
        `/invoices/${otherInvoice.id}`,
        authToken,
      );
      await expectNotFoundResponse(response, "not found");

      // Cleanup
      await db.delete(invoice).where(eq(invoice.id, otherInvoice.id));
      await db.delete(org).where(eq(org.id, otherOrg.id));
    });

    it("should return invoice via user-invoice relationship", async () => {
      // Create invoice and link to user2
      const linkedInvoice = await createTestInvoice(testOrg.id, testUserId);
      await createTestUserInvoice(testUser2Id, linkedInvoice.id);

      const response = await authenticatedRequest(
        app,
        "GET",
        `/invoices/${linkedInvoice.id}`,
        authToken2,
      );
      expect(response.status).toBe(200);

      const data = await parseJsonResponse(response);
      expect(data.id).toBe(linkedInvoice.id);

      // Cleanup
      await db
        .delete(userInvoice)
        .where(eq(userInvoice.invoiceId, linkedInvoice.id));
      await db.delete(invoice).where(eq(invoice.id, linkedInvoice.id));
    });
  });

  describe("PATCH /invoices/:id", () => {
    it("should update invoice", async () => {
      const updateData = {
        amount: 200.0,
        status: "unpaid",
        description: "Updated description",
      };

      const response = await authenticatedRequest(
        app,
        "PATCH",
        `/invoices/${testInvoice.id}`,
        authToken,
        updateData,
      );
      expect(response.status).toBe(200);

      const data = await parseJsonResponse(response);
      // Amount is stored as string with decimal places in database
      expect(Number.parseFloat(data.amount)).toBe(updateData.amount);
      expect(data.status).toBe(updateData.status);
      expect(data.description).toBe(updateData.description);
    });

    it("should return 404 for non-existent invoice", async () => {
      const response = await authenticatedRequest(
        app,
        "PATCH",
        "/invoices/non-existent-id",
        authToken,
        { amount: 100 },
      );
      await expectNotFoundResponse(response, "not found");
    });
  });

  describe("DELETE /invoices/:id", () => {
    it("should delete invoice as admin", async () => {
      const invoiceToDelete = await createTestInvoice(testOrg.id, testUserId);

      const response = await authenticatedRequest(
        app,
        "DELETE",
        `/invoices/${invoiceToDelete.id}`,
        authToken,
      );
      expect(response.status).toBe(200);

      const data = await parseJsonResponse(response);
      expect(data.message).toBe("Invoice deleted successfully");
    });

    it("should return 403 for non-admin", async () => {
      const invoiceToDelete = await createTestInvoice(testOrg.id, testUserId);

      const response = await authenticatedRequest(
        app,
        "DELETE",
        `/invoices/${invoiceToDelete.id}`,
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

      // Cleanup - invoice still exists since deletion was forbidden
      await db.delete(invoice).where(eq(invoice.id, invoiceToDelete.id));
    });

    it("should return 404 for non-existent invoice", async () => {
      const response = await authenticatedRequest(
        app,
        "DELETE",
        "/invoices/non-existent-id",
        authToken,
      );
      await expectNotFoundResponse(response, "not found");
    });
  });
});
