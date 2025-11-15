-- Migration: Fix missing RLS policies
-- Date: 2024-12-19
-- Description: Restores missing RLS policies for clients, templates, and offers tables
--
-- This migration fixes the issue where SELECT and INSERT policies are missing
-- for some tables, which prevents users from reading or creating data.
--
-- PROBLEM DETECTED:
-- - clients: Missing SELECT and INSERT policies
-- - templates: Missing SELECT policy
-- - offers: Missing SELECT and INSERT policies
--
-- This migration recreates all policies to ensure they exist, using
-- DROP POLICY IF EXISTS + CREATE POLICY to make it idempotent.

-- ============================================================================
-- STEP 1: Fix missing policies for 'clients' table
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
-- (Recreate to ensure it exists)
DROP POLICY IF EXISTS "Users can update clients from their organization" ON clients;
CREATE POLICY "Users can update clients from their organization"
ON clients
FOR UPDATE
USING (org_id = public.org_id())
WITH CHECK (org_id = public.org_id());

-- DELETE: Users can only delete clients from their organization
-- (Recreate to ensure it exists)
DROP POLICY IF EXISTS "Users can delete clients from their organization" ON clients;
CREATE POLICY "Users can delete clients from their organization"
ON clients
FOR DELETE
USING (org_id = public.org_id());

-- ============================================================================
-- STEP 2: Fix missing policies for 'templates' table
-- ============================================================================

-- SELECT: Users can only see templates from their organization
DROP POLICY IF EXISTS "Users can view templates from their organization" ON templates;
CREATE POLICY "Users can view templates from their organization"
ON templates
FOR SELECT
USING (org_id = public.org_id());

-- INSERT: Users can only create templates for their organization
-- (Recreate to ensure it exists)
DROP POLICY IF EXISTS "Users can insert templates for their organization" ON templates;
CREATE POLICY "Users can insert templates for their organization"
ON templates
FOR INSERT
WITH CHECK (org_id = public.org_id());

-- UPDATE: Users can only update templates from their organization
-- (Recreate to ensure it exists)
DROP POLICY IF EXISTS "Users can update templates from their organization" ON templates;
CREATE POLICY "Users can update templates from their organization"
ON templates
FOR UPDATE
USING (org_id = public.org_id())
WITH CHECK (org_id = public.org_id());

-- DELETE: Users can only delete templates from their organization
-- (Recreate to ensure it exists)
DROP POLICY IF EXISTS "Users can delete templates from their organization" ON templates;
CREATE POLICY "Users can delete templates from their organization"
ON templates
FOR DELETE
USING (org_id = public.org_id());

-- ============================================================================
-- STEP 3: Fix missing policies for 'offers' table
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
-- (Recreate to ensure it exists)
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
-- (Recreate to ensure it exists)
DROP POLICY IF EXISTS "Users can delete offers from their organization" ON offers;
CREATE POLICY "Users can delete offers from their organization"
ON offers
FOR DELETE
USING (org_id = public.org_id());

-- ============================================================================
-- STEP 4: Verify that all policies exist
-- ============================================================================

DO $$
DECLARE
  clients_select_count INTEGER;
  clients_insert_count INTEGER;
  clients_update_count INTEGER;
  clients_delete_count INTEGER;
  templates_select_count INTEGER;
  templates_insert_count INTEGER;
  templates_update_count INTEGER;
  templates_delete_count INTEGER;
  offers_select_count INTEGER;
  offers_insert_count INTEGER;
  offers_update_count INTEGER;
  offers_delete_count INTEGER;
