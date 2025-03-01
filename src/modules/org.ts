import UnauthorizedError from "@/domain/exceptions/UnauthorizedError";
import type { AuthenticatedContext } from "@/domain/interfaces/auth";
import type { OrgDetails } from "@/domain/interfaces/orgs";
import { UserRole } from "@/domain/types/UserRole";
import type SuccessResponse from "@/domain/types/generic/SuccessResponse";
import type { Org, User } from "@/drizzle/schema";
import * as orgService from "@/services/org";
import * as userService from "@/services/user";

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
    message: "Organization created successfully.",
  };
};

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
    message: "Organization user created successfully.",
  };
};

export const getOrg = async (
  context: AuthenticatedContext,
): Promise<SuccessResponse<Org>> => {
  const { org: orgParam } = context.params;
  const { permissions } = context;
  const { superAdmin, org } = permissions;

  if (!superAdmin && org?.id !== orgParam && org?.role === UserRole.CLIENT) {
    throw new UnauthorizedError(
      "User does not have permission to fetch this organization.",
    );
  }

  const data = await orgService.fetchOrg(orgParam);

  return {
    data,
    message: "Organization & details fetched successfully!",
  };
};

export const getOrgResources = async (context: AuthenticatedContext) => {
  const {
    params: { org: orgId, user: userId },
    permissions: { superAdmin, org },
    query: { include },
  } = context;

  if (!org?.role) {
    throw new UnauthorizedError(
      "User does not have permission to fetch organization resources.",
    );
  }

  let result: OrgDetails | undefined;

  if (superAdmin || org.role > UserRole.EMPLOYEE) {
    const data = await orgService.fetchOrgResources(
      orgId,
      include?.split(","),
      userId,
    );

    if (data) {
      result = data;
    }
  }

  if (!superAdmin && org?.role < UserRole.ADMIN) {
    const data = await orgService.fetchOrgResources(
      orgId,
      include?.split(","),
      userId,
    );

    result = data;
  }

  return {
    data: result,
    message: "Organization resources fetched successfully.",
  };
};

export const updateOrg = async (context: AuthenticatedContext) => {
  const body = context.body as Org;
  const { permissions } = context;
  const { superAdmin, org } = permissions;

  if (org?.role !== undefined) {
    if (!superAdmin && org.role < UserRole.OWNER) {
      throw new UnauthorizedError(
        "User does not have permission to update organization details.",
      );
    }
  }

  return {
    data: await orgService.updateOrg(body),
    message: "Organization updated successfully.",
  };
};

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

  await orgService.deleteOrg(orgParam);

  return {
    message: "Organization deleted successfully.",
  };
};
