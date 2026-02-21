import { db } from "@/drizzle/db";
import { notification } from "@/drizzle/schema";
import { getSessionFromHeader } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { createAuthHelpers } from "../auth/middleware";
import { invoiceModel } from "../invoice/model";
import { createInvoice, getOrgInvoices } from "../invoice/service";
import {
  deleteNotification,
  markNotificationRead,
} from "../notification/service";
import { reportModel } from "../report/model";
import { createReport, getOrgReports } from "../report/service";
import { orgModel } from "./model";
import {
  acceptOwnershipTransfer,
  createOrg,
  declineOwnershipTransfer,
  getOrgOwner,
  getOrgUsers,
  getUserOrgs,
  initiateOwnershipTransfer,
} from "./service";

export const orgRoutes = new Elysia({ prefix: "/orgs" })
  .use(orgModel)
  .use(invoiceModel)
  .use(reportModel)
  .derive(async ({ headers }) => {
    const { session, user } = await getSessionFromHeader(headers.authorization);
    return createAuthHelpers(session, user);
  })
  .get(
    "/",
    async ({ requireAuth }) => {
      const authContext = await requireAuth();
      const orgs = await getUserOrgs(authContext.userId);
      return orgs.map((o) => ({
        id: o.id,
        name: o.name,
        contact: o.contact,
      }));
    },
    {
      response: {
        200: "orgListResponse",
      },
    },
  )
  .post(
    "/",
    async ({ requireAuth, body, set }) => {
      const authContext = await requireAuth();
      const newOrg = await createOrg(authContext.userId, body.name);
      set.status = 201;
      return {
        id: newOrg.id,
        name: newOrg.name,
        contact: newOrg.contact,
      };
    },
    {
      body: "createOrgBody",
      response: {
        201: "orgResponse",
      },
    },
  )
  .get("/:id/users", async ({ requireAuth, params }) => {
    const authContext = await requireAuth();
    const userIds = await getOrgUsers(params.id, authContext.userId);
    return { userIds };
  })
  .get(
    "/:id/invoices",
    async ({ requireAuth, params }) => {
      const authContext = await requireAuth();
      const invoices = await getOrgInvoices(params.id, authContext.userId);
      return invoices.map((inv) => ({
        id: inv.id,
        orgId: inv.orgId,
        amount: inv.amount,
        status: inv.status,
        dueDate: inv.dueDate,
        periodStart: inv.periodStart,
        periodEnd: inv.periodEnd,
        description: inv.description,
        createdBy: inv.createdBy,
        modifiedBy: inv.modifiedBy,
        createdAt: inv.createdAt,
        updatedAt: inv.updatedAt,
      }));
    },
    {
      response: {
        200: "invoiceListResponse",
      },
    },
  )
  .post(
    "/:id/invoices",
    async ({ requireAuth, params, body, set }) => {
      const authContext = await requireAuth();
      const newInvoice = await createInvoice(
        params.id,
        {
          orgId: params.id,
          amount: body.amount,
          status: body.status,
          dueDate: new Date(body.dueDate),
          periodStart: new Date(body.periodStart),
          periodEnd: new Date(body.periodEnd),
          description: body.description,
          userIds: body.userIds,
        },
        authContext.userId,
      );

      set.status = 201;
      return {
        id: newInvoice.id,
        orgId: newInvoice.orgId,
        amount: newInvoice.amount,
        status: newInvoice.status,
        dueDate: newInvoice.dueDate,
        periodStart: newInvoice.periodStart,
        periodEnd: newInvoice.periodEnd,
        description: newInvoice.description,
        createdBy: newInvoice.createdBy,
        modifiedBy: newInvoice.modifiedBy,
        createdAt: newInvoice.createdAt,
        updatedAt: newInvoice.updatedAt,
      };
    },
    {
      body: "createInvoiceBody",
      response: {
        201: "invoiceResponse",
      },
    },
  )
  .get(
    "/:id/reports",
    async ({ requireAuth, params }) => {
      const authContext = await requireAuth();
      const reports = await getOrgReports(params.id, authContext.userId);
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
  .post(
    "/:id/reports",
    async ({ requireAuth, params, body, set }) => {
      const authContext = await requireAuth();
      const newReport = await createReport(
        params.id,
        {
          orgId: params.id,
          title: body.title,
          status: body.status,
          content: body.content,
          periodStart: new Date(body.periodStart),
          periodEnd: new Date(body.periodEnd),
          rating: body.rating,
          userIds: body.userIds,
        },
        authContext.userId,
      );

      set.status = 201;
      return {
        id: newReport.id,
        orgId: newReport.orgId,
        title: newReport.title,
        status: newReport.status,
        content: newReport.content,
        periodStart: newReport.periodStart,
        periodEnd: newReport.periodEnd,
        rating: newReport.rating,
        createdBy: newReport.createdBy,
        modifiedBy: newReport.modifiedBy,
        createdAt: newReport.createdAt,
        updatedAt: newReport.updatedAt,
      };
    },
    {
      body: "createReportBody",
      response: {
        201: "reportResponse",
      },
    },
  )
  .get(
    "/:id/owner",
    async ({ requireAuth, params }) => {
      const authContext = await requireAuth();
      // Check if user is org member or has site-wide read access
      const { getUserSiteRole, getUserOrgRole, canReadAcrossOrgs } =
        await import("../auth/permissions");
      const siteRole = await getUserSiteRole(authContext.userId);
      const orgRole = await getUserOrgRole(authContext.userId, params.id);

      if (!canReadAcrossOrgs(siteRole) && orgRole === null) {
        throw new (await import("@/plugins/error")).ForbiddenError(
          "Not a member of this organization",
        );
      }

      const owner = await getOrgOwner(params.id);
      if (!owner) {
        throw new (await import("@/plugins/error")).NotFoundError(
          "Organization owner not found",
        );
      }

      return {
        id: owner.id,
        name: owner.name,
        email: owner.email,
      };
    },
    {
      response: {
        200: "orgOwnerResponse",
      },
    },
  )
  .post(
    "/:id/ownership/transfer",
    async ({ requireAuth, params, body }) => {
      const authContext = await requireAuth();
      await initiateOwnershipTransfer(
        params.id,
        authContext.userId,
        body.newOwnerId,
      );
      return { success: true };
    },
    {
      body: "transferOwnershipBody",
      response: {
        200: t.Object({ success: t.Boolean() }),
      },
    },
  )
  .post(
    "/:id/ownership/accept",
    async ({ requireAuth, params }) => {
      const authContext = await requireAuth();
      await acceptOwnershipTransfer(params.id, authContext.userId);

      // Mark notification as read
      const notifications = await db
        .select()
        .from(notification)
        .where(
          and(
            eq(notification.userId, authContext.userId),
            eq(notification.type, "ownership_transfer"),
          ),
        );

      for (const notif of notifications) {
        if (notif.metadata) {
          try {
            const metadata = JSON.parse(notif.metadata);
            if (metadata.orgId === params.id) {
              await markNotificationRead(notif.id, authContext.userId);
              break;
            }
          } catch {
            // Invalid JSON, skip
          }
        }
      }

      return { success: true };
    },
    {
      response: {
        200: t.Object({ success: t.Boolean() }),
      },
    },
  )
  .post(
    "/:id/ownership/decline",
    async ({ requireAuth, params }) => {
      const authContext = await requireAuth();
      await declineOwnershipTransfer(params.id, authContext.userId);

      // Delete notification
      const notifications = await db
        .select()
        .from(notification)
        .where(
          and(
            eq(notification.userId, authContext.userId),
            eq(notification.type, "ownership_transfer"),
          ),
        );

      for (const notif of notifications) {
        if (notif.metadata) {
          try {
            const metadata = JSON.parse(notif.metadata);
            if (metadata.orgId === params.id) {
              await deleteNotification(notif.id, authContext.userId);
              break;
            }
          } catch {
            // Invalid JSON, skip
          }
        }
      }

      return { success: true };
    },
    {
      response: {
        200: t.Object({ success: t.Boolean() }),
      },
    },
  );
