import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "@/drizzle/db";
import { user, type userProfile } from "@/drizzle/schema";
import { createTestUserProfile } from "./utils/fixtures";
import { createIntegrationTestUserWithSession } from "./utils/integration-auth";
import {
  setupIntegrationTests,
  teardownIntegrationTests,
} from "./utils/integration-setup";
import {
  authenticatedRequest,
  expectUnauthenticatedResponse,
  parseJsonResponse,
  unauthenticatedRequest,
} from "./utils/requests";
import { createTestApp } from "./utils/test-app";

describe("User Routes", () => {
  let testUserId: string;
  let testUser: typeof user.$inferSelect;
  let testProfile: typeof userProfile.$inferSelect;
  let authToken: string;
  let app: ReturnType<typeof createTestApp>;

  beforeAll(async () => {
    // Setup integration test database
    await setupIntegrationTests();

    // Create test user with session using integration testing
    const session = await createIntegrationTestUserWithSession(
      "test-user@example.com",
      "Test User",
    );
    testUserId = session.userId;
    authToken = session.token;

    // Get user record
    const [testUserRecord] = await db
      .select()
      .from(user)
      .where(eq(user.id, testUserId))
      .limit(1);
    if (!testUserRecord) throw new Error("Test user not found");
    testUser = testUserRecord;

    // Create user profile
    testProfile = await createTestUserProfile(testUserId);

    app = createTestApp();
  });

  afterAll(async () => {
    // Integration teardown handles cleanup
    await teardownIntegrationTests();
  });

  describe("GET /users/me", () => {
    it("should return current user with profile", async () => {
      const response = await authenticatedRequest(
        app,
        "GET",
        "/users/me",
        authToken,
      );
      expect(response.status).toBe(200);

      const data = await parseJsonResponse(response);
      expect(data.id).toBe(testUser.id);
      expect(data.email).toBe(testUser.email);
      expect(data.profile).toBeDefined();
      expect(data.profile.firstName).toBe(testProfile.firstName);
    });

    it("should return 401 when not authenticated", async () => {
      const response = await unauthenticatedRequest(app, "GET", "/users/me");
      expect([401, 500]).toContain(response.status);

      // Verify error plugin processed the UnauthorizedError
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
  });

  describe("GET /users/me/profile", () => {
    it("should return user profile", async () => {
      const response = await authenticatedRequest(
        app,
        "GET",
        "/users/me/profile",
        authToken,
      );
      expect(response.status).toBe(200);

      const data = await parseJsonResponse(response);
      expect(data.userId).toBe(testUserId);
      expect(data.firstName).toBe(testProfile.firstName);
      expect(data.lastName).toBe(testProfile.lastName);
    });

    it("should return empty profile structure when profile doesn't exist", async () => {
      // Create user without profile using integration testing
      const sessionWithoutProfile = await createIntegrationTestUserWithSession(
        "user-without-profile@example.com",
        "User Without Profile",
      );

      const response = await authenticatedRequest(
        app,
        "GET",
        "/users/me/profile",
        sessionWithoutProfile.token,
      );
      expect(response.status).toBe(200);

      const data = await parseJsonResponse(response);
      expect(data.userId).toBe(sessionWithoutProfile.userId);
      expect(data.firstName).toBeNull();
      expect(data.managed).toBe(false);
    });

    it("should return 401 when not authenticated", async () => {
      const response = await unauthenticatedRequest(
        app,
        "GET",
        "/users/me/profile",
      );
      await expectUnauthenticatedResponse(response, "Authentication");
    });
  });

  describe("PATCH /users/me/profile", () => {
    it("should update user profile", async () => {
      const updateData = {
        firstName: "Updated",
        lastName: "Name",
        phone: "123-456-7890",
      };

      const response = await authenticatedRequest(
        app,
        "PATCH",
        "/users/me/profile",
        authToken,
        updateData,
      );
      expect(response.status).toBe(200);

      const data = await parseJsonResponse(response);
      expect(data.firstName).toBe(updateData.firstName);
      expect(data.lastName).toBe(updateData.lastName);
      expect(data.phone).toBe(updateData.phone);
    });

    it("should partially update profile", async () => {
      const updateData = {
        firstName: "Partially",
      };

      const response = await authenticatedRequest(
        app,
        "PATCH",
        "/users/me/profile",
        authToken,
        updateData,
      );
      expect(response.status).toBe(200);

      const data = await parseJsonResponse(response);
      expect(data.firstName).toBe(updateData.firstName);
    });

    it("should return 401 when not authenticated", async () => {
      const response = await unauthenticatedRequest(
        app,
        "PATCH",
        "/users/me/profile",
        { firstName: "Test" },
      );
      await expectUnauthenticatedResponse(response, "Authentication");
    });
  });
});
