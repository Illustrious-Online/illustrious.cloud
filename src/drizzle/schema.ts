import {
  boolean,
  foreignKey,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Represents the authentication table schema in the database.
 *
 * @constant
 * @type {object}
 * @property {ColumnType} id - The primary key of the authentication table, must be a non-null text.
 * @property {ColumnType} sub - The subject identifier, must be a non-null text.
 */
export const authentication = pgTable("Authentication", {
  id: text().primaryKey().notNull(),
  sub: text().notNull(),
});

export type Authentication = typeof authentication.$inferSelect;
export type InsertAuthentication = typeof authentication.$inferInsert;

/**
 * Represents the schema for the "Invoice" table in the database.
 *
 * @property {string} id - The primary key of the invoice, must be a non-null text.
 * @property {boolean} paid - Indicates whether the invoice has been paid, must be a non-null boolean.
 * @property {number} price - The price of the invoice, must be a non-null numeric value with precision 10 and scale 2.
 * @property {Date} start - The start timestamp of the invoice, must be a non-null timestamp.
 * @property {Date} end - The end timestamp of the invoice, must be a non-null timestamp.
 * @property {Date} due - The due timestamp of the invoice, must be a non-null timestamp.
 * @property {Date} createdAt - The timestamp when the invoice was created, must be a non-null timestamp.
 * @property {Date} updatedAt - The timestamp when the invoice was last updated, can be null.
 * @property {Date} deletedAt - The timestamp when the invoice was deleted, can be null.
 */
export const invoice = pgTable("Invoice", {
  id: text().primaryKey().notNull(),
  paid: boolean().notNull(),
  price: numeric({ precision: 10, scale: 2 }).notNull(),
  start: timestamp().notNull(),
  end: timestamp().notNull(),
  due: timestamp().notNull(),
  createdAt: timestamp().notNull(),
  updatedAt: timestamp(),
  deletedAt: timestamp(),
});

export type Invoice = typeof invoice.$inferSelect;
export type InsertInvoice = typeof invoice.$inferInsert;

/**
 * Represents the schema for the "Report" table in the database.
 *
 * @property {string} id - The primary key of the report, must be a non-null text.
 * @property {number} rating - The rating of the report, must be a non-null integer.
 * @property {string} [notes] - Optional notes for the report, can be null.
 * @property {Date} createdAt - The timestamp when the report was created, must be a non-null timestamp.
 */
export const report = pgTable("Report", {
  id: text().primaryKey().notNull(),
  rating: integer().notNull(),
  notes: text(),
  createdAt: timestamp().notNull(),
});

export type Report = typeof report.$inferSelect;
export type InsertReport = typeof report.$inferInsert;

/**
 * Represents the schema for the "Org" table in the database.
 *
 * @property {string} id - The primary key of the organization, must be a non-null text.
 * @property {string} name - The name of the organization, must be a non-null text.
 * @property {string} contact - The contact information of the organization, must be a non-null text.
 */
export const org = pgTable("Org", {
  id: text().primaryKey().notNull(),
  name: text().notNull(),
  contact: text().notNull(),
});

export type Org = typeof org.$inferSelect;
export type InsertOrg = typeof org.$inferInsert;

/**
 * Represents the user table schema in the database.
 *
 * The table is named "User" and contains the following columns:
 *
 * - `id`: The primary key of the user, must be a non-null text.
 * - `identifier`: A unique identifier for the user, must be a non-null text.
 * - `email`: The email address of the user, can be null.
 * - `firstName`: The first name of the user, stored as "first_name".
 * - `lastName`: The last name of the user, stored as "last_name".
 * - `picture`: The URL or path to the user's picture, can be null.
 * - `phone`: The phone number of the user, can be null.
 * - `managed`: A boolean indicating if the user is managed, defaults to false and cannot be null.
 * - `superAdmin`: A boolean indicating if the user is a super admin, stored as "super_admin", defaults to false and cannot be null.
 *
 * The table also includes a unique index on the `email` column, using the B-tree index method with text operations.
 */
export const user = pgTable(
  "User",
  {
    id: text().primaryKey().notNull(),
    identifier: text().notNull(),
    email: text(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    picture: text(),
    phone: text(),
    managed: boolean().default(false).notNull(),
    passwordReset: boolean().default(false),
    superAdmin: boolean("super_admin").default(false).notNull(),
  },
  (table) => [
    uniqueIndex("User_email_key").using(
      "btree",
      table.email.asc().nullsLast().op("text_ops"),
    ),
  ],
);

export type User = typeof user.$inferSelect;
export type InsertUser = typeof user.$inferInsert;

/**
 * Represents the `UserInvoice` table in the database.
 * This table establishes a many-to-many relationship between users and invoices.
 *
 * Columns:
 * - `userId`: The ID of the user. This field is a non-nullable text.
 * - `invoiceId`: The ID of the invoice. This field is a non-nullable text.
 *
 * Foreign Keys:
 * - `UserInvoice_invoiceId_Invoice_id_fk`: References the `id` column in the `Invoice` table.
 *   - On update: Cascade
 *   - On delete: Restrict
 * - `UserInvoice_userId_User_id_fk`: References the `id` column in the `User` table.
 *   - On update: Cascade
 *   - On delete: Restrict
 *
 * Primary Key:
 * - `UserInvoice_pkey`: Composite primary key consisting of `userId` and `invoiceId`.
 */
export const userInvoice = pgTable(
  "UserInvoice",
  {
    userId: text().notNull(),
    invoiceId: text().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.invoiceId],
      foreignColumns: [invoice.id],
      name: "UserInvoice_invoiceId_Invoice_id_fk",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "UserInvoice_userId_User_id_fk",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    primaryKey({
      columns: [table.userId, table.invoiceId],
      name: "UserInvoice_pkey",
    }),
  ],
);

export type UserInvoice = typeof userInvoice.$inferSelect;
export type InsertUserInvoice = typeof userInvoice.$inferInsert;

/**
 * Represents the `OrgReport` table in the database schema.
 * This table establishes a many-to-many relationship between organizations and reports.
 *
 * Columns:
 * - `orgId`: The ID of the organization. This is a non-null text field.
 * - `reportId`: The ID of the report. This is a non-null text field.
 *
 * Constraints:
 * - Foreign key `OrgReport_orgId_Org_id_fk`:
 *   - References the `id` column in the `Org` table.
 *   - On update: Cascade.
 *   - On delete: Restrict.
 * - Foreign key `OrgReport_reportId_Report_id_fk`:
 *   - References the `id` column in the `Report` table.
 *   - On update: Cascade.
 *   - On delete: Restrict.
 * - Primary key `OrgReport_pkey`:
 *   - Composite key consisting of `orgId` and `reportId`.
 */
export const orgReport = pgTable(
  "OrgReport",
  {
    orgId: text().notNull(),
    reportId: text().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.orgId],
      foreignColumns: [org.id],
      name: "OrgReport_orgId_Org_id_fk",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.reportId],
      foreignColumns: [report.id],
      name: "OrgReport_reportId_Report_id_fk",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    primaryKey({
      columns: [table.orgId, table.reportId],
      name: "OrgReport_pkey",
    }),
  ],
);

