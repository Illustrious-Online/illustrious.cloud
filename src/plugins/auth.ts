import UnauthorizedError from "@/domain/exceptions/UnauthorizedError";
import { and, eq } from "drizzle-orm";
import type { Context, Elysia } from "elysia";
import { db } from "../drizzle/db";
import type {
  CreateInvoice,
  SubmitInvoice,
} from "@/domain/interfaces/invoices";
import type { CreateOrg } from "@/domain/interfaces/orgs";
import type { CreateReport, SubmitReport } from "@/domain/interfaces/reports";
import type { CreateUser } from "@/domain/interfaces/users";
import { UserRole } from "@/domain/types/UserRole";
import bearer from "@elysiajs/bearer";
import { supabaseClient } from "../app";
import {
  type User,
  orgUser,
  user,
  userInvoice,
  userReport,
} from "../drizzle/schema";

interface AuthPermissions {
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
  resource?: string;
}

export interface AuthenticatedContext extends Context {
  user: User;
  permissions: AuthPermissions;
}

interface AuthParams {
  user?: string;
  invoice?: string;
  report?: string;
  resource?: string;
  org?: string;
}

interface AuthPluginParams {
  bearer: string;
  body: CreateInvoice | CreateOrg | CreateReport | CreateUser | SubmitInvoice | SubmitReport | unknown;
  path: string;
  params: AuthParams;
}

const authPlugin = (app: Elysia) =>
  app.use(bearer()).derive(async ({ bearer, body, path, params }: AuthPluginParams) => {
    if (path === "/auth") {
      return;
    }

    if (!bearer) {
      throw new UnauthorizedError("Unauthorized: Access token is missing!");
    }

    const { data, error } = await supabaseClient.auth.getUser(bearer);

    if (error || !data) {
      throw new UnauthorizedError(
        `Unauthorized: ${error?.message || "Unknown error!"}`,
      );
    }

    const findUser = await db
      .select()
      .from(user)
      .where(eq(user.id, data.user.id));

    if (!findUser.length) {
      throw new UnauthorizedError("Unauthorized: User not found!");
    }

    const fetchUser: User = findUser[0];
    const permissions: AuthPermissions = {
      superAdmin: fetchUser.superAdmin,
      resource: params.resource
    };

    if (path.includes("/me")) {
      return {
        user: fetchUser,
        permissions,
      };
    }

    if (path.includes("/user")) {
      if (params.user !== fetchUser.id) {
        throw new UnauthorizedError(
          "Unauthorized: You do not have permission to access this resource!",
        );
      }

      if (params.org) {
        const findOrgUsers = await db
          .select()
          .from(orgUser)
          .where(eq(orgUser.userId, fetchUser.id));

        permissions.org = {
          id: params.org,
          role: findOrgUsers.find((orgUser) => orgUser.orgId === params.org)?.role,
          create: !findOrgUsers.filter((orgUser) => orgUser.role === UserRole.OWNER)
            .length,
        };
      }

      return {
        user: fetchUser,
        permissions,
      };
    }

    const findOrgUsers = await db
      .select()
      .from(orgUser)
      .where(eq(orgUser.userId, fetchUser.id));

    permissions.org = {
      id: params.org ?? (body as CreateOrg).org.id,
      role: findOrgUsers.find((orgUser) => orgUser.orgId === params.org)?.role,
      create: !findOrgUsers.filter((orgUser) => orgUser.role === UserRole.OWNER)
        .length,
    };

    if (path.includes("/invoice")) {
      const invoiceId =
        params.invoice ?? (body as CreateInvoice | SubmitInvoice).invoice.id;
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
      const reportId =
        params.report ?? (body as CreateReport | SubmitReport).report.id;
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
