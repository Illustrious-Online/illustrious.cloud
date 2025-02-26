import { eq } from "drizzle-orm";
import { NotFoundError } from "elysia";

import ConflictError from "@/domain/exceptions/ConflictError";
import type { CreateReport } from "@/domain/interfaces/reports";
import { db } from "@/drizzle/db";
import { type Report, orgReport, report, userReport } from "@/drizzle/schema";

/**
 * Creates a new Report.
 *
 * @param payload - The Report data to be created.
 * @returns {Promise<Report>} A promise that resolves to the created Report.
 * @throws {ConflictError} If an Report with the same data already exists.
 * @throws {Error} If an error occurs while creating the Report.
 */
export async function createReport(payload: CreateReport): Promise<Report> {
  const { client, creator, org, report: payloadReport } = payload;
  const foundReport = await db
    .select()
    .from(report)
    .where(eq(report.id, payloadReport.id));

  if (foundReport.length > 0) {
    throw new ConflictError("The report already exists.");
  }

  const result = await db.insert(report).values(payloadReport).returning();

  for (const role of [client, creator]) {
    await db.insert(userReport).values({
      userId: role,
      reportId: payloadReport.id,
    });
  }

  await db.insert(orgReport).values({
    orgId: org,
    reportId: payloadReport.id,
  });

  return result[0];
}

/**
 * Fetches an Report by id.
 *
 * @param payload - The id of the Report to fetch; optional userId to validate relationship.
 * @returns {Promise<Report>} A promise that resolves the Report object.
 */
export async function fetchReport(id: string): Promise<Report> {
  const data = await db.select().from(report).where(eq(report.id, id));

  if (data.length === 0) {
    throw new NotFoundError("Report not found.");
  }

  return data[0];
}

/**
 * Updates a Report.
 *
 * @param payload - The new Report object to update.
 * @returns {Promise<Report>} A promise that resolves to an Report object.
 */
export async function updateReport(payload: Report): Promise<Report> {
  const { id, rating, notes } = payload;
  const foundReport = await db.select().from(report).where(eq(report.id, id));

  if (!foundReport) {
    throw new ConflictError("Could not find the report.");
  }

  const result = await db
    .update(report)
    .set({
      rating,
      notes,
    })
    .where(eq(report.id, id))
    .returning();

  if (result.length === 0) {
    throw new ConflictError("Failed to return response on update.");
  }

  return result[0];
}

/**
 * Removes a Report and relationships.
 *
 * @param invoiceId - The Report ID to be removed.
 * @throws {ConflictError} If a user with the same data already exists.
 */
export async function removeReport(reportId: string): Promise<void> {
  db.delete(userReport).where(eq(userReport.reportId, reportId));
  db.delete(orgReport).where(eq(orgReport.reportId, reportId));
  db.delete(report).where(eq(report.id, reportId));
}
