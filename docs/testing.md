# Testing

## Overview

Tests use Bun's built-in test runner (`bun:test`) and run against a dedicated **integration test database** (`illustrious_test`). All route tests use real better-auth sessions—no mocks for authentication.

## Quick Start

```bash
# All tests with coverage (recommended)
bun run test:local:coverage
```

This will:
1. Setup test database (`illustrious_test`) if needed
2. Run all tests against the test database
3. Generate a coverage report

## Test Scripts

| Script | Description |
|--------|-------------|
| `bun run test:local:coverage` | Setup + run all tests with coverage |
| `bun run test:integration:setup` | Create/reset test database (first time only) |
| `bun run test:integration:reset` | Reset test database |
| `bun run test:integration` | Run only tests matching "Integration" |
| `bun run test:integration:coverage` | Integration tests with coverage |
| `bun run test:all` | Setup + run all tests |
| `bun test` | Run tests (requires DB_NAME=illustrious_test) |

## Test Structure

```
src/modules/tests/
├── setup.ts                    # Global setup (integration DB)
├── setup-integration.ts        # Integration test setup
├── utils/
│   ├── integration-auth.ts     # createIntegrationTestUserWithSession, etc.
│   ├── integration-setup.ts    # setupIntegrationTests, teardownIntegrationTests
│   ├── fixtures.ts             # createTestOrg, createTestUser, etc.
│   ├── requests.ts             # authenticatedRequest, unauthenticatedRequest
│   └── test-app.ts            # createTestApp (Elysia with all routes)
├── *.routes.test.ts           # Route tests (use integration auth)
├── *.service.test.ts          # Service tests (direct DB)
└── auth.*.test.ts             # Auth lib, middleware, permissions
```

## Integration Testing

### How It Works

Route tests use **real better-auth sessions**:

1. **Sign-up/sign-in** via better-auth HTTP endpoints (`/api/auth/sign-up/email`, `/api/auth/sign-in/email`) creates test users and sessions
2. **Token validation** uses `auth.api.getSession()` for each request—no external API calls
3. **Database** is isolated (`illustrious_test`), separate from development

### Writing Route Tests

```typescript
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { setupIntegrationTests, teardownIntegrationTests } from "./utils/integration-setup";
import { createIntegrationTestUserWithSession } from "./utils/integration-auth";
import { authenticatedRequest, unauthenticatedRequest } from "./utils/requests";
import { createTestApp } from "./utils/test-app";

describe("My Routes", () => {
  let authToken: string;
  let app: ReturnType<typeof createTestApp>;

  beforeAll(async () => {
    await setupIntegrationTests();

    const session = await createIntegrationTestUserWithSession(
      "test@example.com",
      "Test User"
    );
    authToken = session.token;
    app = createTestApp();
  });

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  it("should work with real auth", async () => {
    const response = await authenticatedRequest(app, "GET", "/orgs", authToken);
    expect(response.status).toBe(200);
  });
});
```

### Key Functions

| Function | Purpose |
|----------|---------|
| `createIntegrationTestUserWithSession(email, name?)` | Creates user via sign-up, returns session token |
| `authenticatedRequest(app, method, path, token, body?)` | Makes authenticated HTTP request |
| `unauthenticatedRequest(app, method, path, body?)` | Makes request without auth |
| `setupIntegrationTests()` | Initializes test database connection |
| `teardownIntegrationTests()` | Cleans up after tests |

## Test Coverage

The suite covers:

- **Auth**: Permission checks, middleware, session handling
- **Users**: Profile, roles, org invitations, temporary user linking
- **Organizations**: CRUD, permissions, ownership transfer
- **Invoices**: CRUD, access control, org membership
- **Reports**: CRUD, access control, org membership
- **Inquiries**: Creation with reCAPTCHA, user association
- **Notifications**: CRUD, unread count, mark read

### RBAC Testing

- Site roles: Administrator, Moderator, Normal User
- Org roles: Admin, Moderator, Client, Read-Only
- Resource access: read/write, user details, resource assignment
- Invitation acceptance, ownership transfer

## Environment Variables

For tests, set:

```bash
TEST_DB_NAME=illustrious_test
DB_NAME=illustrious_test
DB_USERNAME=admin
DB_PASSWORD=illustrious
DB_HOST=localhost
DB_PORT=5432
```

## CI/CD

Use `test:local:coverage` in CI:

```yaml
- name: Setup Test Database
  run: bun run test:integration:setup

- name: Run Tests
  env:
    TEST_DB_NAME: illustrious_test
    DB_NAME: illustrious_test
  run: bun run test:local:coverage
```

## Troubleshooting

### Database

```bash
# Check container
docker ps | grep postgres

# Check database exists
docker exec -i illustriouscloud-postgres-1 psql -U admin -d postgres -c "\l" | grep test
```

### Migrations

```bash
export DB_NAME=illustrious_test
bunx drizzle-kit migrate
```

### Reset

```bash
bun run test:integration:reset
```

## Writing Tests

### Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Clean up test data in `afterAll`
3. **Fixtures**: Use `createTestOrg`, `createTestUserProfile`, etc.
4. **Auth**: Use `createIntegrationTestUserWithSession` for route tests

### Running Specific Tests

```bash
# Run a specific file
bun test src/modules/tests/org.routes.test.ts

# Run tests matching a pattern
bun test --test-name-pattern "should create org"
```
