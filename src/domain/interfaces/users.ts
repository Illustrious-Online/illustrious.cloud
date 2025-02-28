import type { User } from "@/drizzle/schema";

export interface CreateUser {
  sub: string;
  user: User;
  org?: string;
}

export interface FetchUser {
  id?: string | null;
  email?: string | null;
  identifier?: string | null;
}
