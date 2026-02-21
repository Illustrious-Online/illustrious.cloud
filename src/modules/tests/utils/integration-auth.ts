import type { Elysia } from "elysia";
import { auth } from "@/lib/auth";
import { createTestApp } from "./test-app";
import { authenticatedRequest } from "./requests";

const TEST_PASSWORD = "TestPassword123!";

/**
 * Creates a test user with a real session for integration testing.
 * Uses better-auth sign-up/sign-in to create a session that getSessionFromHeader will validate.
 *
 * @param email - User email (must be unique)
 * @param name - User display name
 * @returns Object with userId, token for authenticated requests
 */
export async function createIntegrationTestUserWithSession(
  email: string,
  name?: string,
): Promise<{ userId: string; token: string }> {
  const app = createTestApp();

  // Sign up - creates user in database
  const signUpRes = await app.handle(
    new Request("http://localhost/api/auth/sign-up/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: TEST_PASSWORD,
        name: name ?? email,
      }),
    }),
  );

  if (!signUpRes.ok) {
    const errText = await signUpRes.text();
    throw new Error(`Sign-up failed: ${signUpRes.status} ${errText}`);
  }

  // Sign in - get session token
  const signInRes = await app.handle(
    new Request("http://localhost/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: TEST_PASSWORD,
      }),
    }),
  );

  if (!signInRes.ok) {
    const errText = await signInRes.text();
    throw new Error(`Sign-in failed: ${signInRes.status} ${errText}`);
  }

  const signInData = (await signInRes.json()) as {
    user?: { id: string };
    token?: string;
    session?: { token?: string };
  };

  const userId = signInData.user?.id;
  // Bearer plugin returns token in set-auth-token header; fallback to response body
  const token =
    signInRes.headers.get("set-auth-token") ??
    signInData.token ??
    signInData.session?.token;

  if (!userId || !token) {
    throw new Error(
      `Could not extract userId/token from sign-in response: ${JSON.stringify(signInData)}`,
    );
  }

  return { userId, token };
}

/**
 * Makes an authenticated HTTP request for integration tests.
 * Alias for authenticatedRequest from requests.ts.
 */
export async function authenticatedIntegrationRequest(
  app: Elysia,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  token: string,
  body?: unknown,
) {
  return authenticatedRequest(app, method, path, token, body);
}

/**
 * Verifies a token using better-auth's internal validation.
 * Uses auth.api.getSession() - no external API calls.
 *
 * @param token - Bearer token to verify
 * @returns true if token is valid, false otherwise
 */
export async function verifyTokenWithBetterAuth(token: string): Promise<boolean> {
  try {
    const result = await auth.api.getSession({
      headers: new Headers({ authorization: `Bearer ${token}` }),
    });
    return result != null;
  } catch {
    return false;
  }
}
