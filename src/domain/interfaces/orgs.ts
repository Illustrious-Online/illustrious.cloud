import { Org, Report } from "../../../drizzle/schema";

export interface CreateOrg {
  user: string;
  org: Org;
}

export interface SubmitReport {
  org: string;
  report: Report;
}

export interface FetchReport {
  id: string;
  userId?: string;
}

export interface FetchAllReports {
  type: string;
  id: string;
}
