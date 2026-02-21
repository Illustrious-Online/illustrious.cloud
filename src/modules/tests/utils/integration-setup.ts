import { afterAll, beforeAll } from "bun:test";
import { connectTestDb, disconnectTestDb, cleanupTestDatabase } from "./test-db-integration";
import type { Client } from "pg";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { db } from "@/drizzle/db";

/**
 * Integration test setup
 * Creates a real database connection and cleans up after tests
 */
let testClient: Client | null = null;
let testDb: NodePgDatabase<typeof import("@/drizzle/schema")> | null = null;

export function getTestDb() {
  if (!testDb) {
    throw new Error("Test database not initialized. Call setupIntegrationTests() first.");
  }
  return testDb;
}

export function getTestClient() {
  if (!testClient) {
    throw new Error("Test client not initialized. Call setupIntegrationTests() first.");
  }
  return testClient;
}

/**
 * Sets up integration test environment
 * Call this in beforeAll of your test suite
 * 
 * Important: This function:
 * 1. Ensures DB_NAME is set to test database (must be set before importing @/lib/auth)
 * 2. Connects to the test database (illustrious_test)
 * 3. Cleans up existing test data
 * 4. Uses better-auth's internal validation (auth.api.getSession)
 * 
 * Note: DB_NAME must be set in the environment BEFORE this function is called,
 * ideally in the test script (e.g., DB_NAME=illustrious_test bun test)
 */
export async function setupIntegrationTests() {
  // Ensure we're using the test database
  const testDbName = process.env.TEST_DB_NAME || process.env.DB_NAME || "illustrious_test";
  if (process.env.DB_NAME !== testDbName) {
    process.env.DB_NAME = testDbName;
  }

  const { client, db: testDbConnection } = await connectTestDb();
  testClient = client;
  testDb = testDbConnection;

  // Clean up any existing test data
  await cleanupTestDatabase(testDbConnection);

  return { client, db: testDbConnection };
}

/**
 * Tears down integration test environment
 * Call this in afterAll of your test suite
 */
export async function teardownIntegrationTests() {
  if (testDb) {
    await cleanupTestDatabase(testDb);
  }
  if (testClient) {
    await disconnectTestDb(testClient);
  }
  testClient = null;
  testDb = null;
}

/**
 * Global integration test setup
 * Uncomment to use integration tests globally
 */
// beforeAll(async () => {
//   await setupIntegrationTests();
// });

// afterAll(async () => {
//   await teardownIntegrationTests();
// });
