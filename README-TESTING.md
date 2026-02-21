# Testing

## Quick Start

```bash
bun run test:local:coverage
```

Runs all tests against the integration test database with coverage.

## Scripts

| Script | Description |
|--------|-------------|
| `test:local:coverage` | Setup + all tests with coverage |
| `test:integration:setup` | Create test database |
| `test:integration:reset` | Reset test database |
| `test:integration` | Run integration tests only |

## Full Documentation

See **[docs/testing.md](./docs/testing.md)** for:
- Test structure and writing tests
- Integration testing setup
- Environment variables
- Troubleshooting
