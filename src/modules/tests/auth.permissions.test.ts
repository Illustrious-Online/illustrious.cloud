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
  canAccessUserDetails,
  canReadAcrossOrgs,
  canReadOrgResource,
  canWriteAcrossOrgs,
  canWriteOrgResource,
  canWriteResource,
  getUserOrgRole,
  getUserSiteRole,
  isResourceAssignedToUser,
} from "../auth/permissions";
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

describe("Auth Permissions", () => {
  let testUser: typeof user.$inferSelect;
  let testUser2: typeof user.$inferSelect;
  let testUser3: typeof user.$inferSelect;
  let testOrg: typeof org.$inferSelect;
  let testOrg2: typeof org.$inferSelect;
  let testInvoice: typeof invoice.$inferSelect;
  let testReport: typeof report.$inferSelect;

  beforeAll(async () => {
    // Create test users with different roles
    testUser = await createTestUser();
    testUser2 = await createTestUser();
    testUser3 = await createTestUser();

    // Create profiles with different site roles
    await createTestUserProfile(testUser.id, { siteRole: SiteRole.ADMIN });
    await createTestUserProfile(testUser2.id, { siteRole: SiteRole.MODERATOR });
    await createTestUserProfile(testUser3.id, {
      siteRole: SiteRole.NORMAL_USER,
    });

    // Create test orgs
    testOrg = await createTestOrg();
    testOrg2 = await createTestOrg();

    // Add users to orgs with different roles
    await createTestOrgUser(testUser.id, testOrg.id, OrgRole.ADMIN);
    await createTestOrgUser(testUser2.id, testOrg.id, OrgRole.MODERATOR);
    await createTestOrgUser(testUser3.id, testOrg.id, OrgRole.CLIENT);

    // Create test resources
    testInvoice = await createTestInvoice(testOrg.id, testUser.id);
    testReport = await createTestReport(testOrg.id, testUser.id);
  });

  afterAll(async () => {
    // Cleanup resources
    if (testInvoice) {
      await db
        .delete(userInvoice)
        .where(eq(userInvoice.invoiceId, testInvoice.id));
      await db.delete(invoice).where(eq(invoice.id, testInvoice.id));
    }
    if (testReport) {
      await db.delete(userReport).where(eq(userReport.reportId, testReport.id));
      await db.delete(report).where(eq(report.id, testReport.id));
    }

    // Cleanup org users
    if (testOrg) {
      await db.delete(orgUser).where(eq(orgUser.orgId, testOrg.id));
      await db.delete(org).where(eq(org.id, testOrg.id));
    }
    if (testOrg2) {
      await db.delete(orgUser).where(eq(orgUser.orgId, testOrg2.id));
      await db.delete(org).where(eq(org.id, testOrg2.id));
    }

    // Cleanup profiles and users
    if (testUser) {
      await db.delete(userProfile).where(eq(userProfile.userId, testUser.id));
      await db.delete(user).where(eq(user.id, testUser.id));
    }
    if (testUser2) {
      await db.delete(userProfile).where(eq(userProfile.userId, testUser2.id));
      await db.delete(user).where(eq(user.id, testUser2.id));
    }
    if (testUser3) {
      await db.delete(userProfile).where(eq(userProfile.userId, testUser3.id));
      await db.delete(user).where(eq(user.id, testUser3.id));
    }
  });

  describe("getUserSiteRole", () => {
    it("should return site role for user with profile", async () => {
      const role = await getUserSiteRole(testUser.id);
      expect(role).toBe(SiteRole.ADMIN);
    });

    it("should return NORMAL_USER for user without profile", async () => {
      const newUser = await createTestUser();
      const role = await getUserSiteRole(newUser.id);
      expect(role).toBe(SiteRole.NORMAL_USER);

      // Cleanup
      await db.delete(user).where(eq(user.id, newUser.id));
    });
  });

  describe("getUserOrgRole", () => {
    it("should return org role for user in org", async () => {
      const role = await getUserOrgRole(testUser.id, testOrg.id);
      expect(role).toBe(OrgRole.ADMIN);
    });

    it("should return null for user not in org", async () => {
      const role = await getUserOrgRole(testUser.id, testOrg2.id);
      expect(role).toBeNull();
    });
  });

  describe("canReadAcrossOrgs", () => {
    it("should return true for site admin", () => {
      expect(canReadAcrossOrgs(SiteRole.ADMIN)).toBe(true);
    });

    it("should return true for site moderator", () => {
      expect(canReadAcrossOrgs(SiteRole.MODERATOR)).toBe(true);
    });

    it("should return false for normal user", () => {
      expect(canReadAcrossOrgs(SiteRole.NORMAL_USER)).toBe(false);
    });
  });

  describe("canWriteAcrossOrgs", () => {
    it("should return true for site admin", () => {
      expect(canWriteAcrossOrgs(SiteRole.ADMIN)).toBe(true);
    });

    it("should return false for site moderator", () => {
      expect(canWriteAcrossOrgs(SiteRole.MODERATOR)).toBe(false);
    });

    it("should return false for normal user", () => {
      expect(canWriteAcrossOrgs(SiteRole.NORMAL_USER)).toBe(false);
    });
  });

  describe("canReadOrgResource", () => {
    it("should return true for site admin", () => {
      expect(canReadOrgResource(SiteRole.ADMIN, null)).toBe(true);
    });

    it("should return true for site moderator", () => {
      expect(canReadOrgResource(SiteRole.MODERATOR, null)).toBe(true);
    });

    it("should return false for non-member", () => {
      expect(canReadOrgResource(SiteRole.NORMAL_USER, null)).toBe(false);
    });

    it("should return true for org admin", () => {
      expect(canReadOrgResource(SiteRole.NORMAL_USER, OrgRole.ADMIN)).toBe(
        true,
      );
    });

    it("should return true for org moderator", () => {
      expect(canReadOrgResource(SiteRole.NORMAL_USER, OrgRole.MODERATOR)).toBe(
        true,
      );
    });

    it("should return true for org client", () => {
      expect(canReadOrgResource(SiteRole.NORMAL_USER, OrgRole.CLIENT)).toBe(
        true,
      );
    });

    it("should return true for read-only user", () => {
      expect(canReadOrgResource(SiteRole.NORMAL_USER, OrgRole.READ_ONLY)).toBe(
        true,
      );
    });
  });

  describe("canWriteOrgResource", () => {
    it("should return true for site admin", () => {
      expect(canWriteOrgResource(SiteRole.ADMIN, null)).toBe(true);
    });

    it("should return false for site moderator without org role", () => {
      expect(canWriteOrgResource(SiteRole.MODERATOR, null)).toBe(false);
    });

    it("should return false for non-member", () => {
      expect(canWriteOrgResource(SiteRole.NORMAL_USER, null)).toBe(false);
    });

    it("should return true for org admin", () => {
      expect(canWriteOrgResource(SiteRole.NORMAL_USER, OrgRole.ADMIN)).toBe(
        true,
      );
    });

    it("should return true for org moderator", () => {
      expect(canWriteOrgResource(SiteRole.NORMAL_USER, OrgRole.MODERATOR)).toBe(
        true,
      );
    });

    it("should return false for org client", () => {
      expect(canWriteOrgResource(SiteRole.NORMAL_USER, OrgRole.CLIENT)).toBe(
        false,
      );
    });

    it("should return false for read-only user", () => {
      expect(canWriteOrgResource(SiteRole.NORMAL_USER, OrgRole.READ_ONLY)).toBe(
        false,
      );
    });
  });

  describe("canWriteResource", () => {
    it("should return true for site admin", () => {
      expect(canWriteResource(SiteRole.ADMIN, null, null, testUser.id)).toBe(
        true,
      );
    });

    it("should return true for org admin", () => {
      expect(
        canWriteResource(
          SiteRole.NORMAL_USER,
          OrgRole.ADMIN,
          null,
          testUser.id,
        ),
      ).toBe(true);
    });

    it("should return true for org moderator writing own resource", () => {
      expect(
        canWriteResource(
          SiteRole.NORMAL_USER,
          OrgRole.MODERATOR,
          testUser2.id,
          testUser2.id,
        ),
      ).toBe(true);
    });

    it("should return false for org moderator writing others' resource", () => {
      expect(
        canWriteResource(
          SiteRole.NORMAL_USER,
          OrgRole.MODERATOR,
          testUser.id,
          testUser2.id,
        ),
      ).toBe(false);
    });

    it("should return false for org client", () => {
      expect(
        canWriteResource(
          SiteRole.NORMAL_USER,
          OrgRole.CLIENT,
          testUser.id,
          testUser3.id,
        ),
      ).toBe(false);
    });

    it("should return false for read-only user", () => {
      expect(
        canWriteResource(
          SiteRole.NORMAL_USER,
          OrgRole.READ_ONLY,
          testUser.id,
          testUser3.id,
        ),
      ).toBe(false);
    });

    it("should return false for non-member", () => {
      expect(
        canWriteResource(SiteRole.NORMAL_USER, null, testUser.id, testUser3.id),
      ).toBe(false);
    });
  });

  describe("canAccessUserDetails", () => {
    it("should return true when accessing own details", async () => {
      const canAccess = await canAccessUserDetails(testUser.id, testUser.id);
      expect(canAccess).toBe(true);
    });

    it("should return true for site admin accessing any user", async () => {
      const canAccess = await canAccessUserDetails(testUser.id, testUser2.id);
      expect(canAccess).toBe(true);
    });

    it("should return true for site moderator accessing any user", async () => {
      const canAccess = await canAccessUserDetails(testUser2.id, testUser.id);
      expect(canAccess).toBe(true);
    });

    it("should return false for normal user without org context", async () => {
      const normalUser = await createTestUser();
      await createTestUserProfile(normalUser.id);
      const canAccess = await canAccessUserDetails(normalUser.id, testUser3.id);
      expect(canAccess).toBe(false);

      // Cleanup
      await db.delete(userProfile).where(eq(userProfile.userId, normalUser.id));
      await db.delete(user).where(eq(user.id, normalUser.id));
    });

    it("should return true for org admin accessing org member", async () => {
      const canAccess = await canAccessUserDetails(
        testUser.id,
        testUser3.id,
        testOrg.id,
      );
      expect(canAccess).toBe(true);
    });

    it("should return true for org moderator accessing org member", async () => {
      const canAccess = await canAccessUserDetails(
        testUser2.id,
        testUser3.id,
        testOrg.id,
      );
      expect(canAccess).toBe(true);
    });

    it("should return false for org client accessing other org member", async () => {
      const canAccess = await canAccessUserDetails(
        testUser3.id,
        testUser.id,
        testOrg.id,
      );
      expect(canAccess).toBe(false);
    });

    it("should return false when viewer is not org member", async () => {
      const outsider = await createTestUser();
      await createTestUserProfile(outsider.id);
      const canAccess = await canAccessUserDetails(
        outsider.id,
        testUser3.id,
        testOrg.id,
      );
      expect(canAccess).toBe(false);

      // Cleanup
      await db.delete(userProfile).where(eq(userProfile.userId, outsider.id));
      await db.delete(user).where(eq(user.id, outsider.id));
    });

    it("should return false when target is not org member", async () => {
      const outsider = await createTestUser();
      await createTestUserProfile(outsider.id);
      // Use testUser3 (normal user) instead of testUser (admin) to test org-level permissions
      const canAccess = await canAccessUserDetails(
        testUser3.id,
        outsider.id,
        testOrg.id,
      );
      expect(canAccess).toBe(false);

      // Cleanup
      await db.delete(userProfile).where(eq(userProfile.userId, outsider.id));
      await db.delete(user).where(eq(user.id, outsider.id));
    });
  });

  describe("isResourceAssignedToUser", () => {
    it("should return true for invoice assigned to user", async () => {
      await createTestUserInvoice(testUser3.id, testInvoice.id);
      const isAssigned = await isResourceAssignedToUser(
        testUser3.id,
        testInvoice.id,
        "userInvoice",
      );
      expect(isAssigned).toBe(true);

      // Cleanup
      await db
        .delete(userInvoice)
        .where(
          and(
            eq(userInvoice.userId, testUser3.id),
            eq(userInvoice.invoiceId, testInvoice.id),
          ),
        );
    });

    it("should return false for invoice not assigned to user", async () => {
      const isAssigned = await isResourceAssignedToUser(
        testUser3.id,
        testInvoice.id,
        "userInvoice",
      );
      expect(isAssigned).toBe(false);
    });

    it("should return true for report assigned to user", async () => {
      await createTestUserReport(testUser3.id, testReport.id);
      const isAssigned = await isResourceAssignedToUser(
        testUser3.id,
        testReport.id,
        "userReport",
      );
      expect(isAssigned).toBe(true);

      // Cleanup
      await db
        .delete(userReport)
        .where(
          eq(userReport.userId, testUser3.id) &&
            eq(userReport.reportId, testReport.id),
        );
    });

    it("should return false for report not assigned to user", async () => {
      const isAssigned = await isResourceAssignedToUser(
        testUser3.id,
        testReport.id,
        "userReport",
      );
      expect(isAssigned).toBe(false);
    });
  });
});
