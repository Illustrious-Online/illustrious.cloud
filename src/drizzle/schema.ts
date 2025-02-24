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

export const authentication = pgTable("Authentication", {
  id: text().primaryKey().notNull(),
  sub: text().notNull(),
});

export type Authentication = typeof authentication.$inferSelect;
export type InsertAuthentication = typeof authentication.$inferInsert;

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

export const report = pgTable("Report", {
  id: text().primaryKey().notNull(),
  rating: integer().notNull(),
  notes: text(),
  createdAt: timestamp().notNull(),
});

export type Report = typeof report.$inferSelect;
export type InsertReport = typeof report.$inferInsert;

export const org = pgTable("Org", {
  id: text().primaryKey().notNull(),
  name: text().notNull(),
  contact: text().notNull(),
});

export type Org = typeof org.$inferSelect;
export type InsertOrg = typeof org.$inferInsert;

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
