import type { Report } from "@/drizzle/schema";

export default interface UpdateReport {
  sub: string;
  org: string;
  report: Report;
}
