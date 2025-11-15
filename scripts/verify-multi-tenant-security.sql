-- Script de vérification de la sécurité multi-tenant
-- Vérifie l'état RLS, les policies, et la fonction org_id()

-- ============================================================================
-- 1. Vérification de l'état RLS des tables métier
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('clients', 'templates', 'offers', 'admin_allowed_emails', 'crm_users')
ORDER BY tablename;

-- ============================================================================
-- 2. Liste des policies RLS par table
-- ============================================================================

SELECT 
  tablename,
  cmd,
  policyname,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('clients', 'templates', 'offers', 'admin_allowed_emails', 'crm_users')
ORDER BY tablename, cmd;

-- ============================================================================
-- 3. Compte des policies par table et opération
-- ============================================================================

SELECT 
  tablename,
  cmd,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('clients', 'templates', 'offers', 'admin_allowed_emails', 'crm_users')
GROUP BY tablename, cmd
ORDER BY tablename, cmd;

-- ============================================================================
-- 4. Vérification de la fonction public.org_id()
-- ============================================================================

SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'org_id';

-- ============================================================================
-- 5. Vérification de la présence de org_id dans les tables
-- ============================================================================

SELECT 
  table_name,
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('clients', 'templates', 'offers', 'admin_allowed_emails', 'crm_users')
  AND column_name = 'org_id'
ORDER BY table_name;

-- ============================================================================
-- 6. Résumé de sécurité par table
-- ============================================================================

WITH rls_status AS (
  SELECT 
    tablename,
    rowsecurity as rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('clients', 'templates', 'offers', 'admin_allowed_emails', 'crm_users')
),
policy_counts AS (
  SELECT 
    tablename,
    COUNT(DISTINCT CASE WHEN cmd = 'SELECT' THEN policyname END) as select_policies,
    COUNT(DISTINCT CASE WHEN cmd = 'INSERT' THEN policyname END) as insert_policies,
    COUNT(DISTINCT CASE WHEN cmd = 'UPDATE' THEN policyname END) as update_policies,
    COUNT(DISTINCT CASE WHEN cmd = 'DELETE' THEN policyname END) as delete_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('clients', 'templates', 'offers', 'admin_allowed_emails', 'crm_users')
  GROUP BY tablename
),
org_id_check AS (
  SELECT 
    table_name as tablename,
    CASE WHEN is_nullable = 'NO' THEN true ELSE false END as org_id_not_null
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name IN ('clients', 'templates', 'offers', 'admin_allowed_emails', 'crm_users')
    AND column_name = 'org_id'
)
SELECT 
  COALESCE(r.tablename, p.tablename, o.tablename) as table_name,
  COALESCE(r.rls_enabled, false) as rls_enabled,
  COALESCE(p.select_policies, 0) as select_policies,
  COALESCE(p.insert_policies, 0) as insert_policies,
  COALESCE(p.update_policies, 0) as update_policies,
  COALESCE(p.delete_policies, 0) as delete_policies,
  COALESCE(o.org_id_not_null, false) as org_id_not_null,
  CASE 
    WHEN COALESCE(r.rls_enabled, false) = true 
      AND COALESCE(p.select_policies, 0) >= 1 
      AND COALESCE(p.insert_policies, 0) >= 1 
      AND COALESCE(p.update_policies, 0) >= 1 
      AND COALESCE(p.delete_policies, 0) >= 1
      AND COALESCE(o.org_id_not_null, false) = true
    THEN '✅ Sécurisé'
    WHEN COALESCE(r.rls_enabled, false) = false 
      AND COALESCE(o.org_id_not_null, false) = true
    THEN '⚠️ Protection app uniquement'
    ELSE '❌ À risque'
  END as security_status
FROM rls_status r
FULL OUTER JOIN policy_counts p ON r.tablename = p.tablename
FULL OUTER JOIN org_id_check o ON COALESCE(r.tablename, p.tablename) = o.tablename
ORDER BY table_name;

