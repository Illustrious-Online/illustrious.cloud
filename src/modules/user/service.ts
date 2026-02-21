import { db } from "@/drizzle/db";
import {
  OrgRole,
  SiteRole,
  orgUser,
  user,
  userProfile,
} from "@/drizzle/schema";
import type { InsertUserProfile, User, UserProfile } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { getUserOrgRole, getUserSiteRole } from "../auth/permissions";

/**
 * Combined user with profile data
 */
export interface UserWithProfile {
  user: User;
  profile: UserProfile | null;
}

/**
 * Gets a user by ID
 * @param id - User ID
 * @returns Promise resolving to the user or undefined
 */
export async function getUserById(id: string): Promise<User | undefined> {
  const [foundUser] = await db
    .select()
    .from(user)
    .where(eq(user.id, id))
    .limit(1);
  return foundUser;
}

/**
 * Gets a user with their profile by ID
 * @param id - User ID
 * @returns Promise resolving to user with profile or undefined
 */
export async function getUserWithProfile(
  id: string,
): Promise<UserWithProfile | undefined> {
  const result = await db
    .select()
    .from(user)
    .leftJoin(userProfile, eq(user.id, userProfile.userId))
    .where(eq(user.id, id))
    .limit(1);

  if (result.length === 0) {
    return undefined;
  }

  return {
    user: result[0].user,
    profile: result[0].user_profile,
  };
}

/**
 * Gets a user profile by user ID
 * @param userId - User ID
 * @returns Promise resolving to the user profile or undefined
 */
export async function getProfileByUserId(
  userId: string,
): Promise<UserProfile | undefined> {
  const [foundProfile] = await db
    .select()
    .from(userProfile)
    .where(eq(userProfile.userId, userId))
    .limit(1);
  return foundProfile;
}

/**
 * Creates or updates a user profile
 * @param userId - User ID
 * @param data - Profile data to upsert
 * @returns Promise resolving to the upserted profile
 */
export async function upsertProfile(
  userId: string,
  data: Partial<Omit<InsertUserProfile, "userId">>,
): Promise<UserProfile> {
  // Check if profile exists
  const existingProfile = await getProfileByUserId(userId);

  if (existingProfile) {
    // Update existing profile
    const [updatedProfile] = await db
      .update(userProfile)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(userProfile.userId, userId))
      .returning();
    return updatedProfile;
  }

  // Create new profile
  const [newProfile] = await db
    .insert(userProfile)
    .values({
      userId,
      ...data,
    })
    .returning();
  return newProfile;
}

/**
 * Updates a user profile
 * @param userId - User ID
 * @param data - Partial profile data to update
 * @returns Promise resolving to the updated profile
 */
export async function updateProfile(
  userId: string,
  data: Partial<Omit<InsertUserProfile, "userId">>,
): Promise<UserProfile> {
  return upsertProfile(userId, data);
}

/**
 * User with roles information
 */
export interface UserWithRoles {
  user: User;
  profile: UserProfile | null;
  siteRole: number;
  orgRoles: Array<{ orgId: string; role: number }>;
}

/**
 * Gets a user with their site role and org roles
 * @param id - User ID
 * @returns Promise resolving to user with roles or undefined
 */
export async function getUserWithRoles(
  id: string,
): Promise<UserWithRoles | undefined> {
  const userData = await getUserWithProfile(id);
  if (!userData) {
    return undefined;
  }

  const siteRole = await getUserSiteRole(id);

  // Get all org memberships
  const orgMemberships = await db
    .select({ orgId: orgUser.orgId, role: orgUser.role })
    .from(orgUser)
    .where(eq(orgUser.userId, id));

  return {
    ...userData,
    siteRole,
    orgRoles: orgMemberships,
  };
}

/**
 * Links a temporary user account to an authenticated user
 * Finds existing temporary user by email and transfers all relationships
 * @param email - Email of the temporary user
 * @param userId - User ID of the authenticated user
 * @returns Promise resolving to the number of relationships transferred
 */
