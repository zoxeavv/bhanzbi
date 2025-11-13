-- Migration: Add org_id column to clients, templates, and offers tables
-- Date: 2024
-- Description: Adds multi-tenancy support by adding org_id to all business tables
--
-- IMPORTANT: This migration assumes existing data belongs to a default organization.
-- You MUST update existing rows with actual org_id values before deploying to production.
-- The temporary default value 'default-org' is used here for migration purposes only.

-- Step 1: Add org_id column as nullable first (to allow existing rows)
ALTER TABLE clients ADD COLUMN org_id TEXT;
ALTER TABLE templates ADD COLUMN org_id TEXT;
ALTER TABLE offers ADD COLUMN org_id TEXT;

-- Step 2: Set temporary default value for existing rows
-- WARNING: Replace 'default-org' with actual org_id values from your user metadata
-- before making the column NOT NULL. This is a temporary measure for migration.
UPDATE clients SET org_id = 'default-org' WHERE org_id IS NULL;
UPDATE templates SET org_id = 'default-org' WHERE org_id IS NULL;
UPDATE offers SET org_id = 'default-org' WHERE org_id IS NULL;

-- Step 3: Make org_id NOT NULL now that all rows have values
ALTER TABLE clients ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE templates ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE offers ALTER COLUMN org_id SET NOT NULL;

-- Step 4: Add indexes for better query performance on org_id filters
CREATE INDEX IF NOT EXISTS idx_clients_org_id ON clients(org_id);
CREATE INDEX IF NOT EXISTS idx_templates_org_id ON templates(org_id);
CREATE INDEX IF NOT EXISTS idx_offers_org_id ON offers(org_id);

-- Step 5: Add composite unique constraint on templates (slug + org_id)
-- This ensures slug uniqueness per organization, not globally
-- Note: Drop the existing unique constraint on slug first if it exists
-- ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_slug_unique;
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_templates_slug_org_id ON templates(slug, org_id);

