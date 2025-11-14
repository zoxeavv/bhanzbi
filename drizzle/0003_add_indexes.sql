-- Migration: Add indexes for dashboard performance optimization
-- Date: 2024
-- Description: Creates indexes on org_id, created_at, and offers.status to optimize dashboard queries
--
-- Indexes created:
-- - org_id indexes on clients, templates, offers (for multi-tenant filtering)
-- - created_at indexes on clients, templates, offers (for sorting recent items)
-- - status index on offers (for filtering by offer status)

-- ============================================================================
-- STEP 1: Indexes on org_id (multi-tenant filtering)
-- ============================================================================

-- Index on clients.org_id
CREATE INDEX IF NOT EXISTS idx_clients_org_id ON clients(org_id);

-- Index on templates.org_id
CREATE INDEX IF NOT EXISTS idx_templates_org_id ON templates(org_id);

-- Index on offers.org_id
CREATE INDEX IF NOT EXISTS idx_offers_org_id ON offers(org_id);

-- ============================================================================
-- STEP 2: Indexes on created_at (sorting recent items)
-- ============================================================================

-- Index on clients.created_at
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at DESC);

-- Index on templates.created_at
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON templates(created_at DESC);

-- Index on offers.created_at
CREATE INDEX IF NOT EXISTS idx_offers_created_at ON offers(created_at DESC);

-- ============================================================================
-- STEP 3: Composite indexes for common query patterns
-- ============================================================================

-- Composite index on offers: org_id + created_at (for recent offers by org)
CREATE INDEX IF NOT EXISTS idx_offers_org_id_created_at ON offers(org_id, created_at DESC);

-- Composite index on offers: org_id + status (for filtering offers by status)
-- Only create if status column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'offers' 
    AND column_name = 'status'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_offers_org_id_status ON offers(org_id, status);
  END IF;
END $$;

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- 1. Indexes on org_id improve performance for multi-tenant queries where
--    all queries filter by org_id.
--
-- 2. Indexes on created_at DESC optimize queries that sort by creation date
--    (e.g., recent items, dashboard lists).
--
-- 3. Composite indexes on offers combine org_id with other frequently filtered
--    columns to optimize common query patterns:
--    - org_id + created_at: Recent offers per organization
--    - org_id + status: Offers filtered by status per organization (only if status column exists)
--
-- 4. All indexes use IF NOT EXISTS to make the migration idempotent.
--
-- 5. To verify indexes were created:
--    SELECT indexname, indexdef FROM pg_indexes 
--    WHERE tablename IN ('clients', 'templates', 'offers')
--    ORDER BY tablename, indexname;
--
-- 6. To drop indexes if needed (use with caution):
--    DROP INDEX IF EXISTS idx_clients_org_id;
--    DROP INDEX IF EXISTS idx_clients_created_at;
--    DROP INDEX IF EXISTS idx_templates_org_id;
--    DROP INDEX IF EXISTS idx_templates_created_at;
--    DROP INDEX IF EXISTS idx_offers_org_id;
--    DROP INDEX IF EXISTS idx_offers_created_at;
--    DROP INDEX IF EXISTS idx_offers_org_id_created_at;
--    DROP INDEX IF EXISTS idx_offers_org_id_status;

