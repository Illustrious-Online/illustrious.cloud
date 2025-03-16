import type { UserRole } from "@/domain/types/UserRole";
import type { User } from "@/drizzle/schema";
import type { Context } from "elysia";
import type { CreateInvoice, SubmitInvoice } from "./invoices";
import type { CreateOrg } from "./orgs";
import type { CreateReport, SubmitReport } from "./reports";
import type { CreateUser } from "./users";

/**
 * Interface representing the structure for creating an authentication record.
 */
export interface CreateAuth {
  userId: string;
  authId: string;
  sub: string;
}

/**
 * Interface representing the permissions for authentication.
 */
export interface AuthPermissions {
  /**
   * Indicates if the user has super admin privileges.
   */
  superAdmin: boolean;

  /**
   * Permissions related to organization.
   */
  org?: {
    /**
     * The ID of the organization.
     */
    id: string;

    /**
     * The role of the user within the organization.
     */
    role?: UserRole;

    /**
     * Indicates if the user can create within the organization.
     */
    create?: boolean;

    /**
     * Indicates if the user is managed by the organization.
     */
    managed?: boolean;
  };

  /**
   * Permissions related to invoices.
   */
  invoice?: {
    /**
     * The ID of the invoice.
     */
    id?: string;

    /**
     * Indicates if the user has access to the invoice.
     */
    access?: boolean;

    /**
     * Indicates if the user can edit the invoice.
     */
    edit?: boolean;

    /**
     * Indicates if the user can create an invoice.
     */
    create?: boolean;

    /**
     * Indicates if the user can delete the invoice.
     */
    delete?: boolean;
  };

  /**
   * Permissions related to reports.
   */
  report?: {
    /**
     * The ID of the report.
     */
    id?: string;

    /**
     * Indicates if the user has access to the report.
     */
    access?: boolean;

    /**
     * Indicates if the user can edit the report.
     */
    edit?: boolean;

    /**
     * Indicates if the user can create a report.
     */
    create?: boolean;

    /**
     * Indicates if the user can delete the report.
     */
    delete?: boolean;
  };

  /**
   * The resource associated with the permissions.
   */
  resource?: string;
}

/**
 * Represents an authenticated context that extends the base context.
 * This context includes information about the authenticated user and their permissions.
 *
 * @extends Context
 *
 * @property {User} user - The authenticated user.
 * @property {AuthPermissions} permissions - The permissions associated with the authenticated user.
 */
export interface AuthenticatedContext extends Context {
  user: User;
  permissions: AuthPermissions;
}

/**
 * Interface representing the parameters for authentication.
 *
 * @property {string} [user] - Optional user identifier.
 * @property {string} [invoice] - Optional invoice identifier.
 * @property {string} [report] - Optional report identifier.
 * @property {string} [org] - Optional organization identifier.
 */
export interface AuthParams {
  user?: string;
  invoice?: string;
  report?: string;
  org?: string;
}

/**
 * Parameters for the authentication plugin.
 */
export interface AuthPluginParams {
  /**
   * The bearer token for authentication.
   */
  bearer?: string;

  /**
   * The body of the request, which can be one of several types.
   */
  body:
    | CreateInvoice
    | CreateOrg
    | CreateReport
    | CreateUser
    | SubmitInvoice
    | SubmitReport
    | unknown;

  /**
   * The path of the request.
   */
  path: string;

  /**
   * Additional authentication parameters.
   */
  params: AuthParams;

  /**
   * The query parameters of the request.
   */
  query: Record<string, string>;

  /** 
   * The redirect function.
   */
  redirect: (url: string) => void;

  /**
   * The request object.
   */
  request: Request;
}
