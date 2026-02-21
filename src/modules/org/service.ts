import { and, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/drizzle/db";
import type { Org } from "@/drizzle/schema";
import { notification, OrgRole, org, orgUser, user } from "@/drizzle/schema";
import { ForbiddenError, NotFoundError } from "@/plugins/error";
import {
  canReadAcrossOrgs,
  getUserOrgRole,
  getUserSiteRole,
} from "../auth/permissions";
import {
  createOwnershipTransferNotification,
  deleteNotification,
  markNotificationRead,
} from "../notification/service";

/**
 * Creates a new organization and adds the user as admin
 * @param userId - User ID of the creator
 * @param name - Organization name
 * @returns Promise resolving to the created organization
 */
export async function createOrg(userId: string, name: string): Promise<Org> {
  const orgId = uuidv4();

  // Create org with owner set to creator
  const [newOrg] = await db
    .insert(org)
    .values({
      id: orgId,
      name,
      contact: "", // Default empty contact
      ownerId: userId,
    })
    .returning();

  // Add user as org admin (role: 0)
  await db.insert(orgUser).values({
    userId,
    orgId,
    role: OrgRole.ADMIN,
  });

  return newOrg;
}

/**
 * Gets all organizations a user belongs to
 * @param userId - User ID
 * @returns Promise resolving to array of organizations
 */
export async function getUserOrgs(userId: string): Promise<Org[]> {
  const results = await db
    .select({ org })
    .from(org)
    .innerJoin(orgUser, eq(org.id, orgUser.orgId))
    .where(eq(orgUser.userId, userId));

  return results.map((r) => r.org);
}

/**
 * Gets users in an organization
 * Requires org admin role or site admin/moderator
 * @param orgId - Organization ID
 * @param userId - User ID requesting
 * @returns Promise resolving to array of user IDs in the org
 */
export async function getOrgUsers(
  orgId: string,
  userId: string,
): Promise<string[]> {
  const siteRole = await getUserSiteRole(userId);
  const orgRole = await getUserOrgRole(userId, orgId);

  // Site admin/moderator can read all orgs
  if (canReadAcrossOrgs(siteRole)) {
    // Get all users in the org
    const orgUsers = await db
      .select({ userId: orgUser.userId })
      .from(orgUser)
      .where(eq(orgUser.orgId, orgId));

    return orgUsers.map((u) => u.userId);
  }

  // Must be org admin
  if (orgRole !== OrgRole.ADMIN) {
    throw new ForbiddenError("User is not an admin of this organization");
  }

  // Get all users in the org
  const orgUsers = await db
    .select({ userId: orgUser.userId })
    .from(orgUser)
    .where(eq(orgUser.orgId, orgId));

  return orgUsers.map((u) => u.userId);
}

/**
 * Gets the current owner of an organization
 * @param orgId - Organization ID
 * @returns Promise resolving to the owner user or null
 */
export async function getOrgOwner(orgId: string) {
  const [foundOrg] = await db
    .select()
    .from(org)
    .where(eq(org.id, orgId))
    .limit(1);

  if (!foundOrg || !foundOrg.ownerId) {
    return null;
  }

  const [owner] = await db
    .select()
    .from(user)
    .where(eq(user.id, foundOrg.ownerId))
    .limit(1);

  return owner || null;
}

/**
 * Checks if a user is the owner of an organization
 * @param userId - User ID
 * @param orgId - Organization ID
 * @returns Promise resolving to true if user is owner
 */
export async function isOrgOwner(
  userId: string,
  orgId: string,
): Promise<boolean> {
  const [foundOrg] = await db
    .select()
    .from(org)
    .where(eq(org.id, orgId))
    .limit(1);

  return foundOrg?.ownerId === userId;
}

/**
 * Initiates an ownership transfer to a new owner
 * @param orgId - Organization ID
 * @param currentOwnerId - Current owner user ID
 * @param newOwnerId - New owner user ID
 * @returns Promise resolving when transfer is initiated
 */
export async function initiateOwnershipTransfer(
  orgId: string,
  currentOwnerId: string,
  newOwnerId: string,
): Promise<void> {
  // Validate current user is owner
  const isOwner = await isOrgOwner(currentOwnerId, orgId);
  if (!isOwner) {
    throw new ForbiddenError(
      "Only the organization owner can transfer ownership",
    );
  }

  // Validate org exists
  const [foundOrg] = await db
    .select()
    .from(org)
    .where(eq(org.id, orgId))
    .limit(1);

  if (!foundOrg) {
    throw new NotFoundError("Organization not found");
  }

  // Validate new owner is org member
  const [orgMembership] = await db
    .select()
    .from(orgUser)
    .where(and(eq(orgUser.orgId, orgId), eq(orgUser.userId, newOwnerId)))
    .limit(1);

  if (!orgMembership) {
    throw new ForbiddenError("New owner must be a member of the organization");
  }

  // Get current owner name
  const [currentOwner] = await db
    .select()
    .from(user)
    .where(eq(user.id, currentOwnerId))
    .limit(1);

  // Set pending owner
  await db
    .update(org)
    .set({ pendingOwnerId: newOwnerId })
    .where(eq(org.id, orgId));

  // Create notification for new owner
  await createOwnershipTransferNotification(
    orgId,
    newOwnerId,
    currentOwner?.name || "Organization Owner",
    foundOrg.name,
  );
}

/**
 * Accepts an ownership transfer
 * @param orgId - Organization ID
 * @param newOwnerId - New owner user ID
 * @returns Promise resolving when transfer is completed
 */
export async function acceptOwnershipTransfer(
  orgId: string,
  newOwnerId: string,
): Promise<void> {
  // Validate org exists and user is pending owner
  const [foundOrg] = await db
    .select()
    .from(org)
    .where(eq(org.id, orgId))
    .limit(1);

  if (!foundOrg) {
    throw new NotFoundError("Organization not found");
  }

  if (foundOrg.pendingOwnerId !== newOwnerId) {
    throw new ForbiddenError(
      "You are not the pending owner of this organization",
    );
  }

  // Update ownership
  await db
    .update(org)
    .set({
      ownerId: newOwnerId,
      pendingOwnerId: null,
    })
    .where(eq(org.id, orgId));

  // Ensure new owner has admin role
  const [orgMembership] = await db
    .select()
    .from(orgUser)
    .where(and(eq(orgUser.orgId, orgId), eq(orgUser.userId, newOwnerId)))
    .limit(1);

  if (orgMembership && orgMembership.role !== OrgRole.ADMIN) {
    await db
      .update(orgUser)
      .set({ role: OrgRole.ADMIN })
      .where(and(eq(orgUser.orgId, orgId), eq(orgUser.userId, newOwnerId)));
  }

  // Find and mark notification as read
  const notifications = await db
    .select()
    .from(notification)
    .where(
      and(
        eq(notification.userId, newOwnerId),
        eq(notification.type, "ownership_transfer"),
      ),
    );

  // Find the notification for this org
  for (const notif of notifications) {
    if (notif.metadata) {
      try {
        const metadata = JSON.parse(notif.metadata);
        if (metadata.orgId === orgId) {
          await markNotificationRead(notif.id, newOwnerId);
          break;
        }
      } catch {
        // Invalid JSON, skip
      }
    }
  }
}

/**
 * Declines an ownership transfer
 * @param orgId - Organization ID
 * @param newOwnerId - New owner user ID
 * @returns Promise resolving when transfer is declined
 */
export async function declineOwnershipTransfer(
  orgId: string,
  newOwnerId: string,
): Promise<void> {
  // Validate org exists and user is pending owner
  const [foundOrg] = await db
    .select()
    .from(org)
    .where(eq(org.id, orgId))
    .limit(1);

  if (!foundOrg) {
    throw new NotFoundError("Organization not found");
  }

  if (foundOrg.pendingOwnerId !== newOwnerId) {
    throw new ForbiddenError(
      "You are not the pending owner of this organization",
    );
  }

  // Clear pending owner
  await db.update(org).set({ pendingOwnerId: null }).where(eq(org.id, orgId));

  // Find and delete notification
  const notifications = await db
    .select()
    .from(notification)
    .where(
      and(
        eq(notification.userId, newOwnerId),
        eq(notification.type, "ownership_transfer"),
      ),
    );

  // Find the notification for this org
  for (const notif of notifications) {
    if (notif.metadata) {
      try {
        const metadata = JSON.parse(notif.metadata);
        if (metadata.orgId === orgId) {
          await deleteNotification(notif.id, newOwnerId);
          break;
        }
      } catch {
        // Invalid JSON, skip
      }
    }
  }
}
