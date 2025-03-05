import type { Report } from "@/drizzle/schema";

/**
 * Interface representing the structure of a report submission.
 */
export interface SubmitReport {
  client: string;
  org: string;
  report: Report;
}

/**
 * Interface representing the creation of a report.
 * Extends the SubmitReport interface.
 *
 * @interface CreateReport
 * @extends SubmitReport
 *
 * @property {string} creator - The creator of the report.
 */
export interface CreateReport extends SubmitReport {
  creator: string;
}
