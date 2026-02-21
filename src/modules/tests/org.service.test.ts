import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import { db } from "@/drizzle/db";
import {
  notification,
  OrgRole,
  org,
  orgUser,
  user,
  userProfile,
} from "@/drizzle/schema";
import { ForbiddenError } from "@/plugins/error";
import {
  acceptOwnershipTransfer,
  createOrg,
  declineOwnershipTransfer,
  getOrgOwner,
  getOrgUsers,
  getUserOrgs,
  initiateOwnershipTransfer,
  isOrgOwner,
} from "../org/service";
import {
  createTestOrg,
  createTestOrgUser,
  createTestUser,
  createTestUserProfile,
} from "./utils/fixtures";

describe("Org Service", () => {
  let testUser: typeof user.$inferSelect;
  let testUser2: typeof user.$inferSelect;
  let testOrg: typeof org.$inferSelect;

  beforeAll(async () => {
    testUser = await createTestUser();
    testUser2 = await createTestUser();
    await createTestUserProfile(testUser.id);
    await createTestUserProfile(testUser2.id);
  });

  afterAll(async () => {
    if (testOrg) {
      await db.delete(orgUser).where(eq(orgUser.orgId, testOrg.id));
      await db.delete(org).where(eq(org.id, testOrg.id));
    }
    await db.delete(userProfile).where(eq(userProfile.userId, testUser.id));
    await db.delete(userProfile).where(eq(userProfile.userId, testUser2.id));
    await db.delete(user).where(eq(user.id, testUser.id));
    await db.delete(user).where(eq(user.id, testUser2.id));
  });

  describe("createOrg", () => {
    it("should create org and add user as admin", async () => {
      const orgName = "Test Organization";
      const created = await createOrg(testUser.id, orgName);

      testOrg = created;

      expect(created.name).toBe(orgName);
      expect(created.id).toBeDefined();

      // Verify user is added as admin
      const [orgUserRecord] = await db
        .select()
        .from(orgUser)
        .where(eq(orgUser.orgId, created.id))
        .limit(1);

      expect(orgUserRecord).toBeDefined();
      expect(orgUserRecord.userId).toBe(testUser.id);
      expect(orgUserRecord.role).toBe(OrgRole.ADMIN); // Admin role (0)

      // Verify owner is set
      const [orgRecord] = await db
        .select()
        .from(org)
        .where(eq(org.id, created.id))
        .limit(1);
      expect(orgRecord.ownerId).toBe(testUser.id);
    });
  });

  describe("getUserOrgs", () => {
    it("should return user's organizations", async () => {
      const org2 = await createTestOrg();
      await createTestOrgUser(testUser.id, org2.id, OrgRole.ADMIN);

      const orgs = await getUserOrgs(testUser.id);
      expect(orgs.length).toBeGreaterThan(0);
      expect(orgs.some((o) => o.id === testOrg.id)).toBe(true);
      expect(orgs.some((o) => o.id === org2.id)).toBe(true);

      // Cleanup
      await db.delete(orgUser).where(eq(orgUser.orgId, org2.id));
      await db.delete(org).where(eq(org.id, org2.id));
    });

    it("should return empty array for user with no orgs", async () => {
      const orgs = await getUserOrgs(testUser2.id);
      expect(orgs).toEqual([]);
    });
  });

  describe("getOrgUsers", () => {
    it("should return org users for admin", async () => {
      await createTestOrgUser(testUser2.id, testOrg.id, OrgRole.CLIENT);

      const userIds = await getOrgUsers(testOrg.id, testUser.id);
      expect(userIds.length).toBeGreaterThan(0);
      expect(userIds).toContain(testUser.id);
      expect(userIds).toContain(testUser2.id);
    });

    it("should throw ForbiddenError for non-admin", async () => {
      await expect(getOrgUsers(testOrg.id, testUser2.id)).rejects.toThrow(
        ForbiddenError,
      );
    });

    it("should throw ForbiddenError for non-member", async () => {
      const otherUser = await createTestUser();
      await createTestUserProfile(otherUser.id);

      await expect(getOrgUsers(testOrg.id, otherUser.id)).rejects.toThrow(
        ForbiddenError,
      );

      // Cleanup
      await db.delete(userProfile).where(eq(userProfile.userId, otherUser.id));
      await db.delete(user).where(eq(user.id, otherUser.id));
    });
  });

  describe("getOrgOwner", () => {
    it("should return owner for org with owner", async () => {
      const owner = await getOrgOwner(testOrg.id);
      expect(owner).toBeDefined();
      expect(owner?.id).toBe(testOrg.ownerId);
    });

    it("should return null for org without owner", async () => {
      const orgWithoutOwner = await createTestOrg({ ownerId: null });
      const owner = await getOrgOwner(orgWithoutOwner.id);
      expect(owner).toBeNull();

      // Cleanup
      await db.delete(org).where(eq(org.id, orgWithoutOwner.id));
    });
  });

  describe("isOrgOwner", () => {
    it("should return true for org owner", async () => {
      const isOwner = await isOrgOwner(testUser.id, testOrg.id);
      expect(isOwner).toBe(true);
    });

    it("should return false for non-owner", async () => {
      const isOwner = await isOrgOwner(testUser2.id, testOrg.id);
      expect(isOwner).toBe(false);
    });
  });

  describe("initiateOwnershipTransfer", () => {
    it("should create notification and set pending owner", async () => {
      const newOwner = await createTestUser();
      await createTestUserProfile(newOwner.id);
      await createTestOrgUser(newOwner.id, testOrg.id, OrgRole.CLIENT);

      await initiateOwnershipTransfer(testOrg.id, testUser.id, newOwner.id);

      // Verify pending owner is set
      const [orgRecord] = await db
        .select()
        .from(org)
        .where(eq(org.id, testOrg.id))
        .limit(1);
      expect(orgRecord.pendingOwnerId).toBe(newOwner.id);

      // Verify notification was created
      const notifications = await db
        .select()
        .from(notification)
        .where(
          and(
            eq(notification.userId, newOwner.id),
            eq(notification.type, "ownership_transfer"),
          ),
        );
      expect(notifications.length).toBeGreaterThan(0);

      // Cleanup
      await db.delete(notification).where(eq(notification.userId, newOwner.id));
      await db.delete(orgUser).where(eq(orgUser.orgId, testOrg.id));
      await db.delete(userProfile).where(eq(userProfile.userId, newOwner.id));
      await db.delete(user).where(eq(user.id, newOwner.id));
      // Reset pending owner
      await db
        .update(org)
        .set({ pendingOwnerId: null })
        .where(eq(org.id, testOrg.id));
    });

    it("should throw ForbiddenError for non-owner", async () => {
      const newOwner = await createTestUser();
      await createTestUserProfile(newOwner.id);
      await createTestOrgUser(newOwner.id, testOrg.id, OrgRole.CLIENT);

      await expect(
        initiateOwnershipTransfer(testOrg.id, testUser2.id, newOwner.id),
      ).rejects.toThrow(ForbiddenError);

      // Cleanup
      await db
        .delete(orgUser)
        .where(
          and(eq(orgUser.orgId, testOrg.id), eq(orgUser.userId, newOwner.id)),
        );
      await db.delete(userProfile).where(eq(userProfile.userId, newOwner.id));
      await db.delete(user).where(eq(user.id, newOwner.id));
    });

    it("should throw ForbiddenError if new owner is not org member", async () => {
      const newOwner = await createTestUser();
      await createTestUserProfile(newOwner.id);

      await expect(
        initiateOwnershipTransfer(testOrg.id, testUser.id, newOwner.id),
      ).rejects.toThrow(ForbiddenError);

      // Cleanup
      await db.delete(userProfile).where(eq(userProfile.userId, newOwner.id));
      await db.delete(user).where(eq(user.id, newOwner.id));
    });
  });

  describe("acceptOwnershipTransfer", () => {
    it("should transfer ownership and mark notification as read", async () => {
      const newOwner = await createTestUser();
      await createTestUserProfile(newOwner.id);
      await createTestOrgUser(newOwner.id, testOrg.id, OrgRole.CLIENT);

      // Ensure old owner (testUser) has orgUser record for test isolation
      const existingOldOwner = await db
        .select()
        .from(orgUser)
        .where(
          and(eq(orgUser.orgId, testOrg.id), eq(orgUser.userId, testUser.id)),
        )
        .limit(1);
      if (existingOldOwner.length === 0) {
        await createTestOrgUser(testUser.id, testOrg.id, OrgRole.ADMIN);
      }

      // Initiate transfer
      await initiateOwnershipTransfer(testOrg.id, testUser.id, newOwner.id);

      // Accept transfer
      await acceptOwnershipTransfer(testOrg.id, newOwner.id);

      // Verify ownership transferred
      const [orgRecord] = await db
        .select()
        .from(org)
        .where(eq(org.id, testOrg.id))
        .limit(1);
      expect(orgRecord.ownerId).toBe(newOwner.id);
      expect(orgRecord.pendingOwnerId).toBeNull();

      // Verify new owner has admin role
      const [orgUserRecord] = await db
        .select()
        .from(orgUser)
        .where(
          and(eq(orgUser.orgId, testOrg.id), eq(orgUser.userId, newOwner.id)),
        )
        .limit(1);
      expect(orgUserRecord.role).toBe(OrgRole.ADMIN);

      // Verify old owner still has admin role
      const [oldOwnerRecord] = await db
        .select()
        .from(orgUser)
        .where(
          and(eq(orgUser.orgId, testOrg.id), eq(orgUser.userId, testUser.id)),
        )
        .limit(1);
      expect(oldOwnerRecord).toBeDefined();
      expect(oldOwnerRecord?.role).toBe(OrgRole.ADMIN);

      // Verify notification is marked as read
      const notifications = await db
        .select()
        .from(notification)
        .where(
          and(
            eq(notification.userId, newOwner.id),
            eq(notification.type, "ownership_transfer"),
          ),
        );
      const ownershipNotification = notifications.find((n) => {
        if (n.metadata) {
          try {
            const metadata = JSON.parse(n.metadata);
            return metadata.orgId === testOrg.id;
          } catch {
            return false;
          }
        }
        return false;
      });
      expect(ownershipNotification?.read).toBe(true);

      // Reset ownership for cleanup
      await db
        .update(org)
        .set({ ownerId: testUser.id })
        .where(eq(org.id, testOrg.id));

      // Cleanup
      await db.delete(notification).where(eq(notification.userId, newOwner.id));
      await db
        .delete(orgUser)
        .where(
          and(eq(orgUser.orgId, testOrg.id), eq(orgUser.userId, newOwner.id)),
        );
      await db.delete(userProfile).where(eq(userProfile.userId, newOwner.id));
      await db.delete(user).where(eq(user.id, newOwner.id));
    });

    it("should throw ForbiddenError if user is not pending owner", async () => {
      await expect(
        acceptOwnershipTransfer(testOrg.id, testUser2.id),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("declineOwnershipTransfer", () => {
    it("should clear pending owner and delete notification", async () => {
      // Ensure testUser is the owner
      await db
        .update(org)
        .set({ ownerId: testUser.id, pendingOwnerId: null })
        .where(eq(org.id, testOrg.id));

      const newOwner = await createTestUser();
      await createTestUserProfile(newOwner.id);
      await createTestOrgUser(newOwner.id, testOrg.id, OrgRole.CLIENT);

      // Initiate transfer
      await initiateOwnershipTransfer(testOrg.id, testUser.id, newOwner.id);

      // Get notification ID before decline
      const notificationsBefore = await db
        .select()
        .from(notification)
        .where(
          and(
            eq(notification.userId, newOwner.id),
            eq(notification.type, "ownership_transfer"),
          ),
        );
      const notificationId = notificationsBefore[0]?.id;

      // Decline transfer
      await declineOwnershipTransfer(testOrg.id, newOwner.id);

      // Verify pending owner is cleared
      const [orgRecord] = await db
        .select()
        .from(org)
        .where(eq(org.id, testOrg.id))
        .limit(1);
      expect(orgRecord.pendingOwnerId).toBeNull();

      // Verify notification is deleted
      if (notificationId) {
        const [deletedNotification] = await db
          .select()
          .from(notification)
          .where(eq(notification.id, notificationId))
          .limit(1);
        expect(deletedNotification).toBeUndefined();
      }

      // Cleanup
      await db
        .delete(orgUser)
        .where(
          and(eq(orgUser.orgId, testOrg.id), eq(orgUser.userId, newOwner.id)),
        );
      await db.delete(userProfile).where(eq(userProfile.userId, newOwner.id));
      await db.delete(user).where(eq(user.id, newOwner.id));
    });

    it("should throw ForbiddenError if user is not pending owner", async () => {
      await expect(
        declineOwnershipTransfer(testOrg.id, testUser2.id),
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
