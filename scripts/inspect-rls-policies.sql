-- Script SQL pour inspecter les RLS (Row Level Security) policies
-- À exécuter dans Supabase SQL Editor
-- 
-- Ce script vérifie :
-- 1. Si RLS est activé sur chaque table
-- 2. Les policies RLS définies (SELECT, INSERT, UPDATE, DELETE)
-- 3. Les conditions USING et WITH CHECK
-- 4. La fonction public.org_id() utilisée dans les policies

-- ============================================================================
-- 1. Vérifier si RLS est activé sur les tables métier
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ RLS activé'
    ELSE '❌ RLS désactivé'
  END AS status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('clients', 'templates', 'offers', 'admin_allowed_emails', 'crm_users')
ORDER BY tablename;

-- ============================================================================
-- 2. Liste complète des policies RLS par table
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd AS command,  -- SELECT, INSERT, UPDATE, DELETE, ALL
  qual AS using_expression,  -- Condition USING (pour SELECT, UPDATE, DELETE)
  with_check AS with_check_expression  -- Condition WITH CHECK (pour INSERT, UPDATE)
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('clients', 'templates', 'offers', 'admin_allowed_emails', 'crm_users')
ORDER BY tablename, cmd, policyname;

-- ============================================================================
-- 3. Détail des policies avec formatage lisible
-- ============================================================================
SELECT 
  t.tablename,
  p.policyname,
  p.cmd AS operation,
  CASE p.cmd
    WHEN 'SELECT' THEN 'SELECT'
    WHEN 'INSERT' THEN 'INSERT'
    WHEN 'UPDATE' THEN 'UPDATE'
    WHEN 'DELETE' THEN 'DELETE'
    WHEN 'ALL' THEN 'ALL OPERATIONS'
    ELSE p.cmd::text
  END AS operation_type,
  CASE 
    WHEN p.qual IS NOT NULL THEN p.qual::text
    ELSE 'N/A'
  END AS using_condition,
  CASE 
    WHEN p.with_check IS NOT NULL THEN p.with_check::text
    ELSE 'N/A'
  END AS with_check_condition,
  CASE 
    WHEN p.qual IS NULL AND p.with_check IS NULL THEN '⚠️ Aucune condition'
    WHEN p.qual IS NOT NULL AND p.with_check IS NULL AND p.cmd IN ('INSERT', 'UPDATE') THEN '⚠️ Pas de WITH CHECK'
    WHEN p.qual IS NULL AND p.with_check IS NOT NULL AND p.cmd IN ('SELECT', 'DELETE') THEN '⚠️ Pas de USING'
    ELSE '✅ Conditions définies'
  END AS condition_status
FROM pg_policies p
JOIN pg_tables t ON p.tablename = t.tablename AND p.schemaname = t.schemaname
WHERE p.schemaname = 'public'
  AND p.tablename IN ('clients', 'templates', 'offers', 'admin_allowed_emails', 'crm_users')
ORDER BY t.tablename, 
  CASE p.cmd
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
    ELSE 5
  END,
  p.policyname;

-- ============================================================================
-- 4. Vérifier la fonction public.org_id() utilisée dans les policies
-- ============================================================================
SELECT 
  routine_name,
  routine_type,
  data_type AS return_type,
  routine_definition,
  security_type,  -- DEFINER ou INVOKER
  CASE 
    WHEN security_type = 'DEFINER' THEN '✅ SECURITY DEFINER (peut accéder à auth.jwt())'
    ELSE '⚠️ SECURITY INVOKER'
  END AS security_status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'org_id';

-- ============================================================================
-- 5. Vérifier si public.org_id() est utilisée dans les policies
-- ============================================================================
SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN qual::text LIKE '%org_id()%' OR qual::text LIKE '%public.org_id()%' THEN '✅ Utilise org_id()'
    WHEN with_check::text LIKE '%org_id()%' OR with_check::text LIKE '%public.org_id()%' THEN '✅ Utilise org_id()'
    ELSE '❌ N''utilise pas org_id()'
  END AS uses_org_id_function,
  qual::text AS using_expression,
  with_check::text AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('clients', 'templates', 'offers', 'admin_allowed_emails', 'crm_users')
ORDER BY tablename, cmd;

-- ============================================================================
-- 6. Résumé par table : RLS activé + nombre de policies
-- ============================================================================
SELECT 
  t.tablename,
  t.rowsecurity AS rls_enabled,
  COUNT(DISTINCT p.policyname) AS policies_count,
  COUNT(DISTINCT CASE WHEN p.cmd = 'SELECT' THEN p.policyname END) AS select_policies,
  COUNT(DISTINCT CASE WHEN p.cmd = 'INSERT' THEN p.policyname END) AS insert_policies,
  COUNT(DISTINCT CASE WHEN p.cmd = 'UPDATE' THEN p.policyname END) AS update_policies,
  COUNT(DISTINCT CASE WHEN p.cmd = 'DELETE' THEN p.policyname END) AS delete_policies,
  CASE 
    WHEN t.rowsecurity AND COUNT(DISTINCT p.policyname) = 0 THEN '⚠️ RLS activé mais aucune policy'
    WHEN t.rowsecurity AND COUNT(DISTINCT p.policyname) > 0 THEN '✅ RLS activé avec policies'
    WHEN NOT t.rowsecurity THEN '❌ RLS désactivé'
    ELSE '❓ État inconnu'
  END AS status
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
  AND t.tablename IN ('clients', 'templates', 'offers', 'admin_allowed_emails', 'crm_users')
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;

-- ============================================================================
-- 7. Vérifier les policies qui vérifient aussi les relations (ex: offers → clients)
-- ============================================================================
SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN qual::text LIKE '%EXISTS%' OR qual::text LIKE '%JOIN%' THEN '✅ Vérifie les relations'
    WHEN with_check::text LIKE '%EXISTS%' OR with_check::text LIKE '%JOIN%' THEN '✅ Vérifie les relations'
    ELSE '⚠️ Ne vérifie pas les relations'
  END AS checks_relations,
  qual::text AS using_expression,
  with_check::text AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('clients', 'templates', 'offers', 'admin_allowed_emails', 'crm_users')
  AND (
    qual::text LIKE '%EXISTS%' 
    OR qual::text LIKE '%JOIN%'
    OR with_check::text LIKE '%EXISTS%'
    OR with_check::text LIKE '%JOIN%'
  )
ORDER BY tablename, cmd;

-- ============================================================================
-- 8. Comparaison avec les attentes (basé sur migration 0002_enable_rls.sql)
-- ============================================================================
-- Table clients : devrait avoir 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- Table templates : devrait avoir 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- Table offers : devrait avoir 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- Table admin_allowed_emails : aucune policy attendue (RLS non activé dans migration)

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
-- NOTES
-- ============================================================================
-- 
-- Ce script vérifie :
-- 1. ✅ Si RLS est activé sur chaque table
-- 2. ✅ Les policies définies et leurs conditions
-- 3. ✅ Si public.org_id() est utilisée correctement
-- 4. ✅ Si les policies vérifient les relations (ex: offers → clients)
-- 5. ✅ Comparaison avec les attentes de la migration 0002_enable_rls.sql
--
-- Résultats attendus :
-- - clients : RLS activé, 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- - templates : RLS activé, 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- - offers : RLS activé, 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- - admin_allowed_emails : RLS probablement désactivé (non activé dans migration 0007)
-- - crm_users : Table n'existe probablement pas
--
-- Les policies devraient toutes utiliser public.org_id() pour le filtrage multi-tenant.


