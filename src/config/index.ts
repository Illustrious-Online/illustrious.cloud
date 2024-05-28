import data from "../../package.json";

const isTestEnvironment = Bun.env.NODE_ENV === "test";

export default {
  app: {
    env: Bun.env.NODE_ENV,
    url: Bun.env.APP_URL,
    name: data.name,
    version: data.version,
    host: Bun.env.TEST_APP_HOST || Bun.env.APP_HOST || "localhost",
    port:
      (isTestEnvironment ? Bun.env.TEST_APP_PORT : Bun.env.APP_PORT) || "8000",
    dashboardUrl: Bun.env.DASHBOARD_URL,
    sentryUrl: Bun.env.SENTRY_URL,
  },
  auth: {
    url: Bun.env.AUTH0_URL || "localhost",
    audience: Bun.env.AUTH0_AUD || "illustrious",
    clientId: Bun.env.CLIENT_ID || "lorem",
    clientSecret: Bun.env.CLIENT_SECRET || "ipsum",
  },
  db: {
    dbName: Bun.env.DB_NAME!,
    dbPassword: Bun.env.DB_PASSWORD!,
    dbUsername: Bun.env.DB_USERNAME!,
    dbPort: Bun.env.DB_PORT!,
    dbHost: Bun.env.DB_HOST!,
  },
};
