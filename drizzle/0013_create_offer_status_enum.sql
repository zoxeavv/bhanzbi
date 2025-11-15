-- Migration: Create offer_status enum type
-- Date: 2024-12-19
-- Description: Creates the offer_status enum type if it doesn't exist
--
-- This enum is used by the offers.status column and should exist in the database
-- before the offers table is created or modified.
--
-- This migration is idempotent - safe to run even if the enum already exists.

-- ============================================================================
-- STEP 1: Create the enum type if it doesn't exist
-- ============================================================================

DO $$
BEGIN
  -- Check if the enum type already exists
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'offer_status'
  ) THEN
    -- Create the enum type
    CREATE TYPE offer_status AS ENUM ('draft', 'sent', 'accepted', 'rejected');
    RAISE NOTICE '✅ Enum type offer_status created';
  ELSE
    RAISE NOTICE '✅ Enum type offer_status already exists';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Verify the enum type exists and has correct values
-- ============================================================================

DO $$
DECLARE
  enum_exists BOOLEAN;
  enum_values TEXT[];
BEGIN
  -- Check if enum exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'offer_status'
  ) INTO enum_exists;
  
  IF enum_exists THEN
    -- Get enum values
    SELECT array_agg(enumlabel ORDER BY enumsortorder)
    INTO enum_values
    FROM pg_enum
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'offer_status');
    
    RAISE NOTICE '✅ Enum offer_status values: %', array_to_string(enum_values, ', ');
    
    -- Verify expected values are present
    IF 'draft' = ANY(enum_values) AND 'sent' = ANY(enum_values) 
       AND 'accepted' = ANY(enum_values) AND 'rejected' = ANY(enum_values) THEN
      RAISE NOTICE '✅ All expected enum values are present';
    ELSE
      RAISE WARNING '⚠️ Some expected enum values may be missing';
    END IF;
  ELSE
    RAISE WARNING '⚠️ Enum type offer_status does not exist after creation attempt';
  END IF;
END $$;

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- This migration ensures the offer_status enum type exists in the database.
-- The enum is used by the offers.status column defined in Drizzle schema.
--
-- Expected enum values:
-- - 'draft'
-- - 'sent'
-- - 'accepted'
-- - 'rejected'
--
-- This migration is idempotent and can be run multiple times safely.
--
-- To verify the enum after migration:
--   SELECT enumlabel
--   FROM pg_enum
--   WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'offer_status')
--   ORDER BY enumsortorder;
--
-- Note: If the enum already exists with different values, this migration will
-- not modify it. Manual intervention may be required in that case.


