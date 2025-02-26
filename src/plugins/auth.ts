import UnauthorizedError from "@/domain/exceptions/UnauthorizedError";
import { and, eq } from "drizzle-orm";
import type { Context, Elysia, Context as ElysiaContext } from "elysia";
import { db } from "../drizzle/db";

import ConflictError from "@/domain/exceptions/ConflictError";
import type {
  CreateInvoice,
  SubmitInvoice,
} from "@/domain/interfaces/invoices";
import type { CreateOrg } from "@/domain/interfaces/orgs";
import type { CreateReport, SubmitReport } from "@/domain/interfaces/reports";
import { CreateUser } from "@/domain/interfaces/users";
import { UserRole } from "@/domain/types/UserRole";
import bearer from "@elysiajs/bearer";
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
  app.use(bearer()).derive(async ({ bearer, body, path, params }) => {
    if (path === "/auth") {
      return;
    }

    if (!bearer) {
      throw new UnauthorizedError("Access token is missing!");
    }

    const { data, error } = await supabaseClient.auth.getUser(bearer);

    if (error || !data) {
      throw new UnauthorizedError(
        `Unauthorized: ${error?.message || "Unknown error"}`,
      );
    }

    const findUser = await db
      .select()
      .from(user)
      .where(eq(user.id, data.user.id));

    const fetchUser: User = findUser[0];

    const permissions: {
      superAdmin: boolean;
      org?: {
        id: string;
        role?: UserRole;
        create?: boolean;
      };
      invoice?: {
        id: string;
        access?: boolean;
        edit?: boolean;
      };
      report?: {
        id: string;
        access?: boolean;
        edit?: boolean;
      };
    } = {
      superAdmin: fetchUser.superAdmin,
    };

    if (path.includes("/me")) {
      return {
        user: fetchUser,
        permissions,
      };
    }

    if (path.includes("/user")) {
      const { user: userParam } = params as { user: string };

      if (userParam !== fetchUser.id) {
        throw new UnauthorizedError(
          "You do not have permission to access this user's information.",
        );
      }

      return {
        user: fetchUser,
        permissions,
      };
    }

    const { org: orgParam } = params as { org: string };
    const findOrgUsers = await db
      .select()
      .from(orgUser)
      .where(eq(orgUser.userId, fetchUser.id));

    permissions.org = {
      id: orgParam ?? (body as CreateOrg).org.id,
      role: findOrgUsers.find((orgUser) => orgUser.orgId === orgParam)?.role,
      create: !findOrgUsers.filter((orgUser) => orgUser.role === UserRole.OWNER)
        .length,
    };

    if (path.includes("/invoice")) {
      const { invoice: invoiceParam } = params as { invoice: string };
      const invoiceId =
        invoiceParam ?? (body as CreateInvoice | SubmitInvoice).invoice.id;
      const findInvoiceUser = await db
        .select()
        .from(userInvoice)
        .where(
          and(
            eq(userInvoice.invoiceId, invoiceId),
            eq(userInvoice.userId, fetchUser.id),
          ),
        );

      permissions.invoice = {
        id: invoiceId,
        access: findInvoiceUser.length > 0,
        edit:
          findInvoiceUser.length > 0 && permissions.org?.role
            ? permissions.org?.role > UserRole.CLIENT
            : false,
      };
    }

    if (path.includes("/report")) {
      const { report: reportParam } = params as { report: string };
      const reportId =
        reportParam ?? (body as CreateReport | SubmitReport).report.id;
      const findReportUser = await db
        .select()
        .from(userReport)
        .where(
          and(
            eq(userReport.reportId, reportId),
            eq(userReport.userId, fetchUser.id),
          ),
        );

      permissions.report = {
        id: reportId,
        access: findReportUser.length > 0,
        edit:
          findReportUser.length > 0 && permissions.org?.role
            ? permissions.org?.role > UserRole.CLIENT
            : false,
      };
    }

    return {
      user,
      permissions,
    };
  });

export default authPlugin;
