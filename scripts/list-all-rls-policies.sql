-- Script SQL pour lister TOUTES les policies RLS et détecter les doublons
-- 
-- PROBLÈME DÉTECTÉ :
-- - clients : 2 SELECT, 2 INSERT (doublons détectés)
-- - offers : 2 SELECT, 2 INSERT (doublons détectés)
-- - templates : 2 SELECT (doublons détectés)
--
-- Ce script liste toutes les policies pour identifier les doublons

-- ============================================================================
-- 1. Liste complète de toutes les policies avec leurs détails
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd AS operation,
  qual::text AS using_expression,
  with_check::text AS with_check_expression,
  CASE 
    WHEN qual::text LIKE '%org_id()%' OR qual::text LIKE '%public.org_id()%' 
      OR with_check::text LIKE '%org_id()%' OR with_check::text LIKE '%public.org_id()%'
    THEN '✅ Utilise org_id()'
    ELSE '❌ N''utilise pas org_id()'
  END AS uses_org_id_function
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('clients', 'templates', 'offers', 'admin_allowed_emails')
ORDER BY tablename, 
  CASE cmd
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
    ELSE 5
  END,
  policyname;

-- ============================================================================
-- 2. Détecter les doublons par table et opération
-- ============================================================================
SELECT 
  tablename,
  cmd AS operation,
  COUNT(*) AS policy_count,
  STRING_AGG(policyname, ', ' ORDER BY policyname) AS policy_names,
  CASE 
    WHEN COUNT(*) > 1 THEN '⚠️ DOUBLONS DÉTECTÉS'
    ELSE '✅ OK'
  END AS status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('clients', 'templates', 'offers', 'admin_allowed_emails')
GROUP BY tablename, cmd
HAVING COUNT(*) > 1
ORDER BY tablename, cmd;

-- ============================================================================
-- 3. Comparer les policies par nom pour identifier les doublons exacts
-- ============================================================================
-- Policies attendues selon migration 0002_enable_rls.sql
WITH expected_policies AS (
  SELECT 'clients' AS tablename, 'SELECT' AS cmd, 'Users can view clients from their organization' AS expected_name
  UNION ALL SELECT 'clients', 'INSERT', 'Users can insert clients for their organization'
  UNION ALL SELECT 'clients', 'UPDATE', 'Users can update clients from their organization'
  UNION ALL SELECT 'clients', 'DELETE', 'Users can delete clients from their organization'
  UNION ALL SELECT 'templates', 'SELECT', 'Users can view templates from their organization'
  UNION ALL SELECT 'templates', 'INSERT', 'Users can insert templates for their organization'
  UNION ALL SELECT 'templates', 'UPDATE', 'Users can update templates from their organization'
  UNION ALL SELECT 'templates', 'DELETE', 'Users can delete templates from their organization'
  UNION ALL SELECT 'offers', 'SELECT', 'Users can view offers from their organization'
  UNION ALL SELECT 'offers', 'INSERT', 'Users can insert offers for their organization'
  UNION ALL SELECT 'offers', 'UPDATE', 'Users can update offers from their organization'
  UNION ALL SELECT 'offers', 'DELETE', 'Users can delete offers from their organization'
)
SELECT 
  p.tablename,
  p.cmd AS operation,
  p.policyname AS actual_name,
  e.expected_name,
  CASE 
    WHEN e.expected_name IS NULL THEN '⚠️ Policy non attendue (doublon?)'
    WHEN p.policyname = e.expected_name THEN '✅ Nom correct'
    ELSE '⚠️ Nom différent de celui attendu'
  END AS name_status,
  CASE 
    WHEN p.qual::text LIKE '%org_id()%' OR p.qual::text LIKE '%public.org_id()%' 
      OR p.with_check::text LIKE '%org_id()%' OR p.with_check::text LIKE '%public.org_id()%'
    THEN '✅ Utilise org_id()'
    ELSE '❌ N''utilise pas org_id()'
  END AS uses_org_id
FROM pg_policies p
LEFT JOIN expected_policies e ON p.tablename = e.tablename AND p.cmd = e.cmd
WHERE p.schemaname = 'public'
  AND p.tablename IN ('clients', 'templates', 'offers')
ORDER BY p.tablename, 
  CASE p.cmd
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
    ELSE 5
  END,
  p.policyname;

-- ============================================================================
-- 4. Vérifier les conditions des policies (USING/WITH CHECK)
-- ============================================================================
SELECT 
  tablename,
  cmd AS operation,
  policyname,
  CASE 
    WHEN cmd IN ('SELECT', 'UPDATE', 'DELETE') AND qual IS NULL THEN '❌ Pas de USING'
    WHEN cmd IN ('SELECT', 'UPDATE', 'DELETE') AND qual IS NOT NULL THEN '✅ USING défini'
    ELSE 'N/A'
  END AS using_status,
  CASE 
    WHEN cmd IN ('INSERT', 'UPDATE') AND with_check IS NULL THEN '❌ Pas de WITH CHECK'
    WHEN cmd IN ('INSERT', 'UPDATE') AND with_check IS NOT NULL THEN '✅ WITH CHECK défini'
    ELSE 'N/A'
  END AS with_check_status,
  qual::text AS using_expression,
  with_check::text AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('clients', 'templates', 'offers')
ORDER BY tablename, cmd, policyname;