BEGIN
  -- Count policies for clients
  SELECT COUNT(*) INTO clients_select_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'clients' AND cmd = 'SELECT';
  
  SELECT COUNT(*) INTO clients_insert_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'clients' AND cmd = 'INSERT';
  
  SELECT COUNT(*) INTO clients_update_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'clients' AND cmd = 'UPDATE';
  
  SELECT COUNT(*) INTO clients_delete_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'clients' AND cmd = 'DELETE';
  
  -- Count policies for templates
  SELECT COUNT(*) INTO templates_select_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'templates' AND cmd = 'SELECT';
  
  SELECT COUNT(*) INTO templates_insert_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'templates' AND cmd = 'INSERT';
  
  SELECT COUNT(*) INTO templates_update_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'templates' AND cmd = 'UPDATE';
  
  SELECT COUNT(*) INTO templates_delete_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'templates' AND cmd = 'DELETE';
  
  -- Count policies for offers
  SELECT COUNT(*) INTO offers_select_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'offers' AND cmd = 'SELECT';
  
  SELECT COUNT(*) INTO offers_insert_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'offers' AND cmd = 'INSERT';
  
  SELECT COUNT(*) INTO offers_update_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'offers' AND cmd = 'UPDATE';
  
  SELECT COUNT(*) INTO offers_delete_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'offers' AND cmd = 'DELETE';
  
  -- Verify clients policies
  IF clients_select_count != 1 THEN
    RAISE WARNING 'clients table: Expected 1 SELECT policy, found %', clients_select_count;
  END IF;
  IF clients_insert_count != 1 THEN
    RAISE WARNING 'clients table: Expected 1 INSERT policy, found %', clients_insert_count;
  END IF;
  IF clients_update_count != 1 THEN
    RAISE WARNING 'clients table: Expected 1 UPDATE policy, found %', clients_update_count;
  END IF;
  IF clients_delete_count != 1 THEN
    RAISE WARNING 'clients table: Expected 1 DELETE policy, found %', clients_delete_count;
  END IF;
  
  -- Verify templates policies
  IF templates_select_count != 1 THEN
    RAISE WARNING 'templates table: Expected 1 SELECT policy, found %', templates_select_count;
  END IF;
  IF templates_insert_count != 1 THEN
    RAISE WARNING 'templates table: Expected 1 INSERT policy, found %', templates_insert_count;
  END IF;
  IF templates_update_count != 1 THEN
    RAISE WARNING 'templates table: Expected 1 UPDATE policy, found %', templates_update_count;
  END IF;
  IF templates_delete_count != 1 THEN
    RAISE WARNING 'templates table: Expected 1 DELETE policy, found %', templates_delete_count;
  END IF;
  
  -- Verify offers policies
  IF offers_select_count != 1 THEN
    RAISE WARNING 'offers table: Expected 1 SELECT policy, found %', offers_select_count;
  END IF;
  IF offers_insert_count != 1 THEN
    RAISE WARNING 'offers table: Expected 1 INSERT policy, found %', offers_insert_count;
  END IF;
  IF offers_update_count != 1 THEN
    RAISE WARNING 'offers table: Expected 1 UPDATE policy, found %', offers_update_count;
  END IF;
  IF offers_delete_count != 1 THEN
    RAISE WARNING 'offers table: Expected 1 DELETE policy, found %', offers_delete_count;
  END IF;
  
  -- Success message if all policies exist
  IF clients_select_count = 1 AND clients_insert_count = 1 AND clients_update_count = 1 AND clients_delete_count = 1
     AND templates_select_count = 1 AND templates_insert_count = 1 AND templates_update_count = 1 AND templates_delete_count = 1
     AND offers_select_count = 1 AND offers_insert_count = 1 AND offers_update_count = 1 AND offers_delete_count = 1 THEN
    RAISE NOTICE '✅ All RLS policies successfully created/verified';
  END IF;
END $$;

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- This migration fixes missing RLS policies that were detected in production.
-- The migration is idempotent and can be run multiple times safely.
--
-- After running this migration, each table should have exactly 4 policies:
-- - 1 SELECT policy
-- - 1 INSERT policy
-- - 1 UPDATE policy
-- - 1 DELETE policy
--
-- To verify policies after migration:
--   SELECT tablename, cmd, COUNT(*) 
--   FROM pg_policies 
--   WHERE schemaname = 'public' 
--     AND tablename IN ('clients', 'templates', 'offers')
--   GROUP BY tablename, cmd
--   ORDER BY tablename, cmd;
--


