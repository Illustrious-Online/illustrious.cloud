import UnauthorizedError from "@/domain/exceptions/UnauthorizedError";
import { and, eq } from "drizzle-orm";
import type { Context, Elysia, Context as ElysiaContext } from "elysia";
import { db } from "../drizzle/db";

import ConflictError from "@/domain/exceptions/ConflictError";
import type { SubmitInvoice } from "@/domain/interfaces/invoices";
import type { SubmitReport } from "@/domain/interfaces/reports";
import { UserRole } from "@/domain/types/UserRole";
import { supabaseClient } from "../app";
import {
  type Org,
  type User,
  orgInvoice,
  orgReport,
  orgUser,
  user,
  userInvoice,
  userReport,
} from "../drizzle/schema";

export interface AuthenticatedContext extends Context {
  user: User;
  permissions: {
    superAdmin: boolean;
    org?: {
      id: string;
      role?: UserRole;
    };
    invoice?: {
      creator?: boolean;
    };
    report?: {
      creator?: boolean;
    };
  };
}

const authPlugin = (app: Elysia) =>
  app.derive(async (context: ElysiaContext) => {
    // Check if the request has a bearer token
    const { body, path, headers = {}, params = {} } = context;
    const { bearer } = headers;
    const { org, invoice, report } = params;

    // If the request does not have a bearer token, throw an error
    if (!bearer) {
      throw new UnauthorizedError("Access token is missing!");
    }

    // Get the user data from the supabase using bearer token
    const { data, error } = await supabaseClient.auth.getUser(bearer);

    // If there is an error or no data, throw an error
    if (error || !data) {
      throw new UnauthorizedError(
        `Unauthorized: ${error?.message || "Unknown error"}`,
      );
    }

    // Find the user in the database
    const findUser = await db
      .select()
      .from(user)
      .where(eq(user.id, data.user.id));
    const fetchUser: User = findUser[0];
    let permissions: {
      superAdmin: boolean;
      org?: {
        id: string;
        role?: UserRole;
      };
      invoice?: {
        creator?: boolean;
      };
      report?: {
        creator?: boolean;
      };
    } = {
      superAdmin: fetchUser.superAdmin,
    };

    if (path.includes("org")) {
      const orgId = org ?? (body as Org).id;
      const findOrgUser = await db
        .select()
        .from(orgUser)
        .where(and(eq(orgUser.orgId, orgId), eq(orgUser.userId, user.id)));

      if (findOrgUser.length > 0) {
        permissions.org = {
          id: orgId,
          role: findOrgUser[0].role,
        };
      }
    }

    if (path.includes("invoice")) {
      const invoiceId = invoice ?? (body as SubmitInvoice).invoice.id;
      const findInvoiceUser = await db
        .select()
        .from(userInvoice)
        .where(
          and(
            eq(userInvoice.invoiceId, invoiceId),
            eq(userInvoice.userId, user.id),
          ),
        );
      const findOrgInvoice = await db
        .select()
        .from(orgInvoice)
        .where(eq(orgInvoice.invoiceId, invoiceId));

      if ((body as SubmitInvoice).client) {
        const { client, org } = body as SubmitInvoice;
        const findClientUser = await db
          .select()
          .from(orgUser)
          .where(and(eq(orgUser.orgId, org), eq(orgUser.userId, client)));

        if (!findClientUser.length) {
          throw new ConflictError("Client not found in the organization");
        }
      }

      permissions = {
        ...permissions,
        org: {
          id: findOrgInvoice[0].orgId,
        },
        invoice: findInvoiceUser.length > 0 ? {} : undefined,
      };
    }

    // Check if report path was requested
    if (path.includes("report")) {
      const reportId = report ? report : (body as SubmitReport).report.id;
      const findReportUser = await db
        .select()
        .from(userReport)
        .where(
          and(
            eq(userReport.reportId, reportId),
            eq(userReport.userId, user.id),
          ),
        );
      const findOrgReport = await db
        .select()
        .from(orgReport)
        .where(eq(orgReport.reportId, reportId));

      if ((body as SubmitReport).client) {
        const { client, org } = body as SubmitReport;
        const findClientUser = await db
          .select()
          .from(orgUser)
          .where(and(eq(orgUser.orgId, org), eq(orgUser.userId, client)));

        if (!findClientUser.length) {
          throw new ConflictError("Client not found in the organization");
        }
      }

      permissions = {
        ...permissions,
        org: {
          id: findOrgReport[0].orgId,
        },
        report: findReportUser.length > 0 ? {} : undefined,
      };
    }

    if (!permissions.org?.id) {
      throw new ConflictError("Unable to find associated org for the request");
    }

    if (!permissions.org?.role) {
      const { id } = permissions.org;
      const findOrgUser = await db
        .select()
        .from(orgUser)
        .where(and(eq(orgUser.orgId, id), eq(orgUser.userId, user.id)));

      permissions.org = {
        ...permissions.org,
        role: findOrgUser[0].role,
      };

      if (permissions.invoice) {
        permissions.invoice.creator = findOrgUser[0].role > UserRole.CLIENT;
      }

      if (permissions.report) {
        permissions.report.creator = findOrgUser[0].role > UserRole.CLIENT;
      }
    }

    return {
      user,
      permissions,
    };
  });

export default authPlugin;
