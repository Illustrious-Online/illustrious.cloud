import BadRequestError from "@/domain/exceptions/BadRequestError";
import UnauthorizedError from "@/domain/exceptions/UnauthorizedError";
import type { AuthenticatedContext } from "@/domain/interfaces/auth";
import { UserRole } from "@/domain/types/UserRole";
import type SuccessResponse from "@/domain/types/generic/SuccessResponse";
import type { Invoice, Org, Report, User } from "@/drizzle/schema";
import * as orgService from "@/services/org";
import * as userService from "@/services/user";

export interface OrgDetails {
  org: Org;
  reports?: Report[];
  invoices?: Invoice[];
  users?: User[];
}

export const postOrg = async (
  context: AuthenticatedContext,
): Promise<SuccessResponse<Org>> => {
  const { body, user } = context;
  const data = await orgService.create({
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
): Promise<SuccessResponse<OrgDetails>> => {
  const { org: orgParam } = context.params;
  const { permissions } = context;
  const { superAdmin, org } = permissions;

  if (!superAdmin && (!org?.role || org?.role < UserRole.ADMIN)) {
    throw new UnauthorizedError(
      "User does not have permission to fetch organization details.",
    );
  }

  if (!superAdmin && org?.id !== orgParam && org?.role === UserRole.CLIENT) {
    throw new UnauthorizedError(
      "User does not have permission to fetch organization details.",
    );
  }

  const data = await orgService.fetchOne(orgParam);
  const result: OrgDetails = { org: data };

  return {
    data: result,
    message: "Organization & details fetched successfully!",
  };
};

export const getOrgResources = async (context: AuthenticatedContext) => {
  const {
    params: { org: orgId },
    permissions: { superAdmin, org },
    query: { include },
  } = context;

  if (!org) {
    throw new BadRequestError("Organization ID is required.");
  }

  if (!superAdmin && org?.role === UserRole.CLIENT) {
    throw new UnauthorizedError(
      "User does not have permission to fetch organization resources.",
    );
  }

  // TODO: Final objective -> Fetch resources based on the user's role and permissions in organization
  // ADMIN: Fetch all resources associated with the organization
  // OWNER: Fetch all resources associated with the organization
  // EMPLOYEE: Fetch all resources associated with the employee
  // CLIENT: Fetch all resources associated with the client

  if (!superAdmin && org?.role === UserRole.EMPLOYEE) {
    // Only should obtain the resources associated with the employee
    // if USER is included, only return the items associated with the user and employee together
  }

  // ADMIN + OWNER + SUPERADMIN: Fetch all resources based on request

  // const resources = await orgService.fetchResources(orgId, include.split(","));

  // if (include?.includes("invoices")) {
  //   const orgInvoices = (await orgService.fetchResources(
  //     org.id,
  //     "invoices",
  //   )) as Invoice[];
  //   result.invoices = orgInvoices;
  // }

  // if (include?.includes("reports")) {
  //   const orgReports = (await orgService.fetchResources(
  //     org.id,
  //     "reports",
  //   )) as Report[];
  //   result.reports = orgReports;
  // }

  // if (include?.includes("users")) {
  //   const orgUsers = (await orgService.fetchResources(
  //     org.id,
  //     "users",
  //   )) as User[];
  //   result.users = orgUsers;
  // }

  // const data = await orgService.fetchResources(id, resource);

  return {
    data: {
      [resource]: data,
    },
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
    data: await orgService.update(body),
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

  await orgService.deleteOne(orgParam);

  return {
    message: "Organization deleted successfully.",
  };
};
