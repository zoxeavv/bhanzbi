-- Migration: Change templates.slug unique constraint to composite (org_id, slug)
-- Date: 2024-12-19
-- Description: 
--   - Removes the global unique constraint on templates.slug
--   - Adds a composite unique constraint on (org_id, slug) to enforce uniqueness per organization
--   This aligns the database constraint with the multi-tenant logic used throughout the codebase
--
-- Rationale:
--   The application logic treats slug uniqueness as (org_id, slug), but the database
--   constraint was enforcing global uniqueness. This migration aligns the DB constraint
--   with the application logic, allowing different organizations to use the same slug.

-- ============================================================================
-- STEP 1: Drop the existing unique constraint on slug
-- ============================================================================

-- Find and drop the existing unique constraint on templates.slug
-- PostgreSQL creates unique constraints with names like: templates_slug_key
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Find the unique constraint on templates.slug
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'templates'::regclass
      AND contype = 'u'
      AND array_length(conkey, 1) = 1
      AND conkey[1] = (
          SELECT attnum
          FROM pg_attribute
          WHERE attrelid = 'templates'::regclass
            AND attname = 'slug'
      );

    -- Drop the constraint if it exists
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE templates DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Dropped unique constraint: %', constraint_name;
    ELSE
        RAISE NOTICE 'No unique constraint found on templates.slug (may have been already removed)';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Add composite unique constraint on (org_id, slug)
-- ============================================================================

-- Create composite unique constraint on (org_id, slug)
-- This ensures that within each organization, slugs are unique
-- but different organizations can use the same slug
CREATE UNIQUE INDEX IF NOT EXISTS templates_org_id_slug_unique 
ON templates(org_id, slug);

-- ============================================================================
-- STEP 3: Verify the migration
-- ============================================================================

-- Check that the old constraint is gone and the new one exists
DO $$
DECLARE
    old_constraint_exists boolean;
    new_index_exists boolean;
BEGIN
    -- Check if old constraint still exists
    SELECT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'templates'::regclass
          AND contype = 'u'
          AND array_length(conkey, 1) = 1
          AND conkey[1] = (
              SELECT attnum
              FROM pg_attribute
              WHERE attrelid = 'templates'::regclass
                AND attname = 'slug'
          )
    ) INTO old_constraint_exists;

    -- Check if new index exists
    SELECT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'templates'
          AND indexname = 'templates_org_id_slug_unique'
    ) INTO new_index_exists;

    IF old_constraint_exists THEN
        RAISE WARNING 'Old unique constraint on templates.slug still exists!';
    END IF;

    IF NOT new_index_exists THEN
        RAISE WARNING 'New composite unique index templates_org_id_slug_unique not found!';
    ELSE
        RAISE NOTICE 'Migration completed successfully: composite unique constraint (org_id, slug) created';
    END IF;
END $$;

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- 1. This migration changes the uniqueness constraint from global (slug alone)
--    to per-organization (org_id + slug). This aligns with the multi-tenant
--    architecture where each organization should be able to use the same slug.
--
-- 2. The migration uses a DO block to dynamically find and drop the old constraint,
--    as PostgreSQL may name it differently depending on when/how it was created.
--
-- 3. The new constraint is created as a UNIQUE INDEX, which PostgreSQL uses
--    internally to enforce uniqueness. This is equivalent to a UNIQUE constraint
--    but gives us more control over the index name.
--
-- 4. Before running this migration, ensure there are no duplicate (org_id, slug)
--    pairs in the existing data. If duplicates exist, they must be resolved first.
--
-- 5. To check for potential duplicates before migration:
--    SELECT org_id, slug, COUNT(*) as count
--    FROM templates
--    GROUP BY org_id, slug
--    HAVING COUNT(*) > 1;
--
-- 6. To verify the constraint after migration:
--    SELECT indexname, indexdef 
--    FROM pg_indexes 
--    WHERE tablename = 'templates' 
--      AND indexname = 'templates_org_id_slug_unique';
--
-- 7. To test the constraint:
--    -- This should succeed (different orgs can have same slug)
--    INSERT INTO templates (org_id, slug, title) VALUES ('org-1', 'test-slug', 'Test 1');
--    INSERT INTO templates (org_id, slug, title) VALUES ('org-2', 'test-slug', 'Test 2');
--
--    -- This should fail (same org, same slug)
--    INSERT INTO templates (org_id, slug, title) VALUES ('org-1', 'test-slug', 'Test 3');
--
-- 8. To rollback (if needed):
--    DROP INDEX IF EXISTS templates_org_id_slug_unique;
--    ALTER TABLE templates ADD CONSTRAINT templates_slug_key UNIQUE (slug);

