import { afterAll, beforeAll } from "bun:test";
import { setupIntegrationTests, teardownIntegrationTests } from "./utils/integration-setup";

/**
 * Global integration test setup
 * 
 * This file can be used to enable integration testing globally.
 * To use it, rename this file to setup.ts or import it in your test files.
 * 
 * Note: This will run for ALL tests. For selective integration testing,
 * use setupIntegrationTests() in individual test files' beforeAll hooks.
 */

// Uncomment to enable global integration test setup
// beforeAll(async () => {
//   await setupIntegrationTests();
// });

// afterAll(async () => {
//   await teardownIntegrationTests();
// });
