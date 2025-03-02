import BadRequestError from "@/domain/exceptions/BadRequestError";
import UnauthorizedError from "@/domain/exceptions/UnauthorizedError";
import type {
  AuthPermissions,
  AuthPluginParams,
  AuthParams,
} from "@/domain/interfaces/auth";
import type { CreateInvoice } from "@/domain/interfaces/invoices";
import type { CreateOrg } from "@/domain/interfaces/orgs";
import type { CreateReport } from "@/domain/interfaces/reports";
import type { CreateUser } from "@/domain/interfaces/users";
import { UserRole } from "@/domain/types/UserRole";
import bearer from "@elysiajs/bearer";
import { and, eq } from "drizzle-orm";
import type { Elysia } from "elysia";
import { supabaseClient } from "../app";
import { db } from "../drizzle/db";
import {
  type User,
  orgInvoice,
  orgReport,
  orgUser,
  user,
  userInvoice,
  userReport,
} from "../drizzle/schema";

const executePostChecks = async (
  currentUser: User,
  params: AuthParams,
  body: unknown,
  path: string,
): Promise<{ user: User; permissions: AuthPermissions }> => {
  let orgId: string | undefined;
  const permissions: AuthPermissions = {
    superAdmin: currentUser.superAdmin,
    resource: params.resource,
  };

  if (path.includes("/org")) {
    const {
      org: { id },
    }: CreateOrg = body as CreateOrg;

    if (!path.includes("/user")) {
      const findOrgUsers = await db
        .select()
        .from(orgUser)
        .where(eq(orgUser.userId, currentUser.id));

      permissions.org = {
        id,
        role: findOrgUsers.find((orgUser) => orgUser.orgId === id)
          ?.role ?? UserRole.CLIENT,
        create: findOrgUsers.length === 0,
      };
    } else {
      const orgId = params.org ?? (body as CreateUser).org;

      if (!orgId) {
        throw new BadRequestError(
          "Required Organization ID is missing.",
        );
      }

      const findOrgUsers = await db
        .select()
        .from(orgUser)
        .where(
          and(
            eq(orgUser.userId, currentUser.id),
            eq(orgUser.orgId, orgId),
          ),
        );

      permissions.org = {
        id,
        role: findOrgUsers.find((orgUser) => orgUser.orgId === id)
          ?.role ?? UserRole.CLIENT,
      };
    }

    return {
      user: currentUser,
      permissions,
    };
  }

  if (path.includes("/invoice")) {
    const { org }: CreateInvoice = body as CreateInvoice;
    orgId = org;
  } else {
    const { org }: CreateReport = body as CreateReport;
    orgId = org;
  }

  const findOrgUsers = await db
    .select()
    .from(orgUser)
    .where(
      and(eq(orgUser.userId, currentUser.id), eq(orgUser.orgId, orgId)),
    );

  permissions.org = {
    id: orgId,
    role: findOrgUsers.find((orgUser) => orgUser.orgId === orgId)?.role ?? UserRole.CLIENT,
    create: findOrgUsers.length === 0,
  };

  return {
    user: currentUser,
    permissions,
  };
}

const executeOrgChecks = async (
  currentUser: User,
  orgId: string,
  userId?: string
): Promise<{ id: string, role: UserRole, managed?: boolean }> => {
  const findOrgUsers = await db
    .select()
    .from(orgUser)
    .where(
      and(
        eq(orgUser.userId, currentUser.id),
        eq(orgUser.orgId, orgId),
      ),
    );

  const permissions: { id: string; role: UserRole; managed?: boolean} = {
    id: orgId,
    role: findOrgUsers.find((orgUser) => orgUser.orgId === orgId)
      ?.role ?? UserRole.CLIENT,
  };

  if (userId) {
    const findUserOrg = await db
      .select()
      .from(orgUser)
      .innerJoin(user, eq(orgUser.userId, user.id))
      .where(
        and(
          eq(orgUser.userId, userId),
          eq(orgUser.orgId, orgId),
        ),
      );

    permissions.managed = findUserOrg.length === 1 && findUserOrg[0].User.managed;
  }

  return permissions;
}

const executeInvoiceChecks = async (
  currentUser: User,
  invoiceId: string
): Promise<{ id: string; access: boolean; edit: boolean; delete: boolean }> => {
  const findInvoiceUser = await db
    .select()
    .from(userInvoice)
    .innerJoin(orgUser, eq(userInvoice.userId, orgUser.userId))
    .innerJoin(
      orgInvoice,
      eq(userInvoice.invoiceId, orgInvoice.invoiceId),
    )
    .where(
      and(
        eq(userInvoice.invoiceId, invoiceId),
        eq(userInvoice.userId, currentUser.id),
        eq(orgInvoice.orgId, orgUser.orgId),
      ),
    );

  const {
    OrgUser: { role },
    UserInvoice,
  } = findInvoiceUser[0];

  return {
    id: invoiceId,
    access: !!UserInvoice,
    edit: !!UserInvoice && role ? role > UserRole.CLIENT : false,
    delete: !!UserInvoice && role ? role > UserRole.EMPLOYEE : false,
  };
}

const executeReportChecks = async (
  currentUser: User,
  reportId: string
): Promise<{ id: string; access: boolean; edit: boolean; delete: boolean }> => {
  const findReportUser = await db
    .select()
    .from(userReport)
    .innerJoin(orgUser, eq(userReport.userId, orgUser.userId))
    .innerJoin(orgReport, eq(userReport.reportId, orgReport.reportId))
    .where(
      and(
        eq(userReport.reportId, reportId),
        eq(userReport.userId, currentUser.id),
        eq(orgReport.orgId, orgUser.orgId),
      ),
    );

  const {
    OrgUser: { role },
    UserReport,
  } = findReportUser[0];

  return {
    id: reportId,
    access: !!UserReport,
    edit: !!UserReport && role ? role > UserRole.CLIENT : false,
    delete: !!UserReport && role ? role > UserRole.EMPLOYEE : false,
  };
}

const authPlugin = (app: Elysia) =>
  app
    .use(bearer())
    .derive(
      async ({ bearer, body, path, params, request }: AuthPluginParams) => {
        if (path === "/auth" || path === "/" || path === "/favicon.ico") {
          return;
        }

        if (!bearer) {
          throw new UnauthorizedError("Unauthorized: Access token is missing!");
        }

        const { data, error } = await supabaseClient.auth.getUser(bearer);

        if (error || !data) {
          throw new UnauthorizedError(`${error?.message || "Unknown error!"}`);
        }

        const findUser = await db
          .select()
          .from(user)
          .where(eq(user.id, data.user.id));

        if (!findUser.length) {
          throw new UnauthorizedError("User was not found.");
        }

        const currentUser: User = findUser[0];
        const permissions: AuthPermissions = {
          superAdmin: currentUser.superAdmin,
          resource: params.resource,
        };

        if (path.includes("/me") || path.includes("/user")) {
          return {
            user: currentUser,
            permissions,
          };
        }

        if (request.method === "POST") {
          return await executePostChecks(currentUser, params, body, path);
        }

        if (params.org) { 
          permissions.org = await executeOrgChecks(currentUser, params.org, params.user);
        }

        if (params.invoice) {
          permissions.invoice = await executeInvoiceChecks(currentUser, params.invoice);
        }

        if (params.report) {
          permissions.report = await executeReportChecks(currentUser, params.report);
        }

        return {
          user: currentUser,
          permissions,
        };
      },
    );

export default authPlugin;
