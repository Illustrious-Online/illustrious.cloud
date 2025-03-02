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
 * Creates a new Organization.
 *
 * @param payload - The Organization data to be created.
 * @returns {Promise<Org>} A promise that resolves to the created Organization.
 * @throws {ConflictError} If an Organization with the same data already exists.
 * @throws {Error} If an error occurs while creating the Organization.
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
 * Fetches an Organization by id.
 *
 * @param payload - The id of the Organization to fetch.
 * @returns {Promise<Org>} A promise that resolves the Organization object.
 */
export async function fetchOrg(id: string): Promise<Org> {
  const result = await db.select().from(org).where(eq(org.id, id));

  if (result.length === 0) {
    throw new NotFoundError();
  }

  return result[0];
}

/**
 * Fetches organization resources based on the provided resource types.
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
  const resources: OrgDetails = { id };

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

    const result = orgsReports
      .filter((r) => !userId || r.UserReport.userId === userId)
      .map((r) => ({
        report: r.Report,
        userId: r.UserReport.userId,
        role: r.OrgUser.role,
      }));

    resources.reports = result;
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

    const result = orgsInvoices
      .filter((i) => !userId || i.UserInvoice.userId === userId)
      .map((i) => ({
        invoice: i.Invoice,
        userId: i.UserInvoice.userId,
        role: i.OrgUser.role,
      }));

    resources.invoices = result;
  }

  if (resource.includes("users")) {
    const orgsUsers = await db
      .select()
      .from(orgUser)
      .innerJoin(user, eq(orgUser.userId, user.id))
      .where(eq(orgUser.orgId, id));

    const result = orgsUsers.map((u) => ({
      orgUser: u.User,
      role: u.OrgUser.role,
    }));

    resources.users = result;
  }

  return resources;
}

/**
 * Updates an Organization.
 *
 * @param payload - The new Organization data to update.
 * @returns {Promise<Org>} A promise that resolves to an Organization object.
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
 * Removes an Organization and all related resources.
 *
 * @param userId - The User ID for current user.
 * @param id - The Organization ID to be removed.
 * @throws {ConflictError} If an Organization is not allowed to be removed.
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
