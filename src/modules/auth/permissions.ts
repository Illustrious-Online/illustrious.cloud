import { db } from "@/drizzle/db";
import { orgUser, userProfile, SiteRole, OrgRole } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Get user's site-wide role
 * @param userId - User ID
 * @returns Site role (0=Admin, 1=Moderator, 2=Normal User) or 2 if no profile exists
 */
export async function getUserSiteRole(userId: string): Promise<number> {
  const [profile] = await db
    .select({ siteRole: userProfile.siteRole })
    .from(userProfile)
    .where(eq(userProfile.userId, userId))
    .limit(1);

  return profile?.siteRole ?? SiteRole.NORMAL_USER;
}

/**
 * Get user's role in a specific organization
 * @param userId - User ID
 * @param orgId - Organization ID
 * @returns Org role (0=Admin, 1=Moderator, 2=Client, 3=Read-only) or null if not a member
 */
export async function getUserOrgRole(
  userId: string,
  orgId: string,
): Promise<number | null> {
  const [orgUserRecord] = await db
    .select({ role: orgUser.role })
    .from(orgUser)
    .where(and(eq(orgUser.userId, userId), eq(orgUser.orgId, orgId)))
    .limit(1);

  return orgUserRecord?.role ?? null;
}

/**
 * Check if site role allows reading across all organizations
 * @param siteRole - Site role level
 * @returns True if site admin or moderator
 */
export function canReadAcrossOrgs(siteRole: number): boolean {
  return siteRole === SiteRole.ADMIN || siteRole === SiteRole.MODERATOR;
}

/**
 * Check if site role allows writing across all organizations
 * @param siteRole - Site role level
 * @returns True only if site admin
 */
export function canWriteAcrossOrgs(siteRole: number): boolean {
  return siteRole === SiteRole.ADMIN;
}

/**
 * Check if user can read org resources based on site and org roles
 * @param siteRole - Site role level
 * @param orgRole - Org role level or null if not a member
 * @returns True if user can read org resources
 */
export function canReadOrgResource(
  siteRole: number,
  orgRole: number | null,
): boolean {
  // Site admin/moderator can read everything
  if (canReadAcrossOrgs(siteRole)) {
    return true;
  }

  // Must be a member of the org
  if (orgRole === null) {
    return false;
  }

  // All org roles can read (admin, moderator, client, read-only)
  return true;
}

/**
 * Check if user can write org resources based on site and org roles
 * @param siteRole - Site role level
 * @param orgRole - Org role level or null if not a member
 * @returns True if user can write org resources
 */
export function canWriteOrgResource(
  siteRole: number,
  orgRole: number | null,
): boolean {
  // Site admin can write everything
  if (canWriteAcrossOrgs(siteRole)) {
    return true;
  }

  // Must be a member of the org
  if (orgRole === null) {
    return false;
  }

  // Only org admin and moderator can write (not client or read-only)
  return orgRole === OrgRole.ADMIN || orgRole === OrgRole.MODERATOR;
}

/**
 * Check if user can write a specific resource they created
 * Org moderators can only write items they created
 * @param siteRole - Site role level
 * @param orgRole - Org role level or null if not a member
 * @param createdBy - User ID who created the resource
 * @param userId - User ID requesting access
 * @returns True if user can write this specific resource
 */
export function canWriteResource(
  siteRole: number,
  orgRole: number | null,
  createdBy: string | null,
  userId: string,
): boolean {
  // Site admin can write everything
  if (canWriteAcrossOrgs(siteRole)) {
    return true;
  }

  // Org admin can write everything in the org
  if (orgRole === OrgRole.ADMIN) {
    return true;
  }

  // Org moderator can only write items they created
  if (orgRole === OrgRole.MODERATOR) {
    return createdBy === userId;
  }

  // Client and read-only cannot write
  return false;
}

/**
 * Check if user can access another user's details
 * @param viewerId - User ID requesting access
 * @param targetUserId - User ID whose details are being accessed
 * @param orgId - Optional organization ID context
 * @returns True if viewer can access target user's details
 */
export async function canAccessUserDetails(
  viewerId: string,
  targetUserId: string,
  orgId?: string,
): Promise<boolean> {
  // Users can always access their own details
  if (viewerId === targetUserId) {
    return true;
  }

  const viewerSiteRole = await getUserSiteRole(viewerId);

  // Site admin/moderator can access all user details
  if (canReadAcrossOrgs(viewerSiteRole)) {
    return true;
  }

  // If org context provided, check org-level permissions
  if (orgId) {
    const viewerOrgRole = await getUserOrgRole(viewerId, orgId);
    const targetOrgRole = await getUserOrgRole(targetUserId, orgId);

    // Both users must be members of the org
    if (viewerOrgRole === null || targetOrgRole === null) {
      return false;
    }

    // Org admin can see all members
    if (viewerOrgRole === OrgRole.ADMIN) {
      return true;
    }

    // Org moderator can see all members
    if (viewerOrgRole === OrgRole.MODERATOR) {
      return true;
    }

    // Clients and read-only users cannot see other users' details
    return false;
  }

  // Without org context, only site admin/moderator can access
  return false;
}

/**
 * Check if user can read a resource assigned to them via junction table
 * Used for clients and read-only users
 * @param userId - User ID
 * @param resourceId - Resource ID (invoice or report)
 * @param junctionTable - Junction table name ('userInvoice' or 'userReport')
 * @returns True if resource is assigned to user
 */
export async function isResourceAssignedToUser(
  userId: string,
  resourceId: string,
  junctionTable: "userInvoice" | "userReport",
): Promise<boolean> {
  if (junctionTable === "userInvoice") {
    const { userInvoice } = await import("@/drizzle/schema");
    const [assignment] = await db
      .select()
      .from(userInvoice)
      .where(
        and(
          eq(userInvoice.userId, userId),
          eq(userInvoice.invoiceId, resourceId),
        ),
      )
      .limit(1);
    return !!assignment;
  }
  const { userReport } = await import("@/drizzle/schema");
  const [assignment] = await db
    .select()
    .from(userReport)
    .where(
      and(
        eq(userReport.userId, userId),
        eq(userReport.reportId, resourceId),
      ),
    )
    .limit(1);
  return !!assignment;
}
