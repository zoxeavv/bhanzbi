-- Migration: Add template_kind column to templates table
-- Date: 2024-12-19
-- Description: 
--   - Adds template_kind column to templates table
--   - Sets default value to 'GENERIC' for backward compatibility
--   - Updates existing rows to have 'GENERIC' as template_kind
--   This prepares the schema for future template type-specific logic

-- ============================================================================
-- STEP 1: Add template_kind column with default value
-- ============================================================================

ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS template_kind VARCHAR(50) NOT NULL DEFAULT 'GENERIC';

-- ============================================================================
-- STEP 2: Update existing rows to ensure they have 'GENERIC' as template_kind
-- ============================================================================

-- This is safe because we set a default, but we do it explicitly for clarity
UPDATE templates 
SET template_kind = 'GENERIC' 
WHERE template_kind IS NULL;

-- ============================================================================
-- STEP 3: Verify the migration
-- ============================================================================

-- Check that the column exists and has the correct default
DO $$
DECLARE
    column_exists boolean;
    default_value text;
BEGIN
    -- Check if column exists
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'templates'
          AND column_name = 'template_kind'
    ) INTO column_exists;

    -- Get the default value
    SELECT column_default INTO default_value
    FROM information_schema.columns
    WHERE table_name = 'templates'
      AND column_name = 'template_kind';

    IF NOT column_exists THEN
        RAISE WARNING 'Column template_kind does not exist!';
    ELSE
        RAISE NOTICE 'Column template_kind exists';
    END IF;

    IF default_value IS NULL OR default_value NOT LIKE '%GENERIC%' THEN
        RAISE WARNING 'Default value for template_kind is not set to GENERIC!';
    ELSE
        RAISE NOTICE 'Default value for template_kind is correctly set to GENERIC';
    END IF;
END $$;

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- 1. This migration adds a template_kind column to support future template
--    type-specific logic (CDI, CDD, avenants, etc.)
--
-- 2. All existing templates will have template_kind = 'GENERIC' by default
--
-- 3. The column is NOT NULL with a default value, ensuring backward compatibility
--
-- 4. To verify the migration:
--    SELECT template_kind, COUNT(*) 
--    FROM templates 
--    GROUP BY template_kind;
--
-- 5. To rollback (if needed):
--    ALTER TABLE templates DROP COLUMN IF EXISTS template_kind;


