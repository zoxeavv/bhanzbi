-- Script pour lister TOUTES les policies RLS existantes avec leurs détails complets
-- À exécuter dans Supabase SQL Editor pour comprendre pourquoi SELECT/INSERT manquent

-- ============================================================================
-- 1. Liste complète de TOUTES les policies pour clients, templates, offers
-- ============================================================================

SELECT 
  tablename,
  policyname,
  cmd AS command,
  permissive,
  roles,
  qual AS using_condition,
  with_check AS with_check_condition,
  CASE 
    WHEN cmd = 'SELECT' THEN 'SELECT'
    WHEN cmd = 'INSERT' THEN 'INSERT'
    WHEN cmd = 'UPDATE' THEN 'UPDATE'
    WHEN cmd = 'DELETE' THEN 'DELETE'
    ELSE cmd::text
  END AS operation_type
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('clients', 'templates', 'offers')
ORDER BY tablename, cmd, policyname;

-- ============================================================================
-- 2. Compte des policies par table et par commande
-- ============================================================================

SELECT 
  tablename,
  cmd,
  COUNT(*) AS policy_count,
  string_agg(policyname, ', ') AS policy_names
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('clients', 'templates', 'offers')
GROUP BY tablename, cmd
ORDER BY tablename, cmd;

-- ============================================================================
-- 3. Vérifier si les policies attendues existent (par nom exact)
-- ============================================================================

SELECT 
  'clients' AS table_name,
  'SELECT' AS expected_command,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename = 'clients' 
        AND cmd = 'SELECT'
        AND policyname = 'Users can view clients from their organization'
    ) THEN '✅ Existe'
    ELSE '❌ Manquante'
  END AS status
UNION ALL
SELECT 
  'clients',
  'INSERT',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename = 'clients' 
        AND cmd = 'INSERT'
        AND policyname = 'Users can insert clients for their organization'
    ) THEN '✅ Existe'
    ELSE '❌ Manquante'
  END
UNION ALL
SELECT 
  'clients',
  'UPDATE',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename = 'clients' 
        AND cmd = 'UPDATE'
        AND policyname = 'Users can update clients from their organization'
    ) THEN '✅ Existe'
    ELSE '❌ Manquante'
  END
UNION ALL
SELECT 
  'clients',
  'DELETE',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename = 'clients' 
        AND cmd = 'DELETE'
        AND policyname = 'Users can delete clients from their organization'
    ) THEN '✅ Existe'
    ELSE '❌ Manquante'
  END
UNION ALL
SELECT 
  'templates',
  'SELECT',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename = 'templates' 
        AND cmd = 'SELECT'
        AND policyname = 'Users can view templates from their organization'
    ) THEN '✅ Existe'
    ELSE '❌ Manquante'
  END
UNION ALL
SELECT 
  'templates',
  'INSERT',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename = 'templates' 
        AND cmd = 'INSERT'
        AND policyname = 'Users can insert templates for their organization'
    ) THEN '✅ Existe'
    ELSE '❌ Manquante'
  END
UNION ALL
SELECT 
  'templates',
  'UPDATE',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename = 'templates' 
        AND cmd = 'UPDATE'
        AND policyname = 'Users can update templates from their organization'
    ) THEN '✅ Existe'
    ELSE '❌ Manquante'
  END
UNION ALL
SELECT 
  'templates',
  'DELETE',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename = 'templates' 
        AND cmd = 'DELETE'
        AND policyname = 'Users can delete templates from their organization'
    ) THEN '✅ Existe'
    ELSE '❌ Manquante'
  END
UNION ALL
SELECT 
  'offers',
  'SELECT',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename = 'offers' 
        AND cmd = 'SELECT'
        AND policyname = 'Users can view offers from their organization'
    ) THEN '✅ Existe'
    ELSE '❌ Manquante'
  END
UNION ALL
SELECT 
  'offers',
  'INSERT',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename = 'offers' 
        AND cmd = 'INSERT'
        AND policyname = 'Users can insert offers for their organization'
    ) THEN '✅ Existe'
    ELSE '❌ Manquante'
  END
UNION ALL
SELECT 
  'offers',
  'UPDATE',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename = 'offers' 
        AND cmd = 'UPDATE'
        AND policyname = 'Users can update offers from their organization'
    ) THEN '✅ Existe'
    ELSE '❌ Manquante'
  END
UNION ALL
SELECT 
  'offers',
  'DELETE',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename = 'offers' 
        AND cmd = 'DELETE'
        AND policyname = 'Users can delete offers from their organization'
    ) THEN '✅ Existe'
    ELSE '❌ Manquante'
  END
ORDER BY table_name, expected_command;

-- ============================================================================
-- 4. Vérifier RLS activé
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
  AND tablename IN ('clients', 'templates', 'offers')
ORDER BY tablename;


