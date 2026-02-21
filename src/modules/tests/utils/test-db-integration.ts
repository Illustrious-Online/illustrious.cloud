import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as relations from "@/drizzle/relations";
import * as schema from "@/drizzle/schema";

/**
 * Creates a test database connection for integration tests
 * Uses a separate test database (illustrious_test) to avoid conflicts
 */
export function createTestDb() {
  const testDbName =
    process.env.TEST_DB_NAME || process.env.DB_NAME || "illustrious_test";

  const client = new Client({
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT) ?? 5432,
    user: process.env.DB_USERNAME ?? "admin",
    password: process.env.DB_PASSWORD ?? "illustrious",
    database: testDbName,
  });

  return {
    client,
    db: drizzle(client, {
      schema: { ...schema, ...relations },
      logger: false,
    }),
  };
}

/**
 * Connects to the test database
 */
export async function connectTestDb() {
  const { client, db } = createTestDb();
  await client.connect();
  return { client, db };
}

/**
 * Disconnects from the test database
 */
export async function disconnectTestDb(client: Client) {
  await client.end();
}

/**
 * Cleans up all test data from the database
 * Useful for resetting state between test suites
 *
 * Note: This uses the global db connection, so make sure DB_NAME
 * environment variable is set to the test database
 */
export async function cleanupTestDatabase(
  db: ReturnType<typeof createTestDb>["db"],
) {
  const {
    notification,
    userReport,
    userInvoice,
    orgUser,
    inquiry,
    report,
    invoice,
    org,
    userProfile,
    session,
    account,
    verification,
    user,
  } = schema;

  // Delete in order to respect foreign key constraints
  await db.delete(notification);
  await db.delete(userReport);
  await db.delete(userInvoice);
  await db.delete(orgUser);
  await db.delete(inquiry);
  await db.delete(report);
  await db.delete(invoice);
  await db.delete(org);
  await db.delete(userProfile);
  await db.delete(session);
  await db.delete(account);
  await db.delete(verification);
  await db.delete(user);
}
