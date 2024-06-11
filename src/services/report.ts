import { and, eq } from "drizzle-orm";
import { NotFoundError } from "elysia";

import { db } from "../../drizzle/db";
import {
  Report,
  orgReports,
  orgUsers,
  reports,
  userReports,
} from "../../drizzle/schema";
import ConflictError from "../domain/exceptions/ConflictError";
import ServerError from "../domain/exceptions/ServerError";
import UnauthorizedError from "../domain/exceptions/UnauthorizedError";
import { CreateReport } from "../domain/interfaces/reports";
import { Roles } from "../domain/interfaces/roles";

/**
 * Creates a new user.
 *
 * @param payload - The user data to be created.
 * @returns {Promise<Report>} A promise that resolves to the created user.
 * @throws {ConflictError} If a user with the same data already exists.
 * @throws {Error} If an error occurs while creating the user.
 */
export async function create(payload: CreateReport): Promise<Report> {
  try {
    const { user, org, report } = payload;
    const foundReport = await db
      .select()
      .from(reports)
      .where(eq(reports.id, report.id));

    if (foundReport) {
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
  } catch (e) {
    const error = e as ServerError;

    if (error.name === "ServerError" && error.code === 11000) {
      throw new ConflictError("Report exists.");
    }

    throw error;
  }
}

/**
 * Fetches a report by id.
 *
 * @param {string} id The id of the user to fetch.
 * @returns {Promise<Report>} A promise that resolves array User objects.
 */
export async function fetchById(payload: {
  id: string;
  userId?: string;
}): Promise<Report> {
  const { userId, id } = payload;

  if (!userId || !id) {
    throw new ConflictError("Unable to continue: Missing search criteria!");
  }

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
      throw new ConflictError("Unable to find org associated with the report");
    }

    const userOrg = await db
      .select()
      .from(orgUsers)
      .where(
        and(
          eq(orgUsers.userId, userId),
          eq(orgUsers.orgId, reportOrg[0].orgId),
        ),
      );

    if (userOrg.length === 0) {
      throw new ConflictError("Unable to find org associated with the user");
    }

    const roleIndex = Object.keys(Roles).indexOf(userOrg[0].role);

    if (roleIndex !== Roles.ADMIN && roleIndex !== Roles.OWNER) {
      throw new UnauthorizedError(
        "Unable to continue: User is not have sufficient permissions",
      );
    }
  }

  const data = await db.select().from(reports).where(eq(reports.id, id));

  if (data.length === 0) {
    throw new NotFoundError();
  }

  return data[0];
}

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

export async function deleteOne(reportId: string): Promise<void> {
  db.delete(reports).where(eq(reports.id, reportId));
  db.delete(userReports).where(eq(userReports.reportId, reportId));

  throw new ConflictError("Failed to delete the reports");
}
