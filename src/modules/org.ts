import UnauthorizedError from "@/domain/exceptions/UnauthorizedError";
import { UserRole } from "@/domain/types/UserRole";
import type SuccessResponse from "@/domain/types/generic/SuccessResponse";
import type { Invoice, Org, Report, User } from "../drizzle/schema";
import type { AuthenticatedContext } from "../plugins/auth";
import * as orgService from "@/services/org";

export interface OrgDetails {
  org: Org;
  reports?: Report[];
  invoices?: Invoice[];
  users?: User[];
}

export const create = async (
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

export const fetchOne = async (
  context: AuthenticatedContext,
): Promise<SuccessResponse<OrgDetails>> => {
  const { org: orgParam } = context.params;
  const { include } = context.query;
  const { permissions } = context;
  const { superAdmin, org } = permissions;

  if (!superAdmin && !org?.role) {
    throw new UnauthorizedError(
      "User does not have permission to fetch organization details.",
    );
  }

  const data = await orgService.fetchOne(orgParam);
  const result: OrgDetails = { org: data };
  const notClient = org?.id && org?.role && org?.role > UserRole.CLIENT;

  if ((superAdmin || notClient) && org?.id) {
    if (include?.includes("invoices")) {
      const orgInvoices = (await orgService.fetchResources(
        org.id,
        "invoices",
      )) as Invoice[];
      result.invoices = orgInvoices;
    }

    if (include?.includes("reports")) {
      const orgReports = (await orgService.fetchResources(
        org.id,
        "reports",
      )) as Report[];
      result.reports = orgReports;
    }

    if (include?.includes("users")) {
      const orgUsers = (await orgService.fetchResources(
        org.id,
        "users",
      )) as User[];
      result.users = orgUsers;
    }
  }

  return {
    data: result,
    message: "Organization & details fetched successfully",
  };
};

export const fetchResources = async (context: AuthenticatedContext) => {
  const { id, resource } = context.params;
  const { permissions } = context;
  const { superAdmin, org } = permissions;

  if (!superAdmin && org?.role === UserRole.CLIENT) {
    throw new UnauthorizedError(
      "User does not have permission to fetch this organization's resources.",
    );
  }

  const data = await orgService.fetchResources(id, resource);

  return {
    data: {
      [resource]: data,
    },
    message: "Organization resources fetched successfully.",
  };
};

export const update = async (context: AuthenticatedContext) => {
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

export const deleteOne = async (context: AuthenticatedContext) => {
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
