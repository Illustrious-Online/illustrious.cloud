import "dotenv/config"; // make sure to install dotenv package
import type { Config } from "drizzle-kit";

export default {
  dialect: "postgresql",
  out: "./src/drizzle",
  schema: "./src/drizzle/schema.ts",
  dbCredentials: {
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 8000),
    user: process.env.DB_USERNAME ?? "default",
    password: process.env.DB_PASSWORD ?? "password",
    database: process.env.DB_NAME ?? "illustrious",
    ssl: process.env.DB_SSL !== "false"
  },
  // Print all statements
  verbose: true,
  // Always ask for confirmation
  strict: true,
} satisfies Config;
