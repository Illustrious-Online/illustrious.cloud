import { Context } from "elysia";

import { Invoice, Org, Report, User } from "../../drizzle/schema";
import BadRequestError from "../domain/exceptions/BadRequestError";
import UnauthorizedError from "../domain/exceptions/UnauthorizedError";
import SuccessResponse from "../domain/types/generic/SuccessResponse";
import * as userService from "../services/user";
import { getSub } from "../utils/extract-sub";

export const me = async (context: Context): Promise<SuccessResponse<User>> => {
  if (!context.headers.authorization) {
    throw new UnauthorizedError(
      "Unable to continue: Cannot find token containing user sub",
    );
  }

  const sub = await getSub(context.headers.authorization);

  if (!sub) {
    throw new UnauthorizedError("Authorization missing user sub value");
  }

  const data = await userService.fetchOne({ sub });

  return {
    data,
    message: "User details fetched successfully!",
  };
};

export const create = async (
  context: Context,
): Promise<SuccessResponse<User>> => {
  const body = context.body as User;
  const data = await userService.create(body);

  return {
    data,
    message: "User created successfully.",
  };
};

export const fetchUser = async (context: Context) => {
  if (!context.headers.authorization) {
    throw new UnauthorizedError(
      "Unable to continue: Cannot find token containing user sub",
    );
  }

  const { include } = context.body as { include?: string };
  const sub = await getSub(context.headers.authorization);
  const user = await userService.fetchOne({ sub });
  const result: {
    user: User;
    reports?: Report[];
    invoices?: Invoice[];
    orgs?: Org[];
  } = { user };

  if (include) {
    if (include.includes("invoices")) {
      const userInvoices = (await userService.fetchAll(
        user.id,
        "invoices",
      )) as Invoice[];
      result.invoices = userInvoices;
    }

    if (include.includes("reports")) {
      const userReports = (await userService.fetchAll(
        user.id,
        "reports",
      )) as Report[];
      result.reports = userReports;
    }

    if (include.includes("orgs")) {
      const userOrgs = (await userService.fetchAll(user.id, "orgs")) as Org[];
      result.orgs = userOrgs;
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

  const { type } = context.params;
  const sub = await getSub(context.headers.authorization);
  const user = await userService.fetchOne({ sub });
  const data = await userService.fetchAll(user.id, type);

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

  const body = context.body as User;
  const { id } = context.params;
  const sub = await getSub(context.headers.authorization);
  const user = await userService.fetchOne({ sub });

  if (user.id !== id) {
    throw new UnauthorizedError("Token does not match user to be updated.");
  }

  const data = await userService.update(body);

  return {
    data,
    message: "Report updated successfully.",
  };
};

export const deleteOne = async (context: Context) => {
  if (!context.headers.authorization) {
    throw new UnauthorizedError(
      "Unable to continue: Cannot find token containing user sub",
    );
  }

  const { id } = context.params;
  const sub = await getSub(context.headers.authorization);

  if (!sub) {
    throw new BadRequestError("Authentication ID is missing.");
  }

  if (!id) {
    throw new BadRequestError("User to delete is required.");
  }

  await userService.deleteOne(sub, id);

  return {
    message: "User deleted successfully.",
  };
};
