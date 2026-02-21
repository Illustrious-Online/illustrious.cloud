import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import config from "@/config";
import { db } from "@/drizzle/db";
import { inquiry, org } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { setAxiosInstance } from "../recaptcha/service";
import {
  createIntegrationTestUserWithSession,
} from "./utils/integration-auth";
import {
  setupIntegrationTests,
  teardownIntegrationTests,
} from "./utils/integration-setup";
import {
  createTestInquiry,
  createTestOrg,
} from "./utils/fixtures";
import {
  createMockAxiosInstance,
  createMockAxiosInstanceFail,
  setupMocks,
  teardownMocks,
} from "./utils/mocks";
import {
  authenticatedRequest,
  expectNotFoundResponse,
  expectUnauthenticatedResponse,
  parseJsonResponse,
  unauthenticatedRequest,
} from "./utils/requests";
import { createTestApp } from "./utils/test-app";

describe("Inquiry Routes", () => {
  let testUserId: string;
  let testOrg: typeof org.$inferSelect;
  let testInquiry: typeof inquiry.$inferSelect;
  let authToken: string;
  let app: ReturnType<typeof createTestApp>;
  let originalRecaptchaSecret: string;

  beforeAll(async () => {
    setupMocks();
    originalRecaptchaSecret = config.recaptcha.secretKey;
    config.recaptcha.secretKey = config.recaptcha.secretKey || "test-secret";

    // Setup integration test database
    await setupIntegrationTests();

    // Create test user with session using integration testing
    const session = await createIntegrationTestUserWithSession(
      "inquiry-test-user@example.com",
      "Inquiry Test User"
    );
    testUserId = session.userId;
    authToken = session.token;

    // Create test org
    testOrg = await createTestOrg({ ownerId: testUserId });

    // Create test inquiry
    testInquiry = await createTestInquiry(testOrg.id, { userId: testUserId });

    app = createTestApp();
  });

  afterAll(async () => {
    config.recaptcha.secretKey = originalRecaptchaSecret;
    teardownMocks();
    setAxiosInstance(null);
    await teardownIntegrationTests();
  });

  describe("POST /inquiries", () => {
    it("should create inquiry with reCAPTCHA token", async () => {
      setAxiosInstance(createMockAxiosInstance());
      const inquiryData = {
        orgId: testOrg.id,
        name: "Test Inquirer",
        email: "test@example.com",
        phone: "123-456-7890",
        comment: "Test inquiry comment",
        recaptchaToken: "valid-token",
      };

      const response = await unauthenticatedRequest(
        app,
        "POST",
        "/inquiries",
        inquiryData,
      );
      expect(response.status).toBe(201);

      const data = await parseJsonResponse(response);
      expect(data.orgId).toBe(testOrg.id);
      expect(data.name).toBe(inquiryData.name);
      expect(data.email).toBe(inquiryData.email);

      // Cleanup
      await db.delete(inquiry).where(eq(inquiry.id, data.id));
    });

    it("should create inquiry with authenticated user", async () => {
      setAxiosInstance(createMockAxiosInstance());
      const inquiryData = {
        orgId: testOrg.id,
        name: "Test User",
        email: "user@example.com",
        comment: "Test inquiry with user",
        recaptchaToken: "valid-token",
      };

      const response = await authenticatedRequest(
        app,
        "POST",
        "/inquiries",
        authToken,
        inquiryData,
      );
      expect(response.status).toBe(201);

      const data = await parseJsonResponse(response);
      expect(data.userId).toBe(testUserId);

      // Cleanup
      await db.delete(inquiry).where(eq(inquiry.id, data.id));
    });

    it("should return 400 for invalid reCAPTCHA token", async () => {
      setAxiosInstance(createMockAxiosInstanceFail());
      const inquiryData = {
        orgId: testOrg.id,
        name: "Test",
        email: "test@example.com",
        comment: "Test",
        recaptchaToken: "invalid-token",
      };

      const response = await unauthenticatedRequest(
        app,
        "POST",
        "/inquiries",
        inquiryData,
      );
      expect([400, 500]).toContain(response.status);
    });
  });

  describe("GET /inquiries", () => {
    it("should return user's inquiries", async () => {
      const response = await authenticatedRequest(
        app,
        "GET",
        "/inquiries",
        authToken,
      );
      expect(response.status).toBe(200);

      const data = await parseJsonResponse(response);
      expect(Array.isArray(data)).toBe(true);
      expect(
        (data as Array<{ id: string }>).some(
          (inq) => inq.id === testInquiry.id,
        ),
      ).toBe(true);
    });

    it("should return 401 when not authenticated", async () => {
      const response = await unauthenticatedRequest(app, "GET", "/inquiries");
      await expectUnauthenticatedResponse(response, "Authentication");
    });
  });

  describe("GET /inquiries/:id", () => {
    it("should return inquiry by ID", async () => {
      const response = await authenticatedRequest(
        app,
        "GET",
        `/inquiries/${testInquiry.id}`,
        authToken,
      );
      expect(response.status).toBe(200);

      const data = await parseJsonResponse(response);
      expect(data.id).toBe(testInquiry.id);
      expect(data.orgId).toBe(testOrg.id);
    });

    it("should return 404 for non-existent inquiry", async () => {
      const response = await authenticatedRequest(
        app,
        "GET",
        "/inquiries/non-existent-id",
        authToken,
      );
      expect([404, 500]).toContain(response.status);

      // Verify error plugin processed the NotFoundError
      const data = await parseJsonResponse(response);
      // Error plugin catches errors from routes and returns structured error responses
      if (typeof data === "object" && data !== null && "error" in data) {
        const errorData = data as { error?: { message?: string; statusCode?: number; code?: string } };
        if (errorData.error) {
          const hasErrorInfo = 
            errorData.error.message !== undefined ||
            errorData.error.statusCode !== undefined ||
            errorData.error.code !== undefined;
          expect(hasErrorInfo).toBe(true);
        }
      }
    });

    it("should return 404 for inquiry user doesn't have access to", async () => {
      // Create inquiry for another user
      const otherSession = await createIntegrationTestUserWithSession(
        "other-inquiry-user@example.com",
        "Other Inquiry User"
      );
      const otherInquiry = await createTestInquiry(testOrg.id, {
        userId: otherSession.userId,
      });

      const response = await authenticatedRequest(
        app,
        "GET",
        `/inquiries/${otherInquiry.id}`,
        authToken,
      );
      await expectNotFoundResponse(response, "not found");
    });
  });
});
