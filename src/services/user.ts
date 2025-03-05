import config from "@/config";
import BadRequestError from "@/domain/exceptions/BadRequestError";
import ConflictError from "@/domain/exceptions/ConflictError";
import ServerError from "@/domain/exceptions/ServerError";
import type { FetchUser } from "@/domain/interfaces/users";
import { UserRole } from "@/domain/types/UserRole";
import { db } from "@/drizzle/db";
import {
  type User as IllustriousUser,
  type Invoice,
  type Org,
  type Report,
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
import axios from "axios";
import { and, eq } from "drizzle-orm";

const supaConfig = {
  method: "post",
  maxBodyLength: Number.POSITIVE_INFINITY,
  headers: {
    Authorization: `Bearer ${config.auth.edgeKey}`,
    "Content-Type": "application/x-www-form-urlencoded",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  },
  url: `https://${config.auth.supabaseId ?? "test"}.supabase.co/functions/v1`,
};

/**
 * Updates an existing user or creates a new user if one does not exist.
 *
 * @param payload - The user data to update or create.
 * @returns A promise that resolves to the updated or newly created user.
 * @throws {BadRequestError} If the payload is missing the required `id` field.
 */
export async function updateOrCreate(
  payload: IllustriousUser,
): Promise<IllustriousUser> {
  if (!payload.id) {
    throw new BadRequestError("Payload is missing required details");
  }

  const findUser: IllustriousUser | undefined = await fetchUser({
    id: payload.id,
  });

  if (findUser) {
    return await updateUser(payload);
  }

  const result = await db.insert(user).values(payload).returning();

  return result[0];
}

/**
 * Fetches a user from the database based on the provided payload.
 *
 * @param payload - An object containing the key-value pair to search for the user.
 * @returns A promise that resolves to an `IllustriousUser` object.
 *
 * @throws Will throw an error if the database query fails.
 */
export async function fetchUser(payload: FetchUser): Promise<IllustriousUser> {
  const key = Object.keys(payload)[0] as keyof FetchUser;
  const value = Object.values(payload)[0];

  const result = await db.select().from(user).where(eq(user[key], value));
  return result[0];
}

/**
 * Fetches resources associated with a user.
 *
 * @param id - The ID of the user.
 * @param resources - An array of resource types to fetch (e.g., "reports", "invoices", "orgs").
 * @param orgId - (Optional) The ID of the organization to filter the resources by.
 * @returns A promise that resolves to an object containing the requested resources.
 *
 * The returned object may contain the following properties:
 * - `orgId` (optional): The ID of the organization.
 * - `reports` (optional): An array of `Report` objects associated with the user.
 * - `invoices` (optional): An array of `Invoice` objects associated with the user.
 * - `orgs` (optional): An array of `Org` objects associated with the user.
 */
export async function fetchResources(
  id: string,
  resources: string[],
  orgId?: string,
): Promise<{
  orgId?: string;
  reports?: Report[];
  invoices?: Invoice[];
  orgs?: Org[];
}> {
  const result: {
    orgId?: string;
    reports?: Report[];
    invoices?: Invoice[];
    orgs?: Org[];
  } = {};

  if (orgId) {
    result.orgId = orgId;
  }

  if (resources.includes("reports")) {
    const usersReports = await db
      .select({
        report: report,
        orgReport: orgReport,
      })
      .from(report)
      .innerJoin(userReport, eq(report.id, userReport.reportId))
      .leftJoin(orgReport, eq(orgReport.reportId, userReport.reportId))
      .where(eq(userReport.userId, id));

    result.reports = usersReports
      .filter((r) => !orgId || r.orgReport?.orgId === orgId)
      .map((result) => result.report);
  }

  if (resources.includes("invoices")) {
    const usersInvoices = await db
      .select({
        invoice: invoice,
        orgInvoice: orgInvoice,
      })
      .from(invoice)
      .innerJoin(userInvoice, eq(invoice.id, userInvoice.invoiceId))
      .leftJoin(orgInvoice, eq(orgInvoice.invoiceId, userInvoice.invoiceId))
      .where(eq(userInvoice.userId, id));

    result.invoices = usersInvoices
      .filter((i) => !orgId || i.orgInvoice?.orgId === orgId)
      .map((result) => result.invoice);
  }

  if (resources.includes("orgs")) {
    const usersOrgs = await db
      .select()
      .from(org)
      .innerJoin(orgUser, eq(orgUser.userId, id));

    result.orgs = usersOrgs.map((result) => result.Org);
  }

  return result;
}

/**
 * Updates a user in the database with the provided payload.
 *
 * @param payload - An object containing the user's updated information.
 * @returns A promise that resolves to the updated user object.
 *
 * @example
 * ```typescript
 * const updatedUser = await updateUser({
 *   id: '123',
 *   email: 'newemail@example.com',
 *   firstName: 'John',
 *   lastName: 'Doe',
 *   picture: 'newpictureurl',
 *   phone: '123-456-7890'
 * });
 * ```
 */
export async function updateUser(
  payload: IllustriousUser,
): Promise<IllustriousUser> {
  const { id, email, firstName, lastName, picture, phone } = payload;
  const result = await db
    .update(user)
    .set({
      email,
      firstName,
      lastName,
      picture,
      phone,
    })
    .where(eq(user.id, id))
    .returning();

  return result[0];
}

/**
 * Removes a user from the database and performs necessary checks before deletion.
 *
 * @param userId - The ID of the user to be removed.
 * @param identifier - The identifier of the user to be used in the external request.
 * @throws {ConflictError} If the user could not be found with the provided details.
 * @throws {ConflictError} If the user has existing reports.
 * @throws {ConflictError} If the user has unpaid invoices.
 * @throws {ConflictError} If the user is an owner of an organization.
 * @returns {Promise<void>} A promise that resolves when the user is successfully removed.
 */
export async function removeUser(
  userId: string,
  identifier: string,
): Promise<void> {
  const userList = await db.select().from(user).where(eq(user.id, userId));

  if (userList.length < 1) {
    throw new ConflictError(
      "User could not be found with the provided details",
    );
  }

  const existingReports = await db
    .select()
    .from(report)
    .innerJoin(userReport, eq(userReport.userId, userId));

  if (existingReports.length > 0) {
    throw new ConflictError("User has existing reports");
  }

  const unpaidInvoices = await db
    .select()
    .from(invoice)
    .innerJoin(userInvoice, eq(userInvoice.userId, userId))
    .where(eq(invoice.paid, false));

  if (unpaidInvoices.length > 0) {
    throw new ConflictError("User has unpaid invoices");
  }

  const ownedOrgs = await db
    .select()
    .from(orgUser)
    .where(and(eq(orgUser.userId, userId), eq(orgUser.role, UserRole.OWNER)));

  if (ownedOrgs.length > 0) {
    throw new ConflictError("User is an owner of an organization");
  }

  await db.delete(user).where(eq(user.id, userId));

  if (!config.app.env.includes("test")) {
    await axios.request({
      ...supaConfig,
      url: `${supaConfig.url}/delete-user`,
      data: {
        user: identifier,
      },
    });
  }
}

/**
 * Links a Steam account to the user's profile.
 *
 * @param {boolean} [authenticate] - Optional flag to indicate if authentication is required.
 * @returns {Promise<{ url?: string; message?: string }>} - A promise that resolves to an object containing the URL or a message.
 * @throws {ServerError} - Throws an error if the server responds with a status of 500.
 */
export async function linkSteam(
  authenticate?: boolean,
): Promise<{ url?: string; message?: string }> {
  const path = `/steam-auth${authenticate ? "/authenticate" : ""}`;
  const steamConfig = {
    ...supaConfig,
    url: `${supaConfig.url}${path}`,
  };

  const response = await axios.request(steamConfig);

  if (response.status === 500) {
    throw new ServerError(
      authenticate
        ? "Error linking Steam account"
        : "Error completing link with Steam",
      500,
    );
  }

  return response.data;
}
