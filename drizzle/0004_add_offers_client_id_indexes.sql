-- Migration: Add indexes on offers.client_id for Clients feature optimization
-- Date: 2024-12-19
-- Description: Creates indexes on client_id to optimize listOffersByClient queries for the Clients feature
--
-- Indexes created:
-- - client_id index on offers (for filtering offers by client)
-- - Composite index on (org_id, client_id) for multi-tenant client-specific queries

-- ============================================================================
-- STEP 1: Index on client_id (client-specific filtering)
-- ============================================================================

-- Index on offers.client_id
-- Optimizes queries that filter offers by a specific client
CREATE INDEX IF NOT EXISTS idx_offers_client_id ON offers(client_id);

-- ============================================================================
-- STEP 2: Composite index on (org_id, client_id) (multi-tenant client queries)
-- ============================================================================

-- Composite index on offers: org_id + client_id
-- Optimizes listOffersByClient queries that filter by both org_id and client_id
-- This is the primary optimization for the Clients feature detail page
CREATE INDEX IF NOT EXISTS idx_offers_org_client ON offers(org_id, client_id);

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- 1. Index on client_id improves performance for queries that filter offers
--    by a specific client, regardless of organization.
--
-- 2. Composite index on (org_id, client_id) is the primary optimization for
--    listOffersByClient() queries used in the Clients feature detail page.
--    This index allows PostgreSQL to efficiently filter by both columns in
--    a single index lookup.
--
-- 3. The order of columns in the composite index (org_id, client_id) is optimal
--    because:
--    - org_id has higher cardinality (more distinct values) and is filtered first
--    - client_id is filtered second, narrowing down to a specific client
--    - This matches the WHERE clause pattern: WHERE org_id = ? AND client_id = ?
--
-- 4. All indexes use IF NOT EXISTS to make the migration idempotent.
--
-- 5. To verify indexes were created:
--    SELECT indexname, indexdef FROM pg_indexes 
--    WHERE tablename = 'offers' 
--    AND indexname IN ('idx_offers_client_id', 'idx_offers_org_client')
--    ORDER BY indexname;
--
-- 6. To drop indexes if needed (use with caution):
--    DROP INDEX IF EXISTS idx_offers_client_id;
--    DROP INDEX IF EXISTS idx_offers_org_client;

