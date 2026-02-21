import { afterAll, beforeAll } from "bun:test";
import { setupIntegrationTests, teardownIntegrationTests } from "./utils/integration-setup";

/**
 * Global test setup
 * Uses integration testing with real database and better-auth validation
 */
beforeAll(async () => {
  await setupIntegrationTests();
});

/**
 * Global test teardown
 */
afterAll(async () => {
  await teardownIntegrationTests();
});
