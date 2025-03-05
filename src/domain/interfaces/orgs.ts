import type { UserRole } from "@/domain/types/UserRole";
import type { Invoice, Org, Report, User } from "@/drizzle/schema";

/**
 * Interface representing the structure for creating an organization.
 */
export interface CreateOrg {
  user: string;
  org: Org;
}

/**
 * Represents the details of an organization.
 */
export interface OrgDetails {
  /**
   * An optional array of reports associated with the organization.
   * Each report is linked to a user and their role within the organization.
   */
  reports?: { report: Report; userId: string; role: UserRole }[];

  /**
   * An optional array of invoices associated with the organization.
   * Each invoice is linked to a user and their role within the organization.
   */
  invoices?: { invoice: Invoice; userId: string; role: UserRole }[];

  /**
   * An optional array of users associated with the organization.
   * Each user is linked to their role within the organization.
   */
  users?: { orgUser: User; role: UserRole }[];
}
