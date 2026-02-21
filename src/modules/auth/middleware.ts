import { type SessionData, auth, getSessionFromHeader } from "@/lib/auth";
import { UnauthorizedError } from "@/plugins/error";
import { Elysia } from "elysia";

/**
 * Auth context returned from session extraction
 */
export interface AuthContext {
  userId: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    emailVerified: boolean;
  };
  session: {
    id: string;
    token: string;
    expiresAt: Date;
  };
}

/**
 * Creates auth helpers from request headers
 */
export function createAuthHelpers(
  session: SessionData["session"] | null,
  user: SessionData["user"] | null,
) {
  // Helper to require authentication (throws error if not authenticated)
  const requireAuth = async (): Promise<AuthContext> => {
    if (!session || !user) {
      throw new UnauthorizedError("Authentication required");
    }

    return {
      userId: user.id,
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        image: user.image ?? null,
        emailVerified: user.emailVerified,
      },
      session: {
        id: session.id,
        token: session.token,
        expiresAt: session.expiresAt,
      },
    };
  };

  // Optional auth context (null if not authenticated)
  const getAuth = (): AuthContext | null => {
    if (!session || !user) {
      return null;
    }

    return {
      userId: user.id,
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        image: user.image ?? null,
        emailVerified: user.emailVerified,
      },
      session: {
        id: session.id,
        token: session.token,
        expiresAt: session.expiresAt,
      },
    };
  };

  return { requireAuth, getAuth, session, user };
}

/**
 * AuthMiddleware provides authentication helpers for Elysia routes
 * Uses Better-Auth for session validation via Authorization header
 */
export const AuthMiddleware = new Elysia({ name: "auth-middleware" }).derive(
  async ({ headers }) => {
    const { session, user } = await getSessionFromHeader(headers.authorization);
    return createAuthHelpers(session, user);
  },
);

export { auth, getSessionFromHeader };
