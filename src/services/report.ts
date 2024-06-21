import { and, eq } from "drizzle-orm";
import { NotFoundError } from "elysia";

import { db } from "../../drizzle/db";
import {
  Report,
  Role,
  orgReports,
  orgUsers,
  orgs,
  reports,
  userReports,
} from "../../drizzle/schema";
import ConflictError from "../domain/exceptions/ConflictError";
import ServerError from "../domain/exceptions/ServerError";
import UnauthorizedError from "../domain/exceptions/UnauthorizedError";
import { CreateReport, FetchReport } from "../domain/interfaces/reports";
import { UserRole } from "../domain/types/UserRole";

/**
 * Creates a new Report.
 *
 * @param payload - The Report data to be created.
 * @returns {Promise<Report>} A promise that resolves to the created Report.
 * @throws {ConflictError} If an Report with the same data already exists.
 * @throws {Error} If an error occurs while creating the Report.
 */
export async function create(payload: CreateReport): Promise<Report> {
  const { user, org, report } = payload;
  const foundReport = await db
    .select()
    .from(reports)
    .where(eq(reports.id, report.id));

  if (foundReport.length > 0) {
    throw new ConflictError("Report already exists!");
  }

  const result = await db.insert(reports).values(report).returning();

  await db.insert(userReports).values({
    userId: user,
    reportId: report.id,
  });

  await db.insert(orgReports).values({
    orgId: org,
    reportId: report.id,
  });

  return result[0];
}

/**
 * Fetches an Report by id.
 *
 * @param payload - The id of the Report to fetch; optional userId to validate relationship.
 * @returns {Promise<Report>} A promise that resolves the Report object.
 */
export async function fetchOne(payload: FetchReport): Promise<Report> {
  const { userId, id } = payload;
  const usersReport = await db
    .select()
    .from(userReports)
    .where(and(eq(userReports.userId, userId), eq(userReports.reportId, id)));

  if (usersReport.length === 0) {
    const reportOrg = await db
      .select()
      .from(orgReports)
      .where(eq(orgReports.reportId, id));

    if (reportOrg.length === 0) {
      throw new UnauthorizedError(
        "User does not have direct association this Report.",
      );
    }

    const users = await db
      .select()
      .from(orgUsers)
      .where(
        and(
          eq(orgUsers.userId, userId),
          eq(orgUsers.orgId, reportOrg[0].orgId),
        ),
      )
      .innerJoin(orgs, eq(orgs.id, reportOrg[0].orgId));

    if (users.length !== 1) {
      throw new UnauthorizedError(
        "User does not have and Org assocation this Report.",
      );
    }

    const orgUser = users[0].OrgUser;
    const clientIndex = Object.keys(UserRole).indexOf("CLIENT");
    const roleIndex = Object.keys(UserRole).indexOf(orgUser.role);

    if (roleIndex < clientIndex) {
      throw new UnauthorizedError(
        "User does not have permissions to access this Report.",
      );
    }
  }

  const data = await db.select().from(reports).where(eq(reports.id, id));

  if (data.length === 0) {
    throw new NotFoundError();
  }

  return data[0];
}

/**
 * Updates a Report.
 *
 * @param payload - The new Report object to update.
 * @returns {Promise<Report>} A promise that resolves to an Report object.
 */
export async function update(payload: Report): Promise<Report> {
  const { id, owner, rating, notes } = payload;
  const foundReport = await db.select().from(reports).where(eq(reports.id, id));

  if (!foundReport) {
    throw new ConflictError("Could not find expected report");
  }

  const result = await db
    .update(reports)
    .set({
      owner,
      rating,
      notes,
    })
    .where(eq(reports.id, id))
    .returning();

  if (result.length === 0) {
    throw new ConflictError("Failed to return response on update");
  }

  return result[0];
}

/**
 * Removes a Report and relationships.
 *
 * @param invoiceId - The Report ID to be removed.
 * @throws {ConflictError} If a user with the same data already exists.
 */
export async function deleteOne(reportId: string): Promise<void> {
  db.delete(reports).where(eq(reports.id, reportId));
  db.delete(userReports).where(eq(userReports.reportId, reportId));
  db.delete(orgReports).where(eq(orgReports.reportId, reportId));
}
