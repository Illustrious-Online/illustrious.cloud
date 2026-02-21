# RBAC Usage Examples

This document provides practical examples of how the RBAC system works in various scenarios.

## Scenario 1: Site Administrator Accessing Resources

**User**: Site Administrator (site_role = 0)  
**Organization**: Any organization

```typescript
// User tries to read invoice from Org A
const siteRole = await getUserSiteRole(userId); // Returns 0 (ADMIN)
const canRead = canReadAcrossOrgs(siteRole); // Returns true

// ✅ Access granted - Site admin can read everything
const invoice = await getInvoiceById(invoiceId, userId);
```

**Result**: ✅ **Access granted** - Site administrators bypass all organization-level checks.

---

## Scenario 2: Organization Moderator Modifying Own Resource

**User**: Normal User (site_role = 2)  
**Organization**: Org A, Moderator role (org_role = 1)  
**Resource**: Report created by this user

```typescript
// User tries to update their own report
const siteRole = await getUserSiteRole(userId); // Returns 2 (NORMAL_USER)
const orgRole = await getUserOrgRole(userId, orgId); // Returns 1 (MODERATOR)
const report = await getReportById(reportId);

const canWrite = canWriteResource(
  siteRole,
  orgRole,
  report.createdBy, // User's own ID
  userId
); // Returns true

// ✅ Access granted - Moderator can modify own resources
await updateReport(reportId, updateData, userId);
```

**Result**: ✅ **Access granted** - Org moderators can modify resources they created.

---

## Scenario 3: Organization Moderator Modifying Others' Resource

**User**: Normal User (site_role = 2)  
**Organization**: Org A, Moderator role (org_role = 1)  
**Resource**: Report created by another user

```typescript
// User tries to update another user's report
const siteRole = await getUserSiteRole(userId); // Returns 2 (NORMAL_USER)
const orgRole = await getUserOrgRole(userId, orgId); // Returns 1 (MODERATOR)
const report = await getReportById(reportId);

const canWrite = canWriteResource(
  siteRole,
  orgRole,
  report.createdBy, // Another user's ID
  userId
); // Returns false

// ❌ Access denied - Moderator cannot modify others' resources
throw new ForbiddenError("Cannot modify resources created by others");
```

**Result**: ❌ **Access denied** - Org moderators can only modify their own resources.

---

## Scenario 4: Client Accessing Assigned Invoice

**User**: Normal User (site_role = 2)  
**Organization**: Org A, Client role (org_role = 2)  
**Resource**: Invoice assigned via `user_invoice` table

```typescript
// User tries to read invoice
const siteRole = await getUserSiteRole(userId); // Returns 2 (NORMAL_USER)
const orgRole = await getUserOrgRole(userId, orgId); // Returns 2 (CLIENT)

// Check if can read org resources
if (!canReadOrgResource(siteRole, orgRole)) {
  return null; // This would be false, but orgRole is not null
}

// Since user is CLIENT, check if invoice is assigned
const isAssigned = await isResourceAssignedToUser(userId, invoiceId, "userInvoice");
if (!isAssigned) {
  return null; // ❌ Access denied
}

// ✅ Access granted - Invoice is assigned to user
const invoice = await getInvoiceById(invoiceId, userId);
```

**Result**: ✅ **Access granted** - Client can access assigned resources.

---

## Scenario 5: Client Accessing Unassigned Invoice

**User**: Normal User (site_role = 2)  
**Organization**: Org A, Client role (org_role = 2)  
**Resource**: Invoice NOT assigned to user

```typescript
// User tries to read invoice
const isAssigned = await isResourceAssignedToUser(userId, invoiceId, "userInvoice");
if (!isAssigned) {
  return null; // ❌ Access denied
}
```

**Result**: ❌ **Access denied** - Clients can only access assigned resources.

---

## Scenario 6: Site Moderator Writing in Own Organization

**User**: Site Moderator (site_role = 1)  
**Organization**: Org A, Admin role (org_role = 0)

```typescript
// User tries to create invoice
const siteRole = await getUserSiteRole(userId); // Returns 1 (MODERATOR)
const orgRole = await getUserOrgRole(userId, orgId); // Returns 0 (ADMIN)

const canWrite = canWriteOrgResource(siteRole, orgRole); // Returns true
// Site moderator can write because they have org admin role

// ✅ Access granted
const invoice = await createInvoice(orgId, invoiceData, userId);
```

**Result**: ✅ **Access granted** - Site moderators can write if they have org admin/moderator role.

---

## Scenario 7: Site Moderator Writing in Organization Without Role

**User**: Site Moderator (site_role = 1)  
**Organization**: Org B, Not a member (org_role = null)

```typescript
// User tries to create invoice
const siteRole = await getUserSiteRole(userId); // Returns 1 (MODERATOR)
const orgRole = await getUserOrgRole(userId, orgId); // Returns null

const canWrite = canWriteOrgResource(siteRole, orgRole); // Returns false
// Site moderator cannot write without org role

// ❌ Access denied
throw new ForbiddenError("Not a member of this organization");
```

