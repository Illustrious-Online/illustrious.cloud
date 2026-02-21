# Role-Based Access Control (RBAC)

Illustrious Cloud implements a comprehensive two-tier role-based access control system that provides granular permissions at both the application-wide and organization-specific levels.

## Overview

The RBAC system consists of two distinct permission layers:

1. **Site-Wide Roles** - Control access across all organizations
2. **Organization Roles** - Control access within specific organizations

This dual-layer approach allows users to have different permission levels in different organizations while maintaining site-wide administrative capabilities.

## Role Hierarchy

### Site-Wide Roles

Site-wide roles are stored in the `user_profile.site_role` column and control application-level permissions:

```
┌─────────────────────────────────────────────────────────┐
│                    Site-Wide Roles                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────┐ │
│  │ Administrator│    │  Moderator   │    │  Normal  │ │
│  │   (Level 0)  │    │  (Level 1)   │    │  (Level 2)│ │
│  └──────────────┘    └──────────────┘    └──────────┘ │
│         │                   │                  │        │
│         │                   │                  │        │
│    Read/Write          Read Only          Standard     │
│    Everything          Everything         Permissions  │
│    (All Orgs)          (All Orgs)        (Org-Based)  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Site Administrator (Level 0)
- **Read Access**: All resources across all organizations
- **Write Access**: All resources across all organizations
- **Bypasses**: All organization-level permission checks
- **Use Case**: System administrators who need full access

#### Site Moderator (Level 1)
- **Read Access**: All resources across all organizations
- **Write Access**: Only if they have org-level admin/moderator permissions
- **Use Case**: Support staff who need to view everything but only modify within their assigned organizations

#### Normal User (Level 2)
- **Read Access**: Based on organization roles
- **Write Access**: Based on organization roles
- **Use Case**: Standard application users

### Organization Roles

Organization roles are stored in the `org_user.role` column and control access within specific organizations:

```
┌─────────────────────────────────────────────────────────┐
│                Organization Roles                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐│
│  │   Admin  │  │ Moderator│  │  Client  │  │Read-Only││
│  │ (Level 0)│  │ (Level 1)│  │ (Level 2)│  │(Level 3)││
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘│
│      │             │              │              │      │
│      │             │              │              │      │
│   Full Access   Read All      Assigned      Assigned   │
│   Everything    Write Own    Resources     Resources   │
│                  Only          Only          Only       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Organization Administrator (Level 0)
- **Read Access**: All resources in the organization
- **Write Access**: All resources in the organization
- **Can**: Manage organization members, delete any resource
- **Use Case**: Organization owners and managers

#### Organization Moderator (Level 1)
- **Read Access**: All resources in the organization
- **Write Access**: Only resources they created or are assigned to
- **Can**: Create new resources, modify own resources
- **Use Case**: Team leads who need visibility but limited modification rights

#### Client/User (Level 2)
- **Read Access**: Only resources assigned via junction tables (`user_invoice`, `user_report`)
- **Write Access**: None
- **Can**: View invoices/reports specifically assigned to them
- **Use Case**: End clients who receive invoices and reports

#### Read-Only/Invited (Level 3)
- **Read Access**: Only resources assigned via junction tables
- **Write Access**: None
- **Can**: View assigned resources, accept invitation to upgrade role
- **Use Case**: Users invited to organization who haven't accepted yet

## Permission Flow

### Reading Resources

```
┌─────────────────────────────────────────────────────────┐
│              Resource Read Permission Check             │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │  Site Admin/Moderator?  │
              └─────────────────────────┘
                    │              │
              Yes   │              │   No
                    ▼              ▼
         ┌──────────────┐  ┌──────────────────┐
         │   ALLOW      │  │ Org Member?      │
         │              │  └──────────────────┘
         │              │         │
         │              │    Yes  │  No
         │              │         │
         │              │         ▼
         │              │    ┌─────────┐
         │              │    │  DENY   │
         │              │    └─────────┘
         │              │         │
         │              │         │
         │              └─────────┘
         │                    │
         │                    ▼
         │         ┌──────────────────┐
         │         │  Org Admin/      │
         │         │  Moderator/      │
         │         │  Client/         │
         │         │  Read-Only?      │
         │         └──────────────────┘
         │                │
         │            Yes │
         │                ▼
         │         ┌─────────┐
         │         │  ALLOW  │
         │         └─────────┘
         │
         └─────────────────┘
```

