-- Migration: Create templates table with all required columns
-- Date: 2024-12-19
-- Description: Creates the templates table if it doesn't exist, or adds missing columns
--
-- This migration ensures the templates table has all required columns:
-- - id (primary key)
-- - org_id (for multi-tenancy)
-- - title
-- - slug
-- - content
-- - category
-- - tags
-- - created_at
-- - updated_at

-- ============================================================================
-- STEP 1: Create table if it doesn't exist
-- ============================================================================

CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  title TEXT NOT NULL,
  slug VARCHAR(255) NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: Add missing columns if table already exists
-- ============================================================================

-- Add slug column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'templates' 
    AND column_name = 'slug'
  ) THEN
    ALTER TABLE templates ADD COLUMN slug VARCHAR(255) NOT NULL DEFAULT '';
    RAISE NOTICE 'Added column: slug';
  END IF;
END $$;

-- Add org_id column if it doesn't exist (should already exist from migration 0001)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'templates' 
    AND column_name = 'org_id'
  ) THEN
    ALTER TABLE templates ADD COLUMN org_id TEXT;
    UPDATE templates SET org_id = 'default-org' WHERE org_id IS NULL;
    ALTER TABLE templates ALTER COLUMN org_id SET NOT NULL;
    RAISE NOTICE 'Added column: org_id';
  END IF;
END $$;

-- Add title column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'templates' 
    AND column_name = 'title'
  ) THEN
    ALTER TABLE templates ADD COLUMN title TEXT NOT NULL DEFAULT '';
    RAISE NOTICE 'Added column: title';
  END IF;
END $$;

-- Add content column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'templates' 
    AND column_name = 'content'
  ) THEN
    ALTER TABLE templates ADD COLUMN content TEXT NOT NULL DEFAULT '';
    RAISE NOTICE 'Added column: content';
  END IF;
END $$;

-- Add category column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'templates' 
    AND column_name = 'category'
  ) THEN
    ALTER TABLE templates ADD COLUMN category TEXT NOT NULL DEFAULT '';
    RAISE NOTICE 'Added column: category';
  END IF;
END $$;

-- Add tags column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'templates' 
    AND column_name = 'tags'
  ) THEN
    ALTER TABLE templates ADD COLUMN tags JSONB NOT NULL DEFAULT '[]'::jsonb;
    RAISE NOTICE 'Added column: tags';
  END IF;
END $$;

-- Add created_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'templates' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE templates ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT NOW();
    RAISE NOTICE 'Added column: created_at';
  END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'templates' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE templates ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT NOW();
    RAISE NOTICE 'Added column: updated_at';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Ensure NOT NULL constraints (if columns exist but are nullable)
-- ============================================================================

-- Make slug NOT NULL if it exists but is nullable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'templates' 
    AND column_name = 'slug'
    AND is_nullable = 'YES'
  ) THEN
    -- Set default for NULL values first
    UPDATE templates SET slug = '' WHERE slug IS NULL;
    ALTER TABLE templates ALTER COLUMN slug SET NOT NULL;
    RAISE NOTICE 'Made slug column NOT NULL';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Verify final structure
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

