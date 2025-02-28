import type { UserRole } from "@/domain/types/UserRole";
import type { User } from "@/drizzle/schema";
import type { Context } from "elysia";
import type { CreateInvoice, SubmitInvoice } from "./invoices";
import type { CreateOrg } from "./orgs";
import type { CreateReport, SubmitReport } from "./reports";
import type { CreateUser } from "./users";

export interface CreateAuth {
  userId: string;
  authId: string;
  sub: string;
}

export interface AuthPermissions {
  superAdmin: boolean;
  org?: {
    id: string;
    role?: UserRole;
    create?: boolean;
  };
  invoice?: {
    id?: string;
    access?: boolean;
    edit?: boolean;
    create?: boolean;
    delete?: boolean;
  };
  report?: {
    id?: string;
    access?: boolean;
    edit?: boolean;
    create?: boolean;
    delete?: boolean;
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

export interface AuthPluginParams {
  bearer: string;
  body:
    | CreateInvoice
    | CreateOrg
    | CreateReport
    | CreateUser
    | SubmitInvoice
    | SubmitReport
    | unknown;
  path: string;
  params: AuthParams;
  request: Request;
}
