import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import { db } from "@/drizzle/db";
import {
  OrgRole,
  org,
  orgUser,
  report,
  user,
  userProfile,
  userReport,
} from "@/drizzle/schema";
import { ForbiddenError, NotFoundError } from "@/plugins/error";
import {
  addReportUsers,
  createReport,
  deleteReport,
  getOrgReports,
  getReportById,
  getUserReports,
  removeReportUser,
  updateReport,
} from "../report/service";
import {
  createTestOrg,
  createTestOrgUser,
  createTestReport,
  createTestUser,
  createTestUserProfile,
  createTestUserReport,
} from "./utils/fixtures";

describe("Report Service", () => {
  let testUser: typeof user.$inferSelect;
  let testUser2: typeof user.$inferSelect;
  let testOrg: typeof org.$inferSelect;
  let testReport: typeof report.$inferSelect;

  beforeAll(async () => {
    testUser = await createTestUser();
    testUser2 = await createTestUser();
    await createTestUserProfile(testUser.id);
    await createTestUserProfile(testUser2.id);
    testOrg = await createTestOrg();
    await createTestOrgUser(testUser.id, testOrg.id, OrgRole.ADMIN);
    await createTestOrgUser(testUser2.id, testOrg.id, OrgRole.CLIENT);

    // Create test report for use across tests
    testReport = await createTestReport(testOrg.id, testUser.id);
  });

  afterAll(async () => {
    if (testReport) {
      await db.delete(userReport).where(eq(userReport.reportId, testReport.id));
      await db.delete(report).where(eq(report.id, testReport.id));
    }
    await db.delete(orgUser).where(eq(orgUser.orgId, testOrg.id));
    await db.delete(org).where(eq(org.id, testOrg.id));
    await db.delete(userProfile).where(eq(userProfile.userId, testUser.id));
    await db.delete(userProfile).where(eq(userProfile.userId, testUser2.id));
    await db.delete(user).where(eq(user.id, testUser.id));
    await db.delete(user).where(eq(user.id, testUser2.id));
  });

  describe("createReport", () => {
    it("should create report for org member", async () => {
      const reportData = {
        orgId: testOrg.id,
        title: "Test Report",
        status: "draft" as const,
        content: "Test content",
        periodStart: new Date(),
        periodEnd: new Date(),
        rating: 5,
        userIds: [],
      };

      const created = await createReport(testOrg.id, reportData, testUser.id);

      expect(created.orgId).toBe(testOrg.id);
      expect(created.title).toBe(reportData.title);
      expect(created.status).toBe(reportData.status);
      expect(created.createdBy).toBe(testUser.id);

      // Cleanup
      await db.delete(report).where(eq(report.id, created.id));
    });

    it("should create report with userIds and call addReportUsers", async () => {
      const otherUser = await createTestUser();
      await createTestUserProfile(otherUser.id);
      const reportData = {
        orgId: testOrg.id,
        title: "Report with Users",
        status: "draft" as const,
        periodStart: new Date(),
        periodEnd: new Date(),
        userIds: [otherUser.id],
      };

      const created = await createReport(testOrg.id, reportData, testUser.id);

      // Verify user relationship was created (covers line 69)
      const [userRep] = await db
        .select()
        .from(userReport)
        .where(eq(userReport.reportId, created.id))
        .limit(1);

      expect(userRep).toBeDefined();
      expect(userRep.userId).toBe(otherUser.id);

      // Cleanup
      await db.delete(userReport).where(eq(userReport.reportId, created.id));
      await db.delete(report).where(eq(report.id, created.id));
      await db.delete(userProfile).where(eq(userProfile.userId, otherUser.id));
      await db.delete(user).where(eq(user.id, otherUser.id));
    });

    it("should throw ForbiddenError for non-member", async () => {
      const otherUser = await createTestUser();
      await createTestUserProfile(otherUser.id);
      const reportData = {
        orgId: testOrg.id,
        title: "Test",
        status: "draft" as const,
        periodStart: new Date(),
        periodEnd: new Date(),
        userIds: [],
      };

      await expect(
        createReport(testOrg.id, reportData, otherUser.id),
      ).rejects.toThrow(ForbiddenError);

      await db.delete(userProfile).where(eq(userProfile.userId, otherUser.id));
      await db.delete(user).where(eq(user.id, otherUser.id));
    });

    it("should throw ForbiddenError for read-only user", async () => {
      const readOnlyUser = await createTestUser();
      await createTestUserProfile(readOnlyUser.id);
      await createTestOrgUser(readOnlyUser.id, testOrg.id, OrgRole.READ_ONLY);
      const reportData = {
        orgId: testOrg.id,
        title: "Test",
        status: "draft" as const,
        periodStart: new Date(),
        periodEnd: new Date(),
        userIds: [],
      };

      await expect(
        createReport(testOrg.id, reportData, readOnlyUser.id),
      ).rejects.toThrow(ForbiddenError);

      await db
        .delete(orgUser)
        .where(
          and(eq(orgUser.orgId, testOrg.id), eq(orgUser.userId, readOnlyUser.id)),
        );
      await db
        .delete(userProfile)
        .where(eq(userProfile.userId, readOnlyUser.id));
      await db.delete(user).where(eq(user.id, readOnlyUser.id));
    });
  });

  describe("getReportById", () => {
    it("should return report for org member", async () => {
      const found = await getReportById(testReport.id, testUser.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(testReport.id);
    });

    it("should return report via user-report relationship", async () => {
      const linkedReport = await createTestReport(testOrg.id, testUser.id);
      await createTestUserReport(testUser2.id, linkedReport.id);

      const found = await getReportById(linkedReport.id, testUser2.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(linkedReport.id);

      // Cleanup
      await db
        .delete(userReport)
        .where(eq(userReport.reportId, linkedReport.id));
      await db.delete(report).where(eq(report.id, linkedReport.id));
    });

    it("should return null for report user doesn't have access to", async () => {
      const otherOrg = await createTestOrg();
      const otherReport = await createTestReport(otherOrg.id, testUser.id);

      const found = await getReportById(otherReport.id, testUser2.id);
      expect(found).toBeNull();

      // Cleanup
      await db.delete(report).where(eq(report.id, otherReport.id));
      await db.delete(org).where(eq(org.id, otherOrg.id));
    });
  });

  describe("getUserReports", () => {
    it("should return all reports user has access to", async () => {
      const reports = await getUserReports(testUser.id);
      expect(reports.length).toBeGreaterThan(0);
      expect(reports.some((rep) => rep.id === testReport.id)).toBe(true);
    });

    it("should deduplicate reports from org and userReport relationships", async () => {
      // Create a report linked via userReport (covers line 143)
      const linkedReport = await createTestReport(testOrg.id, testUser.id);
      await createTestUserReport(testUser.id, linkedReport.id);

      const reports = await getUserReports(testUser.id);

      // Should include both org reports and userReport-linked reports
      const reportIds = reports.map((r) => r.id);
      expect(reportIds.includes(testReport.id)).toBe(true);
      expect(reportIds.includes(linkedReport.id)).toBe(true);

      // Should deduplicate (user is both org member and has userReport link)
      const uniqueIds = new Set(reportIds);
      expect(uniqueIds.size).toBe(reportIds.length);

      // Cleanup
      await db
        .delete(userReport)
        .where(eq(userReport.reportId, linkedReport.id));
      await db.delete(report).where(eq(report.id, linkedReport.id));
    });
  });

  describe("getOrgReports", () => {
    it("should return org reports for member", async () => {
      const reports = await getOrgReports(testOrg.id, testUser.id);
      expect(Array.isArray(reports)).toBe(true);
      expect(reports.some((rep) => rep.id === testReport.id)).toBe(true);
    });

    it("should throw ForbiddenError for non-member", async () => {
      const otherUser = await createTestUser();
      await createTestUserProfile(otherUser.id);

      await expect(getOrgReports(testOrg.id, otherUser.id)).rejects.toThrow(
        ForbiddenError,
      );

      await db.delete(userProfile).where(eq(userProfile.userId, otherUser.id));
      await db.delete(user).where(eq(user.id, otherUser.id));
    });
  });

  describe("updateReport", () => {
    it("should update report", async () => {
      const updateData = {
        title: "Updated Title",
        status: "published" as const,
        content: "Updated content",
        rating: 8,
      };

      const updated = await updateReport(
        testReport.id,
        updateData,
        testUser.id,
      );

      expect(updated.title).toBe(updateData.title);
      expect(updated.status).toBe(updateData.status);
      expect(updated.content).toBe(updateData.content);
      expect(updated.rating).toBe(updateData.rating);
    });

    it("should update periodStart and periodEnd", async () => {
      const newPeriodStart = new Date("2024-01-01");
      const newPeriodEnd = new Date("2024-12-31");
      const updateData = {
        periodStart: newPeriodStart,
        periodEnd: newPeriodEnd,
      };

      const updated = await updateReport(
        testReport.id,
        updateData,
        testUser.id,
      );

      expect(updated.periodStart).toEqual(newPeriodStart);
      expect(updated.periodEnd).toEqual(newPeriodEnd);
    });

    it("should update userIds and handle user relationships", async () => {
      const otherUser = await createTestUser();
      await createTestUserProfile(otherUser.id);
      const updateData = {
        userIds: [otherUser.id],
      };

      const _updated = await updateReport(
        testReport.id,
        updateData,
        testUser.id,
      );

      // Verify old relationships removed and new ones added (covers lines 216, 218-220)
      const userReps = await db
        .select()
        .from(userReport)
        .where(eq(userReport.reportId, testReport.id));

      expect(userReps.length).toBe(1);
      expect(userReps[0].userId).toBe(otherUser.id);

      // Cleanup
      await db.delete(userReport).where(eq(userReport.reportId, testReport.id));
      await db.delete(userProfile).where(eq(userProfile.userId, otherUser.id));
      await db.delete(user).where(eq(user.id, otherUser.id));
    });

    it("should remove all userIds when empty array provided", async () => {
      // First add a user relationship
      const otherUser = await createTestUser();
      await createTestUserProfile(otherUser.id);
      await addReportUsers(testReport.id, [otherUser.id]);

      // Then remove it
      const updateData = {
        userIds: [],
      };

      await updateReport(testReport.id, updateData, testUser.id);

      // Verify relationships removed
      const userReps = await db
        .select()
        .from(userReport)
        .where(eq(userReport.reportId, testReport.id));

      expect(userReps.length).toBe(0);

      // Cleanup
      await db.delete(userProfile).where(eq(userProfile.userId, otherUser.id));
      await db.delete(user).where(eq(user.id, otherUser.id));
    });

    it("should throw NotFoundError for non-existent report", async () => {
      await expect(
        updateReport("non-existent-id", { title: "Test" }, testUser.id),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("deleteReport", () => {
    it("should delete report as admin", async () => {
      const reportToDelete = await createTestReport(testOrg.id, testUser.id);

      // Delete should not throw
      await deleteReport(reportToDelete.id, testUser.id);

      // Verify deleted - check that no report with this ID exists
      const found = await db
        .select()
        .from(report)
        .where(eq(report.id, reportToDelete.id))
        .limit(1);
      expect(found.length).toBe(0);
    });

    it("should throw NotFoundError for non-existent report", async () => {
      await expect(
        deleteReport("non-existent-id", testUser.id),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ForbiddenError for non-admin", async () => {
      const reportToDelete = await createTestReport(testOrg.id, testUser.id);

      await expect(
        deleteReport(reportToDelete.id, testUser2.id),
      ).rejects.toThrow(ForbiddenError);

      // Cleanup
      await db.delete(report).where(eq(report.id, reportToDelete.id));
    });
  });

  describe("addReportUsers", () => {
    it("should add user relationships", async () => {
      const testRep = await createTestReport(testOrg.id, testUser.id);
      const otherUser = await createTestUser();
      await createTestUserProfile(otherUser.id);

      await addReportUsers(testRep.id, [otherUser.id]);

      const [userRep] = await db
        .select()
        .from(userReport)
        .where(eq(userReport.reportId, testRep.id))
        .limit(1);

      expect(userRep).toBeDefined();
      expect(userRep.userId).toBe(otherUser.id);

      // Cleanup
      await db.delete(userReport).where(eq(userReport.reportId, testRep.id));
      await db.delete(report).where(eq(report.id, testRep.id));
      await db.delete(userProfile).where(eq(userProfile.userId, otherUser.id));
      await db.delete(user).where(eq(user.id, otherUser.id));
    });

    it("should handle empty userIds array", async () => {
      const testRep = await createTestReport(testOrg.id, testUser.id);

      // Should not throw when userIds is empty (covers line 266-268)
      await addReportUsers(testRep.id, []);

      // Cleanup
      await db.delete(report).where(eq(report.id, testRep.id));
    });
  });

  describe("removeReportUser", () => {
    it("should remove user relationship", async () => {
      const testRep = await createTestReport(testOrg.id, testUser.id);
      const otherUser = await createTestUser();
      await createTestUserProfile(otherUser.id);
      await addReportUsers(testRep.id, [otherUser.id]);

      await removeReportUser(testRep.id, otherUser.id);

      const userReps = await db
        .select()
        .from(userReport)
        .where(eq(userReport.reportId, testRep.id));

      expect(userReps.length).toBe(0);

      // Cleanup
      await db.delete(report).where(eq(report.id, testRep.id));
      await db.delete(userProfile).where(eq(userProfile.userId, otherUser.id));
      await db.delete(user).where(eq(user.id, otherUser.id));
    });
  });
});
