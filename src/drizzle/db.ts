import * as fs from "node:fs";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as relations from "./relations";
import * as schema from "./schema";

export const client = new Client({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT) ?? 5432,
  user: process.env.DB_USERNAME ?? "admin",
  password: process.env.DB_PASSWORD ?? "illustrious",
  database: process.env.DB_NAME ?? "illustrious",
  ssl:
    process.env.DB_SSL === "true"
      ? {
          rejectUnauthorized: true,
          ca: fs.readFileSync("cert.crt").toString(),
        }
      : undefined,
});

await client.connect();
// { schema } is used for relational queries
export const db = drizzle(client, {
  schema: { ...schema, ...relations },
  logger: false,
});
