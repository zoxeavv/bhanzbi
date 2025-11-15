-- Script de diagnostic pour comprendre pourquoi les policies SELECT et INSERT sont manquantes
-- À exécuter dans Supabase SQL Editor

-- ============================================================================
-- 1. Vérifier toutes les policies existantes (avec leurs noms exacts)
-- ============================================================================

SELECT 
  tablename,
  cmd,
  policyname,
  qual AS using_condition,
  with_check AS with_check_condition
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('clients', 'templates', 'offers')
ORDER BY tablename, cmd;

-- ============================================================================
-- 2. Vérifier si RLS est activé
-- ============================================================================

SELECT 
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('clients', 'templates', 'offers')
ORDER BY tablename;

-- ============================================================================
-- 3. Vérifier si la fonction org_id() existe et fonctionne
-- ============================================================================

SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'org_id';

-- ============================================================================
-- 4. Tenter de créer manuellement une policy SELECT pour clients (test)
-- ============================================================================

-- Décommentez pour tester la création manuelle
/*
DROP POLICY IF EXISTS "Users can view clients from their organization" ON clients;
CREATE POLICY "Users can view clients from their organization"
ON clients
FOR SELECT
USING (org_id = public.org_id());
*/

-- ============================================================================
-- 5. Vérifier les permissions sur les tables
-- ============================================================================

SELECT 
  table_name,
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('clients', 'templates', 'offers')
ORDER BY table_name, grantee, privilege_type;

-- ============================================================================
-- 6. Vérifier s'il y a des erreurs dans les logs (si accessible)
-- ============================================================================

-- Note: Les logs PostgreSQL ne sont pas directement accessibles via SQL
-- Vérifier dans Supabase Dashboard → Logs

