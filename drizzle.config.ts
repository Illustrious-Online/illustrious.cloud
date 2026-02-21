import "dotenv/config"; // make sure to install dotenv package
import type { Config } from "drizzle-kit";
import fs from "node:fs";

export default {
  dialect: "postgresql",
  out: "./src/drizzle",
  schema: "./src/drizzle/schema.ts",
  dbCredentials: {
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
  },
  // Print all statements
  verbose: true,
  // Always ask for confirmation
  strict: true,
} satisfies Config;
