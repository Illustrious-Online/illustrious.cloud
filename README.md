# Illustrious Cloud API

A modern, type-safe REST API built with ElysiaJS, featuring better-auth (email/password + OAuth), bearer token authentication, and full Eden Treaty integration for end-to-end type safety.

## Quick Start

```bash
# Install dependencies
bun install

# Copy environment variables
cp .env.example .env
# Edit .env with your configuration

# Start database and server
bun run start
```

The API will be available at `http://localhost:3000`

## Documentation

- **[Role-Based Access Control (RBAC)](./docs/rbac.md)** - RBAC system with site and org roles
- **[RBAC Examples](./docs/rbac-examples.md)** - Practical RBAC usage examples
- **[Testing](./docs/testing.md)** - Testing guide and integration test setup
- **[Backend Processing](./docs/backend-processing.md)** - Request flow, auth, and error handling
- **[Eden Treaty Integration](./docs/eden-treaty.md)** - Type-safe frontend API client
- **[Security](./docs/security.md)** - Security practices and configuration

## Features

- **Type-Safe API** - Built with ElysiaJS and TypeScript
- **Eden Treaty** - End-to-end type safety between frontend and backend
- **Better-Auth** - Email/password and OAuth (Google, Discord, GitHub) with bearer tokens
- **Role-Based Access Control (RBAC)** - Two-tier permission system (site-wide and organization-level)
- **reCAPTCHA** - Bot protection for public endpoints
- **Email Service** - Nodemailer integration
- **Modular Architecture** - Clean, maintainable code structure

## Tech Stack

- **ElysiaJS** - Fast, type-safe web framework
- **Drizzle ORM** - TypeScript ORM for PostgreSQL
- **Eden Treaty** - Type-safe client generation
- **Bun** - JavaScript runtime and package manager
- **PostgreSQL** - Database
- **Biome** - Linting and formatting

## Available Scripts

- `bun run dev` - Start development server with hot reload
- `bun run build` - Build for production
- `bun run start` - Start database and server concurrently
- `bun run db:start` - Start PostgreSQL container and run migrations
- `bun run db:stop` - Stop PostgreSQL container
- `bun run db:migrate` - Run database migrations
- `bun test` - Run tests (requires DB_NAME=illustrious_test for full suite)
- `bun run test:local:coverage` - Setup test DB and run all tests with coverage
- `bun run check` - Lint code with Biome
- `bun run check:fix` - Fix linting issues automatically

## API Documentation

Once the server is running:
- **Swagger UI**: http://localhost:3000/docs
- **Health Check**: http://localhost:3000/health

## Contributing

1. Follow the existing code structure
2. Use Biome for linting and formatting
3. Write tests for new features
4. Update documentation if adding new endpoints or features
5. Ensure all tests pass before submitting PR

## License

See [LICENSE](./LICENSE) file for details.