export type OrgReport = typeof orgReport.$inferSelect;
export type InsertOrgReport = typeof orgReport.$inferInsert;

/**
 * Represents the `UserReport` table in the database.
 *
 * This table establishes a many-to-many relationship between users and reports.
 * Each entry in the table links a user to a report they are associated with.
 *
 * Columns:
 * - `userId`: The ID of the user. This field is a non-nullable text.
 * - `reportId`: The ID of the report. This field is a non-nullable text.
 *
 * Constraints:
 * - `UserReport_reportId_Report_id_fk`: Foreign key constraint linking `reportId` to the `id` column in the `Report` table.
 *   - On update: Cascade
 *   - On delete: Restrict
 * - `UserReport_userId_User_id_fk`: Foreign key constraint linking `userId` to the `id` column in the `User` table.
 *   - On update: Cascade
 *   - On delete: Restrict
 * - `UserReport_pkey`: Primary key constraint combining `userId` and `reportId`.
 *
 * @module UserReport
 */
export const userReport = pgTable(
  "UserReport",
  {
    userId: text().notNull(),
    reportId: text().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.reportId],
      foreignColumns: [report.id],
      name: "UserReport_reportId_Report_id_fk",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "UserReport_userId_User_id_fk",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    primaryKey({
      columns: [table.userId, table.reportId],
      name: "UserReport_pkey",
    }),
  ],
);

