import { NotFoundError } from "elysia";
import { v4 as uuidv4 } from "uuid";

import { eq } from "drizzle-orm";
import { db } from "../../drizzle/db";
import {
  Invoice,
  Org,
  Report,
  User,
  invoices,
  orgInvoices,
  orgReports,
  orgUsers,
  orgs,
  reports,
  userInvoices,
  userReports,
  users,
} from "../../drizzle/schema";
import BadRequestError from "../domain/exceptions/BadRequestError";
import ConflictError from "../domain/exceptions/ConflictError";
import ServerError from "../domain/exceptions/ServerError";
import UnauthorizedError from "../domain/exceptions/UnauthorizedError";
import { CreateOrg } from "../domain/interfaces/orgs";

/**
 * Creates a new Organization.
 *
 * @param payload - The Organization data to be created.
 * @returns {Promise<Org>} A promise that resolves to the created Organization.
 * @throws {ConflictError} If an Organization with the same data already exists.
 * @throws {Error} If an error occurs while creating the Organization.
 */
export async function create(payload: CreateOrg): Promise<Org> {
  try {
    const { user, org } = payload;
    const newOrg = await db.select().from(orgs).where(eq(orgs.id, org.id));

    if (newOrg.length > 0) {
      throw new ConflictError("Organization already exists!");
    }

    const result = await db.insert(orgs).values(payload.org).returning();

    if (result.length > 0) {
      await db.insert(orgUsers).values({
        id: uuidv4(),
        role: "OWNER",
        userId: user,
        orgId: result[0].id,
      });

      return result[0];
    }

    throw new ConflictError("Failed to create the new organization.");
  } catch (e) {
    const error = e as ServerError;

    if (error.name === "ServerError" && error.code === 11000) {
      throw new ConflictError("Organization exists.");
    }

    throw error;
  }
}

/**
 * Fetches an Organization by id.
 *
 * @param payload - The id of the Organization to fetch.
 * @returns {Promise<Org>} A promise that resolves the Organization object.
 */
export async function fetchOne(id: string): Promise<Org> {
  const result = await db.select().from(orgs).where(eq(orgs.id, id));

  if (result.length > 0) {
    return result[0];
  }

  throw new NotFoundError();
}

/**
 * Fetches all resources for an Organization from the database.
 *
 * @returns {Promise<User[]>} A promise that resolves to an array of User objects.
 */
export async function fetchAll(
  id: string,
  type: string,
): Promise<Invoice[] | Report[] | User[]> {
  if (type === "reports") {
    const orgsReports = db
      .select()
      .from(orgReports)
      .where(eq(orgReports.orgId, id))
      .as("orgsReports");

    const _reports = await db
      .select()
      .from(reports)
      .innerJoin(orgsReports, eq(reports.id, orgsReports.reportId));

    return _reports.map((result) => result.Report);
  }

  if (type === "invoices") {
    const orgsInvoices = db
      .select()
      .from(orgInvoices)
      .where(eq(orgInvoices.orgId, id))
      .as("orgsInvoices");

    const _invoices = await db
      .select()
      .from(invoices)
      .innerJoin(orgsInvoices, eq(invoices.id, orgsInvoices.invoiceId));

    return _invoices.map((result) => result.Invoice);
  }

  if (type === "users") {
    const orgsUsers = db
      .select()
      .from(orgUsers)
      .where(eq(orgUsers.orgId, id))
      .as("orgsUsers");

    const _users = await db
      .select()
      .from(users)
      .innerJoin(orgsUsers, eq(users.id, orgsUsers.userId));

    return _users.map((result) => result.User);
  }

  throw new BadRequestError("Required details for look up are missing");
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
    .update(orgs)
    .set({
      name,
      contact,
    })
    .where(eq(orgs.id, id))
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
export async function deleteOne(userId: string, id: string): Promise<void> {
  const orgsList = await db.select().from(orgs).where(eq(orgs.id, id));

  if (orgsList.length < 1) {
    throw new ConflictError("Unable to find associated org for the user");
  }

  const currentOrg = orgsList[0];
  const orgUserList = await db
    .select()
    .from(orgUsers)
    .where(eq(orgUsers.userId, userId));

  if (orgUserList.length < 1) {
    throw new ConflictError("Unable to determine org for report delete");
  }

  const orgUser = orgUserList.find((user) => user.orgId == id);

  if (!orgUser) {
    throw new ConflictError("Unable to determine the organization user role");
  }

  if (orgUser.role !== "OWNER") {
    throw new UnauthorizedError("This user is not allowed to delete this org");
  }

  const orgInvoicesList = await db
    .select()
    .from(orgInvoices)
    .where(eq(orgInvoices.orgId, currentOrg.id));

  if (orgInvoicesList.length < 1) {
    throw new ConflictError("Unable to determine org for report delete");
  }

  const orgReportsList = await db
    .select()
    .from(orgReports)
    .where(eq(orgReports.orgId, currentOrg.id));

  if (orgReportsList.length < 1) {
    throw new ConflictError("Unable to determine org for report delete");
  }

  orgInvoicesList.forEach(async (i) => {
    await db
      .delete(userInvoices)
      .where(eq(userInvoices.invoiceId, i.invoiceId));
    await db.delete(orgInvoices).where(eq(orgInvoices.invoiceId, i.invoiceId));
    await db.delete(invoices).where(eq(invoices.id, i.invoiceId));
  });

  orgReportsList.forEach(async (r) => {
    await db.delete(userReports).where(eq(userReports.reportId, r.reportId));
    await db.delete(orgReports).where(eq(orgReports.reportId, r.reportId));
    await db.delete(reports).where(eq(reports.id, r.reportId));
  });

  await db.delete(orgUsers).where(eq(orgUsers.orgId, id));
  await db.delete(orgs).where(eq(orgs.id, id));
}
