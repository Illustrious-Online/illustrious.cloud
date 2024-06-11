import { Context } from "elysia";

import { Report } from "../../drizzle/schema";
import BadRequestError from "../domain/exceptions/BadRequestError";
import UnauthorizedError from "../domain/exceptions/UnauthorizedError";
import { SubmitReport } from "../domain/interfaces/reports";
import SuccessResponse from "../domain/types/generic/SuccessResponse";
import * as reportService from "../services/report";
import * as userService from "../services/user";
import { getSub } from "../utils/extract-sub";

export const create = async (
  context: Context,
): Promise<SuccessResponse<Report>> => {
  if (!context.headers.authorization) {
    throw new UnauthorizedError(
      "Unable to continue: Cannot find token containing user sub",
    );
  }

  const body = context.body as SubmitReport;
  const sub = await getSub(context.headers.authorization);
  const user = await userService.validatePermissions(sub, body.org);
  const data = await reportService.create({
    user: user.id,
    org: body.org,
    report: body.report,
  });

  return {
    data,
    message: "Report created successfully.",
  };
};

export const fetchOne = async (context: Context) => {
  if (!context.headers.authorization) {
    throw new UnauthorizedError(
      "Unable to continue: Cannot find token containing user sub",
    );
  }

  const { id } = context.params;
  const sub = await getSub(context.headers.authorization);
  const user = await userService.fetchOne({ sub });
  const data = await reportService.fetchById({
    id,
    userId: user.id,
  });

  return {
    message: "Report fetched successfully.",
    data,
  };
};

export const update = async (context: Context) => {
  if (!context.headers.authorization) {
    throw new UnauthorizedError(
      "Unable to continue: Cannot find token containing user sub",
    );
  }

  const body = context.body as SubmitReport;
  const sub = await getSub(context.headers.authorization);

  await userService.validatePermissions(sub, body.org);
  const data = await reportService.update(body.report);

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

  const sub = await getSub(context.headers.authorization);
  const { id, org } = context.params;

  if (!id) {
    throw new BadRequestError("Report to delete is required.");
  }

  await userService.validatePermissions(sub, org);
  await reportService.deleteOne(id);

  return {
    message: "Report deleted successfully.",
  };
};
