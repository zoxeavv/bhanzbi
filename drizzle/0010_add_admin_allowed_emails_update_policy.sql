-- Migration: Add UPDATE policy for admin_allowed_emails table
-- Date: 2024-12-19
-- Description: Adds missing UPDATE policy for admin_allowed_emails to complete RLS protection
--
-- This migration adds the UPDATE policy that was missing, which is needed for
-- the markAdminEmailAsUsed() function that updates the used_at timestamp.

-- ============================================================================
-- STEP 1: Ensure RLS is enabled (should already be enabled, but safe to run)
-- ============================================================================

ALTER TABLE admin_allowed_emails ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: Create UPDATE policy for admin_allowed_emails
-- ============================================================================

-- UPDATE: Users can only update admin allowed emails from their organization
DROP POLICY IF EXISTS "Users can update admin allowed emails from their organization" ON admin_allowed_emails;
CREATE POLICY "Users can update admin allowed emails from their organization"
ON admin_allowed_emails
FOR UPDATE
USING (org_id = public.org_id())
WITH CHECK (org_id = public.org_id());

-- ============================================================================
-- STEP 3: Verify the policy was created
-- ============================================================================

DO $$
DECLARE
  update_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO update_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'admin_allowed_emails'
    AND cmd = 'UPDATE';
  
  IF update_policy_count = 1 THEN
    RAISE NOTICE '✅ UPDATE policy successfully created for admin_allowed_emails';
  ELSE
    RAISE WARNING '⚠️ Expected 1 UPDATE policy, found %', update_policy_count;
  END IF;
END $$;

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- This policy is needed for the markAdminEmailAsUsed() function which updates
-- the used_at timestamp when an admin email is used during registration.
--
-- The policy ensures that:
-- 1. Users can only update rows that belong to their organization (USING clause)
-- 2. Users cannot change the org_id when updating (WITH CHECK clause)
--
-- After running this migration, verify with:
--   SELECT tablename, cmd, policyname
--   FROM pg_policies
--   WHERE schemaname = 'public'
--     AND tablename = 'admin_allowed_emails'
--   ORDER BY cmd;

