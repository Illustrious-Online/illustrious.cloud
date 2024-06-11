import { Context } from "elysia";

import { jwtDecode } from "jwt-decode";
import { Invoice, Org, Report, User } from "../../drizzle/schema";
import BadRequestError from "../domain/exceptions/BadRequestError";
import UnauthorizedError from "../domain/exceptions/UnauthorizedError";
import SuccessResponse from "../domain/types/generic/SuccessResponse";
import * as orgService from "../services/org";
import * as userService from "../services/user";
import { getSub } from "../utils/extract-sub";

export const create = async (
  context: Context,
): Promise<SuccessResponse<Org>> => {
  const body = context.body as Org;
  const data = await orgService.create(body);

  return {
    data,
    message: "Organization created successfully.",
  };
};

export const fetchOrg = async (context: Context) => {
  const { id } = context.params;
  const { include } = context.body as { include?: string };
  const data = await orgService.fetchOne(id);
  const result: {
    org: Org;
    reports?: Report[];
    invoices?: Invoice[];
    users?: User[];
  } = { org: data };

  if (include) {
    if (include.includes("invoices")) {
      const orgInvoices = (await orgService.fetchAll(
        id,
        "invoices",
      )) as Invoice[];
      result.invoices = orgInvoices;
    }

    if (include.includes("reports")) {
      const orgReports = (await orgService.fetchAll(id, "reports")) as Report[];
      result.reports = orgReports;
    }

    if (include.includes("users")) {
      const orgUsers = (await orgService.fetchAll(id, "users")) as User[];
      result.users = orgUsers;
    }
  }

  return {
    data: result,
    message: "Organization & details fetched successfully",
  };
};

export const fetchResources = async (context: Context) => {
  if (!context.headers.authorization) {
    throw new UnauthorizedError(
      "Unable to continue: Cannot find token containing user sub",
    );
  }

  const { id, type } = context.params;
  const data = await orgService.fetchAll(id, type);

  return {
    data,
    message: "Organizations fetched successfully.",
  };
};

export const update = async (context: Context) => {
  if (!context.headers.authorization) {
    throw new UnauthorizedError(
      "Unable to continue: Cannot find token containing user sub",
    );
  }

  const body = context.body as Org;
  const sub = await getSub(context.headers.authorization);

  await userService.validatePermissions(sub, body.id);
  const data = await orgService.update(body);

  return {
    data,
    message: "Report updated successfully.",
  };
};

export const deleteOne = async (context: Context) => {
  if (context.headers.authorization) {
    const token = jwtDecode(context.headers.authorization);
    const { id } = context.params;
    const { sub } = token;

    if (!sub) {
      throw new BadRequestError("Authentication ID is missing.");
    }

    if (!id) {
      throw new BadRequestError("Organization to delete is required.");
    }

    await orgService.deleteOne(sub, id);

    return {
      message: "Organization deleted successfully.",
    };
  }
};
