-- Migration: Force creation of missing RLS policies
-- Date: 2024-12-19
-- Description: Force creation of SELECT and INSERT policies that are still missing
--
-- This migration uses a different approach to ensure policies are created:
-- 1. First drops ALL existing policies for these tables
-- 2. Then recreates all policies from scratch
-- 3. Uses explicit error handling
--
-- WARNING: This will temporarily remove existing policies, then recreate them all

-- ============================================================================
-- STEP 1: Drop ALL existing policies for clients, templates, offers
-- ============================================================================

-- Drop all policies for clients
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'clients'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON clients', policy_record.policyname);
    RAISE NOTICE 'Dropped policy: % on clients', policy_record.policyname;
  END LOOP;
END $$;

-- Drop all policies for templates
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'templates'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON templates', policy_record.policyname);
    RAISE NOTICE 'Dropped policy: % on templates', policy_record.policyname;
  END LOOP;
END $$;

-- Drop all policies for offers
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'offers'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON offers', policy_record.policyname);
    RAISE NOTICE 'Dropped policy: % on offers', policy_record.policyname;
  END LOOP;
END $$;

-- ============================================================================
-- STEP 2: Ensure RLS is enabled
-- ============================================================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: Create all policies for 'clients' table
-- ============================================================================

-- SELECT
CREATE POLICY "Users can view clients from their organization"
ON clients
FOR SELECT
USING (org_id = public.org_id());

-- INSERT
CREATE POLICY "Users can insert clients for their organization"
ON clients
FOR INSERT
WITH CHECK (org_id = public.org_id());

-- UPDATE
CREATE POLICY "Users can update clients from their organization"
ON clients
FOR UPDATE
USING (org_id = public.org_id())
WITH CHECK (org_id = public.org_id());

-- DELETE
CREATE POLICY "Users can delete clients from their organization"
ON clients
FOR DELETE
USING (org_id = public.org_id());

-- ============================================================================
-- STEP 4: Create all policies for 'templates' table
-- ============================================================================

-- SELECT
CREATE POLICY "Users can view templates from their organization"
ON templates
FOR SELECT
USING (org_id = public.org_id());

-- INSERT
CREATE POLICY "Users can insert templates for their organization"
ON templates
FOR INSERT
WITH CHECK (org_id = public.org_id());

-- UPDATE
CREATE POLICY "Users can update templates from their organization"
ON templates
FOR UPDATE
USING (org_id = public.org_id())
WITH CHECK (org_id = public.org_id());

-- DELETE
CREATE POLICY "Users can delete templates from their organization"
ON templates
FOR DELETE
USING (org_id = public.org_id());

-- ============================================================================
-- STEP 5: Create all policies for 'offers' table
-- ============================================================================

-- SELECT
CREATE POLICY "Users can view offers from their organization"
ON offers
FOR SELECT
USING (org_id = public.org_id());

-- INSERT
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

-- UPDATE
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

-- DELETE
CREATE POLICY "Users can delete offers from their organization"
ON offers
FOR DELETE
USING (org_id = public.org_id());

-- ============================================================================
-- STEP 6: Verify all policies were created
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
  
  -- Report results
  RAISE NOTICE 'clients: SELECT=%, INSERT=%, UPDATE=%, DELETE=%', 
    clients_select_count, clients_insert_count, clients_update_count, clients_delete_count;
  RAISE NOTICE 'templates: SELECT=%, INSERT=%, UPDATE=%, DELETE=%', 
    templates_select_count, templates_insert_count, templates_update_count, templates_delete_count;
  RAISE NOTICE 'offers: SELECT=%, INSERT=%, UPDATE=%, DELETE=%', 
    offers_select_count, offers_insert_count, offers_update_count, offers_delete_count;
  
  -- Verify all policies exist
  IF clients_select_count = 1 AND clients_insert_count = 1 AND clients_update_count = 1 AND clients_delete_count = 1
     AND templates_select_count = 1 AND templates_insert_count = 1 AND templates_update_count = 1 AND templates_delete_count = 1
     AND offers_select_count = 1 AND offers_insert_count = 1 AND offers_update_count = 1 AND offers_delete_count = 1 THEN
    RAISE NOTICE '✅ All RLS policies successfully created';
  ELSE
    RAISE WARNING '⚠️ Some policies are missing. Check counts above.';
  END IF;
END $$;

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- This migration uses a more aggressive approach:
-- 1. Drops ALL existing policies first
-- 2. Recreates them from scratch
-- 3. This ensures no conflicts or duplicate policies
--
-- After running this migration, verify with:
--   SELECT tablename, cmd, COUNT(*) 
--   FROM pg_policies 
--   WHERE schemaname = 'public' 
--     AND tablename IN ('clients', 'templates', 'offers')
--   GROUP BY tablename, cmd
--   ORDER BY tablename, cmd;
--


