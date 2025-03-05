## Basic Initialization
```
mv .env.example .env
bun install
```

## Development
To start the development server, run:
```bash
bun run dev
```

To start the development database:
```bash
### Docker Daemon needs to be running for this change
### i.e.: sudo systemctl start docker
bun run db:docker
```

To run the database & development server concurrently, run:
```bash
bun run start
```
> `bun run start` is the default for local deployment as production should utilize `bun
> run build` for the best production deployment.

> ~~Development database will be required to complete testing in pre-commit event!~~
> 
>`bun test` has been removed from pre-commit functionality.
> However, it is recommended to execute the unit tests as they will be required for PRs.

## Testing
The database is required for executing tests appropriately and this can be accomplished in several ways:

Execute one-liner to start db & run test:
```bash
bun run test:local
```

Ensure the database is started, migrate the Drizzle schema, and execute test:
```bash
bun run db:docker
bun run db:migrate
bun test
```

Open http://localhost:3000/ with your browser to see the result.
