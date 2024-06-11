import { NotFoundError } from "elysia";

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
import * as userService from "./user";

/**
 * Creates a new user.
 *
 * @param payload - The org data to be created.
 * @returns {Promise<Org>} A promise that resolves to the created org.
 * @throws {ConflictError} If an org with the same data already exists.
 * @throws {Error} If an error occurs while creating the org.
 */
export async function create(payload: Org): Promise<Org> {
  try {
    const user = await db.select().from(orgs).where(eq(orgs.id, payload.id));

    if (user) {
      throw new ConflictError("Organization already exists!");
    }

    const result = await db.insert(orgs).values(payload).returning();

    return result[0];
  } catch (e) {
    const error = e as ServerError;

    if (error.name === "ServerError" && error.code === 11000) {
      throw new ConflictError("Organization exists.");
    }

    throw error;
  }
}

/**
 * Fetches a user by id.
 *
 * @param {string} id The id of the user to fetch.
 * @returns {Promise<User>} A promise that resolves array User objects.
 */
export async function fetchOne(id: string): Promise<Org> {
  const result = await db.select().from(orgs).where(eq(orgs.id, id));

  if (result.length > 0) {
    return result[0];
  }

  throw new NotFoundError();
}

/**
 * Fetches all users from the database.
 *
 * @returns {Promise<User[]>} A promise that resolves to an array of User objects.
 */
export async function fetchAll(
  id: string,
  type: string,
): Promise<Invoice[] | Report[] | User[]> {
  if (type === "reports") {
    const orgsReports = await db
      .select()
      .from(reports)
      .leftJoin(orgReports, eq(orgReports.orgId, id));

    return orgsReports.map((result) => result.Report);
  }

  if (type === "invoices") {
    const orgsInvoices = await db
      .select()
      .from(invoices)
      .leftJoin(orgInvoices, eq(orgInvoices.orgId, id));

    return orgsInvoices.map((result) => result.Invoice);
  }

  if (type === "users") {
    const orgsUsers = await db
      .select()
      .from(users)
      .leftJoin(orgUsers, eq(orgUsers.orgId, id));

    return orgsUsers.map((result) => result.User);
  }

  throw new BadRequestError("Required details for look up are missing");
}

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

export async function deleteOne(sub: string, id: string): Promise<void> {
  const currentUser = await userService.fetchOne({ sub });
  const orgsList = await db.select().from(orgs).where(eq(orgs.id, id));

  if (orgsList.length < 1) {
    throw new ConflictError("Unable to find associated org for the user");
  }

  const currentOrg = orgsList[0];
  const orgUserList = await db
    .select()
    .from(orgUsers)
    .where(eq(orgUsers.userId, currentUser.id));

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
