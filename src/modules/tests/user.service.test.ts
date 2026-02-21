import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import { db } from "@/drizzle/db";
import {
  invoice,
  OrgRole,
  org,
  orgUser,
  report,
  SiteRole,
  user,
  userInvoice,
  userProfile,
  userReport,
} from "@/drizzle/schema";
import {
  acceptOrgInvitation,
  getProfileByUserId,
  getUserById,
  getUserWithProfile,
  getUserWithRoles,
  linkTemporaryUser,
  updateProfile,
} from "../user/service";
import {
  createTestInvoice,
  createTestOrg,
  createTestOrgUser,
  createTestReport,
  createTestUser,
  createTestUserInvoice,
  createTestUserProfile,
  createTestUserReport,
} from "./utils/fixtures";

describe("User Service", () => {
  let testUser: typeof user.$inferSelect;
  let testUser2: typeof user.$inferSelect;
  let testProfile: typeof userProfile.$inferSelect;

  beforeAll(async () => {
    testUser = await createTestUser();
    testUser2 = await createTestUser();
    testProfile = await createTestUserProfile(testUser.id);
  });

  afterAll(async () => {
    if (testProfile) {
      await db.delete(userProfile).where(eq(userProfile.userId, testUser.id));
    }
    await db.delete(user).where(eq(user.id, testUser.id));
    await db.delete(user).where(eq(user.id, testUser2.id));
  });

  describe("getUserById", () => {
    it("should return user by ID", async () => {
      const found = await getUserById(testUser.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(testUser.id);
      expect(found?.email).toBe(testUser.email);
    });

    it("should return undefined for non-existent user", async () => {
      const found = await getUserById("non-existent-id");
      expect(found).toBeUndefined();
    });
  });

  describe("getUserWithProfile", () => {
    it("should return user with profile", async () => {
      const found = await getUserWithProfile(testUser.id);
      expect(found).toBeDefined();
      expect(found?.user.id).toBe(testUser.id);
      expect(found?.profile).toBeDefined();
      expect(found?.profile?.firstName).toBe(testProfile.firstName);
    });

    it("should return user without profile", async () => {
      const found = await getUserWithProfile(testUser2.id);
      expect(found).toBeDefined();
      expect(found?.user.id).toBe(testUser2.id);
      expect(found?.profile).toBeNull();
    });

    it("should return undefined for non-existent user", async () => {
      const found = await getUserWithProfile("non-existent-id");
      expect(found).toBeUndefined();
    });
  });

  describe("getProfileByUserId", () => {
    it("should return profile by user ID", async () => {
      const found = await getProfileByUserId(testUser.id);
      expect(found).toBeDefined();
      expect(found?.userId).toBe(testUser.id);
      expect(found?.firstName).toBe(testProfile.firstName);
    });

    it("should return undefined when profile doesn't exist", async () => {
      const found = await getProfileByUserId(testUser2.id);
      expect(found).toBeUndefined();
    });
  });

  describe("updateProfile", () => {
    it("should update existing profile", async () => {
      const updateData = {
        firstName: "Updated",
        lastName: "Name",
        phone: "999-999-9999",
      };

      const updated = await updateProfile(testUser.id, updateData);
      expect(updated.firstName).toBe(updateData.firstName);
      expect(updated.lastName).toBe(updateData.lastName);
      expect(updated.phone).toBe(updateData.phone);
    });

    it("should create profile if it doesn't exist", async () => {
      const updateData = {
        firstName: "New",
        lastName: "Profile",
      };

      const created = await updateProfile(testUser2.id, updateData);
      expect(created.userId).toBe(testUser2.id);
      expect(created.firstName).toBe(updateData.firstName);
      expect(created.lastName).toBe(updateData.lastName);

      // Cleanup
      await db.delete(userProfile).where(eq(userProfile.userId, testUser2.id));
    });

    it("should partially update profile", async () => {
      const updateData = {
        firstName: "Partially",
      };

      const updated = await updateProfile(testUser.id, updateData);
      expect(updated.firstName).toBe(updateData.firstName);
      // Other fields should remain
      expect(updated.lastName).toBeDefined();
    });
  });

  describe("getUserWithRoles", () => {
    let testOrg: typeof org.$inferSelect;
    let testOrg2: typeof org.$inferSelect;

    beforeAll(async () => {
      testOrg = await createTestOrg();
      testOrg2 = await createTestOrg();
      await createTestOrgUser(testUser.id, testOrg.id, OrgRole.ADMIN);
      await createTestOrgUser(testUser.id, testOrg2.id, OrgRole.CLIENT);
    });

    afterAll(async () => {
      if (testOrg) {
        await db.delete(orgUser).where(eq(orgUser.orgId, testOrg.id));
        await db.delete(org).where(eq(org.id, testOrg.id));
      }
      if (testOrg2) {
        await db.delete(orgUser).where(eq(orgUser.orgId, testOrg2.id));
        await db.delete(org).where(eq(org.id, testOrg2.id));
      }
    });

    it("should return user with roles and org memberships", async () => {
      const userWithRoles = await getUserWithRoles(testUser.id);
      expect(userWithRoles).toBeDefined();
      expect(userWithRoles?.user.id).toBe(testUser.id);
      expect(userWithRoles?.siteRole).toBe(SiteRole.NORMAL_USER);
      expect(userWithRoles?.orgRoles).toBeDefined();
      expect(userWithRoles?.orgRoles.length).toBeGreaterThan(0);
      expect(
        userWithRoles?.orgRoles.some(
          (r) => r.orgId === testOrg.id && r.role === OrgRole.ADMIN,
        ),
      ).toBe(true);
      expect(
        userWithRoles?.orgRoles.some(
          (r) => r.orgId === testOrg2.id && r.role === OrgRole.CLIENT,
        ),
      ).toBe(true);
    });

    it("should return undefined for non-existent user", async () => {
      const userWithRoles = await getUserWithRoles("non-existent-id");
      expect(userWithRoles).toBeUndefined();
    });

    it("should return user with site role when no org memberships", async () => {
      const newUser = await createTestUser();
      await createTestUserProfile(newUser.id, { siteRole: SiteRole.MODERATOR });
      const userWithRoles = await getUserWithRoles(newUser.id);
      expect(userWithRoles).toBeDefined();
      expect(userWithRoles?.siteRole).toBe(SiteRole.MODERATOR);
      expect(userWithRoles?.orgRoles).toEqual([]);

      // Cleanup
      await db.delete(userProfile).where(eq(userProfile.userId, newUser.id));
      await db.delete(user).where(eq(user.id, newUser.id));
    });
  });

  describe("linkTemporaryUser", () => {
    it("should link temporary user and transfer all relationships", async () => {
      // Create temporary user (emailVerified=false)
      const tempUser = await createTestUser({ emailVerified: false });
      const authUser = await createTestUser();
      await createTestUserProfile(authUser.id);

      // Create org and resources
      const testOrg = await createTestOrg();
      const testInvoice = await createTestInvoice(testOrg.id, tempUser.id);
      const testReport = await createTestReport(testOrg.id, tempUser.id);

      // Add temporary user to org
      await createTestOrgUser(tempUser.id, testOrg.id, OrgRole.READ_ONLY);

      // Create user-invoice and user-report relationships
      await createTestUserInvoice(tempUser.id, testInvoice.id);
      await createTestUserReport(tempUser.id, testReport.id);

      const transferredCount = await linkTemporaryUser(
        tempUser.email,
        authUser.id,
      );
      expect(transferredCount).toBeGreaterThan(0);

      // Verify org membership transferred
      const [orgMembership] = await db
        .select()
        .from(orgUser)
        .where(
          and(eq(orgUser.userId, authUser.id), eq(orgUser.orgId, testOrg.id)),
        )
        .limit(1);
      expect(orgMembership).toBeDefined();
      expect(orgMembership.role).toBe(OrgRole.READ_ONLY);

      // Verify invoice relationship transferred
      const [invoiceRel] = await db
        .select()
        .from(userInvoice)
        .where(
          and(
            eq(userInvoice.userId, authUser.id),
            eq(userInvoice.invoiceId, testInvoice.id),
          ),
        )
        .limit(1);
      expect(invoiceRel).toBeDefined();

      // Verify report relationship transferred
      const [reportRel] = await db
        .select()
        .from(userReport)
        .where(
          and(
            eq(userReport.userId, authUser.id),
            eq(userReport.reportId, testReport.id),
          ),
        )
        .limit(1);
      expect(reportRel).toBeDefined();

      // Verify temporary user deleted
      const [deletedTemp] = await db
        .select()
        .from(user)
        .where(eq(user.id, tempUser.id))
        .limit(1);
      expect(deletedTemp).toBeUndefined();

      // Cleanup
      await db
        .delete(userInvoice)
        .where(eq(userInvoice.invoiceId, testInvoice.id));
      await db.delete(invoice).where(eq(invoice.id, testInvoice.id));
      await db.delete(userReport).where(eq(userReport.reportId, testReport.id));
      await db.delete(report).where(eq(report.id, testReport.id));
      await db.delete(orgUser).where(eq(orgUser.orgId, testOrg.id));
      await db.delete(org).where(eq(org.id, testOrg.id));
      await db.delete(userProfile).where(eq(userProfile.userId, authUser.id));
      await db.delete(user).where(eq(user.id, authUser.id));
    });

    it("should return 0 when temporary user not found", async () => {
      const authUser = await createTestUser();
      await createTestUserProfile(authUser.id);
      const transferredCount = await linkTemporaryUser(
        "nonexistent@example.com",
        authUser.id,
      );
      expect(transferredCount).toBe(0);

      // Cleanup
      await db.delete(userProfile).where(eq(userProfile.userId, authUser.id));
      await db.delete(user).where(eq(user.id, authUser.id));
    });

    it("should handle duplicate org membership gracefully", async () => {
      const tempUser = await createTestUser({ emailVerified: false });
      const authUser = await createTestUser();
      await createTestUserProfile(authUser.id);
      const testOrg = await createTestOrg();

      // Add auth user to same org first
      await createTestOrgUser(authUser.id, testOrg.id, OrgRole.CLIENT);
      await createTestOrgUser(tempUser.id, testOrg.id, OrgRole.READ_ONLY);

      const transferredCount = await linkTemporaryUser(
        tempUser.email,
        authUser.id,
      );
      expect(transferredCount).toBe(0); // No transfer because duplicate

      // Verify temp user's org membership was deleted
      const [tempOrgMembership] = await db
        .select()
        .from(orgUser)
        .where(
          and(eq(orgUser.userId, tempUser.id), eq(orgUser.orgId, testOrg.id)),
        )
        .limit(1);
      expect(tempOrgMembership).toBeUndefined();

      // Verify auth user still has their original membership
      const [authOrgMembership] = await db
        .select()
        .from(orgUser)
        .where(
          and(eq(orgUser.userId, authUser.id), eq(orgUser.orgId, testOrg.id)),
        )
        .limit(1);
      expect(authOrgMembership).toBeDefined();
      expect(authOrgMembership.role).toBe(OrgRole.CLIENT);

      // Cleanup
      await db.delete(orgUser).where(eq(orgUser.orgId, testOrg.id));
      await db.delete(org).where(eq(org.id, testOrg.id));
      await db.delete(userProfile).where(eq(userProfile.userId, authUser.id));
      await db.delete(user).where(eq(user.id, authUser.id));
    });

    it("should handle duplicate invoice relationship gracefully", async () => {
      const tempUser = await createTestUser({ emailVerified: false });
      const authUser = await createTestUser();
      await createTestUserProfile(authUser.id);
      const testOrg = await createTestOrg();
      const testInvoice = await createTestInvoice(testOrg.id, tempUser.id);

      // Add auth user to invoice first
      await createTestUserInvoice(authUser.id, testInvoice.id);
      await createTestUserInvoice(tempUser.id, testInvoice.id);

      const transferredCount = await linkTemporaryUser(
        tempUser.email,
        authUser.id,
      );
      expect(transferredCount).toBe(0); // No transfer because duplicate

      // Verify temp user's invoice relationship was deleted
      const [tempInvoiceRel] = await db
        .select()
        .from(userInvoice)
        .where(
          and(
            eq(userInvoice.userId, tempUser.id),
            eq(userInvoice.invoiceId, testInvoice.id),
          ),
        )
        .limit(1);
      expect(tempInvoiceRel).toBeUndefined();

      // Cleanup
      await db
        .delete(userInvoice)
        .where(eq(userInvoice.invoiceId, testInvoice.id));
      await db.delete(invoice).where(eq(invoice.id, testInvoice.id));
      await db.delete(orgUser).where(eq(orgUser.orgId, testOrg.id));
      await db.delete(org).where(eq(org.id, testOrg.id));
      await db.delete(userProfile).where(eq(userProfile.userId, authUser.id));
      await db.delete(user).where(eq(user.id, authUser.id));
    });

    it("should handle duplicate report relationship gracefully", async () => {
      const tempUser = await createTestUser({ emailVerified: false });
      const authUser = await createTestUser();
      await createTestUserProfile(authUser.id);
      const testOrg = await createTestOrg();
      const testReport = await createTestReport(testOrg.id, tempUser.id);

      // Add auth user to report first
      await createTestUserReport(authUser.id, testReport.id);
      await createTestUserReport(tempUser.id, testReport.id);

      const transferredCount = await linkTemporaryUser(
        tempUser.email,
        authUser.id,
      );
      expect(transferredCount).toBe(0); // No transfer because duplicate

      // Verify temp user's report relationship was deleted
      const [tempReportRel] = await db
        .select()
        .from(userReport)
        .where(
          and(
            eq(userReport.userId, tempUser.id),
            eq(userReport.reportId, testReport.id),
          ),
        )
        .limit(1);
      expect(tempReportRel).toBeUndefined();

      // Cleanup
      await db.delete(userReport).where(eq(userReport.reportId, testReport.id));
      await db.delete(report).where(eq(report.id, testReport.id));
      await db.delete(orgUser).where(eq(orgUser.orgId, testOrg.id));
      await db.delete(org).where(eq(org.id, testOrg.id));
      await db.delete(userProfile).where(eq(userProfile.userId, authUser.id));
      await db.delete(user).where(eq(user.id, authUser.id));
    });
  });

  describe("acceptOrgInvitation", () => {
    it("should accept invitation and update role to CLIENT", async () => {
      const testOrg = await createTestOrg();
      const invitedUser = await createTestUser();
      await createTestUserProfile(invitedUser.id);
      await createTestOrgUser(invitedUser.id, testOrg.id, OrgRole.READ_ONLY);

      const updated = await acceptOrgInvitation(invitedUser.id, testOrg.id);
      expect(updated.role).toBe(OrgRole.CLIENT);
      expect(updated.userId).toBe(invitedUser.id);
      expect(updated.orgId).toBe(testOrg.id);

      // Cleanup
      await db.delete(orgUser).where(eq(orgUser.orgId, testOrg.id));
      await db.delete(org).where(eq(org.id, testOrg.id));
      await db
        .delete(userProfile)
        .where(eq(userProfile.userId, invitedUser.id));
      await db.delete(user).where(eq(user.id, invitedUser.id));
    });

    it("should accept invitation with custom role", async () => {
      const testOrg = await createTestOrg();
      const invitedUser = await createTestUser();
      await createTestUserProfile(invitedUser.id);
      await createTestOrgUser(invitedUser.id, testOrg.id, OrgRole.READ_ONLY);

      const updated = await acceptOrgInvitation(
        invitedUser.id,
        testOrg.id,
        OrgRole.MODERATOR,
      );
      expect(updated.role).toBe(OrgRole.MODERATOR);

      // Cleanup
      await db.delete(orgUser).where(eq(orgUser.orgId, testOrg.id));
      await db.delete(org).where(eq(org.id, testOrg.id));
      await db
        .delete(userProfile)
        .where(eq(userProfile.userId, invitedUser.id));
      await db.delete(user).where(eq(user.id, invitedUser.id));
    });

    it("should throw error for invalid role", async () => {
      const testOrg = await createTestOrg();
      const invitedUser = await createTestUser();
      await createTestUserProfile(invitedUser.id);
      await createTestOrgUser(invitedUser.id, testOrg.id, OrgRole.READ_ONLY);

      await expect(
        acceptOrgInvitation(invitedUser.id, testOrg.id, 999),
      ).rejects.toThrow("Invalid role");

      // Cleanup
      await db.delete(orgUser).where(eq(orgUser.orgId, testOrg.id));
      await db.delete(org).where(eq(org.id, testOrg.id));
      await db
        .delete(userProfile)
        .where(eq(userProfile.userId, invitedUser.id));
      await db.delete(user).where(eq(user.id, invitedUser.id));
    });

    it("should throw error when user is not org member", async () => {
      const testOrg = await createTestOrg();
      const nonMember = await createTestUser();
      await createTestUserProfile(nonMember.id);
      await expect(
        acceptOrgInvitation(nonMember.id, testOrg.id),
      ).rejects.toThrow("not a member");

      // Cleanup
      await db.delete(org).where(eq(org.id, testOrg.id));
      await db.delete(userProfile).where(eq(userProfile.userId, nonMember.id));
      await db.delete(user).where(eq(user.id, nonMember.id));
    });

    it("should throw error when user does not have pending invitation", async () => {
      const testOrg = await createTestOrg();
      const invitedUser = await createTestUser();
      await createTestUserProfile(invitedUser.id);
      // Add user with CLIENT role (not READ_ONLY)
      await createTestOrgUser(invitedUser.id, testOrg.id, OrgRole.CLIENT);

      await expect(
        acceptOrgInvitation(invitedUser.id, testOrg.id),
      ).rejects.toThrow("pending invitation");

      // Cleanup
      await db.delete(orgUser).where(eq(orgUser.orgId, testOrg.id));
      await db.delete(org).where(eq(org.id, testOrg.id));
      await db
        .delete(userProfile)
        .where(eq(userProfile.userId, invitedUser.id));
      await db.delete(user).where(eq(user.id, invitedUser.id));
    });
  });
});
