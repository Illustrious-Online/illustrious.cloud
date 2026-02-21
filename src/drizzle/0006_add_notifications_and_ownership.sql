-- Add Notifications and Organization Ownership
-- Creates notification table and adds ownership fields to org table

-- ============================================
-- CREATE NOTIFICATION TABLE
-- ============================================

CREATE TABLE "notification" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" TEXT, -- JSON string
  "read" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP,
  "expires_at" TIMESTAMP
);

-- ============================================
-- ADD OWNERSHIP FIELDS TO ORG TABLE
-- ============================================

ALTER TABLE "org" 
ADD COLUMN "owner_id" TEXT REFERENCES "user"("id") ON DELETE SET NULL,
ADD COLUMN "pending_owner_id" TEXT REFERENCES "user"("id") ON DELETE SET NULL;

-- Set existing orgs: owner_id = first admin user (if exists)
UPDATE "org" o
SET "owner_id" = (
  SELECT ou."user_id" 
  FROM "org_user" ou 
  WHERE ou."org_id" = o."id" 
    AND ou."role" = 0 
  ORDER BY ou."user_id" 
  LIMIT 1
)
WHERE "owner_id" IS NULL;

-- ============================================
-- CREATE INDEXES
-- ============================================

CREATE INDEX "notification_user_id_idx" ON "notification"("user_id");
CREATE INDEX "notification_read_idx" ON "notification"("read");
CREATE INDEX "notification_type_idx" ON "notification"("type");
CREATE INDEX "org_owner_id_idx" ON "org"("owner_id");
CREATE INDEX "org_pending_owner_id_idx" ON "org"("pending_owner_id");
