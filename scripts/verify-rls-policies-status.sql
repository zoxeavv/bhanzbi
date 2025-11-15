-- Script de vérification rapide des policies RLS
-- À exécuter AVANT et APRÈS la migration 0008_fix_missing_rls_policies.sql
-- 
-- Usage:
--   1. Exécuter AVANT migration pour voir l'état actuel
--   2. Appliquer migration 0008_fix_missing_rls_policies.sql
--   3. Exécuter APRÈS migration pour vérifier que tout est corrigé

-- ============================================================================
-- RÉSUMÉ PAR TABLE (format JSON-friendly)
-- ============================================================================

SELECT 
  'clients' AS table_name,
  CASE 
    WHEN COUNT(*) FILTER (WHERE cmd = 'SELECT') = 1 THEN '✅'
    ELSE '❌'
  END AS has_select,
  CASE 
    WHEN COUNT(*) FILTER (WHERE cmd = 'INSERT') = 1 THEN '✅'
    ELSE '❌'
  END AS has_insert,
  CASE 
    WHEN COUNT(*) FILTER (WHERE cmd = 'UPDATE') = 1 THEN '✅'
    ELSE '❌'
  END AS has_update,
  CASE 
    WHEN COUNT(*) FILTER (WHERE cmd = 'DELETE') = 1 THEN '✅'
    ELSE '❌'
  END AS has_delete
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'clients'

UNION ALL

SELECT 
  'templates' AS table_name,
  CASE 
    WHEN COUNT(*) FILTER (WHERE cmd = 'SELECT') = 1 THEN '✅'
    ELSE '❌'
  END AS has_select,
  CASE 
    WHEN COUNT(*) FILTER (WHERE cmd = 'INSERT') = 1 THEN '✅'
    ELSE '❌'
  END AS has_insert,
  CASE 
    WHEN COUNT(*) FILTER (WHERE cmd = 'UPDATE') = 1 THEN '✅'
    ELSE '❌'
  END AS has_update,
  CASE 
    WHEN COUNT(*) FILTER (WHERE cmd = 'DELETE') = 1 THEN '✅'
    ELSE '❌'
  END AS has_delete
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'templates'

UNION ALL

SELECT 
  'offers' AS table_name,
  CASE 
    WHEN COUNT(*) FILTER (WHERE cmd = 'SELECT') = 1 THEN '✅'
    ELSE '❌'
  END AS has_select,
  CASE 
    WHEN COUNT(*) FILTER (WHERE cmd = 'INSERT') = 1 THEN '✅'
    ELSE '❌'
  END AS has_insert,
  CASE 
    WHEN COUNT(*) FILTER (WHERE cmd = 'UPDATE') = 1 THEN '✅'
    ELSE '❌'
  END AS has_update,
  CASE 
    WHEN COUNT(*) FILTER (WHERE cmd = 'DELETE') = 1 THEN '✅'
    ELSE '❌'
  END AS has_delete
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'offers'

UNION ALL

SELECT 
  'admin_allowed_emails' AS table_name,
  CASE 
    WHEN COUNT(*) FILTER (WHERE cmd = 'SELECT') >= 0 THEN '⚠️'
    ELSE 'N/A'
  END AS has_select,
  CASE 
    WHEN COUNT(*) FILTER (WHERE cmd = 'INSERT') >= 0 THEN '⚠️'
    ELSE 'N/A'
  END AS has_insert,
  CASE 
    WHEN COUNT(*) FILTER (WHERE cmd = 'UPDATE') >= 0 THEN '⚠️'
    ELSE 'N/A'
  END AS has_update,
  CASE 
    WHEN COUNT(*) FILTER (WHERE cmd = 'DELETE') >= 0 THEN '⚠️'
    ELSE 'N/A'
  END AS has_delete
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'admin_allowed_emails';

-- ============================================================================
-- DÉTAIL DES POLICIES PAR TABLE
-- ============================================================================

-- Clients
SELECT 
  'clients' AS table_name,
  cmd,
  policyname,
  CASE 
    WHEN qual IS NOT NULL THEN qual::text
    ELSE 'N/A'
  END AS using_condition,
  CASE 
    WHEN with_check IS NOT NULL THEN with_check::text
    ELSE 'N/A'
  END AS with_check_condition
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'clients'
ORDER BY cmd;

-- Templates
SELECT 
  'templates' AS table_name,
  cmd,
  policyname,
  CASE 
    WHEN qual IS NOT NULL THEN qual::text
    ELSE 'N/A'
  END AS using_condition,
  CASE 
    WHEN with_check IS NOT NULL THEN with_check::text
    ELSE 'N/A'
  END AS with_check_condition
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'templates'
ORDER BY cmd;

-- Offers
SELECT 
  'offers' AS table_name,
  cmd,
  policyname,
  CASE 
    WHEN qual IS NOT NULL THEN qual::text
    ELSE 'N/A'
  END AS using_condition,
  CASE 
    WHEN with_check IS NOT NULL THEN with_check::text
    ELSE 'N/A'
  END AS with_check_condition
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'offers'
ORDER BY cmd;

-- ============================================================================
-- VÉRIFICATION RLS ACTIVÉ
-- ============================================================================

SELECT 
  tablename,
  rowsecurity AS rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ RLS activé'
    ELSE '❌ RLS désactivé'
  END AS status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('clients', 'templates', 'offers', 'admin_allowed_emails')
ORDER BY tablename;

-- ============================================================================
-- VÉRIFICATION FONCTION public.org_id()
-- ============================================================================

SELECT 
  routine_name,
  routine_type,
  CASE 
    WHEN routine_name = 'org_id' THEN '✅ Fonction existe'
    ELSE '❌ Fonction manquante'
  END AS status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'org_id';


