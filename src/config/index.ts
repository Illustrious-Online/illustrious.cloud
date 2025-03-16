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
 * @property {Object} auth - Authentication-related configuration.
 * @property {string} [auth.supabaseId] - The Supabase project ID.
 * @property {string} [auth.supabaseServiceRoleKey] - The Supabase service role key.
 * @property {string} [auth.edgeKey] - The Supabase edge key.
 *
 * @property {Object} db - Database-related configuration.
 * @property {string} db.dbName - The name of the database (default: "default").
 * @property {string} db.dbPassword - The password for the database (default: "password").
 * @property {string} db.dbUsername - The username for the database (default: "dbuser").
 * @property {string} db.dbPort - The port on which the database is running (default: "5432").
 * @property {string} db.dbHost - The host of the database (default: "localhost").
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
  auth: {
    supabaseId: Bun.env.SUPABASE_ID,
    supabaseServiceRoleKey: Bun.env.SUPABASE_SERVICE_ROLE_KEY,
    supabaseAnonKey: Bun.env.SUPABASE_ANON_KEY,
    edgeKey: Bun.env.SUPABASE_EDGE_KEY,
  },
  db: {
    dbName: Bun.env.DB_NAME ?? "default",
    dbPassword: Bun.env.DB_PASSWORD ?? "password",
    dbUsername: Bun.env.DB_USERNAME ?? "dbuser",
    dbPort: Bun.env.DB_PORT ?? "5432",
    dbHost: Bun.env.DB_HOST ?? "localhost",
  },
};
