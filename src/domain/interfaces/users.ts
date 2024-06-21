import { User } from "../../../drizzle/schema";

export interface CreateUser {
  sub: string;
  user: User;
}

export interface FetchUser {
  id?: string;
  sub?: string;
  email?: string;
}
