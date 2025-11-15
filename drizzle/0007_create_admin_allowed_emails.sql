-- Migration: Create/Update admin_allowed_emails table
-- Date: 2024
-- Description: Creates the admin_allowed_emails table or adds missing columns if table exists

-- Step 1: Create the table if it doesn't exist (sans org_id d'abord pour éviter les erreurs)
CREATE TABLE IF NOT EXISTS admin_allowed_emails (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 2: Add org_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'admin_allowed_emails'
    AND column_name = 'org_id'
  ) THEN
    ALTER TABLE admin_allowed_emails ADD COLUMN org_id TEXT;
    -- Set default value for existing rows
    UPDATE admin_allowed_emails SET org_id = 'default-org-id' WHERE org_id IS NULL;
    -- Make it NOT NULL after setting defaults
    ALTER TABLE admin_allowed_emails ALTER COLUMN org_id SET NOT NULL;
  END IF;
END $$;

-- Step 3: Add email column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'admin_allowed_emails'
    AND column_name = 'email'
  ) THEN
    ALTER TABLE admin_allowed_emails ADD COLUMN email TEXT;
    -- Make it NOT NULL (assuming no existing rows, or set a default)
    ALTER TABLE admin_allowed_emails ALTER COLUMN email SET NOT NULL;
  END IF;
END $$;

-- Step 4: Add created_by column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'admin_allowed_emails'
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE admin_allowed_emails ADD COLUMN created_by TEXT;
    -- Set default value for existing rows
    UPDATE admin_allowed_emails SET created_by = 'system' WHERE created_by IS NULL;
    -- Make it NOT NULL after setting defaults
    ALTER TABLE admin_allowed_emails ALTER COLUMN created_by SET NOT NULL;
  END IF;
END $$;

-- Step 5: Add used_at column if it doesn't exist (nullable)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'admin_allowed_emails'
    AND column_name = 'used_at'
  ) THEN
    ALTER TABLE admin_allowed_emails ADD COLUMN used_at TIMESTAMPTZ;
  END IF;
END $$;

-- Step 6: Create unique index on (org_id, email) to prevent duplicates per organization
CREATE UNIQUE INDEX IF NOT EXISTS admin_allowed_emails_org_id_email_unique 
ON admin_allowed_emails(org_id, email);

-- Step 7: Create index on org_id for better query performance
CREATE INDEX IF NOT EXISTS idx_admin_allowed_emails_org_id 
ON admin_allowed_emails(org_id);

-- Step 8: Create index on email for lookups
CREATE INDEX IF NOT EXISTS idx_admin_allowed_emails_email 
ON admin_allowed_emails(email);

-- Step 9: Add comment to table
COMMENT ON TABLE admin_allowed_emails IS 'Stores emails allowed to register as admin users per organization';

