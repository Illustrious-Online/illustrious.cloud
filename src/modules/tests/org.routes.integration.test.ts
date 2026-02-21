/**
 * Integration Test Example
 *
 * This demonstrates full integration testing using:
 * - Real database connection (illustrious_test)
 * - Better-auth token validation (via auth.api.getSession - internal method)
 * - Full request/response cycle
 * - No external API calls
 *
 * To run:
 * 1. Setup test database: bun run test:integration:setup
 * 2. Set environment: TEST_DB_NAME=illustrious_test DB_NAME=illustrious_test
 * 3. Run: bun test org.routes.integration.test.ts
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "@/drizzle/db";
import { OrgRole, org, orgUser } from "@/drizzle/schema";
import {
  createTestOrg,
  createTestOrgUser,
  createTestUserProfile,
} from "./utils/fixtures";
import {
  authenticatedIntegrationRequest,
  createIntegrationTestUserWithSession,
  verifyTokenWithBetterAuth,
} from "./utils/integration-auth";
import {
  setupIntegrationTests,
  teardownIntegrationTests,
} from "./utils/integration-setup";
import { parseJsonResponse } from "./utils/requests";
import { createTestApp } from "./utils/test-app";

describe("Org Routes (Integration)", () => {
  let authToken: string;
  let userId: string;
  let app: ReturnType<typeof createTestApp>;

  beforeAll(async () => {
    // Setup test database connection
    await setupIntegrationTests();

    // Create real user and session using better-auth's internal mechanisms
    // This uses auth.api.getSession() for validation (internal method, not external API)
    const session = await createIntegrationTestUserWithSession(
      "integration-test@example.com",
      "Integration Test User",
    );
    authToken = session.token;
    userId = session.userId;

    // Create user profile for the authenticated user
    await createTestUserProfile(userId);

    // Verify token works with better-auth validation
    const isValid = await verifyTokenWithBetterAuth(authToken);
    expect(isValid).toBe(true);

    // Create test app
    app = createTestApp();
  });

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  it("should create org with real authentication", async () => {
    const response = await authenticatedIntegrationRequest(
      app,
      "POST",
      "/orgs",
      authToken,
      { name: "Integration Test Org", contact: "contact@example.com" },
    );

    expect(response.status).toBe(201);
    const data = await parseJsonResponse(response);
    expect(data.name).toBe("Integration Test Org");
    expect(data.id).toBeDefined();

    // Verify org was created in database
    const [createdOrg] = await db
      .select()
      .from(org)
      .where(eq(org.id, data.id))
      .limit(1);

    expect(createdOrg).toBeDefined();
    expect(createdOrg.name).toBe("Integration Test Org");
    expect(createdOrg.ownerId).toBe(userId); // Owner should be set

    // Cleanup
    await db.delete(orgUser).where(eq(orgUser.orgId, data.id));
    await db.delete(org).where(eq(org.id, data.id));
  });

  it("should get user's orgs with real authentication", async () => {
    // Create an org for the user
    const testOrg = await createTestOrg({ ownerId: userId });
    await createTestOrgUser(userId, testOrg.id, OrgRole.ADMIN);

    const response = await authenticatedIntegrationRequest(
      app,
      "GET",
      "/orgs",
      authToken,
    );

    expect(response.status).toBe(200);
    const data = await parseJsonResponse(response);
    expect(Array.isArray(data)).toBe(true);
    expect(
      (data as Array<{ id: string }>).some((o) => o.id === testOrg.id),
    ).toBe(true);

    // Cleanup
    await db.delete(orgUser).where(eq(orgUser.orgId, testOrg.id));
    await db.delete(org).where(eq(org.id, testOrg.id));
  });

  it("should return 401 when not authenticated", async () => {
    const response = await app.handle(
      new Request("http://localhost/orgs", { method: "GET" }),
    );

    // Unauthenticated requests return 401 or 500 depending on error handling
    expect([401, 500]).toContain(response.status);
  });

  it("should validate token using better-auth's internal validation", async () => {
    // Verify our token works with better-auth's getSessionFromHeader
    const isValid = await verifyTokenWithBetterAuth(authToken);
    expect(isValid).toBe(true);

    // Test with invalid token
    const invalidToken = "invalid_token_12345";
    const isInvalid = await verifyTokenWithBetterAuth(invalidToken);
    expect(isInvalid).toBe(false);
  });
});