### Writing Resources

```
┌─────────────────────────────────────────────────────────┐
│             Resource Write Permission Check             │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │     Site Admin?         │
              └─────────────────────────┘
                    │              │
              Yes   │              │   No
                    ▼              ▼
         ┌──────────────┐  ┌──────────────────┐
         │   ALLOW      │  │ Org Admin/       │
         │              │  │ Moderator?       │
         │              │  └──────────────────┘
         │              │         │
         │              │    Yes  │  No
         │              │         │
         │              │         ▼
         │              │    ┌─────────┐
         │              │    │  DENY   │
         │              │    └─────────┘
         │              │         │
         │              │         │
         │              └─────────┘
         │                    │
         │                    ▼
         │         ┌──────────────────┐
         │         │  Org Admin?      │
         │         └──────────────────┘
         │                │
         │            Yes  │  No
         │                │
         │                ▼
         │         ┌──────────────────┐
         │         │  Created by      │
         │         │  User?           │
         │         └──────────────────┘
         │                │
         │            Yes │
         │                ▼
         │         ┌─────────┐
         │         │  ALLOW  │
         │         └─────────┘
         │
         └─────────────────┘
```

## Permission Functions

The RBAC system is implemented through centralized permission checking functions in `src/modules/auth/permissions.ts`:

### Core Functions

#### `getUserSiteRole(userId: string): Promise<number>`
Retrieves a user's site-wide role. Returns `SiteRole.NORMAL_USER` (2) if no profile exists.

#### `getUserOrgRole(userId: string, orgId: string): Promise<number | null>`
Retrieves a user's role in a specific organization. Returns `null` if not a member.

#### `canReadAcrossOrgs(siteRole: number): boolean`
Checks if site role allows reading across all organizations (Admin or Moderator).

#### `canWriteAcrossOrgs(siteRole: number): boolean`
Checks if site role allows writing across all organizations (Admin only).

#### `canReadOrgResource(siteRole: number, orgRole: number | null): boolean`
Determines if user can read resources in an organization.

#### `canWriteOrgResource(siteRole: number, orgRole: number | null): boolean`
Determines if user can write resources in an organization.

#### `canWriteResource(siteRole: number, orgRole: number | null, createdBy: string | null, userId: string): boolean`
Checks if user can write a specific resource (considers creator for moderators).

#### `canAccessUserDetails(viewerId: string, targetUserId: string, orgId?: string): Promise<boolean>`
Determines if a user can view another user's details.

#### `isResourceAssignedToUser(userId: string, resourceId: string, junctionTable: "userInvoice" | "userReport"): Promise<boolean>`
Checks if a resource is assigned to a user via junction table.

## Usage Examples

### Example 1: Site Admin Accessing Any Resource

```typescript
const siteRole = await getUserSiteRole(userId); // Returns SiteRole.ADMIN (0)
const canRead = canReadAcrossOrgs(siteRole); // Returns true
const canWrite = canWriteAcrossOrgs(siteRole); // Returns true
// Site admin can read/write everything, bypassing org checks
```

### Example 2: Org Moderator Writing Own Resource

```typescript
const siteRole = await getUserSiteRole(userId); // Returns SiteRole.NORMAL_USER (2)
const orgRole = await getUserOrgRole(userId, orgId); // Returns OrgRole.MODERATOR (1)
const canWrite = canWriteResource(
  siteRole,
  orgRole,
  resource.createdBy, // Resource creator ID
  userId // Current user ID
);
// Returns true only if resource.createdBy === userId
```

### Example 3: Client Accessing Assigned Resource

