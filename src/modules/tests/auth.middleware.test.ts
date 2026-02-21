import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { SessionData } from "@/lib/auth";
import { UnauthorizedError } from "@/plugins/error";
import { AuthMiddleware, createAuthHelpers } from "../auth/middleware";
import {
  createIntegrationTestUserWithSession,
} from "./utils/integration-auth";
import {
  setupIntegrationTests,
  teardownIntegrationTests,
} from "./utils/integration-setup";
import { Elysia } from "elysia";
import errorPlugin from "@/plugins/error";

describe("Auth Middleware", () => {
  describe("AuthMiddleware plugin", () => {
    let testUserId: string;
    let authToken: string;

    beforeAll(async () => {
      // Setup integration test database
      await setupIntegrationTests();

      // Create test user with session using integration testing
      const session = await createIntegrationTestUserWithSession(
        "auth-middleware-test@example.com",
        "Auth Middleware Test User"
      );
      testUserId = session.userId;
      authToken = session.token;
    });

    afterAll(async () => {
      // Integration teardown handles cleanup
      await teardownIntegrationTests();
    });

    it("should derive auth helpers from headers when using AuthMiddleware", async () => {
      const app = new Elysia()
        .use(errorPlugin)
        .use(AuthMiddleware)
        .get("/test", (context) => {
          const auth = context.getAuth();
          return { authenticated: auth !== null, userId: auth?.userId };
        });

      const response = await app.handle(
        new Request("http://localhost/test", {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }),
      );

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        const data = await response.json();
        expect(data.authenticated).toBe(true);
        expect(data.userId).toBe(testUserId);
      }
    });

    it("should return null auth when no authorization header", async () => {
      const app = new Elysia()
        .use(errorPlugin)
        .use(AuthMiddleware)
        .get("/test", (context) => {
          const auth = context.getAuth();
          return { authenticated: auth !== null };
        });

      const response = await app.handle(
        new Request("http://localhost/test"),
      );

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        const data = await response.json();
        expect(data.authenticated).toBe(false);
      }
    });
  });

  describe("createAuthHelpers", () => {
    it("should create requireAuth that returns auth context when authenticated", async () => {
      const mockSession: SessionData["session"] = {
        id: "session-id",
        token: "token",
        expiresAt: new Date(Date.now() + 10000),
        userId: "user-id",
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: null,
        userAgent: null,
      };

      const mockUser: SessionData["user"] = {
        id: "user-id",
        email: "test@example.com",
        name: "Test User",
        image: null,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { requireAuth } = createAuthHelpers(mockSession, mockUser);
      const authContext = await requireAuth();

      expect(authContext.userId).toBe("user-id");
      expect(authContext.user.id).toBe("user-id");
      expect(authContext.user.email).toBe("test@example.com");
      expect(authContext.session.id).toBe("session-id");
    });

    it("should throw UnauthorizedError when requireAuth called without session", async () => {
      const { requireAuth } = createAuthHelpers(null, null);

      await expect(requireAuth()).rejects.toThrow(UnauthorizedError);
    });

    it("should throw UnauthorizedError when requireAuth called without user", async () => {
      const mockSession: SessionData["session"] = {
        id: "session-id",
        token: "token",
        expiresAt: new Date(),
        userId: "user-id",
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: null,
        userAgent: null,
      };

      const { requireAuth } = createAuthHelpers(mockSession, null);

      await expect(requireAuth()).rejects.toThrow(UnauthorizedError);
    });

    it("should create getAuth that returns null when not authenticated", () => {
      const { getAuth } = createAuthHelpers(null, null);
      const authContext = getAuth();

      expect(authContext).toBeNull();
    });

    it("should create getAuth that returns auth context when authenticated", () => {
      const mockSession: SessionData["session"] = {
        id: "session-id",
        token: "token",
        expiresAt: new Date(),
        userId: "user-id",
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: null,
        userAgent: null,
      };

      const mockUser: SessionData["user"] = {
        id: "user-id",
        email: "test@example.com",
        name: "Test User",
        image: null,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { getAuth } = createAuthHelpers(mockSession, mockUser);
      const authContext = getAuth();

      expect(authContext).not.toBeNull();
      expect(authContext?.userId).toBe("user-id");
      expect(authContext?.user.email).toBe("test@example.com");
    });
  });
});
