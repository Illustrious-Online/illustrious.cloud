import * as fs from "node:fs";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as schema from "./schema";

export const client = new Client({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 8000),
  user: process.env.DB_USERNAME ?? "default",
  password: process.env.DB_PASSWORD ?? "password",
  database: process.env.DB_NAME ?? "illustrious",
  ssl:
    process.env.DB_SSL !== "false"
      ? {
          rejectUnauthorized: true,
          ca: fs.readFileSync("cert.crt").toString(),
        }
      : undefined,
});

await client.connect();
// { schema } is used for relational queries
export const db = drizzle(client, { schema, logger: false });
