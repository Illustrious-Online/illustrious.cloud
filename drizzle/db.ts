import * as fs from "fs";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as schema from "./schema";

export const client = new Client({
  host: 'localhost',
  port: Number(process.env.DB_PORT!),
  user: process.env.DB_USERNAME!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_NAME!,
  ssl: process.env.DB_SSL !== "false"
    ? {
        rejectUnauthorized: true,
        ca: fs.readFileSync("cert.crt").toString(),
      }
    : false,
});

await client.connect();
// { schema } is used for relational queries
export const db = drizzle(client, { schema, logger: true });
