import type { UserRole } from "@/domain/types/UserRole";
import type { Invoice, Org, Report, User } from "@/drizzle/schema";

export interface CreateOrg {
  user: string;
  org: Org;
}

export interface OrgDetails {
  id: string;
  reports?: { report: Report; userId: string; role: UserRole }[];
  invoices?: { invoice: Invoice; userId: string; role: UserRole }[];
  users?: { orgUser: User; role: UserRole }[];
}
