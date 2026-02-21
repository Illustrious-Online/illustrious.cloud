import {
  boolean,
  foreignKey,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// ============================================
// BETTER-AUTH TABLES (snake_case columns)
// ============================================

/**
 * User table for Better-Auth
 * Core user data managed by better-auth
 */
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type User = typeof user.$inferSelect;
export type InsertUser = typeof user.$inferInsert;

/**
 * Session table for Better-Auth
 * Manages user sessions with token-based authentication
 */
export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export type Session = typeof session.$inferSelect;
export type InsertSession = typeof session.$inferInsert;

/**
 * Account table for Better-Auth
 * Stores OAuth provider accounts linked to users
 */
export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Account = typeof account.$inferSelect;
export type InsertAccount = typeof account.$inferInsert;

/**
 * Verification table for Better-Auth
 * Stores email verification and password reset tokens
 */
export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Verification = typeof verification.$inferSelect;
export type InsertVerification = typeof verification.$inferInsert;

// ============================================
// CUSTOM APPLICATION TABLES
// ============================================

/**
 * UserProfile table for custom user fields
 * Extends better-auth user with application-specific data
 */
export const userProfile = pgTable("user_profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  managed: boolean("managed").default(false).notNull(),
  siteRole: integer("site_role").default(2).notNull(), // 0=Admin, 1=Moderator, 2=Normal User
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export type UserProfile = typeof userProfile.$inferSelect;
export type InsertUserProfile = typeof userProfile.$inferInsert;

// ============================================
// ROLE CONSTANTS
// ============================================

/**
 * Site-wide role levels
 * Stored in userProfile.siteRole
 */
export const SiteRole = {
  ADMIN: 0, // Site administrator - can read/write everything across all orgs
  MODERATOR: 1, // Site moderator - can read everything, write only if org admin/moderator
  NORMAL_USER: 2, // Normal user - standard org-based permissions
} as const;

/**
 * Organization role levels
 * Stored in orgUser.role
 */
export const OrgRole = {
  ADMIN: 0, // Org administrator - full access to org resources
  MODERATOR: 1, // Org moderator - read all, write only items they created/assigned
  CLIENT: 2, // User/Client - only access items assigned via junction tables
  READ_ONLY: 3, // Read-only/Invited - only read items assigned via junction tables
} as const;

// ============================================
// BUSINESS DOMAIN TABLES
// ============================================

/**
 * Represents the Org table in the database.
 */
export const org = pgTable("org", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
  contact: text("contact").notNull(),
  ownerId: text("owner_id").references(() => user.id, { onDelete: "set null" }),
  pendingOwnerId: text("pending_owner_id").references(() => user.id, {
    onDelete: "set null",
  }),
});

export type Org = typeof org.$inferSelect;
export type InsertOrg = typeof org.$inferInsert;

/**
 * Represents the Inquiry table in the database.
 */
export const inquiry = pgTable("inquiry", {
  id: text("id").primaryKey().notNull(),
  orgId: text("org_id").notNull(),
  userId: text("user_id"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Inquiry = typeof inquiry.$inferSelect;
export type InsertInquiry = typeof inquiry.$inferInsert;

/**
 * Represents the Invoice table in the database.
 */
export const invoice = pgTable("invoice", {
  id: text("id").primaryKey().notNull(),
  orgId: text("org_id").notNull(),
  amount: numeric({ precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("draft"),
  dueDate: timestamp("due_date").notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  description: text("description"),
  createdBy: text("created_by"),
  modifiedBy: text("modified_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export type Invoice = typeof invoice.$inferSelect;
export type InsertInvoice = typeof invoice.$inferInsert;

/**
 * Represents the Report table in the database.
 */
export const report = pgTable("report", {
  id: text("id").primaryKey().notNull(),
  orgId: text("org_id").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull().default("draft"),
  content: text("content"),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  rating: integer("rating"),
  createdBy: text("created_by"),
  modifiedBy: text("modified_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export type Report = typeof report.$inferSelect;
export type InsertReport = typeof report.$inferInsert;

// ============================================
// JUNCTION TABLES
// ============================================

/**
 * Represents the OrgUser table in the database.
 * This table establishes a many-to-many relationship between users and organizations,
 * with additional role information for each user within an organization.
 */
export const orgUser = pgTable(
  "org_user",
  {
    role: integer("role").default(0).notNull(),
    userId: text("user_id").notNull(),
    orgId: text("org_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.orgId],
      foreignColumns: [org.id],
      name: "org_user_org_id_fk",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "org_user_user_id_fk",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    primaryKey({ columns: [table.userId, table.orgId], name: "org_user_pkey" }),
  ],
);

export type OrgUser = typeof orgUser.$inferSelect;
export type InsertOrgUser = typeof orgUser.$inferInsert;

/**
 * Represents the UserInvoice junction table in the database.
 * This table establishes a many-to-many relationship between users and invoices.
 */
export const userInvoice = pgTable(
  "user_invoice",
  {
    userId: text("user_id").notNull(),
    invoiceId: text("invoice_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.invoiceId],
      foreignColumns: [invoice.id],
      name: "user_invoice_invoice_id_fk",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "user_invoice_user_id_fk",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    primaryKey({
      columns: [table.userId, table.invoiceId],
      name: "user_invoice_pkey",
    }),
  ],
);

export type UserInvoice = typeof userInvoice.$inferSelect;
export type InsertUserInvoice = typeof userInvoice.$inferInsert;

/**
 * Represents the UserReport junction table in the database.
 * This table establishes a many-to-many relationship between users and reports.
 */
export const userReport = pgTable(
  "user_report",
  {
    userId: text("user_id").notNull(),
    reportId: text("report_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.reportId],
      foreignColumns: [report.id],
      name: "user_report_report_id_fk",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: "user_report_user_id_fk",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    primaryKey({
      columns: [table.userId, table.reportId],
      name: "user_report_pkey",
    }),
  ],
);

export type UserReport = typeof userReport.$inferSelect;
export type InsertUserReport = typeof userReport.$inferInsert;

/**
 * Notification table
 * Stores notifications for users
 */
export const notification = pgTable("notification", {
  id: text("id").primaryKey().notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // e.g., "ownership_transfer", "invitation", "assignment"
  title: text("title").notNull(),
  message: text("message").notNull(),
  metadata: text("metadata"), // JSON string for additional data (orgId, resourceId, etc.)
  read: boolean("read").default(false).notNull(), // Read/acknowledged (combined)
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
  expiresAt: timestamp("expires_at"), // Optional expiration for time-sensitive notifications
});

export type Notification = typeof notification.$inferSelect;
export type InsertNotification = typeof notification.$inferInsert;
