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

/**
 * Executes post-authentication checks and returns the current user along with their permissions.
 *
 * @param currentUser - The current authenticated user.
 * @param params - The authentication parameters.
 * @param body - The request body.
 * @param path - The request path.
 * @returns A promise that resolves to an object containing the user and their permissions.
 * @throws {BadRequestError} If the required organization ID is missing.
 */
export const executePostChecks = async (
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

/**
 * Executes organization checks for the current user and optionally for another user.
 *
 * @param currentUser - The current user performing the checks.
 * @param orgId - The ID of the organization.
 * @param userId - (Optional) The ID of another user to check within the organization.
 * @returns A promise that resolves to an object containing the organization ID, the role of the current user within the organization, and optionally whether the other user is managed.
 */
export const executeOrgChecks = async (
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

/**
 * Executes checks on an invoice to determine the current user's access, edit, and delete permissions.
 *
 * @param currentUser - The user object representing the current user.
 * @param invoiceId - The ID of the invoice to check permissions for.
 * @returns A promise that resolves to an object containing the invoice ID and the user's permissions (access, edit, delete).
 */
export const executeInvoiceChecks = async (
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

/**
 * Executes report checks for the current user and a specified report.
 *
 * @param currentUser - The current user object.
 * @param reportId - The ID of the report to check.
 * @returns A promise that resolves to an object containing the report ID and the user's access, edit, and delete permissions.
 */
export const executeReportChecks = async (
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

/**
 * Authenticates and authorizes requests to the application.
 *
 * This plugin integrates with the Elysia framework to provide authentication
 * and authorization capabilities using bearer tokens. It performs various
 * checks to ensure that the user is authenticated and has the necessary
 * permissions to access the requested resources.
 *
 * @param {Elysia} app - The Elysia application instance.
 * @returns {Elysia} The Elysia application instance with the authentication plugin applied.
 *
 * @throws {UnauthorizedError} If the bearer token is missing, invalid, or the user is not found.
 *
 * @example
 * // Usage in an Elysia application
 * const app = new Elysia();
 * app.use(authPlugin);
 *
 * @typedef {Object} AuthPluginParams
 * @property {string} bearer - The bearer token from the request.
 * @property {Object} body - The request body.
 * @property {string} path - The request path.
 * @property {Object} params - The request parameters.
 * @property {Request} request - The request object.
 *
 * @typedef {Object} AuthPermissions
 * @property {boolean} superAdmin - Indicates if the user is a super admin.
 * @property {string} [resource] - The resource being accessed.
 * @property {string} [org] - The organization being accessed.
 * @property {string} [invoice] - The invoice being accessed.
 * @property {string} [report] - The report being accessed.
 *
 * @typedef {Object} User
 * @property {string} id - The user ID.
 * @property {boolean} superAdmin - Indicates if the user is a super admin.
 */
const authPlugin = (app: Elysia) =>
  app
    .use(bearer())
    .derive(
      async ({ bearer, body, path, params, request }: AuthPluginParams) => {
        if (path === "/auth" || path === "/" || path === "/favicon.ico") {
          return;
        }

        if (!bearer) {
          throw new UnauthorizedError("Access token is missing.");
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
