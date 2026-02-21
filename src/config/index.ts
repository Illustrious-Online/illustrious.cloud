import data from "../../package.json";

/**
 * Configuration object for the application.
 *
 * @property {Object} app - Application-specific configuration.
 * @property {string} app.env - The environment in which the app is running (default: "development").
 * @property {string} app.url - The URL of the application (default: "http://localhost:3000").
 * @property {string} app.name - The name of the application.
 * @property {string} app.version - The version of the application.
 * @property {string} app.host - The host of the application (default: "localhost").
 * @property {string} app.port - The port on which the application is running (default: "3000").
 * @property {string} [app.sentryUrl] - The Sentry URL for error tracking.
 *
 * @property {Object} betterAuth - Better-Auth configuration.
 * @property {string} betterAuth.secret - The secret key for Better-Auth (min 32 chars).
 * @property {string} betterAuth.baseUrl - The base URL for Better-Auth.
 * @property {string[]} betterAuth.trustedOrigins - Trusted origins for CORS.
 *
 * @property {Object} oauth - OAuth provider configuration.
 *
 * @property {Object} db - Database-related configuration.
 * @property {string} db.dbName - The name of the database (default: "default").
 * @property {string} db.dbPassword - The password for the database (default: "password").
 * @property {string} db.dbUsername - The username for the database (default: "dbuser").
 * @property {string} db.dbPort - The port on which the database is running (default: "5432").
 * @property {string} db.dbHost - The host of the database (default: "localhost").
 *
 * @property {Object} recaptcha - reCAPTCHA configuration.
 *
 * @property {Object} mailer - Email configuration.
 */
export default {
  app: {
    env: Bun.env.NODE_ENV || "development",
    url: Bun.env.APP_URL || "http://localhost:3000",
    name: data.name,
    version: data.version,
    host: Bun.env.APP_HOST || "localhost",
    port: Bun.env.APP_PORT || "3000",
    sentryUrl: Bun.env.SENTRY_URL,
  },
  betterAuth: {
    secret: Bun.env.BETTER_AUTH_SECRET || "",
    baseUrl: Bun.env.API_BASE_URL || "http://localhost:3000",
    trustedOrigins: (
      Bun.env.ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:3000"
    ).split(","),
  },
  oauth: {
    google: {
      clientId: Bun.env.GOOGLE_CLIENT_ID || "",
      clientSecret: Bun.env.GOOGLE_CLIENT_SECRET || "",
    },
    discord: {
      clientId: Bun.env.DISCORD_CLIENT_ID || "",
      clientSecret: Bun.env.DISCORD_CLIENT_SECRET || "",
    },
    github: {
      clientId: Bun.env.GITHUB_CLIENT_ID || "",
      clientSecret: Bun.env.GITHUB_CLIENT_SECRET || "",
    },
  },
  recaptcha: {
    secretKey: Bun.env.RECAPTCHA_SECRET_KEY || "",
    scoreThreshold: Number(Bun.env.RECAPTCHA_SCORE_THRESHOLD) || 0.5,
  },
  mailer: {
    mailUser: Bun.env.MAIL_USER || "",
    mailPass: Bun.env.MAIL_PASS || "",
    mailFrom: Bun.env.MAIL_FROM || "",
  },
  db: {
    dbName: Bun.env.DB_NAME ?? "default",
    dbPassword: Bun.env.DB_PASSWORD ?? "password",
    dbUsername: Bun.env.DB_USERNAME ?? "dbuser",
    dbPort: Bun.env.DB_PORT ?? "5432",
    dbHost: Bun.env.DB_HOST ?? "localhost",
  },
};
