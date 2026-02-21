import { getSessionFromHeader } from "@/lib/auth";
import { NotFoundError } from "@/plugins/error";
import { Elysia } from "elysia";
import { createAuthHelpers } from "../auth/middleware";
import { reportModel } from "./model";
import {
  deleteReport,
  getReportById,
  getUserReports,
  updateReport,
} from "./service";

export const reportRoutes = new Elysia({ prefix: "/reports" })
  .use(reportModel)
  .derive(async ({ headers }) => {
    const { session, user } = await getSessionFromHeader(headers.authorization);
    return createAuthHelpers(session, user);
  })
  .get(
    "/",
    async ({ requireAuth }) => {
      const authContext = await requireAuth();
      const reports = await getUserReports(authContext.userId);
      return reports.map((rep) => ({
        id: rep.id,
        orgId: rep.orgId,
        title: rep.title,
        status: rep.status,
        content: rep.content,
        periodStart: rep.periodStart,
        periodEnd: rep.periodEnd,
        rating: rep.rating,
        createdBy: rep.createdBy,
        modifiedBy: rep.modifiedBy,
        createdAt: rep.createdAt,
        updatedAt: rep.updatedAt,
      }));
    },
    {
      response: {
        200: "reportListResponse",
      },
    },
  )
  .get(
    "/:id",
    async ({ requireAuth, params }) => {
      const authContext = await requireAuth();
      const foundReport = await getReportById(params.id, authContext.userId);

      if (!foundReport) {
        throw new NotFoundError("Report not found or access denied");
      }

      return {
        id: foundReport.id,
        orgId: foundReport.orgId,
        title: foundReport.title,
        status: foundReport.status,
        content: foundReport.content,
        periodStart: foundReport.periodStart,
        periodEnd: foundReport.periodEnd,
        rating: foundReport.rating,
        createdBy: foundReport.createdBy,
        modifiedBy: foundReport.modifiedBy,
        createdAt: foundReport.createdAt,
        updatedAt: foundReport.updatedAt,
      };
    },
    {
      response: {
        200: "reportResponse",
      },
    },
  )
  .patch(
    "/:id",
    async ({ requireAuth, params, body }) => {
      const authContext = await requireAuth();
      const updatedReport = await updateReport(
        params.id,
        {
          title: body.title,
          status: body.status,
          content: body.content,
          periodStart: body.periodStart
            ? new Date(body.periodStart)
            : undefined,
          periodEnd: body.periodEnd ? new Date(body.periodEnd) : undefined,
          rating: body.rating,
          userIds: body.userIds,
        },
        authContext.userId,
      );

      return {
        id: updatedReport.id,
        orgId: updatedReport.orgId,
        title: updatedReport.title,
        status: updatedReport.status,
        content: updatedReport.content,
        periodStart: updatedReport.periodStart,
        periodEnd: updatedReport.periodEnd,
        rating: updatedReport.rating,
        createdBy: updatedReport.createdBy,
        modifiedBy: updatedReport.modifiedBy,
        createdAt: updatedReport.createdAt,
        updatedAt: updatedReport.updatedAt,
      };
    },
    {
      body: "updateReportBody",
      response: {
        200: "reportResponse",
      },
    },
  )
  .delete("/:id", async ({ requireAuth, params }) => {
    const authContext = await requireAuth();
    await deleteReport(params.id, authContext.userId);
    return { message: "Report deleted successfully" };
  });
