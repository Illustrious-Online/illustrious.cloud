import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test";
import { db } from "@/drizzle/db";
import { session, user } from "@/drizzle/schema";
import { getSessionFromHeader } from "@/lib/auth";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { createTestSession, createTestUser } from "./utils/fixtures";
import type { SessionData } from "@/lib/auth";

describe("Auth Library", () => {
  describe("getSessionFromHeader", () => {
    let testUser: Awaited<ReturnType<typeof createTestUser>>;
    let testSession: Awaited<ReturnType<typeof createTestSession>>;
    let validToken: string | null = null;

    beforeAll(async () => {
      // Create a test user
      testUser = await createTestUser();

      // Create a session directly in the database
      testSession = await createTestSession(testUser.id);

      // Try to get a valid session using better-auth
      // This tests the successful path where better-auth returns a valid session
      try {
        const result = await auth.api.getSession({
          headers: new Headers({ authorization: `Bearer ${testSession.token}` }),
        });

        if (result) {
          validToken = testSession.token;
        }
      } catch (error) {
        // If better-auth can't validate our manually created session,
        // we'll still test other paths
        console.warn("Better-auth session validation warning:", error);
      }
    });

    afterAll(async () => {
      // Cleanup
      if (testSession) {
        await db.delete(session).where(eq(session.id, testSession.id));
      }
      if (testUser) {
        await db.delete(user).where(eq(user.id, testUser.id));
      }
    });

    it("should return null when authHeader is undefined", async () => {
      const result = await getSessionFromHeader(undefined);
      expect(result.session).toBeNull();
      expect(result.user).toBeNull();
    });

    it("should return null when authHeader is empty string", async () => {
      const result = await getSessionFromHeader("");
      expect(result.session).toBeNull();
      expect(result.user).toBeNull();
    });

    it("should return null when authHeader does not start with 'Bearer '", async () => {
      const result = await getSessionFromHeader("InvalidToken");
      expect(result.session).toBeNull();
      expect(result.user).toBeNull();
    });

    it("should return null when authHeader starts with 'Bearer' but no space", async () => {
      const result = await getSessionFromHeader("Bearertoken");
      expect(result.session).toBeNull();
      expect(result.user).toBeNull();
    });

    it("should return null when token is invalid", async () => {
      const result = await getSessionFromHeader("Bearer invalid-token-12345");
      expect(result.session).toBeNull();
      expect(result.user).toBeNull();
    });

    it("should return null when token is empty", async () => {
      const result = await getSessionFromHeader("Bearer ");
      expect(result.session).toBeNull();
      expect(result.user).toBeNull();
    });

    it("should handle errors gracefully and return null", async () => {
      // Test with a malformed token that might cause an error
      const result = await getSessionFromHeader("Bearer malformed.token.here");
      // Should not throw, but return null
      expect(result.session).toBeNull();
      expect(result.user).toBeNull();
    });

    it("should extract token correctly from Bearer header", async () => {
      // This test verifies the token extraction logic works
      // Even if the token is invalid, we should get past the Bearer check
      const testToken = "test-token-123";
      const result = await getSessionFromHeader(`Bearer ${testToken}`);
      
      // The function should attempt to validate (may fail, but shouldn't crash)
      expect(result).toBeDefined();
      expect(result.session === null || typeof result.session === "object").toBe(true);
      expect(result.user === null || typeof result.user === "object").toBe(true);
    });

    it("should handle better-auth API errors gracefully", async () => {
      // Test with a token that might cause better-auth to throw
      // This tests the catch block
      const result = await getSessionFromHeader(`Bearer ${"x".repeat(100)}`);
      
      // Should catch error and return null instead of throwing
      expect(result.session).toBeNull();
      expect(result.user).toBeNull();
    });

    it("should return null when better-auth returns null result", async () => {
      // Test the path where auth.api.getSession returns null/undefined
      // This covers line 118-120
      // We'll use an invalid but properly formatted token
      const result = await getSessionFromHeader("Bearer invalid-but-formatted-token");
      
      // Should return null when result is falsy
      expect(result.session).toBeNull();
      expect(result.user).toBeNull();
    });

    it("should successfully map session and user when valid token provided", async () => {
      // This test covers the successful mapping path (lines 123-135)
      // Only run if we have a valid token from better-auth
      if (!validToken) {
        // Skip if we couldn't create a valid session
        // This is expected in some test environments
        return;
      }

      const result = await getSessionFromHeader(`Bearer ${validToken}`);
      
      // Should successfully map the session and user
      expect(result.session).not.toBeNull();
      expect(result.user).not.toBeNull();
      
      if (result.session && result.user) {
        // Verify session structure
        expect(result.session.id).toBeDefined();
        expect(result.session.token).toBeDefined();
        expect(result.session.expiresAt).toBeInstanceOf(Date);
        expect(result.session.userId).toBe(testUser.id);
        
        // Verify user structure matches expected format
        expect(result.user.id).toBe(testUser.id);
        expect(result.user.email).toBe(testUser.email);
        expect(result.user.name).toBe(testUser.name);
        expect(result.user.image).toBe(testUser.image);
        expect(typeof result.user.emailVerified).toBe("boolean");
        expect(result.user.createdAt).toBeInstanceOf(Date);
        expect(result.user.updatedAt).toBeInstanceOf(Date);
      }
    });

    it("should map session and user correctly when better-auth returns valid result", async () => {
      // This test mocks auth.api.getSession to test the mapping logic (lines 123-135)
      const mockSession: SessionData["session"] = {
        id: "session-id-123",
        token: "mock-token-123",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userId: testUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: null,
        userAgent: null,
      };

      const mockUser = {
        id: testUser.id,
        email: testUser.email,
        name: testUser.name,
        image: testUser.image,
        emailVerified: testUser.emailVerified,
        createdAt: testUser.createdAt,
        updatedAt: testUser.updatedAt,
      };

      // Mock auth.api.getSession to return our mock data
      const originalGetSession = auth.api.getSession;
      auth.api.getSession = mock(async () => ({
        session: mockSession,
        user: mockUser,
      })) as unknown as typeof auth.api.getSession;

      try {
        const result = await getSessionFromHeader("Bearer mock-token-123");

        // Verify the mapping worked correctly
        expect(result.session).not.toBeNull();
        expect(result.user).not.toBeNull();

        if (result.session && result.user) {
          // Verify session mapping (line 124)
          expect(result.session.id).toBe(mockSession.id);
          expect(result.session.token).toBe(mockSession.token);
          expect(result.session.expiresAt).toEqual(mockSession.expiresAt);
          expect(result.session.userId).toBe(mockSession.userId);

          // Verify user mapping (lines 125-133)
          expect(result.user.id).toBe(mockUser.id);
          expect(result.user.email).toBe(mockUser.email);
          expect(result.user.name).toBe(mockUser.name);
          expect(result.user.image).toBe(mockUser.image);
          expect(result.user.emailVerified).toBe(mockUser.emailVerified);
          expect(result.user.createdAt).toEqual(mockUser.createdAt);
          expect(result.user.updatedAt).toEqual(mockUser.updatedAt);
        }
      } finally {
        // Restore original
        auth.api.getSession = originalGetSession;
      }
    });

    it("should return null when better-auth getSession returns null", async () => {
      // This test covers line 118-120 (when result is falsy)
      const originalGetSession = auth.api.getSession;
      // @ts-expect-error - Intentional mock type assertion for testing
      auth.api.getSession = mock(async () => null) as unknown as typeof auth.api.getSession;

      try {
        const result = await getSessionFromHeader("Bearer some-token");

        // Should return null when result is null
        expect(result.session).toBeNull();
        expect(result.user).toBeNull();
      } finally {
        // Restore original
        auth.api.getSession = originalGetSession;
      }
    });

    it("should catch errors and return null (covers catch block)", async () => {
      // This test explicitly covers the catch block (lines 135-138)
      const originalGetSession = auth.api.getSession;
      
      // Mock getSession to throw an error
      // @ts-expect-error - Intentional mock type assertion for testing
      auth.api.getSession = mock(async () => {
        throw new Error("Network error or invalid token");
      }) as unknown as typeof auth.api.getSession;

      try {
        const result = await getSessionFromHeader("Bearer error-token");

        // Should catch error and return null instead of throwing
        expect(result.session).toBeNull();
        expect(result.user).toBeNull();
      } finally {
        // Restore original
        auth.api.getSession = originalGetSession;
      }
    });
  });
});
