import * as relations from "@/drizzle/relations";
import * as schema from "@/drizzle/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";

/**
 * Creates a test database connection
 * Uses a separate test database to avoid conflicts
 */
export function createTestDb() {
  const client = new Client({
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT) ?? 5432,
    user: process.env.DB_USERNAME ?? "admin",
    password: process.env.DB_PASSWORD ?? "illustrious",
    database: process.env.DB_NAME ?? "illustrious",
  });

  return {
    client,
    db: drizzle(client, {
      schema: { ...schema, ...relations },
      logger: false,
    }),
  };
}
