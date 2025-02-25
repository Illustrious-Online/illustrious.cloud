## Basic Initialization
```
mv .env.example .env
bun install
```

## Development
To start the development server run:
```bash
bun run dev
```

> Development database will be required to complete testing in pre-commit event!

To start the development database:
```bash
### Docker Daemon needs to be running for this change
### i.e.: sudo systemctl start docker
bun run db:docker
```

Open http://localhost:3000/ with your browser to see the result.
