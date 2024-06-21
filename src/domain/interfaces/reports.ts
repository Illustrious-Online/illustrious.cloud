import { Report } from "../../../drizzle/schema";

export interface CreateReport {
  user: string;
  org: string;
  report: Report;
}

export interface SubmitReport {
  org: string;
  report: Report;
}

export interface FetchReport {
  id: string;
  userId: string;
}

export interface FetchAllReports {
  type: string;
  id: string;
}
