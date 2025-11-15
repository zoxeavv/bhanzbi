-- Migration: Adapt templates table to match Drizzle schema
-- Date: 2024-12-19
-- Description: 
--   Adapts the existing templates table to match the Drizzle schema definition.
--   The table currently has:
--   - organization_id (uuid) and org_id (text) - both exist
--   - Missing: slug (required)
--   - Missing: tags (but has metadata jsonb)
--   - Extra columns: created_by_profile_id, is_draft, preview_image_url, metadata
--
-- This migration:
--   1. Migrates data from organization_id to org_id if needed
--   2. Adds missing slug column (generated from title)
--   3. Adds tags column (extracted from metadata if possible)
--   4. Keeps extra columns (they won't break Drizzle)

-- ============================================================================
-- STEP 1: Migrate organization_id to org_id if org_id is empty
-- ============================================================================

DO $$
BEGIN
  -- If org_id exists but has NULL or empty values, populate from organization_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'templates' 
    AND column_name = 'organization_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'templates' 
    AND column_name = 'org_id'
  ) THEN
    -- Convert UUID to TEXT and populate org_id where it's empty or default
    UPDATE templates 
    SET org_id = organization_id::text
    WHERE org_id IS NULL 
       OR org_id = '' 
       OR org_id = 'default-org';
    
    RAISE NOTICE 'Migrated data from organization_id (uuid) to org_id (text)';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Add slug column (REQUIRED for Drizzle schema)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'templates' 
    AND column_name = 'slug'
  ) THEN
    -- Add slug column as nullable first
    ALTER TABLE templates ADD COLUMN slug VARCHAR(255);
    
    -- Generate slug from title for existing rows
    UPDATE templates 
    SET slug = LOWER(
      REGEXP_REPLACE(
        REGEXP_REPLACE(title, '[^a-z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
      )
    )
    WHERE slug IS NULL AND title IS NOT NULL;
    
    -- For any remaining NULL slugs, use id-based slug
    UPDATE templates 
    SET slug = 'template-' || SUBSTRING(id::text FROM 1 FOR 8)
    WHERE slug IS NULL;
    
    -- Make NOT NULL after populating
    ALTER TABLE templates ALTER COLUMN slug SET NOT NULL;
    
    RAISE NOTICE 'Added column: slug (generated from title)';
  ELSE
    -- If slug exists but has NULL values, populate them
    UPDATE templates 
    SET slug = LOWER(
      REGEXP_REPLACE(
        REGEXP_REPLACE(title, '[^a-z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
      )
    )
    WHERE slug IS NULL AND title IS NOT NULL;
    
    UPDATE templates 
    SET slug = 'template-' || SUBSTRING(id::text FROM 1 FOR 8)
    WHERE slug IS NULL;
    
    -- Ensure NOT NULL
    ALTER TABLE templates ALTER COLUMN slug SET NOT NULL;
    
    RAISE NOTICE 'Populated NULL slugs in existing slug column';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Add tags column (extract from metadata if possible)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'templates' 
    AND column_name = 'tags'
  ) THEN
    -- Add tags column
    ALTER TABLE templates ADD COLUMN tags JSONB NOT NULL DEFAULT '[]'::jsonb;
    
    -- Try to extract tags from metadata if it exists and has a tags field
    UPDATE templates 
    SET tags = COALESCE(
      (metadata->'tags')::jsonb,
      CASE 
        WHEN metadata ? 'tags' THEN to_jsonb(ARRAY(SELECT jsonb_array_elements_text(metadata->'tags')))
        ELSE '[]'::jsonb
      END,
      '[]'::jsonb
    )
    WHERE metadata IS NOT NULL;
    
    RAISE NOTICE 'Added column: tags (extracted from metadata where possible)';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Ensure category has default value if nullable
-- ============================================================================

DO $$
BEGIN
  -- If category exists but is nullable, ensure it has empty string default
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'templates' 
    AND column_name = 'category'
    AND is_nullable = 'YES'
  ) THEN
    -- Set NULL categories to empty string
    UPDATE templates SET category = '' WHERE category IS NULL;
    
    -- Note: We don't make it NOT NULL to avoid breaking existing data
    -- Drizzle schema expects it to be NOT NULL, but we'll handle NULLs in queries
    RAISE NOTICE 'Set NULL categories to empty string';
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Update indexes that reference organization_id
-- ============================================================================

-- Recreate org_category index with org_id (text) instead of organization_id (uuid)
DO $$
BEGIN
  -- Drop old index if it exists
  DROP INDEX IF EXISTS templates_org_category_idx;
  
  -- Recreate with org_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'templates' 
    AND column_name = 'category'
  ) THEN
    CREATE INDEX IF NOT EXISTS templates_org_category_idx 
    ON templates(org_id, category);
    RAISE NOTICE 'Recreated index: templates_org_category_idx with org_id (text)';
  END IF;
END $$;

-- Recreate org_draft index with org_id
DO $$
BEGIN
  -- Drop old index if it exists
  DROP INDEX IF EXISTS templates_org_draft_idx;
  
  -- Recreate with org_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'templates' 
    AND column_name = 'is_draft'
  ) THEN
    CREATE INDEX IF NOT EXISTS templates_org_draft_idx 
    ON templates(org_id, is_draft);
    RAISE NOTICE 'Recreated index: templates_org_draft_idx with org_id (text)';
  END IF;
END $$;

-- ============================================================================
-- STEP 6: Verify final structure
-- ============================================================================

-- List all columns after migration
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'templates'
ORDER BY ordinal_position;

-- Verify slug column exists and has no NULLs
SELECT 
  COUNT(*) as total_rows,
  COUNT(slug) as rows_with_slug,
  COUNT(*) - COUNT(slug) as rows_with_null_slug
FROM templates;
