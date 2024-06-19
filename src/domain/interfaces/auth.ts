export interface CreateAuth {
  userId: string;
  authId: string;
  sub: string;
}

export interface FetchAuth {
  id?: string;
  sub?: string;
}
