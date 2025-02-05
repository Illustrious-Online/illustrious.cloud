import { eq } from "drizzle-orm";
import { NotFoundError } from "elysia";

import ConflictError from "@/domain/exceptions/ConflictError";
import type { CreateReport } from "@/domain/interfaces/reports";
import { db } from "../drizzle/db";
import {
  type Report,
  orgReports,
  reports,
  userReports,
} from "../drizzle/schema";

/**
 * Creates a new Report.
 *
 * @param payload - The Report data to be created.
 * @returns {Promise<Report>} A promise that resolves to the created Report.
 * @throws {ConflictError} If an Report with the same data already exists.
 * @throws {Error} If an error occurs while creating the Report.
 */
export async function create(payload: CreateReport): Promise<Report> {
  const { client, creator, org, report } = payload;
  const foundReport = await db
    .select()
    .from(reports)
    .where(eq(reports.id, report.id));

  if (foundReport.length > 0) {
    throw new ConflictError("Report already exists!");
  }

  const result = await db.insert(reports).values(report).returning();

  for (const role of [client, creator]) {
    await db.insert(userReports).values({
      userId: role,
      reportId: report.id,
    });
  }

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
export async function fetchOne(id: string): Promise<Report> {
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
  const { id, rating, notes } = payload;
  const foundReport = await db.select().from(reports).where(eq(reports.id, id));

  if (!foundReport) {
    throw new ConflictError("Could not find expected report");
  }

  const result = await db
    .update(reports)
    .set({
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
  db.delete(userReports).where(eq(userReports.reportId, reportId));
  db.delete(orgReports).where(eq(orgReports.reportId, reportId));
  db.delete(reports).where(eq(reports.id, reportId));
}
