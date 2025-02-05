import data from "../../package.json";

export default {
  app: {
    env: Bun.env.NODE_ENV || "development",
    url: Bun.env.APP_URL || "http://localhost:8000",
    name: data.name,
    version: data.version,
    host: Bun.env.TEST_APP_HOST || Bun.env.APP_HOST || "localhost",
    port: Bun.env.APP_PORT || "8000",
    dashboardUrl: Bun.env.DASHBOARD_URL || "http://localhost:3000",
    sentryUrl: Bun.env.SENTRY_URL,
  },
  auth: {
    supabaseId: Bun.env.SUPABASE_ID || "default",
    supabaseServiceRoleKey: Bun.env.SUPABASE_SERVICE_ROLE_KEY || "default",
    edgeKey: Bun.env.SUPABASE_EDGE_KEY || "default",
  },
  db: {
    dbName: Bun.env.DB_NAME || "default",
    dbPassword: Bun.env.DB_PASSWORD || "password",
    dbUsername: Bun.env.DB_USERNAME || "dbuser",
    dbPort: Bun.env.DB_PORT || "5432",
    dbHost: Bun.env.DB_HOST || "localhost",
  },
};
