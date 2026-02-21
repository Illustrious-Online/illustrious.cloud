-- Fresh Better-Auth Integration Migration
-- This migration creates a clean schema for better-auth with cross-domain token support

-- Drop existing tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS "user_report" CASCADE;
DROP TABLE IF EXISTS "user_invoice" CASCADE;
DROP TABLE IF EXISTS "org_user" CASCADE;
DROP TABLE IF EXISTS "inquiry" CASCADE;
DROP TABLE IF EXISTS "report" CASCADE;
DROP TABLE IF EXISTS "invoice" CASCADE;
DROP TABLE IF EXISTS "org" CASCADE;
DROP TABLE IF EXISTS "user_profile" CASCADE;
DROP TABLE IF EXISTS "verification" CASCADE;
DROP TABLE IF EXISTS "account" CASCADE;
DROP TABLE IF EXISTS "session" CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;

-- Also drop old table names if they exist (PascalCase versions)
DROP TABLE IF EXISTS "UserReport" CASCADE;
DROP TABLE IF EXISTS "UserInvoice" CASCADE;
DROP TABLE IF EXISTS "OrgUser" CASCADE;
DROP TABLE IF EXISTS "Inquiry" CASCADE;
DROP TABLE IF EXISTS "Report" CASCADE;
DROP TABLE IF EXISTS "Invoice" CASCADE;
DROP TABLE IF EXISTS "Org" CASCADE;
DROP TABLE IF EXISTS "Verification" CASCADE;
DROP TABLE IF EXISTS "Account" CASCADE;
DROP TABLE IF EXISTS "Session" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

-- ============================================
-- BETTER-AUTH TABLES
-- ============================================

-- User table (better-auth standard)
CREATE TABLE "user" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "email" TEXT NOT NULL UNIQUE,
  "email_verified" BOOLEAN NOT NULL DEFAULT FALSE,
  "image" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Session table (better-auth standard with token support)
CREATE TABLE "session" (
  "id" TEXT PRIMARY KEY,
  "expires_at" TIMESTAMP NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "ip_address" TEXT,
  "user_agent" TEXT,
  "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

-- Account table (better-auth standard for OAuth)
CREATE TABLE "account" (
  "id" TEXT PRIMARY KEY,
  "account_id" TEXT NOT NULL,
  "provider_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "access_token" TEXT,
  "refresh_token" TEXT,
  "id_token" TEXT,
  "access_token_expires_at" TIMESTAMP,
  "refresh_token_expires_at" TIMESTAMP,
  "scope" TEXT,
  "password" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Verification table (better-auth standard)
CREATE TABLE "verification" (
  "id" TEXT PRIMARY KEY,
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expires_at" TIMESTAMP NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- CUSTOM APPLICATION TABLES
-- ============================================

-- UserProfile table (extends better-auth user)
CREATE TABLE "user_profile" (
  "user_id" TEXT PRIMARY KEY REFERENCES "user"("id") ON DELETE CASCADE,
  "first_name" TEXT,
  "last_name" TEXT,
  "phone" TEXT,
  "managed" BOOLEAN NOT NULL DEFAULT FALSE,
  "super_admin" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP
);

-- ============================================
-- BUSINESS DOMAIN TABLES
-- ============================================

-- Organization table
CREATE TABLE "org" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "contact" TEXT NOT NULL
);

-- Inquiry table
CREATE TABLE "inquiry" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "org_id" TEXT NOT NULL,
  "user_id" TEXT,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "comment" TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Invoice table
CREATE TABLE "invoice" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "org_id" TEXT NOT NULL,
  "amount" NUMERIC(10, 2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "due_date" TIMESTAMP NOT NULL,
  "period_start" TIMESTAMP NOT NULL,
  "period_end" TIMESTAMP NOT NULL,
  "description" TEXT,
  "created_by" TEXT,
  "modified_by" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP
);

-- Report table
CREATE TABLE "report" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "org_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "content" TEXT,
  "period_start" TIMESTAMP NOT NULL,
  "period_end" TIMESTAMP NOT NULL,
  "rating" INTEGER,
  "created_by" TEXT,
  "modified_by" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP
);

-- ============================================
-- JUNCTION TABLES
-- ============================================

-- OrgUser junction table
CREATE TABLE "org_user" (
  "role" INTEGER NOT NULL DEFAULT 0,
  "user_id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  PRIMARY KEY ("user_id", "org_id"),
  CONSTRAINT "org_user_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "org"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "org_user_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON UPDATE CASCADE ON DELETE RESTRICT
);

-- UserInvoice junction table
CREATE TABLE "user_invoice" (
  "user_id" TEXT NOT NULL,
  "invoice_id" TEXT NOT NULL,
  PRIMARY KEY ("user_id", "invoice_id"),
  CONSTRAINT "user_invoice_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "invoice"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "user_invoice_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON UPDATE CASCADE ON DELETE RESTRICT
);

-- UserReport junction table
CREATE TABLE "user_report" (
  "user_id" TEXT NOT NULL,
  "report_id" TEXT NOT NULL,
  PRIMARY KEY ("user_id", "report_id"),
  CONSTRAINT "user_report_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "report"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "user_report_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON UPDATE CASCADE ON DELETE RESTRICT
);

-- ============================================
-- INDEXES
-- ============================================

-- Session indexes
CREATE INDEX "session_user_id_idx" ON "session"("user_id");
CREATE INDEX "session_token_idx" ON "session"("token");

-- Account indexes
CREATE INDEX "account_user_id_idx" ON "account"("user_id");

-- UserProfile indexes (primary key is already indexed)

-- Inquiry indexes
CREATE INDEX "inquiry_org_id_idx" ON "inquiry"("org_id");
CREATE INDEX "inquiry_user_id_idx" ON "inquiry"("user_id");

-- Invoice indexes
CREATE INDEX "invoice_org_id_idx" ON "invoice"("org_id");

-- Report indexes
CREATE INDEX "report_org_id_idx" ON "report"("org_id");
