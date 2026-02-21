import { db } from "@/drizzle/db";
import { orgUser, report, userReport, OrgRole } from "@/drizzle/schema";
import type { InsertReport, Report } from "@/drizzle/schema";
import { ForbiddenError, NotFoundError } from "@/plugins/error";
import { and, eq, or, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import {
  getUserSiteRole,
  getUserOrgRole,
  canReadAcrossOrgs,
  canWriteAcrossOrgs,
  canWriteResource,
  isResourceAssignedToUser,
} from "../auth/permissions";

export interface CreateReportData {
  orgId: string;
  title: string;
  status?: "draft" | "published";
  content?: string;
  periodStart: Date;
  periodEnd: Date;
  rating?: number;
  userIds?: string[];
}

export interface UpdateReportData {
  title?: string;
  status?: "draft" | "published";
  content?: string;
  periodStart?: Date;
  periodEnd?: Date;
  rating?: number | null;
  userIds?: string[];
}

/**
 * Creates a report for an organization
 */
export async function createReport(
  orgId: string,
  data: CreateReportData,
  userId: string,
): Promise<Report> {
  const siteRole = await getUserSiteRole(userId);
  const orgRole = await getUserOrgRole(userId, orgId);

  // Site admin can create reports in any org
  if (!canWriteAcrossOrgs(siteRole)) {
    // Must be a member of the org
    if (orgRole === null) {
      throw new ForbiddenError("User is not a member of this organization");
    }

    // Read-only users cannot create reports
    if (orgRole === OrgRole.READ_ONLY) {
      throw new ForbiddenError(
        "Read-only users cannot create reports in this organization",
      );
    }
  }

  const reportId = uuidv4();
  const [newReport] = await db
    .insert(report)
    .values({
      id: reportId,
      orgId,
      title: data.title,
      status: data.status || "draft",
      content: data.content || null,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      rating: data.rating || null,
      createdBy: userId,
      createdAt: new Date(),
    })
    .returning();

  // Add user relationships if provided
  if (data.userIds && data.userIds.length > 0) {
    await addReportUsers(reportId, data.userIds);
  }

  return newReport;
}

/**
 * Gets a report by ID if user has access
 */
export async function getReportById(
  id: string,
  userId: string,
): Promise<Report | null> {
  const [foundReport] = await db
    .select()
    .from(report)
    .where(eq(report.id, id))
    .limit(1);

  if (!foundReport) {
    return null;
  }

  const siteRole = await getUserSiteRole(userId);
  const orgRole = await getUserOrgRole(userId, foundReport.orgId);

  // Site admin/moderator can read everything
  if (canReadAcrossOrgs(siteRole)) {
    return foundReport;
  }

  // Org admin and moderator can read all reports in their org
  if (orgRole === OrgRole.ADMIN || orgRole === OrgRole.MODERATOR) {
    return foundReport;
  }

  // Client and read-only users can only read reports assigned to them
  if (orgRole === OrgRole.CLIENT || orgRole === OrgRole.READ_ONLY) {
    const isAssigned = await isResourceAssignedToUser(
      userId,
      id,
      "userReport",
    );
    if (isAssigned) {
      return foundReport;
    }
  }

  // Not a member of the org - check if assigned via junction table
  const isAssigned = await isResourceAssignedToUser(userId, id, "userReport");
  if (isAssigned) {
    return foundReport;
  }

  return null;
}

/**
 * Gets all reports user has access to
 */
export async function getUserReports(userId: string): Promise<Report[]> {
  const siteRole = await getUserSiteRole(userId);

  // Site admin/moderator can read all reports
  if (canReadAcrossOrgs(siteRole)) {
    return await db.select().from(report);
  }

  // Get user's org memberships with roles
  const userOrgs = await db
    .select({ orgId: orgUser.orgId, role: orgUser.role })
    .from(orgUser)
    .where(eq(orgUser.userId, userId));

  const reportMap = new Map<string, Report>();

  // Process each org membership
  for (const userOrg of userOrgs) {
    if (userOrg.role === OrgRole.ADMIN || userOrg.role === OrgRole.MODERATOR) {
      // Org admin and moderator see all reports in their org
      const orgReports = await db
        .select()
        .from(report)
        .where(eq(report.orgId, userOrg.orgId));
      for (const rep of orgReports) {
        reportMap.set(rep.id, rep);
      }
    } else if (
      userOrg.role === OrgRole.CLIENT ||
      userOrg.role === OrgRole.READ_ONLY
    ) {
      // Client and read-only see only assigned reports
      const assignedReports = await db
        .select({ report })
        .from(report)
        .innerJoin(userReport, eq(report.id, userReport.reportId))
        .where(
          and(
            eq(report.orgId, userOrg.orgId),
            eq(userReport.userId, userId),
          ),
        );
      for (const { report: rep } of assignedReports) {
        reportMap.set(rep.id, rep);
      }
    }
  }

  // Also get reports assigned via junction table (for users not in org)
  const userReports = await db
    .select({ report })
    .from(report)
    .innerJoin(userReport, eq(report.id, userReport.reportId))
    .where(eq(userReport.userId, userId));

  for (const { report: rep } of userReports) {
    reportMap.set(rep.id, rep);
  }

  return Array.from(reportMap.values());
}

/**
 * Gets reports for an organization
 */
export async function getOrgReports(
  orgId: string,
  userId: string,
): Promise<Report[]> {
  const siteRole = await getUserSiteRole(userId);
  const orgRole = await getUserOrgRole(userId, orgId);

  // Site admin/moderator can read all orgs
  if (canReadAcrossOrgs(siteRole)) {
    return await db.select().from(report).where(eq(report.orgId, orgId));
  }

  // Must be a member of the org
  if (orgRole === null) {
    throw new ForbiddenError("User is not a member of this organization");
  }

  // Org admin and moderator see all reports
  if (orgRole === OrgRole.ADMIN || orgRole === OrgRole.MODERATOR) {
    return await db.select().from(report).where(eq(report.orgId, orgId));
  }

  // Client and read-only see only assigned reports
  if (orgRole === OrgRole.CLIENT || orgRole === OrgRole.READ_ONLY) {
    const assignedReports = await db
      .select({ report })
      .from(report)
      .innerJoin(userReport, eq(report.id, userReport.reportId))
      .where(
        and(eq(report.orgId, orgId), eq(userReport.userId, userId)),
      );

    return assignedReports.map((r) => r.report);
  }

  return [];
}

/**
 * Updates a report
 */
export async function updateReport(
  id: string,
  data: UpdateReportData,
  userId: string,
): Promise<Report> {
  const [foundReport] = await db
    .select()
    .from(report)
    .where(eq(report.id, id))
    .limit(1);

  if (!foundReport) {
    throw new NotFoundError("Report not found");
  }

  const siteRole = await getUserSiteRole(userId);
  const orgRole = await getUserOrgRole(userId, foundReport.orgId);

  // Check write permissions
  const canWrite = canWriteResource(
    siteRole,
    orgRole,
    foundReport.createdBy,
    userId,
  );

  if (!canWrite) {
    throw new ForbiddenError("User does not have permission to update this report");
  }

  const updateData: Partial<InsertReport> = {
    modifiedBy: userId,
    updatedAt: new Date(),
  };

  if (data.title !== undefined) {
    updateData.title = data.title;
  }
  if (data.status !== undefined) {
    updateData.status = data.status;
  }
  if (data.content !== undefined) {
    updateData.content = data.content || null;
  }
  if (data.periodStart !== undefined) {
    updateData.periodStart = data.periodStart;
  }
  if (data.periodEnd !== undefined) {
    updateData.periodEnd = data.periodEnd;
  }
  if (data.rating !== undefined) {
    updateData.rating = data.rating || null;
  }

  const [updatedReport] = await db
    .update(report)
    .set(updateData)
    .where(eq(report.id, id))
    .returning();

  // Update user relationships if provided
  if (data.userIds !== undefined) {
    // Remove existing relationships
    await db.delete(userReport).where(eq(userReport.reportId, id));
    // Add new relationships
    if (data.userIds.length > 0) {
      await addReportUsers(id, data.userIds);
    }
  }

  return updatedReport;
}

/**
 * Deletes a report (org admin or site admin only)
 */
export async function deleteReport(id: string, userId: string): Promise<void> {
  const [foundReport] = await db
    .select()
    .from(report)
    .where(eq(report.id, id))
    .limit(1);

  if (!foundReport) {
    throw new NotFoundError("Report not found");
  }

  const siteRole = await getUserSiteRole(userId);
  const orgRole = await getUserOrgRole(userId, foundReport.orgId);

  // Site admin can delete anything
  if (!canWriteAcrossOrgs(siteRole)) {
    // Must be org admin
    if (orgRole !== OrgRole.ADMIN) {
      throw new ForbiddenError("User is not an admin of this organization");
    }
  }

  // Delete user relationships first
  await db.delete(userReport).where(eq(userReport.reportId, id));
  // Delete report
  await db.delete(report).where(eq(report.id, id));
}

/**
 * Adds user relationships for client/recipient access
 */
export async function addReportUsers(
  reportId: string,
  userIds: string[],
): Promise<void> {
  if (userIds.length === 0) {
    return;
  }

  await db.insert(userReport).values(
    userIds.map((uid) => ({
      userId: uid,
      reportId,
    })),
  );
}

/**
 * Removes a user relationship
 */
export async function removeReportUser(
  reportId: string,
  userId: string,
): Promise<void> {
  await db
    .delete(userReport)
    .where(
      and(eq(userReport.reportId, reportId), eq(userReport.userId, userId)),
    );
}
