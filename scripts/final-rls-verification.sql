-- Vérification finale des policies RLS après migration 0009
-- À exécuter dans Supabase SQL Editor pour confirmer que tout est corrigé

-- ============================================================================
-- RÉSUMÉ PAR TABLE (format JSON-friendly pour vérification)
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
WHERE schemaname = 'public' AND tablename = 'offers';

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
-- VÉRIFICATION FINALE : TOUTES LES POLICIES DOIVENT EXISTER
-- ============================================================================

SELECT 
  'VÉRIFICATION FINALE' AS check_type,
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clients' AND cmd = 'SELECT') = 1
     AND (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clients' AND cmd = 'INSERT') = 1
     AND (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clients' AND cmd = 'UPDATE') = 1
     AND (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clients' AND cmd = 'DELETE') = 1
     AND (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'templates' AND cmd = 'SELECT') = 1
     AND (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'templates' AND cmd = 'INSERT') = 1
     AND (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'templates' AND cmd = 'UPDATE') = 1
     AND (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'templates' AND cmd = 'DELETE') = 1
     AND (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'offers' AND cmd = 'SELECT') = 1
     AND (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'offers' AND cmd = 'INSERT') = 1
     AND (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'offers' AND cmd = 'UPDATE') = 1
     AND (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'offers' AND cmd = 'DELETE') = 1
    THEN '✅ TOUTES LES POLICIES SONT PRÉSENTES'
    ELSE '❌ CERTAINES POLICIES MANQUENT ENCORE'
  END AS status;

