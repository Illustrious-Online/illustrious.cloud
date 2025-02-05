import type { Org } from "../../drizzle/schema";

export interface CreateOrg {
  user: string;
  org: Org;
}
