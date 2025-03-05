import type { Invoice, Org, Report, User } from "@/drizzle/schema";

/**
 * Interface representing the structure for creating a user.
 *
 * @interface CreateUser
 *
 * @property {string} sub - The subject identifier for the user.
 * @property {User} user - The user object containing user details.
 * @property {string} [org] - Optional organization identifier associated with the user.
 */
export interface CreateUser {
  sub: string;
  user: User;
  org?: string;
}

/**
 * Interface representing the structure of a user fetch request.
 */
export interface FetchUser {
  id?: string | null;
  email?: string | null;
  identifier?: string | null;
}

/**
 * Interface representing the details of a user.
 *
 * @property {User} user - The user object.
 * @property {Report[]} [reports] - Optional array of reports associated with the user.
 * @property {Invoice[]} [invoices] - Optional array of invoices associated with the user.
 * @property {Org[]} [orgs] - Optional array of organizations associated with the user.
 */
export interface UserDetails {
  user: User;
  reports?: Report[];
  invoices?: Invoice[];
  orgs?: Org[];
}