```typescript
const siteRole = await getUserSiteRole(userId); // Returns SiteRole.NORMAL_USER (2)
const orgRole = await getUserOrgRole(userId, orgId); // Returns OrgRole.CLIENT (2)
const isAssigned = await isResourceAssignedToUser(userId, invoiceId, "userInvoice");
// Returns true if invoice is assigned via user_invoice table
```

## Temporary Users and Account Linking

### Temporary Users

Temporary users are created when an organization needs to send invoices/reports to users who don't have accounts yet:

- **Email Verified**: `false`
- **No Password**: Cannot sign in
- **Org Role**: Typically `READ_ONLY` (3)
- **Use Case**: Inviting external users to receive documents

### Account Linking

When a temporary user creates an account with the same email, the `linkTemporaryUser()` function:

1. Finds the temporary user by email
2. Transfers all relationships:
   - Organization memberships (`org_user`)
   - Invoice assignments (`user_invoice`)
   - Report assignments (`user_report`)
3. Deletes the temporary user record
4. Returns count of transferred relationships

```typescript
const transferredCount = await linkTemporaryUser(email, authenticatedUserId);
// All temporary user's relationships are now linked to authenticated user
```

## Accepting Organization Invitations

Users with `READ_ONLY` role can accept invitations to upgrade their role:

```typescript
// User accepts invitation, upgrading from READ_ONLY to CLIENT
const updated = await acceptOrgInvitation(userId, orgId, OrgRole.CLIENT);
// Role updated from 3 (READ_ONLY) to 2 (CLIENT)
```

### Validation

- User must be a member of the organization
- User must have `READ_ONLY` role (pending invitation)
- New role must be valid (ADMIN, MODERATOR, or CLIENT)

## Database Schema

### User Profile Table

```sql
CREATE TABLE user_profile (
  user_id TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
  site_role INTEGER NOT NULL DEFAULT 2, -- 0=Admin, 1=Moderator, 2=Normal User
  -- ... other fields
);
```

### Organization User Table

```sql
CREATE TABLE org_user (
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL REFERENCES org(id) ON DELETE CASCADE,
  role INTEGER NOT NULL DEFAULT 0, -- 0=Admin, 1=Moderator, 2=Client, 3=Read-only
  PRIMARY KEY (user_id, org_id)
);
```

## Role Constants

### Site Roles

```typescript
export const SiteRole = {
  ADMIN: 0,        // Site administrator
  MODERATOR: 1,    // Site moderator
  NORMAL_USER: 2, // Normal user
} as const;
```

### Organization Roles

```typescript
export const OrgRole = {
  ADMIN: 0,      // Org administrator
  MODERATOR: 1,  // Org moderator
  CLIENT: 2,     // User/Client
  READ_ONLY: 3,  // Read-only/Invited
} as const;
```

## Best Practices

1. **Always Check Permissions**: Never assume a user has access based on previous checks
2. **Use Permission Functions**: Use centralized permission functions rather than inline checks
3. **Check Site Role First**: Site-level permissions bypass org-level checks
4. **Handle Null Cases**: Org roles can be `null` if user is not a member
5. **Resource Assignment**: For clients/read-only users, always check junction tables
6. **Moderator Restrictions**: Org moderators can only modify resources they created
7. **Temporary Users**: Handle temporary user linking gracefully when users sign up

## Migration Notes

The RBAC system was introduced in migration `0005_add_role_system.sql`:

- Replaced `user_profile.super_admin` boolean with `user_profile.site_role` integer
- Migrated existing `super_admin=true` to `site_role=0` (Administrator)
- Updated `org_user.role` semantics:
  - Old: `1` = admin, `0` = regular user
  - New: `0` = admin, `1` = moderator, `2` = client, `3` = read-only

## Testing

Comprehensive test coverage is available in:
- `src/modules/tests/auth.permissions.test.ts` - Permission function tests
- `src/modules/tests/user.service.test.ts` - User role and linking tests
- Service tests include permission checks for all CRUD operations
