-- Migration: Drop crm_users table (ghost table)
-- Date: 2024-12-19
-- Description: Drops the crm_users table that exists in Drizzle schema but was never migrated to Supabase
--
-- This table is a "ghost table" - defined in Drizzle schema but never created in the database.
-- It's not used anywhere in the codebase and should be removed from the schema.
--
-- This migration is idempotent - safe to run even if the table doesn't exist.

-- ============================================================================
-- STEP 1: Drop the table if it exists
-- ============================================================================

DROP TABLE IF EXISTS crm_users CASCADE;

-- ============================================================================
-- STEP 2: Verify the table was dropped
-- ============================================================================

DO $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'crm_users'
  ) INTO table_exists;
  
  IF table_exists THEN
    RAISE WARNING '⚠️ Table crm_users still exists after DROP';
  ELSE
    RAISE NOTICE '✅ Table crm_users successfully dropped (or did not exist)';
  END IF;
END $$;

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- This migration removes the ghost table crm_users that was defined in
-- src/lib/db/schema.ts but never migrated to Supabase.
--
-- The table was not used anywhere in the codebase:
-- - No queries reference it
-- - No API routes use it
-- - No migrations created it
--
-- After running this migration, verify that the table is removed from
-- the Drizzle schema (src/lib/db/schema.ts) as well.


