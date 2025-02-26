import { NotFoundError } from "elysia";
import { v4 as uuidv4 } from "uuid";

import BadRequestError from "@/domain/exceptions/BadRequestError";
import ConflictError from "@/domain/exceptions/ConflictError";
import type { CreateOrg } from "@/domain/interfaces/orgs";
import { UserRole } from "@/domain/types/UserRole";
import { db } from "@/drizzle/db";
import {
  type Invoice,
  type Org,
  type Report,
  type User,
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
import { eq } from "drizzle-orm";

/**
 * Creates a new Organization.
 *
 * @param payload - The Organization data to be created.
 * @returns {Promise<Org>} A promise that resolves to the created Organization.
 * @throws {ConflictError} If an Organization with the same data already exists.
 * @throws {Error} If an error occurs while creating the Organization.
 */
export async function create(payload: CreateOrg): Promise<Org> {
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
export async function fetchOne(id: string): Promise<Org> {
  const result = await db.select().from(org).where(eq(org.id, id));

  if (result.length === 0) {
    throw new NotFoundError();
  }

  return result[0];
}

/**
 * Fetches all resources for an Organization from the database.
 *
 * @returns {Promise<User[]>} A promise that resolves to an array of User objects.
 */
export async function fetchResources(
  id: string,
  resource: string,
): Promise<Invoice[] | Report[] | User[]> {
  switch (resource) {
    case "reports": {
      const orgsReports = db
        .select()
        .from(orgReport)
        .where(eq(orgReport.orgId, id))
        .as("orgsReports");

      const _reports = await db
        .select()
        .from(report)
        .innerJoin(orgsReports, eq(report.id, orgsReports.reportId));

      return _reports.map((result) => result.Report);
    }
    case "invoices": {
      const orgsInvoices = db
        .select()
        .from(orgInvoice)
        .where(eq(orgInvoice.orgId, id))
        .as("orgsInvoices");

      const _invoices = await db
        .select()
        .from(invoice)
        .innerJoin(orgsInvoices, eq(invoice.id, orgsInvoices.invoiceId));

      return _invoices.map((result) => result.Invoice);
    }
    case "users": {
      const orgsUsers = db
        .select()
        .from(orgUser)
        .where(eq(orgUser.orgId, id))
        .as("orgsUsers");

      const _users = await db
        .select()
        .from(user)
        .innerJoin(orgsUsers, eq(user.id, orgsUsers.userId));

      return _users.map((result) => result.User);
    }
    default:
      throw new BadRequestError("Required details for look up are missing");
  }
}

/**
 * Updates an Organization.
 *
 * @param payload - The new Organization data to update.
 * @returns {Promise<Org>} A promise that resolves to an Organization object.
 */
export async function update(payload: Org): Promise<Org> {
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
export async function deleteOne(id: string): Promise<void> {
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
