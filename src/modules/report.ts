import UnauthorizedError from "@/domain/exceptions/UnauthorizedError";
import type { SubmitReport } from "@/domain/interfaces/reports";
import { UserRole } from "@/domain/types/UserRole";
import type SuccessResponse from "@/domain/types/generic/SuccessResponse";
import * as reportService from "@/services/report";
import type { Report } from "../drizzle/schema";
import type { AuthenticatedContext } from "../plugins/auth";

export const create = async (
  context: AuthenticatedContext,
): Promise<SuccessResponse<Report>> => {
  const { user, permissions } = context;
  const { superAdmin, org, report } = permissions;
  const body = context.body as SubmitReport;

  if (superAdmin || (org?.role && org.role > UserRole.CLIENT)) {
    const data = await reportService.create({
      client: body.client,
      org: body.org,
      report: body.report,
      creator: user.id,
    });

    return {
      data,
      message: "Report created successfully.",
    };
  }

  throw new UnauthorizedError("You do not have permission to create a report.");
};

export const fetchOne = async (context: AuthenticatedContext) => {
  const { report: reportId } = context.params;
  const { permissions } = context;
  const { superAdmin, org, report } = permissions;

  if (superAdmin || (org?.role && org.role > UserRole.EMPLOYEE) || report) {
    const data = await reportService.fetchOne(reportId);

    return {
      message: "Report fetched successfully.",
      data,
    };
  }

  throw new UnauthorizedError(
    "You do not have permission to access this report.",
  );
};

export const update = async (context: AuthenticatedContext) => {
  const body = context.body as SubmitReport;
  const { permissions } = context;
  const { superAdmin, report, org } = permissions;

  if (
    superAdmin ||
    (org?.role &&
      (org.role > UserRole.EMPLOYEE || (report && org.role > UserRole.CLIENT)))
  ) {
    const data = await reportService.update(body.report);

    return {
      data,
      message: "Report updated successfully.",
    };
  }

  throw new UnauthorizedError(
    "You do not have permission to update this report.",
  );
};

export const deleteOne = async (context: AuthenticatedContext) => {
  const { report: reportId } = context.params;
  const { permissions } = context;
  const { superAdmin, report, org } = permissions;

  if (
    superAdmin ||
    (org?.role &&
      (org.role > UserRole.EMPLOYEE || (report && org.role > UserRole.CLIENT)))
  ) {
    await reportService.deleteOne(reportId);

    return {
      message: "Report deleted successfully.",
    };
  }

  throw new UnauthorizedError(
    "You do not have permission to delete this report.",
  );
};
