# Security Considerations

## Better-Auth & Session Security

### Configuration

- **Strong Secret**: Use a strong, random `BETTER_AUTH_SECRET` (minimum 32 characters)
  ```bash
  openssl rand -base64 32
  ```

- **Session Expiration**: Sessions expire after 7 days (configurable in better-auth)
  - Sessions are stored in the database
  - Tokens are validated via `auth.api.getSession()` on each request

### Best Practices

- **Token Storage**: Store tokens securely on client
  - **Web**: `localStorage` (XSS risk) or `httpOnly` cookies (CSRF risk)
  - **Mobile**: Secure storage (Keychain/Keystore)
  - **Desktop**: Secure credential storage

- **Token Transmission**: Always use HTTPS in production
  - Tokens are sent in `Authorization: Bearer <token>` header
  - Never send tokens in URL parameters

- **Trusted Origins**: Configure `ALLOWED_ORIGINS` for CORS in production

## reCAPTCHA

### Configuration

- **Required** for public inquiry endpoint (`POST /inquiries`)
- Supports both reCAPTCHA v2 and v3
- Score threshold configurable (default: 0.5 for v3)

### Best Practices

1. **Secret Key**: Keep `RECAPTCHA_SECRET_KEY` secure
2. **Score Threshold**: Adjust based on your traffic patterns
   - Higher threshold = more strict (fewer false positives, more false negatives)
   - Lower threshold = more lenient (more false positives, fewer false negatives)
3. **Monitoring**: Monitor reCAPTCHA scores for patterns
4. **Fallback**: Have a fallback mechanism for legitimate users who fail reCAPTCHA

## Password Security

### Hashing

- Passwords are hashed with **argon2** before storage
- Argon2 is a memory-hard function resistant to GPU attacks
- Default configuration: `timeCost: 2`, `memoryCost: 65536`

### Requirements

- **Minimum Length**: 8 characters (enforced by validation)
- **Storage**: Never stored in plaintext
- **Verification**: Always use constant-time comparison

### Best Practices

1. **Password Policy**: Consider enforcing stronger policies (uppercase, numbers, symbols)
2. **Rate Limiting**: Implement rate limiting on sign-in endpoints
3. **Password Reset**: Implement secure password reset flow
4. **Breach Detection**: Monitor for password breaches (Have I Been Pwned, etc.)

## Role-Based Access Control (RBAC)

### Overview

Illustrious Cloud implements a comprehensive two-tier RBAC system:

- **Site-Wide Roles**: Control access across all organizations (Administrator, Moderator, Normal User)
- **Organization Roles**: Control access within specific organizations (Admin, Moderator, Client, Read-Only)

See [RBAC Documentation](./rbac.md) for complete details.

### Security Considerations

1. **Permission Checks**: All resource access is validated through centralized permission functions
2. **Site Admin Bypass**: Site administrators bypass all organization-level checks
3. **Moderator Restrictions**: Organization moderators can only modify resources they created
4. **Client Access**: Clients can only access resources explicitly assigned to them
5. **Temporary Users**: Temporary users (unverified email) cannot sign in until they create an account

### Best Practices

- Always use permission checking functions rather than inline checks
- Never assume permissions based on previous checks
- Validate both site and organization roles before granting access
- Handle null org roles (user not a member) gracefully

## Database Security

### Connection Security

- Use SSL/TLS for database connections in production (`DB_SSL=true`)
- Use strong database passwords
- Restrict database access to application servers only

### Query Security

- **Parameterized Queries**: All queries use Drizzle ORM with parameterized queries (prevents SQL injection)
- **Input Validation**: All inputs are validated using Elysia models before database operations
- **Type Safety**: TypeScript provides compile-time type checking
- **Permission Checks**: All database operations are gated by RBAC permission checks

## API Security

### CORS

- CORS is enabled for cross-origin requests
- Configure allowed origins in production

### Rate Limiting

Consider implementing rate limiting for:
- Authentication endpoints (`/api/auth/sign-in/email`, `/api/auth/sign-up/email`)
- Public endpoints (`/inquiries`)

### Input Validation

- All inputs are validated using Elysia's built-in validation
- Type-safe validation models ensure data integrity
- Invalid inputs return `400 Bad Request` with descriptive errors

### Error Handling

- Error messages don't leak sensitive information
- Stack traces are only logged (not returned to client)
- Consistent error format: `{ success: false, error: { message, code, statusCode } }`

## HTTPS

### Production Requirements

- **Always use HTTPS** in production
- Redirect HTTP to HTTPS
- Use valid SSL/TLS certificates
- Consider HSTS (HTTP Strict Transport Security)

## Security Headers

Consider adding security headers:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`

## Monitoring & Logging

### Security Events to Monitor

- Failed authentication attempts
- Unusual request patterns
- Error rates
- Database query performance

### Logging Best Practices

- Log security events (authentication failures, etc.)
- Don't log sensitive data (passwords, tokens)
- Use structured logging
- Rotate logs regularly
- Secure log storage

## Dependency Security

### Regular Updates

- Keep dependencies up to date
- Monitor for security vulnerabilities
- Use tools like `npm audit` or `bun audit`

### Dependency Review

Regularly review dependencies for:
- Active maintenance
- Known vulnerabilities
- License compatibility
- Bundle size impact

## Compliance

Consider compliance requirements for your use case:

- **GDPR**: User data handling, right to deletion
- **SOC 2**: Security controls and monitoring
- **HIPAA**: Healthcare data protection (if applicable)
- **PCI DSS**: Payment card data (if applicable)



