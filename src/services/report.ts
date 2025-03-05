import { eq } from "drizzle-orm";
import { NotFoundError } from "elysia";

import ConflictError from "@/domain/exceptions/ConflictError";
import type { CreateReport } from "@/domain/interfaces/reports";
import { db } from "@/drizzle/db";
import { type Report, orgReport, report, userReport } from "@/drizzle/schema";

/**
 * Creates a new report in the database.
 *
 * @param payload - The data required to create a report, including client, creator, organization, and report details.
 * @returns A promise that resolves to the created report.
 * @throws ConflictError - If a report with the same ID already exists.
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

  payloadReport.createdAt = new Date(payloadReport.createdAt);
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
 * Fetches a report by its ID.
 *
 * @param id - The unique identifier of the report to fetch.
 * @returns A promise that resolves to the fetched report.
 * @throws NotFoundError - If no report is found with the given ID.
 */
export async function fetchReport(id: string): Promise<Report> {
  const data = await db.select().from(report).where(eq(report.id, id));

  if (data.length === 0) {
    throw new NotFoundError("Report not found.");
  }

  return data[0];
}

/**
 * Updates an existing report in the database.
 *
 * @param payload - The report data to update, including the report ID, rating, and notes.
 * @returns A promise that resolves to the updated report.
 * @throws {ConflictError} If the report could not be found or if the update operation fails.
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
 * Removes a report and its associated user and organization reports from the database.
 *
 * @param reportId - The unique identifier of the report to be removed.
 * @returns A promise that resolves when the report and its associations have been deleted.
 */
export async function removeReport(reportId: string): Promise<void> {
  await db.delete(userReport).where(eq(userReport.reportId, reportId));
  await db.delete(orgReport).where(eq(orgReport.reportId, reportId));
  await db.delete(report).where(eq(report.id, reportId));
}
