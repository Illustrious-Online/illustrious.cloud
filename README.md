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

## Email (SMTP) Configuration

To enable email sending (e.g., for inquiries), set the following environment variables in your deployment or `.env` file:

```
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=465 # or 587, depending on your provider
SMTP_SECURE=true # true for port 465 (SSL), false for 587 (TLS)
SMTP_USER=nick@illustrious.online
SMTP_PASS=your_email_password_or_app_password
```

- For best results, use an app-specific password if your provider supports it.
- The sender address will default to `SMTP_USER`.

## reCAPTCHA Configuration

To enable reCAPTCHA verification for the inquiry endpoint, set the following environment variable:

```
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key
```

- Get your reCAPTCHA secret key from the [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin).
- If not configured, reCAPTCHA verification will be skipped (not recommended for production).

## Inquiry Endpoint

The `/inquiry` endpoint accepts POST requests with the following security requirements:

- **Service Role Key**: Must be included in the `Authorization` header as `Bearer <your_service_role_key>`
- **reCAPTCHA Token**: Must be included in the request body

Example request:
```bash
curl -X POST http://localhost:8000/inquiry \
  -H "Authorization: Bearer your_supabase_service_role_key" \
  -H "Content-Type: application/json" \
  -d '{
    "orgId": "org_id",
    "name": "John Doe",
    "email": "john@example.com",
    "subject": "General Inquiry",
    "message": "Hello, I have a question...",
    "recaptchaToken": "recaptcha_token_from_frontend"
  }'
```
