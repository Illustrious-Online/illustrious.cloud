import type { Report } from "../../drizzle/schema";

export interface SubmitReport {
  client: string;
  org: string;
  report: Report;
}

export interface CreateReport extends SubmitReport {
  creator: string;
}