export async function linkTemporaryUser(
  email: string,
  userId: string,
): Promise<number> {
  // Find temporary user by email (emailVerified=false, no account/password)
  const [tempUser] = await db
    .select()
    .from(user)
    .where(and(eq(user.email, email), eq(user.emailVerified, false)))
    .limit(1);

  if (!tempUser) {
    return 0;
  }

  const tempUserId = tempUser.id;
  let transferredCount = 0;

  // Transfer orgUser relationships
  const orgUsers = await db
    .select()
    .from(orgUser)
    .where(eq(orgUser.userId, tempUserId));

  for (const orgUserRecord of orgUsers) {
    // Check if user already has membership in this org
    const [existing] = await db
      .select()
      .from(orgUser)
      .where(
        and(eq(orgUser.userId, userId), eq(orgUser.orgId, orgUserRecord.orgId)),
      )
      .limit(1);

    if (!existing) {
      // Transfer the membership
      await db
        .update(orgUser)
        .set({ userId })
        .where(
          and(
            eq(orgUser.userId, tempUserId),
            eq(orgUser.orgId, orgUserRecord.orgId),
          ),
        );
      transferredCount++;
    } else {
      // Delete duplicate membership
      await db
        .delete(orgUser)
        .where(
          and(
            eq(orgUser.userId, tempUserId),
            eq(orgUser.orgId, orgUserRecord.orgId),
          ),
        );
    }
  }

  // Transfer userInvoice relationships
  const { userInvoice } = await import("@/drizzle/schema");
  const userInvoices = await db
    .select()
    .from(userInvoice)
    .where(eq(userInvoice.userId, tempUserId));

  for (const userInv of userInvoices) {
    // Check if relationship already exists
    const [existing] = await db
      .select()
      .from(userInvoice)
      .where(
        and(
          eq(userInvoice.userId, userId),
          eq(userInvoice.invoiceId, userInv.invoiceId),
        ),
      )
      .limit(1);

    if (!existing) {
      await db
        .update(userInvoice)
        .set({ userId })
        .where(
          and(
            eq(userInvoice.userId, tempUserId),
            eq(userInvoice.invoiceId, userInv.invoiceId),
          ),
        );
      transferredCount++;
    } else {
      await db
        .delete(userInvoice)
        .where(
          and(
            eq(userInvoice.userId, tempUserId),
            eq(userInvoice.invoiceId, userInv.invoiceId),
          ),
        );
    }
  }

  // Transfer userReport relationships
  const { userReport } = await import("@/drizzle/schema");
  const userReports = await db
    .select()
    .from(userReport)
    .where(eq(userReport.userId, tempUserId));

  for (const userRep of userReports) {
    // Check if relationship already exists
    const [existing] = await db
      .select()
      .from(userReport)
      .where(
        and(
          eq(userReport.userId, userId),
          eq(userReport.reportId, userRep.reportId),
        ),
      )
      .limit(1);

    if (!existing) {
      await db
        .update(userReport)
        .set({ userId })
        .where(
          and(
            eq(userReport.userId, tempUserId),
            eq(userReport.reportId, userRep.reportId),
          ),
        );
      transferredCount++;
    } else {
      await db
        .delete(userReport)
        .where(
          and(
            eq(userReport.userId, tempUserId),
            eq(userReport.reportId, userRep.reportId),
          ),
        );
    }
  }

  // Delete temporary user profile if exists
  await db.delete(userProfile).where(eq(userProfile.userId, tempUserId));

  // Delete temporary user
  await db.delete(user).where(eq(user.id, tempUserId));

  return transferredCount;
}

/**
 * Accepts an organization invitation
 * Updates orgUser.role from READ_ONLY (3) to specified role (default CLIENT/2)
 * @param userId - User ID
 * @param orgId - Organization ID
 * @param newRole - New role to assign (defaults to CLIENT/2)
 * @returns Promise resolving to the updated orgUser record
 */
export async function acceptOrgInvitation(
  userId: string,
  orgId: string,
  newRole: number = OrgRole.CLIENT,
): Promise<typeof orgUser.$inferSelect> {
  // Validate new role
  if (
    newRole !== OrgRole.ADMIN &&
    newRole !== OrgRole.MODERATOR &&
    newRole !== OrgRole.CLIENT
  ) {
    throw new Error("Invalid role for invitation acceptance");
  }

  // Check if user has read-only role in this org
  const [orgUserRecord] = await db
    .select()
    .from(orgUser)
    .where(and(eq(orgUser.userId, userId), eq(orgUser.orgId, orgId)))
    .limit(1);

  if (!orgUserRecord) {
    throw new Error("User is not a member of this organization");
  }

  if (orgUserRecord.role !== OrgRole.READ_ONLY) {
    throw new Error(
      "User does not have a pending invitation for this organization",
    );
  }

  // Update role
  const [updated] = await db
    .update(orgUser)
    .set({ role: newRole })
    .where(and(eq(orgUser.userId, userId), eq(orgUser.orgId, orgId)))
    .returning();

  return updated;
}
