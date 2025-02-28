import UnauthorizedError from "@/domain/exceptions/UnauthorizedError";
import type {
  AuthPermissions,
  AuthPluginParams,
} from "@/domain/interfaces/auth";
import type {
  CreateInvoice,
  SubmitInvoice,
} from "@/domain/interfaces/invoices";
import type { CreateOrg } from "@/domain/interfaces/orgs";
import type { CreateReport, SubmitReport } from "@/domain/interfaces/reports";
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
import type { CreateUser } from "@/domain/interfaces/users";
import BadRequestError from "@/domain/exceptions/BadRequestError";

const authPlugin = (app: Elysia) =>
  app
    .use(bearer())
    .derive(
      async ({ bearer, body, path, params, request }: AuthPluginParams) => {
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
          resource: params.resource,
        };

        if (path.includes("/me") || path.includes("/user")) {
          return {
            user: fetchUser,
            permissions,
          };
        }

        if (request.method === "POST") {
          let orgId: string | undefined;

          if (path.includes("/org")) {
            const { org: { id } }: CreateOrg = body as CreateOrg;

            if (!path.includes('/user')) {
              const findOrgUsers = await db
                .select()
                .from(orgUser)
                .where(eq(orgUser.userId, fetchUser.id)
              );

              permissions.org = {
                id,
                create: findOrgUsers.length === 0,
              };
            } else {
              const orgId = params.org ?? (body as CreateUser).org;

              if (!orgId) {
                throw new BadRequestError("Required Organization ID is missing.");
              }

              const findOrgUsers = await db
                .select()
                .from(orgUser)
                .where(
                  and(
                    eq(orgUser.userId, fetchUser.id),
                    eq(orgUser.orgId, orgId),
                  ),
              );

              permissions.org = {
                id,
                role: findOrgUsers.find((orgUser) => orgUser.orgId === id)?.role,
              };
            }

            return {
              user: fetchUser,
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
              and(
                eq(orgUser.userId, fetchUser.id),
                eq(orgUser.orgId, orgId),
              ),
          );

          permissions.org = {
            id: orgId,
            role: findOrgUsers.find((orgUser) => orgUser.orgId === orgId)?.role,
            create: findOrgUsers.length === 0,
          };

          return {
            user: fetchUser,
            permissions,
          };
        }

        if (params.org) {
          const findOrgUsers = await db
            .select()
            .from(orgUser)
            .where(
              and(
                eq(orgUser.userId, fetchUser.id),
                eq(orgUser.orgId, params.org),
            ));

          permissions.org = {
            id: params.org,
            role: findOrgUsers.find((orgUser) => orgUser.orgId === params.org)
              ?.role,
          };
        }

        if (params.invoice) {
          const findInvoiceUser = await db
            .select()
            .from(userInvoice)
            .innerJoin(orgUser, eq(userInvoice.userId, orgUser.userId))
            .innerJoin(orgInvoice, eq(userInvoice.invoiceId, orgInvoice.invoiceId))
            .where(
              and(
                eq(userInvoice.invoiceId, params.invoice),
                eq(userInvoice.userId, fetchUser.id),
                eq(orgInvoice.orgId, orgUser.orgId),
              ),
            );

          const { OrgUser: { role }, UserInvoice } = findInvoiceUser[0];

          permissions.invoice = {
            id: params.invoice,
            access: !!UserInvoice,
            edit: !!UserInvoice && role
              ? role > UserRole.CLIENT
              : false,
            delete: !!UserInvoice && role
              ? role > UserRole.EMPLOYEE
              : false,
          };
        }

        if (params.report) {
          const findReportUser = await db
            .select()
            .from(userReport)
            .innerJoin(orgUser, eq(userReport.userId, orgUser.userId))
            .innerJoin(orgReport, eq(userReport.reportId, orgReport.reportId))
            .where(
              and(
                eq(userReport.reportId, params.report),
                eq(userReport.userId, fetchUser.id),
                eq(orgReport.orgId, orgUser.orgId),
              ),
            );

          const { OrgUser: { role }, UserReport } = findReportUser[0];

          permissions.report = {
            id: params.report,
            access: !!UserReport,
            edit: !!UserReport && role
              ? role > UserRole.CLIENT
              : false,
            delete: !!UserReport && role
              ? role > UserRole.EMPLOYEE
              : false,
          };
        }

        return {
          user: fetchUser,
          permissions
        };
      },
    );

export default authPlugin;