**Result**: ❌ **Access denied** - Site moderators need org-level permissions to write.

---

## Scenario 8: Organization Admin Viewing User Details

**User**: Normal User (site_role = 2)  
**Organization**: Org A, Admin role (org_role = 0)  
**Target**: Another org member

```typescript
// User tries to view another member's details
const canAccess = await canAccessUserDetails(
  userId,        // Viewer (org admin)
  targetUserId,  // Target user
  orgId          // Org context
);

// Function checks:
// 1. viewerSiteRole = 2 (NORMAL_USER) - not site admin/moderator
// 2. viewerOrgRole = 0 (ADMIN) - org admin
// 3. targetOrgRole = 2 (CLIENT) - target is org member
// Returns true because viewer is org admin

// ✅ Access granted
const userDetails = await getUserById(targetUserId);
```

**Result**: ✅ **Access granted** - Org admins can view all org members' details.

---

## Scenario 9: Client Viewing Another User's Details

**User**: Normal User (site_role = 2)  
**Organization**: Org A, Client role (org_role = 2)  
**Target**: Another org member

```typescript
// User tries to view another member's details
const canAccess = await canAccessUserDetails(
  userId,        // Viewer (client)
  targetUserId,  // Target user
  orgId          // Org context
);

// Function checks:
// 1. viewerSiteRole = 2 (NORMAL_USER) - not site admin/moderator
// 2. viewerOrgRole = 2 (CLIENT) - not admin/moderator
// Returns false - clients cannot view other users' details

// ❌ Access denied
throw new ForbiddenError("Cannot access user details");
```

**Result**: ❌ **Access denied** - Clients cannot view other users' details.

---

## Scenario 10: Temporary User Account Linking

**Temporary User**: Email verified = false, READ_ONLY role  
**Authenticated User**: Creates account with same email

```typescript
// User signs up with email that has temporary user
const tempUserEmail = "client@example.com";

// Link temporary user relationships
const transferredCount = await linkTemporaryUser(tempUserEmail, authenticatedUserId);

// Function:
// 1. Finds temporary user by email (emailVerified = false)
// 2. Transfers org_user relationships
// 3. Transfers user_invoice relationships
// 4. Transfers user_report relationships
// 5. Deletes temporary user and profile

// ✅ Relationships transferred
console.log(`Transferred ${transferredCount} relationships`);
```

**Result**: ✅ **Success** - All temporary user relationships transferred to authenticated account.

---

## Scenario 11: Accepting Organization Invitation

**User**: Normal User (site_role = 2)  
**Organization**: Org A, READ_ONLY role (org_role = 3)

```typescript
// User accepts invitation
const updated = await acceptOrgInvitation(
  userId,
  orgId,
  OrgRole.CLIENT // Upgrade to CLIENT role
);

// Function validates:
// 1. User is org member ✅
// 2. Current role is READ_ONLY (3) ✅
// 3. New role is valid (CLIENT = 2) ✅
// Updates role from 3 to 2

// ✅ Role updated
console.log(`Role updated to: ${updated.role}`); // 2 (CLIENT)
```

**Result**: ✅ **Success** - Role upgraded from READ_ONLY to CLIENT.

---

## Permission Matrix

| Site Role | Org Role | Read Org Resources | Write Org Resources | Write Own Resources | Write Others' Resources |
|-----------|----------|-------------------|---------------------|---------------------|------------------------|
| Admin (0) | Any      | ✅ Yes            | ✅ Yes             | ✅ Yes              | ✅ Yes                 |
| Moderator (1) | Admin (0) | ✅ Yes            | ✅ Yes             | ✅ Yes              | ✅ Yes                 |
| Moderator (1) | Moderator (1) | ✅ Yes        | ✅ Yes             | ✅ Yes              | ❌ No                  |
| Moderator (1) | Client (2) | ✅ Yes            | ❌ No              | ❌ No               | ❌ No                  |
| Moderator (1) | None     | ✅ Yes            | ❌ No              | ❌ No               | ❌ No                  |
| Normal (2) | Admin (0) | ✅ Yes            | ✅ Yes             | ✅ Yes              | ✅ Yes                 |
| Normal (2) | Moderator (1) | ✅ Yes        | ✅ Yes             | ✅ Yes              | ❌ No                  |
| Normal (2) | Client (2) | Assigned Only    | ❌ No              | ❌ No               | ❌ No                  |
| Normal (2) | Read-Only (3) | Assigned Only  | ❌ No              | ❌ No               | ❌ No                  |
| Normal (2) | None     | ❌ No             | ❌ No              | ❌ No               | ❌ No                  |

## Best Practices

1. **Always Check Permissions**: Never assume access based on previous checks
2. **Use Permission Functions**: Centralized functions ensure consistency
3. **Handle Null Cases**: Org roles can be null if user is not a member
4. **Check Site Role First**: Site-level permissions bypass org checks
5. **Resource Assignment**: Always check junction tables for clients/read-only users
6. **Moderator Restrictions**: Remember moderators can only modify own resources
7. **Error Messages**: Provide clear error messages for permission denials
