# Backend Processing

## Request Flow

1. **Request arrives** → Elysia middleware stack
2. **CORS** → Handles cross-origin requests
3. **Logger** → Logs request details
4. **Error Plugin** → Centralized error handling
5. **Route Handler** → Processes request
6. **Authentication** → Validates bearer token via better-auth (if protected)
7. **Authorization (RBAC)** → Checks user roles and permissions
   - Retrieves site-wide role from `user_profile`
   - Retrieves organization role from `org_user` (if org context)
   - Validates access using permission functions
8. **Validation** → Validates request body/params using Elysia models
9. **Service Layer** → Business logic execution with permission checks
10. **Database** → Drizzle ORM queries (gated by permissions)
11. **Response** → Typed response returned

## Authentication Processing

### Better-Auth Authentication Flow

Authentication uses [better-auth](https://www.better-auth.com/) with the bearer plugin for token-based auth across domains.

```
1. Client signs up: POST /api/auth/sign-up/email
   Body: { email, password, name }

2. Client signs in: POST /api/auth/sign-in/email
   Body: { email, password }

3. Server responds with session token
   - Token returned in Set-Auth-Token header or response body
   - Session stored in database (session table)

4. Client sends: Authorization: Bearer <token>
   - getSessionFromHeader() calls auth.api.getSession()
   - Better-auth validates token against session table
   - Adds session and user to request context
   - Permission checks retrieve user roles for authorization
```

### OAuth (Google, Discord, GitHub)

Better-auth also supports OAuth providers. Configure client IDs and secrets in environment variables.

## Error Handling

All errors are handled by the `errorPlugin` which:
- Catches domain exceptions (BadRequestError, UnauthorizedError, etc.)
- Returns consistent error format
- Logs stack traces (except in production)
- Sets appropriate HTTP status codes

### Error Response Format

```typescript
{
  success: false;
  error: {
    message: string;   // Human-readable error message
    code: string;     // Error code (e.g. "FORBIDDEN")
    statusCode: number;  // HTTP status code
  };
}
```

### Domain Exceptions

- `BadRequestError` (400) - Invalid request data
- `UnauthorizedError` (401) - Authentication required or failed
- `ForbiddenError` (403) - Permission denied (RBAC authorization failure)
- `NotFoundError` (404) - Resource not found
- `ConflictError` (409) - Resource conflict
- `ValidationError` (422) - Validation failed
- `ServerError` (500) - Internal server errors

## Database Operations

### Query Pattern

```typescript
// Select
const users = await db.select().from(user).where(eq(user.email, email));

// Insert
const [newUser] = await db.insert(user).values(data).returning();

// Update
const [updated] = await db.update(user).set(data).where(eq(user.id, id)).returning();

// Delete
await db.delete(user).where(eq(user.id, id));
```

### Transactions

For operations requiring multiple queries:

```typescript
await db.transaction(async (tx) => {
  await tx.insert(org).values(orgData);
  await tx.insert(orgUser).values(userOrgData);
});
```

## Authorization (RBAC) Processing

### Permission Check Flow

Every resource access request goes through RBAC permission checks:

```
1. Service function receives request with userId and orgId (if applicable)

2. Retrieve user roles:
   - Site role: getUserSiteRole(userId)
   - Org role: getUserOrgRole(userId, orgId) (if org context)

3. Check permissions based on operation:
   - Read: canReadAcrossOrgs() OR canReadOrgResource()
   - Write: canWriteAcrossOrgs() OR canWriteOrgResource() OR canWriteResource()
   - User details: canAccessUserDetails()
   - Resource assignment: isResourceAssignedToUser()

4. If permission denied → Throw ForbiddenError (403)

5. If permission granted → Proceed with operation
```

### Example: Reading an Invoice

```typescript
export async function getInvoiceById(invoiceId: string, userId: string) {
  // 1. Get user roles
  const siteRole = await getUserSiteRole(userId);
  const invoice = await getInvoiceFromDB(invoiceId);
  const orgRole = await getUserOrgRole(userId, invoice.orgId);

  // 2. Check read permission
  if (!canReadAcrossOrgs(siteRole)) {
    if (!canReadOrgResource(siteRole, orgRole)) {
      // Check if resource is assigned to user (for clients/read-only)
      if (orgRole === OrgRole.CLIENT || orgRole === OrgRole.READ_ONLY) {
        const isAssigned = await isResourceAssignedToUser(userId, invoiceId, "userInvoice");
        if (!isAssigned) {
          return null; // User doesn't have access
        }
      } else {
        return null; // Not a member or insufficient permissions
      }
    }
  }

  // 3. Permission granted, return invoice
  return invoice;
}
```

### Permission Check Locations

- **Service Layer**: All service functions check permissions before operations
- **Centralized Functions**: Permission logic in `src/modules/auth/permissions.ts`
- **Consistent Errors**: Permission failures throw `ForbiddenError` (403)

See [RBAC Documentation](./rbac.md) for complete permission system details.

## Service Layer Pattern

Each module follows this pattern:

1. **Model** (`model.ts`) - Elysia validation models
2. **Service** (`service.ts`) - Business logic, database operations, and RBAC permission checks
3. **Routes** (`routes.ts`) - HTTP route handlers

This separation ensures:
- Type safety through validation models
- Reusable business logic
- Centralized permission checks
- Clean route handlers



