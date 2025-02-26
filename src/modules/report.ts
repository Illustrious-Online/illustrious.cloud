import UnauthorizedError from "@/domain/exceptions/UnauthorizedError";
import type { AuthenticatedContext } from "@/domain/interfaces/auth";
import type { SubmitReport } from "@/domain/interfaces/reports";
import type SuccessResponse from "@/domain/types/generic/SuccessResponse";
import type { Report } from "@/drizzle/schema";
import * as reportService from "@/services/report";

export const postReport = async (
  context: AuthenticatedContext,
): Promise<SuccessResponse<Report>> => {
  const { user, permissions } = context;
  const { superAdmin, report } = permissions;
  const body = context.body as SubmitReport;

  if (!superAdmin && !report?.create) {
    throw new UnauthorizedError(
      "You do not have permission to create a report in this organization.",
    );
  }

  const data = await reportService.createReport({
    client: body.client,
    org: body.org,
    report: body.report,
    creator: user.id,
  });

  return {
    data,
    message: "Report created successfully!",
  };
};

export const getReport = async (
  context: AuthenticatedContext,
): Promise<SuccessResponse<Report>> => {
  const { report: reportId } = context.params;
  const { permissions } = context;
  const { superAdmin, report } = permissions;

  if (!superAdmin && !report?.access) {
    throw new UnauthorizedError(
      "You do not have permission to access this report.",
    );
  }

  return {
    message: "Report fetched successfully!",
    data: await reportService.fetchReport(reportId),
  };
};

export const putReport = async (
  context: AuthenticatedContext,
): Promise<SuccessResponse<Report>> => {
  const body = context.body as SubmitReport;
  const { permissions } = context;
  const { superAdmin, report } = permissions;

  if (!superAdmin && !report?.edit) {
    throw new UnauthorizedError(
      "You do not have permission to update this report.",
    );
  }

  return {
    data: await reportService.updateReport(body.report),
    message: "Report updated successfully!",
  };
};

export const deleteReport = async (
  context: AuthenticatedContext,
): Promise<SuccessResponse<Report>> => {
  const { report: reportId } = context.params;
  const { permissions } = context;
  const { superAdmin, report } = permissions;

  if (!superAdmin && !report?.edit) {
    throw new UnauthorizedError(
      "You do not have permission to delete this report.",
    );
  }

  await reportService.removeReport(reportId);

  return {
    message: "Report deleted successfully!",
  };
};