export type UserReport = typeof userReport.$inferSelect;
export type InsertUserReport = typeof userReport.$inferInsert;

/**
 * Represents the OrgInvoice table in the database.
 *
 * This table establishes a many-to-many relationship between organizations and invoices.
 *
 * Columns:
 * - `orgId`: The ID of the organization. This field is a non-nullable text.
 * - `invoiceId`: The ID of the invoice. This field is a non-nullable text.
 *
 * Constraints:
 * - `OrgInvoice_invoiceId_Invoice_id_fk`: Foreign key constraint on `invoiceId` referencing the `id` column of the `Invoice` table.
 *   - On update: Cascade
 *   - On delete: Restrict
 * - `OrgInvoice_orgId_Org_id_fk`: Foreign key constraint on `orgId` referencing the `id` column of the `Org` table.
 *   - On update: Cascade
 *   - On delete: Restrict
 * - `OrgInvoice_pkey`: Primary key constraint on the combination of `orgId` and `invoiceId`.
 */
export const orgInvoice = pgTable(
  "OrgInvoice",
  {
    orgId: text().notNull(),
    invoiceId: text().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.invoiceId],
      foreignColumns: [invoice.id],
      name: "OrgInvoice_invoiceId_Invoice_id_fk",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.orgId],
      foreignColumns: [org.id],
      name: "OrgInvoice_orgId_Org_id_fk",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    primaryKey({
      columns: [table.orgId, table.invoiceId],
      name: "OrgInvoice_pkey",
    }),
  ],
);

export type OrgInvoice = typeof orgInvoice.$inferSelect;
export type InsertOrgInvoice = typeof orgInvoice.$inferInsert;

/**
 * Represents the OrgUser table in the database.
 *
 * This table establishes a many-to-many relationship between users and organizations,
 * with additional role information for each user within an organization.
 *
 * Columns:
 * - `role`: An integer representing the role of the user within the organization. Defaults to 0 and cannot be null.
 * - `userId`: A text field representing the unique identifier of the user. Cannot be null.
 * - `orgId`: A text field representing the unique identifier of the organization. Cannot be null.
 *
 * Constraints:
 * - `OrgUser_orgId_Org_id_fk`: Foreign key constraint linking `orgId` to the `id` column of the `Org` table.
 *   - On update: Cascade
 *   - On delete: Restrict
 * - `OrgUser_userId_User_id_fk`: Foreign key constraint linking `userId` to the `id` column of the `User` table.
 *   - On update: Cascade
 *   - On delete: Restrict
 * - `OrgUser_pkey`: Primary key constraint combining `userId` and `orgId`.
 *
 * @module OrgUser
 */
export const orgUser = pgTable(
  "OrgUser",
  {
    role: integer().default(0).notNull(),
    userId: text().notNull(),
    orgId: text().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.orgId],
      foreignColumns: [org.id],
      name: "OrgUser_orgId_Org_id_fk",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "OrgUser_userId_User_id_fk",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    primaryKey({ columns: [table.userId, table.orgId], name: "OrgUser_pkey" }),
  ],
);

export type OrgUser = typeof orgUser.$inferSelect;
export type InsertOrgUser = typeof orgUser.$inferInsert;
