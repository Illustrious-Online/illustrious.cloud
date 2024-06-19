import { and, eq } from "drizzle-orm";
import { db } from "../../drizzle/db";
import {
  Invoice,
  Org,
  Report,
  Role,
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
import UnauthorizedError from "../domain/exceptions/UnauthorizedError";
import { CreateUser, FetchUser } from "../domain/interfaces/users";
import { UserRole } from "../domain/types/UserRole";

/**
 * Creates a new user.
 *
 * @param payload - The user data to be created.
 * @returns {Promise<User>} A promise that resolves to the created user.
 * @throws {ConflictError} If a user with the same data already exists.
 * @throws {Error} If an error occurs while creating the user.
 */
export async function create(payload: User): Promise<User> {
  let currentUser;

  currentUser = await db.select().from(users).where(eq(users.id, payload.id));

  if (currentUser.length > 0) {
    throw new ConflictError("User already exists!");
  }

  currentUser = await db
    .select()
    .from(users)
    .where(eq(users.email, payload.email));

  if (currentUser.length > 0) {
    throw new ConflictError("User already exists!");
  }

  const result = await db.insert(users).values(payload).returning();

  return result[0];
}

/**
 * Fetches a User by email, id, sub.
 *
 * @param payload - The email, id, or sub of the User to fetch.
 * @returns {Promise<User>} A promise that resolves the User object.
 */
export async function fetchOne(payload: FetchUser): Promise<User> {
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
    const response = await db
      .select()
      .from(authentications)
      .leftJoin(
        userAuthentications,
        eq(userAuthentications.authId, authentications.id),
      );

    const auth = response.find(
      (res) => res.Authentication.sub === payload.sub,
    )?.UserAuthentications;

    if (!auth) {
      throw new ConflictError("Unable to find user with the provided sub");
    }

    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, auth.userId));

    return result[0];
  }

  throw new BadRequestError("Failed to fetch user with provided details");
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
  type: string,
): Promise<Invoice[] | Report[] | Org[]> {
  if (type === "reports") {
    const usersReports = await db
      .select()
      .from(reports)
      .innerJoin(userReports, eq(userReports.userId, id));

    return usersReports.map((result) => result.Report);
  }

  if (type === "invoices") {
    const usersInvoices = await db
      .select()
      .from(invoices)
      .innerJoin(userInvoices, eq(userInvoices.userId, id));

    return usersInvoices.map((result) => result.Invoice);
  }

  if (type === "orgs") {
    const usersOrgs = await db
      .select()
      .from(orgs)
      .innerJoin(orgUsers, eq(orgUsers.userId, id));

    return usersOrgs.map((result) => result.Org);
  }

  throw new BadRequestError("Required details for look up are missing");
}

/**
 * Updates a User.
 *
 * @param payload - The new User data to update.
 * @returns {Promise<User>} A promise that resolves to an User object.
 */
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

/**
 * Removes an Organization and all related resources.
 *
 * @param userId - The User ID for current user.
 * @param id - The Organization ID to be removed.
 * @throws {ConflictError} If an Organization is not allowed to be removed.
 */
export async function deleteOne(userId: string): Promise<void> {
  const userAuths = await db
    .select()
    .from(userAuthentications)
    .where(eq(userAuthentications.userId, userId));

  if (userAuths.length < 1) {
    throw new ConflictError("Unable to find user authentication.");
  }

  userAuths.forEach(async (userAuth) => {
    await db
      .delete(userAuthentications)
      .where(eq(userAuthentications.authId, userAuth.authId));
    await db
      .delete(authentications)
      .where(eq(authentications.id, userAuth.authId));
  });

  db.delete(users).where(eq(users.id, userId));
}

/**
 * Validates that the provided user has access/permissions to resource.
 *
 * @param sub - The sub item obtained from authorization token.
 * @param org - The Organization ID to validate permissions.
 * @throws {ConflictError} If an Organization has failed to be removed.
 * @throws {UnauthorizedError} If the permissions are not allowed to remote Organization.
 */
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

  const orgUser = userFromOrg[0];
  const clientIndex = Object.keys(UserRole).indexOf("CLIENT");
  const roleIndex = Object.keys(UserRole).indexOf(orgUser.role);

  if (roleIndex < clientIndex) {
    throw new UnauthorizedError(
      "Unable to continue: User is not have sufficient permissions",
    );
  }

  return user;
}
