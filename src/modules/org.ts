import UnauthorizedError from "@/domain/exceptions/UnauthorizedError";
import type { AuthenticatedContext } from "@/domain/interfaces/auth";
import type { OrgDetails } from "@/domain/interfaces/orgs";
import { UserRole } from "@/domain/types/UserRole";
import type SuccessResponse from "@/domain/types/generic/SuccessResponse";
import type { Org, User } from "@/drizzle/schema";
import * as orgService from "@/services/org";
import * as userService from "@/services/user";

/**
 * Creates a new organization.
 *
 * @param context - The authenticated context containing the request body and user information.
 * @returns A promise that resolves to a success response containing the created organization.
 */
export const postOrg = async (
  context: AuthenticatedContext,
): Promise<SuccessResponse<Org>> => {
  const { body, user } = context;
  const data = await orgService.createOrg({
    user: user.id,
    org: body as Org,
  });

  return {
    data,
    message: "Organization created successfully!",
  };
};

/**
 * Creates or updates an organization user.
 *
 * @param context - The authenticated context containing the request body and user permissions.
 * @returns A promise that resolves to a success response containing the created or updated user.
 * @throws UnauthorizedError - If the user does not have permission to create organization users.
 */
export const postOrgUser = async (
  context: AuthenticatedContext,
): Promise<SuccessResponse<User>> => {
  const { body, permissions } = context;
  const { superAdmin, org } = permissions;

  if (!superAdmin && org?.role && org?.role < UserRole.ADMIN) {
    throw new UnauthorizedError(
      "User does not have permission to create organization users.",
    );
  }

  const data = await userService.updateOrCreate(body as User);

  return {
    data,
    message: "Organization user created successfully!",
  };
};

/**
 * Fetches the organization and its details based on the provided context.
 *
 * @param context - The authenticated context containing parameters, permissions, and query information.
 * @returns A promise that resolves to a success response containing the organization and optional details.
 * @throws UnauthorizedError - If the user does not have permission to fetch the organization.
 */
export const getOrg = async (
  context: AuthenticatedContext,
): Promise<SuccessResponse<{ org: Org; details?: OrgDetails }>> => {
  const { org: orgParam } = context.params;
  const { permissions, query } = context;
  const { superAdmin, org } = permissions;

  if (!org?.role && !superAdmin) {
    throw new UnauthorizedError(
      "User does not have permission to fetch this organization.",
    );
  }

  const result: { org: Org; details?: OrgDetails } = {
    org: await orgService.fetchOrg(orgParam),
  };

  if (query.include) {
    const resources = query.include.split(",");
    const foundResources = await orgService.fetchOrgResources(
      orgParam,
      resources,
      query.user,
    );

    result.details = foundResources;
  }

  return {
    data: result,
    message: "Organization & details fetched successfully!",
  };
};

/**
 * Updates the organization details.
 *
 * @param context - The authenticated context containing the request body and permissions.
 * @throws {UnauthorizedError} If the user does not have permission to update organization details.
 * @returns An object containing the updated organization data and a success message.
 */
export const putOrg = async (context: AuthenticatedContext) => {
  const body = context.body as Org;
  const { permissions } = context;
  const { superAdmin, org } = permissions;

  if (!superAdmin && org?.role && org.role < UserRole.ADMIN) {
    throw new UnauthorizedError(
      "User does not have permission to update organization details.",
    );
  }

  return {
    data: await orgService.updateOrg(body),
    message: "Organization updated successfully!",
  };
};

/**
 * Updates or creates an organization user.
 *
 * @param {AuthenticatedContext} context - The authenticated context containing the request body and user permissions.
 * @throws {UnauthorizedError} If the user does not have permission to update organization users.
 * @returns {Promise<{ data: User, message: string }>} The updated or created user data and a success message.
 */
export const putOrgUser = async (context: AuthenticatedContext) => {
  const { body, permissions } = context;
  const { superAdmin, org } = permissions;

  if (
    (!superAdmin && org?.role && org?.role < UserRole.ADMIN) ||
    !org?.managed
  ) {
    throw new UnauthorizedError(
      "User does not have permission to update organization users.",
    );
  }

  const data = await userService.updateOrCreate(body as User);

  return {
    data,
    message: "Organization user updated successfully!",
  };
};

/**
 * Deletes an organization based on the provided context.
 *
 * @param context - The authenticated context containing parameters and permissions.
 * @throws {UnauthorizedError} If the user does not have permission to delete the organization.
 * @returns An object containing a success message.
 */
export const deleteOrg = async (context: AuthenticatedContext) => {
  const { org: orgParam } = context.params;
  const { permissions } = context;
  const { superAdmin, org } = permissions;

  if (org?.role !== undefined) {
    if (!superAdmin && org.role < UserRole.OWNER) {
      throw new UnauthorizedError(
        "User does not have permission to delete organization.",
      );
    }
  }

  await orgService.removeOrg(orgParam);

  return {
    message: "Organization deleted successfully!",
  };
};
