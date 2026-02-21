import { db } from "@/drizzle/db";
import { session, user } from "@/drizzle/schema";
import type { SessionData } from "@/lib/auth";
import { auth } from "@/lib/auth";
import { faker } from "@faker-js/faker";
import { eq } from "drizzle-orm";
import { createTestSession, createTestUser } from "./fixtures";

/**
 * Creates a real auth context using better-auth
 * This creates a real session that works with getSessionFromHeader
 */
export async function createMockAuthContext(): Promise<{
  session: SessionData["session"];
  user: SessionData["user"];
  token: string;
}> {
  const testUser = await createTestUser();
  const testSession = await createTestSession(testUser.id);

  // Use better-auth to get the session (this validates the token)
  try {
    const result = await auth.api.getSession({
      headers: new Headers({ authorization: `Bearer ${testSession.token}` }),
    });

    if (result) {
      return {
        session: result.session,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name ?? null,
          image: result.user.image ?? null,
          emailVerified: result.user.emailVerified,
          createdAt: result.user.createdAt,
          updatedAt: result.user.updatedAt,
        },
        token: testSession.token,
      };
    }
  } catch {
    // Fallback to direct database values if better-auth fails
  }

  return {
    session: {
      id: testSession.id,
      token: testSession.token,
      expiresAt: testSession.expiresAt,
      userId: testSession.userId,
      createdAt: testSession.createdAt,
      updatedAt: testSession.updatedAt,
      ipAddress: null,
      userAgent: null,
    },
    user: {
      id: testUser.id,
      email: testUser.email,
      name: testUser.name ?? null,
      image: testUser.image ?? null,
      emailVerified: testUser.emailVerified,
      createdAt: testUser.createdAt,
      updatedAt: testUser.updatedAt,
    },
    token: testSession.token,
  };
}

/**
 * Creates an authorization header value
 */
export function createAuthHeader(token: string): string {
  return `Bearer ${token}`;
}

/**
 * Mocks getSessionFromHeader for testing
 * This allows us to bypass actual better-auth calls
 */
export function mockGetSessionFromHeader(
  mockSession: SessionData["session"] | null,
  mockUser: SessionData["user"] | null,
) {
  return async (authHeader: string | undefined) => {
    if (!authHeader?.startsWith("Bearer ")) {
      return { session: null, user: null };
    }
    return { session: mockSession, user: mockUser };
  };
}
