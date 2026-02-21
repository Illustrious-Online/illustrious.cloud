-- Role-Based Access Control Migration
-- Adds siteRole to userProfile and updates orgUser.role semantics

-- ============================================
-- UPDATE USER_PROFILE TABLE
-- ============================================

-- Add siteRole column (default 2 = Normal User)
-- Only add if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profile' AND column_name = 'site_role'
    ) THEN
        ALTER TABLE "user_profile" 
        ADD COLUMN "site_role" INTEGER NOT NULL DEFAULT 2;
    END IF;
END $$;

-- Migrate existing superAdmin data: superAdmin=true -> siteRole=0 (Administrator)
UPDATE "user_profile" 
SET "site_role" = 0 
WHERE "super_admin" = TRUE;

-- Remove superAdmin column (only if it exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profile' AND column_name = 'super_admin'
    ) THEN
        ALTER TABLE "user_profile" 
        DROP COLUMN "super_admin";
    END IF;
END $$;

-- ============================================
-- UPDATE ORG_USER TABLE ROLE SEMANTICS
-- ============================================

-- Current state: role=1 means admin, role=0 means regular user
-- New state: role=0 = Org Admin, role=1 = Org Moderator, role=2 = User/Client, role=3 = Read-only/Invited
-- Migration: Convert role=1 to role=0 (admin), role=0 to role=2 (client)

-- First, update role=1 (current admin) to role=0 (new admin)
UPDATE "org_user" 
SET "role" = 0 
WHERE "role" = 1;

-- Then, update role=0 (current regular user) to role=2 (new client)
UPDATE "org_user" 
SET "role" = 2 
WHERE "role" = 0;

-- Note: The default value in schema is already 0, but we've migrated existing data
-- New inserts will default to 0 (Org Admin), which should be explicitly set to appropriate role
