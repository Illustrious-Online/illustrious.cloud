import { and, eq } from "drizzle-orm";
import { db } from "../../drizzle/db";
import {
  Invoice,
  Org,
  Report,
  User,
  authentications,
  invoices,
  orgUsers,
  orgs,
  reports,
  userAuthentications,
  userInvoices,
  userReports,
  users,
} from "../../drizzle/schema";
import BadRequestError from "../domain/exceptions/BadRequestError";
import ConflictError from "../domain/exceptions/ConflictError";
import ServerError from "../domain/exceptions/ServerError";
import UnauthorizedError from "../domain/exceptions/UnauthorizedError";
import { Roles } from "../domain/interfaces/roles";

/**
 * Creates a new user.
 *
 * @param payload - The user data to be created.
 * @returns {Promise<User>} A promise that resolves to the created user.
 * @throws {ConflictError} If a user with the same data already exists.
 * @throws {Error} If an error occurs while creating the user.
 */
export async function create(payload: User): Promise<User> {
  try {
    const user: User[] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.id));

    if (user.length > 0) {
      throw new ConflictError("User already exists!");
    }

    const result = await db.insert(users).values(payload).returning();

    return result[0];
  } catch (e) {
    const error = e as ServerError;

    if (error.name === "ServerError" && error.code === 11000) {
      throw new ConflictError("User exists.");
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
export async function fetchOne(payload: {
  id?: string;
  sub?: string;
  email?: string;
}): Promise<User> {
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

  if (payload.sub) {
    const auth = await db
      .select()
      .from(authentications)
      .where(eq(authentications.sub, payload.sub));

    if (auth.length !== 1) {
      throw new ConflictError("Unable to find user with the provided sub");
    }

    const userAuth = await db
      .select()
      .from(userAuthentications)
      .where(eq(userAuthentications.authId, auth[0].id));

    if (userAuth.length !== 1) {
      throw new ConflictError("Unable to find user authentication details");
    }

    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, userAuth[0].userId));

    return result[0];
  }

  throw new BadRequestError("Failed to fetch user with provided details");
}

/**
 * Fetches all users from the database.
 *
 * @returns {Promise<User[]>} A promise that resolves to an array of User objects.
 */
export async function fetchAll(
  id: string,
  type: string,
): Promise<Invoice[] | Report[] | Org[]> {
  if (type === "reports") {
    const usersReports = await db
      .select()
      .from(reports)
      .leftJoin(userReports, eq(userReports.userId, id));

    return usersReports.map((result) => result.Report);
  }

  if (type === "invoices") {
    const usersInvoices = await db
      .select()
      .from(invoices)
      .leftJoin(userInvoices, eq(userInvoices.userId, id));

    return usersInvoices.map((result) => result.Invoice);
  }

  if (type === "orgs") {
    const usersOrgs = await db
      .select()
      .from(orgs)
      .leftJoin(orgUsers, eq(orgUsers.userId, id));

    return usersOrgs.map((result) => result.Org);
  }

  throw new BadRequestError("Required details for look up are missing");
}

export async function update(payload: User): Promise<User> {
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

export async function deleteOne(sub: string, userId: string): Promise<void> {
  const user = await fetchOne({ sub });

  if (user.id !== userId) {
    throw new ConflictError("Provided user does not match authenticaiton ID.");
  }

  const userAuths = await db
    .select()
    .from(userAuthentications)
    .where(eq(userAuthentications.userId, user.id));

  if (userAuths.length < 1) {
    throw new ConflictError("Unable to find user authentication.");
  }

  userAuths.forEach(async (userAuth) => {
    await db
      .delete(authentications)
      .where(eq(authentications.id, userAuth.authId));
  });

  db.delete(users).where(eq(users.id, user.id));
}

export async function validatePermissions(
  sub: string,
  org: string,
): Promise<User> {
  const user = await fetchOne({ sub });
  const userFromOrg = await db
    .select()
    .from(orgUsers)
    .where(and(eq(orgUsers.userId, user.id), eq(orgUsers.orgId, org)));

  if (userFromOrg.length === 0) {
    throw new ConflictError(
      "Unable to continue: Failed to find user in organization",
    );
  }

  const roleIndex = Object.keys(Roles).indexOf(userFromOrg[0].role);

  if (roleIndex !== Roles.ADMIN && roleIndex !== Roles.OWNER) {
    throw new UnauthorizedError(
      "Unable to continue: User is not have sufficient permissions",
    );
  }

  return user;
}
