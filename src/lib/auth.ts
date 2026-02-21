import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";
import config from "@/config";
import { db } from "@/drizzle/db";

/**
 * Better-Auth configuration with Drizzle adapter
 * Supports email/password and OAuth (Google, Discord, GitHub)
 * Configured for cross-domain token-based authentication
 */
export const auth = betterAuth({
  plugins: [bearer()],
  // Database adapter - connects to shared PostgreSQL via Drizzle
  database: drizzleAdapter(db, {
    provider: "pg",
  }),

  // Email & Password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set true for production
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },

  // OAuth providers
  socialProviders: {
    google: {
      clientId: config.oauth.google.clientId,
      clientSecret: config.oauth.google.clientSecret,
    },
    discord: {
      clientId: config.oauth.discord.clientId,
      clientSecret: config.oauth.discord.clientSecret,
    },
    github: {
      clientId: config.oauth.github.clientId,
      clientSecret: config.oauth.github.clientSecret,
    },
  },

  // Session configuration for cross-domain
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: false, // Disable cookie caching for cross-domain
    },
  },

  // CORS & Trusted Origins
  trustedOrigins: config.betterAuth.trustedOrigins,

  // Advanced settings
  advanced: {
    generateSessionToken: true, // Generate token for Authorization header
    useSecureCookies: config.app.env === "production",
    crossSubDomainCookies: {
      enabled: false, // We're using different domains, not subdomains
    },
  },

  // Secret for signing tokens
  secret: config.betterAuth.secret,

  // Base URL for redirects and email links
  baseURL: config.betterAuth.baseUrl,
});

// Export auth type for Eden Treaty
export type Auth = typeof auth;

/**
 * Session data from better-auth
 */
export interface SessionData {
  session: {
    id: string;
    token: string;
    expiresAt: Date;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
}

/**
 * Helper to extract session from Authorization header
 * Used for cross-domain token-based authentication
 */
export async function getSessionFromHeader(
  authHeader: string | undefined,
): Promise<{
  session: SessionData["session"] | null;
  user: SessionData["user"] | null;
}> {
  if (!authHeader?.startsWith("Bearer ")) {
    return { session: null, user: null };
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const result = await auth.api.getSession({
      headers: new Headers({ authorization: `Bearer ${token}` }),
    });

    if (!result) {
      return { session: null, user: null };
    }

    // Map the response to our SessionData type
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
    };
  } catch (error) {
    // Log error in test environment for debugging
    if (
      process.env.NODE_ENV === "test" ||
      process.env.DB_NAME === "illustrious_test"
    ) {
      console.error("[getSessionFromHeader] Error validating token:", error);
    }
    // Silently return null for any errors (invalid token, network issues, etc.)
    // This allows the auth middleware to handle authentication failures gracefully
    return { session: null, user: null };
  }
}
