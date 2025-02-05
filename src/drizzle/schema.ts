import {
  boolean,
  decimal,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const authentications = pgTable("Authentication", {
  id: text("id").primaryKey().notNull(),
  sub: text("sub").notNull(),
});

export type Authentication = typeof authentications.$inferSelect;
export type InsertAuthentication = typeof authentications.$inferInsert;

export const invoices = pgTable("Invoice", {
  id: text("id").primaryKey().notNull(),
  paid: boolean("paid").notNull(),
  value: decimal("price", { precision: 10, scale: 2 }).notNull(),
  start: timestamp("start", { mode: "date" }).notNull(),
  end: timestamp("end", { mode: "date" }).notNull(),
  due: timestamp("due", { mode: "date" }).notNull(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt"),
  deletedAt: timestamp("deletedAt"),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

export const orgs = pgTable("Org", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
  contact: text("contact").notNull(),
});

export type Org = typeof orgs.$inferSelect;
export type InsertOrg = typeof orgs.$inferInsert;

export const orgUsers = pgTable(
  "OrgUser",
  {
    role: integer("role").default(0).notNull(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    orgId: text("orgId")
      .notNull()
      .references(() => orgs.id, { onDelete: "restrict", onUpdate: "cascade" }),
  },
  (table) => {
    return {
      OrgUser_pkey: primaryKey({
        columns: [table.orgId, table.userId],
        name: "OrgUser_pkey",
      }),
    };
  },
);

export type OrgUser = typeof orgUsers.$inferSelect;
export type InsertOrgUser = typeof orgUsers.$inferInsert;

export const reports = pgTable("Report", {
  id: text("id").primaryKey().notNull(),
  rating: integer("rating").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").notNull(),
});

export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;

export const users = pgTable(
  "User",
  {
    id: text("id").primaryKey().notNull(),
    identifier: text("identifier").notNull(),
    email: text("email"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    picture: text("picture"),
    phone: text("phone"),
    superAdmin: boolean("super_admin").default(false).notNull(),
  },
  (table) => {
    return {
      email_key: uniqueIndex("User_email_key").on(table.email),
    };
  },
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const userInvoices = pgTable(
  "UserInvoice",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    invoiceId: text("invoiceId")
      .notNull()
      .references(() => invoices.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
  },
  (table) => {
    return {
      UserInvoice_pkey: primaryKey({
        columns: [table.userId, table.invoiceId],
        name: "UserInvoice_pkey",
      }),
    };
  },
);

export type UserInvoice = typeof userInvoices.$inferSelect;
export type InsertUserInvoice = typeof userInvoices.$inferInsert;

export const userReports = pgTable(
  "UserReport",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    reportId: text("reportId")
      .notNull()
      .references(() => reports.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
  },
  (table) => {
    return {
      UserReport_pkey: primaryKey({
        columns: [table.userId, table.reportId],
        name: "UserReport_pkey",
      }),
    };
  },
);

export type UserReport = typeof userReports.$inferSelect;
export type InsertUserReport = typeof userReports.$inferInsert;

export const orgReports = pgTable(
  "OrgReport",
  {
    orgId: text("orgId")
      .notNull()
      .references(() => orgs.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    reportId: text("reportId")
      .notNull()
      .references(() => reports.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
  },
  (table) => {
    return {
      OrgReport_pkey: primaryKey({
        columns: [table.orgId, table.reportId],
        name: "OrgReport_pkey",
      }),
    };
  },
);

export type OrgReport = typeof orgReports.$inferSelect;
export type InsertOrgReport = typeof orgReports.$inferInsert;

export const orgInvoices = pgTable(
  "OrgInvoice",
  {
    orgId: text("orgId")
      .notNull()
      .references(() => orgs.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    invoiceId: text("invoiceId")
      .notNull()
      .references(() => invoices.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
  },
  (table) => {
    return {
      OrgInvoice_pkey: primaryKey({
        columns: [table.orgId, table.invoiceId],
        name: "OrgInvoice_pkey",
      }),
    };
  },
);

export type OrgInvoice = typeof orgInvoices.$inferSelect;
export type InsertOrgInvoice = typeof orgInvoices.$inferInsert;
