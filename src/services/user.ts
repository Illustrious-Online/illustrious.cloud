import { supabaseClient } from "@/app";
import config from "@/config";
import BadRequestError from "@/domain/exceptions/BadRequestError";
import ConflictError from "@/domain/exceptions/ConflictError";
import ServerError from "@/domain/exceptions/ServerError";
import type { FetchUser } from "@/domain/interfaces/users";
import { User } from "@/domain/models/user";
import { UserRole } from "@/domain/types/UserRole";
import axios from "axios";
import { and, eq } from "drizzle-orm";
import { db } from "../drizzle/db";
import {
  type User as IllustriousUser,
  type Invoice,
  type Org,
  type Report,
  invoices,
  orgUsers,
  orgs,
  reports,
  userInvoices,
  userReports,
  users,
} from "../drizzle/schema";

/**
 * Creates a new user.
 *
 * @param payload - The user data to be created.
 * @returns {Promise<User>} A promise that resolves to the created user.
 * @throws {ConflictError} If a user with the same data already exists.
 * @throws {Error} If an error occurs while creating the user.
 */
export async function updateOrCreate(
  payload: IllustriousUser,
): Promise<IllustriousUser> {
  if (!payload.id) {
    throw new BadRequestError("Payload is missing required details");
  }

  const user: IllustriousUser | undefined = await fetchOne({ id: payload.id });

  if (user) {
    return await update(payload);
  }

  const result = await db.insert(users).values(payload).returning();

  return result[0];
}

/**
 * Fetches a User by email, id, sub.
 *
 * @param payload - The email, id, or sub of the User to fetch.
 * @returns {Promise<IllustriousUser>} A promise that resolves the User object.
 */
export async function fetchOne(payload: FetchUser): Promise<IllustriousUser> {
  if (payload.id) {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.id));
    return result[0];
  }

  if (payload.email) {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, payload.email));
    return result[0];
  }

  if (payload.identifier) {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.identifier, payload.identifier));
    return result[0];
  }

  throw new ConflictError("User could not be found with the provided details.");
}

/**
 * Fetches all resources for User from the database.
 *
 * @param id - User ID used to gather relationships.
 * @param type - Type as string; either "reports", "invoices", or "orgs".
 * @returns {Promise<Invoice[] | Report[] | Org[]>} A promise that resolves to an array of Resource objects.
 */
export async function fetchResources(
  id: string,
  type?: {
    reports?: boolean;
    invoices?: boolean;
    orgs?: boolean;
  },
): Promise<{
  reports?: Report[];
  invoices?: Invoice[];
  orgs?: Org[];
}> {
  const result: {
    reports?: Report[];
    invoices?: Invoice[];
    orgs?: Org[];
  } = {};

  if (!type || type.reports) {
    const usersReports = await db
      .select()
      .from(reports)
      .innerJoin(userReports, eq(userReports.userId, id));

    result.reports = usersReports.map((result) => result.Report);
  }

  if (!type || type.invoices) {
    const usersInvoices = await db
      .select()
      .from(invoices)
      .innerJoin(userInvoices, eq(userInvoices.userId, id));

    result.invoices = usersInvoices.map((result) => result.Invoice);
  }

  if (!type || type.orgs) {
    const usersOrgs = await db
      .select()
      .from(orgs)
      .innerJoin(orgUsers, eq(orgUsers.userId, id));

    result.orgs = usersOrgs.map((result) => result.Org);
  }

  return result;
}

/**
 * Updates a User.
 *
 * @param payload - The new User data to update.
 * @returns {Promise<User>} A promise that resolves to an User object.
 */
export async function update(
  payload: IllustriousUser,
): Promise<IllustriousUser> {
  const { id, email, firstName, lastName, picture, phone } = payload;
  const result = await db
    .update(users)
    .set({
      email,
      firstName,
      lastName,
      picture,
      phone,
    })
    .where(eq(users.id, id))
    .returning();

  return result[0];
}

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
 * Removes an Organization and all related resources.
 *
 * @param userId - The User ID for current user.
 * @param id - The Organization ID to be removed.
 * @throws {ConflictError} If an Organization is not allowed to be removed.
 */
export async function deleteOne(
  userId: string,
  identifier: string,
): Promise<void> {
  const userList = await db.select().from(users).where(eq(users.id, userId));

  if (userList.length < 1) {
    throw new ConflictError(
      "User could not be found with the provided details",
    );
  }

  const unpaidInvoices = await db
    .select()
    .from(invoices)
    .innerJoin(userInvoices, eq(userInvoices.userId, userId))
    .where(eq(invoices.paid, false));

  if (unpaidInvoices.length > 0) {
    throw new ConflictError("User has unpaid invoices");
  }

  const ownedOrgs = await db
    .select()
    .from(orgUsers)
    .where(and(eq(orgUsers.userId, userId), eq(orgUsers.role, UserRole.OWNER)));

  if (ownedOrgs.length > 0) {
    throw new ConflictError("User is an owner of an organization");
  }

  await db.delete(users).where(eq(users.id, userId));

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
