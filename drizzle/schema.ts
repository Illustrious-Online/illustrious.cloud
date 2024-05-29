import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const Role = pgEnum("Role", ["CLIENT", "ADMIN", "OWNER"]);

export const authentications = pgTable("Authentication", {
  id: text("id").primaryKey().notNull(),
  paid: text("sub").notNull(),
});

export type Authentication = typeof authentications.$inferSelect;
export type InsertAuthentication = typeof authentications.$inferInsert;

export const invoices = pgTable("Invoice", {
  id: text("id").primaryKey().notNull(),
  paid: boolean("paid").notNull(),
  value: numeric("value", { precision: 65, scale: 30 }).notNull(),
  start: timestamp("start", { precision: 3, mode: "string" }).notNull(),
  end: timestamp("end", { precision: 3, mode: "string" }).notNull(),
  due: timestamp("due", { precision: 3, mode: "string" }).notNull(),
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

export const orgUsers = pgTable("OrgUser", {
  id: text("id").primaryKey().notNull(),
  role: Role("role").default("CLIENT").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
  orgId: text("orgId")
    .notNull()
    .references(() => orgs.id, { onDelete: "restrict", onUpdate: "cascade" }),
});

export type OrgUser = typeof orgUsers.$inferSelect;
export type InsertOrgUser = typeof orgUsers.$inferInsert;

export const reports = pgTable("Report", {
  id: text("id").primaryKey().notNull(),
  rating: integer("rating").notNull(),
  notes: text("notes").notNull(),
});

export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;

export const users = pgTable(
  "User",
  {
    id: text("id").primaryKey().notNull(),
    email: text("email").notNull(),
    name: text("name"),
  },
  (table) => {
    return {
      email_key: uniqueIndex("User_email_key").on(table.email),
    };
  },
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const userAuthentications = pgTable(
  "UserAuthentications",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    authId: text("authId")
      .notNull()
      .references(() => authentications.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
  },
  (table) => {
    return {
      UserAuthentication_pkey: primaryKey({
        columns: [table.authId, table.userId],
        name: "UserAuthentication_pkey",
      }),
    };
  },
);

export type UserAuthentication = typeof userAuthentications.$inferSelect;
export type InsertUserAuthentication = typeof userAuthentications.$inferInsert;

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
