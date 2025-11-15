-- Migration: Enable RLS and add policies for admin_allowed_emails table
-- Date: 2024-12-19
-- Description: Enables RLS and creates all policies (SELECT, INSERT, UPDATE, DELETE) for admin_allowed_emails
--
-- This migration aligns admin_allowed_emails with the RLS protection pattern
-- used for clients, templates, and offers tables.
--
-- The policies ensure that users can only access admin_allowed_emails from
-- their organization, maintaining multi-tenant security.

-- ============================================================================
-- STEP 1: Enable Row Level Security on admin_allowed_emails
-- ============================================================================

ALTER TABLE admin_allowed_emails ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: Ensure the org_id() helper function exists
-- ============================================================================
-- This function should already exist from migration 0002_enable_rls.sql,
-- but we recreate it here to ensure it's available (idempotent).

CREATE OR REPLACE FUNCTION public.org_id()
RETURNS TEXT AS $$
BEGIN
  RETURN (auth.jwt() ->> 'user_metadata')::jsonb ->> 'org_id';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- STEP 3: RLS Policies for 'admin_allowed_emails' table
-- ============================================================================

-- SELECT: Users can only see admin_allowed_emails from their organization
DROP POLICY IF EXISTS "Users can view admin allowed emails from their organization" ON admin_allowed_emails;
CREATE POLICY "Users can view admin allowed emails from their organization"
ON admin_allowed_emails
FOR SELECT
USING (org_id = public.org_id());

-- INSERT: Users can only create admin_allowed_emails for their organization
DROP POLICY IF EXISTS "Users can insert admin allowed emails for their organization" ON admin_allowed_emails;
CREATE POLICY "Users can insert admin allowed emails for their organization"
ON admin_allowed_emails
FOR INSERT
WITH CHECK (org_id = public.org_id());

-- UPDATE: Users can only update admin_allowed_emails from their organization
-- This policy is needed for markAdminEmailAsUsed() function
DROP POLICY IF EXISTS "Users can update admin allowed emails from their organization" ON admin_allowed_emails;
CREATE POLICY "Users can update admin allowed emails from their organization"
ON admin_allowed_emails
FOR UPDATE
USING (org_id = public.org_id())
WITH CHECK (org_id = public.org_id());

-- DELETE: Users can only delete admin_allowed_emails from their organization
DROP POLICY IF EXISTS "Users can delete admin allowed emails from their organization" ON admin_allowed_emails;
CREATE POLICY "Users can delete admin allowed emails from their organization"
ON admin_allowed_emails
FOR DELETE
USING (org_id = public.org_id());

-- ============================================================================
-- STEP 4: Verify that all policies were created
-- ============================================================================

DO $$
DECLARE
  select_count INTEGER;
  insert_count INTEGER;
  update_count INTEGER;
  delete_count INTEGER;
BEGIN
  -- Count policies for admin_allowed_emails
  SELECT COUNT(*) INTO select_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'admin_allowed_emails' AND cmd = 'SELECT';
  
  SELECT COUNT(*) INTO insert_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'admin_allowed_emails' AND cmd = 'INSERT';
  
  SELECT COUNT(*) INTO update_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'admin_allowed_emails' AND cmd = 'UPDATE';
  
  SELECT COUNT(*) INTO delete_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'admin_allowed_emails' AND cmd = 'DELETE';
  
  -- Report results
  RAISE NOTICE 'admin_allowed_emails policies: SELECT=%, INSERT=%, UPDATE=%, DELETE=%', 
    select_count, insert_count, update_count, delete_count;
  
  -- Verify all policies exist
  IF select_count = 1 AND insert_count = 1 AND update_count = 1 AND delete_count = 1 THEN
    RAISE NOTICE '✅ All RLS policies successfully created for admin_allowed_emails';
  ELSE
    RAISE WARNING '⚠️ Some policies are missing. Expected 1 of each, check counts above.';
  END IF;
END $$;

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- This migration completes the RLS protection for admin_allowed_emails table,
-- aligning it with the security model used for clients, templates, and offers.
--
-- After running this migration, admin_allowed_emails will have:
-- - RLS enabled
-- - 4 policies: SELECT, INSERT, UPDATE, DELETE
-- - All policies enforce org_id-based multi-tenant isolation
--
-- To verify policies after migration:
--   SELECT tablename, cmd, policyname
--   FROM pg_policies
--   WHERE schemaname = 'public'
--     AND tablename = 'admin_allowed_emails'
--   ORDER BY cmd;
--
-- This migration is idempotent - it can be run multiple times safely.
-- Each policy is dropped before creation using DROP POLICY IF EXISTS.


