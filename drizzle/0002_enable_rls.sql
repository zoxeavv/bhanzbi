-- Migration: Enable Row Level Security (RLS) on business tables
-- Date: 2024
-- Description: Activates RLS and creates policies to enforce org_id-based multi-tenancy
--
-- This migration assumes org_id is stored in user JWT claims as:
-- auth.jwt() ->> 'user_metadata' ->> 'org_id'
--
-- IMPORTANT: Ensure all existing rows have valid org_id values before enabling RLS.
-- Users without org_id in their JWT will not be able to access any data.

-- ============================================================================
-- STEP 1: Enable Row Level Security on all business tables
-- ============================================================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: Helper function to extract org_id from JWT
-- ============================================================================
-- This function extracts the org_id from the authenticated user's JWT token.
-- Returns NULL if user is not authenticated or org_id is missing.
-- Note: Created in public schema (not auth) because auth schema is protected.

CREATE OR REPLACE FUNCTION public.org_id()
RETURNS TEXT AS $$
BEGIN
  RETURN (auth.jwt() ->> 'user_metadata')::jsonb ->> 'org_id';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- STEP 3: RLS Policies for 'clients' table
-- ============================================================================

-- SELECT: Users can only see clients from their organization
DROP POLICY IF EXISTS "Users can view clients from their organization" ON clients;
CREATE POLICY "Users can view clients from their organization"
ON clients
FOR SELECT
USING (org_id = public.org_id());

-- INSERT: Users can only create clients for their organization
DROP POLICY IF EXISTS "Users can insert clients for their organization" ON clients;
CREATE POLICY "Users can insert clients for their organization"
ON clients
FOR INSERT
WITH CHECK (org_id = public.org_id());

-- UPDATE: Users can only update clients from their organization
DROP POLICY IF EXISTS "Users can update clients from their organization" ON clients;
CREATE POLICY "Users can update clients from their organization"
ON clients
FOR UPDATE
USING (org_id = public.org_id())
WITH CHECK (org_id = public.org_id());

-- DELETE: Users can only delete clients from their organization
DROP POLICY IF EXISTS "Users can delete clients from their organization" ON clients;
CREATE POLICY "Users can delete clients from their organization"
ON clients
FOR DELETE
USING (org_id = public.org_id());

-- ============================================================================
-- STEP 4: RLS Policies for 'templates' table
-- ============================================================================

-- SELECT: Users can only see templates from their organization
DROP POLICY IF EXISTS "Users can view templates from their organization" ON templates;
CREATE POLICY "Users can view templates from their organization"
ON templates
FOR SELECT
USING (org_id = public.org_id());

-- INSERT: Users can only create templates for their organization
DROP POLICY IF EXISTS "Users can insert templates for their organization" ON templates;
CREATE POLICY "Users can insert templates for their organization"
ON templates
FOR INSERT
WITH CHECK (org_id = public.org_id());

-- UPDATE: Users can only update templates from their organization
DROP POLICY IF EXISTS "Users can update templates from their organization" ON templates;
CREATE POLICY "Users can update templates from their organization"
ON templates
FOR UPDATE
USING (org_id = public.org_id())
WITH CHECK (org_id = public.org_id());

-- DELETE: Users can only delete templates from their organization
DROP POLICY IF EXISTS "Users can delete templates from their organization" ON templates;
CREATE POLICY "Users can delete templates from their organization"
ON templates
FOR DELETE
USING (org_id = public.org_id());

-- ============================================================================
-- STEP 5: RLS Policies for 'offers' table
-- ============================================================================

-- SELECT: Users can only see offers from their organization
DROP POLICY IF EXISTS "Users can view offers from their organization" ON offers;
CREATE POLICY "Users can view offers from their organization"
ON offers
FOR SELECT
USING (org_id = public.org_id());

-- INSERT: Users can only create offers for their organization
-- Note: The org_id must match the user's org_id AND the client's org_id
DROP POLICY IF EXISTS "Users can insert offers for their organization" ON offers;
CREATE POLICY "Users can insert offers for their organization"
ON offers
FOR INSERT
WITH CHECK (
  org_id = public.org_id()
  AND EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = offers.client_id
    AND clients.org_id = public.org_id()
  )
);

-- UPDATE: Users can only update offers from their organization
DROP POLICY IF EXISTS "Users can update offers from their organization" ON offers;
CREATE POLICY "Users can update offers from their organization"
ON offers
FOR UPDATE
USING (org_id = public.org_id())
WITH CHECK (
  org_id = public.org_id()
  AND EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = offers.client_id
    AND clients.org_id = public.org_id()
  )
);

-- DELETE: Users can only delete offers from their organization
DROP POLICY IF EXISTS "Users can delete offers from their organization" ON offers;
CREATE POLICY "Users can delete offers from their organization"
ON offers
FOR DELETE
USING (org_id = public.org_id());

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- 1. The public.org_id() function uses SECURITY DEFINER to access auth.jwt()
--    which requires elevated privileges. Created in public schema (not auth)
--    because the auth schema is protected by Supabase.
--
-- 2. All policies use USING clause for SELECT/UPDATE/DELETE and WITH CHECK
--    for INSERT/UPDATE to ensure org_id matches the authenticated user's org_id.
--
-- 3. The offers policies also verify that the referenced client belongs to
--    the same organization, preventing cross-org references.
--
-- 4. After enabling RLS, users without org_id in their JWT will see empty
--    results for all queries (no rows will match).
--
-- 5. To test RLS policies:
--    - Connect as a user with org_id in user_metadata
--    - Verify you can only see/modify rows with matching org_id
--    - Verify you cannot access rows from other organizations
--
-- 6. To temporarily disable RLS for maintenance (use with caution):
--    ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
--    -- (repeat for templates and offers)
--
-- 7. This migration is idempotent - it can be run multiple times safely.
--    Each policy is dropped before creation using DROP POLICY IF EXISTS.

