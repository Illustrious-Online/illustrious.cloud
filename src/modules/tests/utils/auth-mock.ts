import { mock } from "bun:test";
import type { SessionData } from "@/lib/auth";

/**
 * Creates a mock auth context from test data
 */
export function createMockAuthFromTestData(
  testUser: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  },
  testSession: {
    id: string;
    token: string;
    expiresAt: Date;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
  },
): { session: SessionData["session"]; user: SessionData["user"] } {
  return {
    session: {
      id: testSession.id,
      token: testSession.token,
      expiresAt: testSession.expiresAt,
      userId: testSession.userId,
      createdAt: testSession.createdAt,
      updatedAt: testSession.updatedAt,
      ipAddress: testSession.ipAddress,
      userAgent: testSession.userAgent,
    },
    user: {
      id: testUser.id,
      email: testUser.email,
      name: testUser.name,
      image: testUser.image,
      emailVerified: testUser.emailVerified,
      createdAt: testUser.createdAt,
      updatedAt: testUser.updatedAt,
    },
  };
}

// Store the original function
let originalGetSessionFromHeader:
  | typeof import("@/lib/auth").getSessionFromHeader
  | null = null;

// Token-to-auth mapping for multi-user tests
const tokenAuthMap = new Map<
  string,
  { session: SessionData["session"]; user: SessionData["user"] }
>();

/**
 * Registers a token with its corresponding session and user
 * This allows multiple users to be used in the same test suite
 */
export function registerAuthToken(
  token: string,
  session: SessionData["session"],
  user: SessionData["user"],
) {
  tokenAuthMap.set(token, { session, user });
}

/**
 * Clears all registered auth tokens
 */
export function clearAuthTokens() {
  tokenAuthMap.clear();
}

/**
 * Sets up module mock for getSessionFromHeader
 * This allows tests to bypass better-auth validation
 * Supports multiple users via token registration
 */
export async function setupAuthMock(
  session: SessionData["session"] | null,
  user: SessionData["user"] | null,
) {
  const authModule = await import("@/lib/auth");

  // Store original if not already stored
  if (!originalGetSessionFromHeader) {
    originalGetSessionFromHeader = authModule.getSessionFromHeader;
  }

  // If session/user provided, register the token
  if (session && user) {
    registerAuthToken(session.token, session, user);
  }

  // Create mock function that checks token map
  const mockGetSessionFromHeader = async (authHeader: string | undefined) => {
    if (!authHeader?.startsWith("Bearer ")) {
      return { session: null, user: null };
    }

    const token = authHeader.replace("Bearer ", "");
    const authData = tokenAuthMap.get(token);

    if (authData) {
      return { session: authData.session, user: authData.user };
    }

    // Fallback: if no token match but we have a single session/user, use it
    // This maintains backward compatibility
    if (session && user) {
      return { session, user };
    }

    return { session: null, user: null };
  };

  // Mock the module
  mock.module("@/lib/auth", () => ({
    ...authModule,
    getSessionFromHeader: mockGetSessionFromHeader,
  }));
}

/**
 * Restores the original auth module
 */
export async function restoreAuthMock() {
  clearAuthTokens();
  if (originalGetSessionFromHeader) {
    const authModule = await import("@/lib/auth");
    mock.module("@/lib/auth", () => ({
      ...authModule,
      getSessionFromHeader: originalGetSessionFromHeader,
    }));
    originalGetSessionFromHeader = null;
  } else {
    mock.restore();
  }
}
