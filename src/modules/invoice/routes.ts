import { getSessionFromHeader } from "@/lib/auth";
import { NotFoundError } from "@/plugins/error";
import { Elysia } from "elysia";
import { createAuthHelpers } from "../auth/middleware";
import { invoiceModel } from "./model";
import {
  deleteInvoice,
  getInvoiceById,
  getUserInvoices,
  updateInvoice,
} from "./service";

export const invoiceRoutes = new Elysia({ prefix: "/invoices" })
  .use(invoiceModel)
  .derive(async ({ headers }) => {
    const { session, user } = await getSessionFromHeader(headers.authorization);
    return createAuthHelpers(session, user);
  })
  .get(
    "/",
    async ({ requireAuth }) => {
      const authContext = await requireAuth();
      const invoices = await getUserInvoices(authContext.userId);
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
  .get(
    "/:id",
    async ({ requireAuth, params }) => {
      const authContext = await requireAuth();
      const foundInvoice = await getInvoiceById(params.id, authContext.userId);

      if (!foundInvoice) {
        throw new NotFoundError("Invoice not found or access denied");
      }

      return {
        id: foundInvoice.id,
        orgId: foundInvoice.orgId,
        amount: foundInvoice.amount,
        status: foundInvoice.status,
        dueDate: foundInvoice.dueDate,
        periodStart: foundInvoice.periodStart,
        periodEnd: foundInvoice.periodEnd,
        description: foundInvoice.description,
        createdBy: foundInvoice.createdBy,
        modifiedBy: foundInvoice.modifiedBy,
        createdAt: foundInvoice.createdAt,
        updatedAt: foundInvoice.updatedAt,
      };
    },
    {
      response: {
        200: "invoiceResponse",
      },
    },
  )
  .patch(
    "/:id",
    async ({ requireAuth, params, body }) => {
      const authContext = await requireAuth();
      const updatedInvoice = await updateInvoice(
        params.id,
        {
          amount: body.amount,
          status: body.status,
          dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
          periodStart: body.periodStart
            ? new Date(body.periodStart)
            : undefined,
          periodEnd: body.periodEnd ? new Date(body.periodEnd) : undefined,
          description: body.description,
          userIds: body.userIds,
        },
        authContext.userId,
      );

      return {
        id: updatedInvoice.id,
        orgId: updatedInvoice.orgId,
        amount: updatedInvoice.amount,
        status: updatedInvoice.status,
        dueDate: updatedInvoice.dueDate,
        periodStart: updatedInvoice.periodStart,
        periodEnd: updatedInvoice.periodEnd,
        description: updatedInvoice.description,
        createdBy: updatedInvoice.createdBy,
        modifiedBy: updatedInvoice.modifiedBy,
        createdAt: updatedInvoice.createdAt,
        updatedAt: updatedInvoice.updatedAt,
      };
    },
    {
      body: "updateInvoiceBody",
      response: {
        200: "invoiceResponse",
      },
    },
  )
  .delete("/:id", async ({ requireAuth, params }) => {
    const authContext = await requireAuth();
    await deleteInvoice(params.id, authContext.userId);
    return { message: "Invoice deleted successfully" };
  });
