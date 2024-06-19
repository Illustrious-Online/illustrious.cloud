import { Context } from "elysia";

import { Report } from "../../drizzle/schema";
import UnauthorizedError from "../domain/exceptions/UnauthorizedError";
import { SubmitReport } from "../domain/interfaces/reports";
import SuccessResponse from "../domain/types/generic/SuccessResponse";
import * as reportService from "../services/report";
import * as userService from "../services/user";
import { getSub } from "../utils/extract-sub";

export const create = async (
  context: Context,
): Promise<SuccessResponse<Report>> => {
  const { authorization } = context.headers as { authorization: string };
  const body = context.body as SubmitReport;
  const sub = await getSub(authorization);
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
  const { authorization } = context.headers as { authorization: string };
  const { id } = context.params;
  const sub = await getSub(authorization);
  const user = await userService.fetchOne({ sub });
  const data = await reportService.fetchOne({
    id,
    userId: user.id,
  });

  return {
    message: "Report fetched successfully.",
    data,
  };
};

export const update = async (context: Context) => {
  const { authorization } = context.headers as { authorization: string };
  const body = context.body as SubmitReport;
  const sub = await getSub(authorization);

  await userService.validatePermissions(sub, body.org);
  const data = await reportService.update(body.report);

  return {
    data,
    message: "Report updated successfully.",
  };
};

export const deleteOne = async (context: Context) => {
  const { authorization } = context.headers as { authorization: string };
  const sub = await getSub(authorization);
  const { id, org } = context.params;

  await userService.validatePermissions(sub, org);
  await reportService.deleteOne(id);

  return {
    message: "Report deleted successfully.",
  };
};
