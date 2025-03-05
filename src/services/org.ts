import { NotFoundError } from "elysia";

import ConflictError from "@/domain/exceptions/ConflictError";
import type { CreateOrg } from "@/domain/interfaces/orgs";
import type { OrgDetails } from "@/domain/interfaces/orgs";
import { UserRole } from "@/domain/types/UserRole";
import { db } from "@/drizzle/db";
import {
  type Org,
  invoice,
  org,
  orgInvoice,
  orgReport,
  orgUser,
  report,
  user,
  userInvoice,
  userReport,
} from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";

/**
 * Creates a new organization.
 *
 * @param payload - The payload containing the user and organization details.
 * @returns A promise that resolves to the newly created organization.
 * @throws {ConflictError} If the organization already exists or if the creation fails.
 */
export async function createOrg(payload: CreateOrg): Promise<Org> {
  const { user, org: payloadOrg } = payload;
  const newOrg = await db.select().from(org).where(eq(org.id, payloadOrg.id));

  if (newOrg.length > 0) {
    throw new ConflictError("Organization already exists!");
  }

  const result = await db.insert(org).values(payload.org).returning();

  if (result.length === 0) {
    throw new ConflictError("Failed to create the new organization.");
  }

  await db.insert(orgUser).values({
    role: UserRole.OWNER,
    userId: user,
    orgId: result[0].id,
  });

  return result[0];
}

/**
 * Fetches an organization by its ID.
 *
 * @param id - The ID of the organization to fetch.
 * @returns A promise that resolves to the organization object.
 * @throws NotFoundError - If no organization is found with the given ID.
 */
export async function fetchOrg(id: string): Promise<Org> {
  const result = await db.select().from(org).where(eq(org.id, id));

  if (result.length === 0) {
    throw new NotFoundError();
  }

  return result[0];
}

/**
 * Fetches organization resources based on the provided resource types and optional user ID.
 *
 * @param id - The ID of the organization.
 * @param resource - An array of resource types to fetch (e.g., "reports", "invoices", "users").
 * @param userId - (Optional) The ID of the user to filter the resources by.
 * @returns A promise that resolves to an object containing the requested organization details.
 *
 * @example
 * ```typescript
 * const orgDetails = await fetchOrgResources("org123", ["reports", "invoices"], "user456");
 * console.log(orgDetails);
 * ```
 */
export async function fetchOrgResources(
  id: string,
  resource: string[],
  userId?: string,
): Promise<OrgDetails> {
  const resources: OrgDetails = {};

  if (resource.includes("reports")) {
    const orgsReports = await db
      .select()
      .from(orgReport)
      .innerJoin(userReport, eq(orgReport.reportId, userReport.reportId))
      .innerJoin(orgUser, eq(userReport.userId, userReport.reportId))
      .innerJoin(report, eq(orgReport.reportId, report.id))
      .where(
        and(
          eq(orgReport.orgId, id),
          eq(userReport.reportId, orgReport.reportId),
          eq(report.id, userReport.reportId),
        ),
      );

    resources.reports = orgsReports
      .filter((r) => !userId || r.UserReport.userId === userId)
      .map((r) => ({
        report: r.Report,
        userId: r.UserReport.userId,
        role: r.OrgUser.role,
      }));
  }

  if (resource.includes("invoices")) {
    const orgsInvoices = await db
      .select()
      .from(orgInvoice)
      .innerJoin(userInvoice, eq(orgInvoice.invoiceId, userInvoice.invoiceId))
      .innerJoin(orgUser, eq(userInvoice.userId, orgUser.userId))
      .innerJoin(invoice, eq(orgInvoice.invoiceId, invoice.id))
      .where(
        and(
          eq(orgInvoice.orgId, id),
          eq(userInvoice.invoiceId, orgInvoice.invoiceId),
          eq(invoice.id, userInvoice.invoiceId),
        ),
      );

    resources.invoices = orgsInvoices
      .filter((i) => !userId || i.UserInvoice.userId === userId)
      .map((i) => ({
        invoice: i.Invoice,
        userId: i.UserInvoice.userId,
        role: i.OrgUser.role,
      }));
  }

  if (resource.includes("users")) {
    const orgsUsers = await db
      .select()
      .from(orgUser)
      .innerJoin(user, eq(orgUser.userId, user.id))
      .where(eq(orgUser.orgId, id));

    resources.users = orgsUsers.map((u) => ({
      orgUser: u.User,
      role: u.OrgUser.role,
    }));
  }

  return resources;
}

/**
 * Updates an organization with the given payload.
 *
 * @param payload - The organization data to update.
 * @returns A promise that resolves to the updated organization.
 */
export async function updateOrg(payload: Org): Promise<Org> {
  const { id, name, contact } = payload;
  const result = await db
    .update(org)
    .set({
      name,
      contact,
    })
    .where(eq(org.id, id))
    .returning();

  return result[0];
}

/**
 * Removes an organization and its associated data from the database.
 *
 * This function performs the following steps:
 * 1. Retrieves the organization by its ID.
 * 2. Throws a `ConflictError` if the organization is not found.
 * 3. Retrieves and deletes all invoices associated with the organization.
 * 4. Retrieves and deletes all reports associated with the organization.
 * 5. Deletes all user associations with the organization.
 * 6. Deletes the organization itself.
 *
 * @param id - The ID of the organization to be removed.
 * @throws {ConflictError} If the organization is not found.
 * @returns A promise that resolves when the organization and its associated data are removed.
 */
export async function removeOrg(id: string): Promise<void> {
  const orgsList = await db.select().from(org).where(eq(org.id, id));
  if (orgsList.length < 1) {
    throw new ConflictError("Unable to find associated org for the user");
  }

  const currentOrg = orgsList[0];
  const orgInvoicesList = await db
    .select()
    .from(orgInvoice)
    .where(eq(orgInvoice.orgId, currentOrg.id));
  const orgReportsList = await db
    .select()
    .from(orgReport)
    .where(eq(orgReport.orgId, currentOrg.id));

  if (orgInvoicesList.length > 0) {
    for (const i of orgInvoicesList) {
      await db
        .delete(userInvoice)
        .where(eq(userInvoice.invoiceId, i.invoiceId));
      await db.delete(orgInvoice).where(eq(orgInvoice.invoiceId, i.invoiceId));
      await db.delete(invoice).where(eq(invoice.id, i.invoiceId));
    }
  }

  if (orgReportsList.length > 0) {
    for (const r of orgReportsList) {
      await db.delete(userReport).where(eq(userReport.reportId, r.reportId));
      await db.delete(orgReport).where(eq(orgReport.reportId, r.reportId));
      await db.delete(report).where(eq(report.id, r.reportId));
    }
  }

  await db.delete(orgUser).where(eq(orgUser.orgId, id));
  await db.delete(org).where(eq(org.id, id));
}
