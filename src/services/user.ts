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
 * @param payload - An object containing user identification details. It must have at least one of the following properties:
 * - `id`: The unique identifier of the user.
 * - `email`: The email address of the user.
 * - `identifier`: Another unique identifier for the user.
 *
 * @returns A promise that resolves to an `IllustriousUser` object.
 */
export async function fetchUser(payload: FetchUser): Promise<IllustriousUser> {
  const key = Object.keys(payload)[0] as keyof FetchUser;
  const value = Object.values(payload)[0];

  const result = await db.select().from(user).where(eq(user[key], value));
  return result[0];
}

/**
 * Fetches specified resources for a given user.
 *
 * @param id - The ID of the user whose resources are to be fetched.
 * @param resources - An array of resource types to fetch (e.g., "reports", "invoices", "orgs").
 * @returns A promise that resolves to an object containing the requested resources.
 *          The object may contain the following properties:
 *          - `reports`: An array of `Report` objects if "reports" is included in the resources.
 *          - `invoices`: An array of `Invoice` objects if "invoices" is included in the resources.
 *          - `orgs`: An array of `Org` objects if "orgs" is included in the resources.
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
      .select()
      .from(userReport)
      .innerJoin(orgReport, eq(orgReport.reportId, userReport.reportId))
      .innerJoin(report, eq(userReport.reportId, report.id))
      .where(
        and(
          eq(userReport.userId, id),
          eq(userReport.reportId, orgReport.reportId),
          eq(report.id, userReport.reportId),
        ),
      );

    result.reports = usersReports
      .filter((r) => !orgId || r.OrgReport.orgId === orgId)
      .map((result) => result.Report);
  }

  if (resources.includes("invoices")) {
    const usersInvoices = await db
      .select()
      .from(userInvoice)
      .innerJoin(orgInvoice, eq(orgInvoice.invoiceId, userInvoice.invoiceId))
      .innerJoin(invoice, eq(userInvoice.invoiceId, report.id))
      .where(
        and(
          eq(userInvoice.userId, id),
          eq(userInvoice.invoiceId, orgInvoice.invoiceId),
          eq(invoice.id, userInvoice.invoiceId),
        ),
      );

    result.invoices = usersInvoices
      .filter((i) => !orgId || i.OrgInvoice.orgId === orgId)
      .map((result) => result.Invoice);
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
 * @param payload - An object containing the user details to be updated.
 * @param payload.id - The unique identifier of the user.
 * @param payload.email - The email address of the user.
 * @param payload.firstName - The first name of the user.
 * @param payload.lastName - The last name of the user.
 * @param payload.picture - The URL of the user's profile picture.
 * @param payload.phone - The phone number of the user.
 * @returns A promise that resolves to the updated user object.
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
 * Removes a user from the database.
 *
 * This function performs several checks before removing the user:
 * 1. Verifies if the user exists.
 * 2. Checks if the user has any unpaid invoices.
 * 3. Ensures the user is not an owner of any organization.
 *
 * If any of these checks fail, a `ConflictError` is thrown.
 * If the environment is not "test", an additional request is made to an external service to delete the user.
 *
 * @param userId - The ID of the user to be removed.
 * @param identifier - An identifier for the user, used in the external service request.
 * @throws {ConflictError} If the user does not exist, has unpaid invoices, or is an owner of an organization.
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
 * @param {boolean} [authenticate] - If true, the function will authenticate the user with Steam.
 * @returns {Promise<{ url?: string; message?: string }>} A promise that resolves to an object containing the URL for Steam authentication or a message.
 * @throws {ServerError} Throws an error if the server responds with a status of 500.
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
