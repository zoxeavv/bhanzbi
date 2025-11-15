-- Script SQL pour nettoyer les policies RLS dupliquées
-- 
-- ATTENTION : Ce script supprime les policies qui ne correspondent pas aux noms attendus
-- de la migration 0002_enable_rls.sql
--
-- Vérifiez d'abord avec scripts/list-all-rls-policies.sql avant d'exécuter ce script

-- ============================================================================
-- 1. Lister les policies à supprimer (celles qui ne correspondent pas aux noms attendus)
-- ============================================================================
SELECT 
  tablename,
  cmd,
  policyname,
  'À supprimer' AS action
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('clients', 'templates', 'offers')
  AND policyname NOT IN (
    -- Noms attendus selon migration 0002_enable_rls.sql
    'Users can view clients from their organization',
    'Users can insert clients for their organization',
    'Users can update clients from their organization',
    'Users can delete clients from their organization',
    'Users can view templates from their organization',
    'Users can insert templates for their organization',
    'Users can update templates from their organization',
    'Users can delete templates from their organization',
    'Users can view offers from their organization',
    'Users can insert offers for their organization',
    'Users can update offers from their organization',
    'Users can delete offers from their organization'
  )
ORDER BY tablename, cmd, policyname;

-- ============================================================================
-- 2. Supprimer les policies dupliquées (UNCOMMENT pour exécuter)
-- ============================================================================
-- ATTENTION : Décommentez seulement après avoir vérifié la liste ci-dessus

/*
-- Supprimer les policies clients qui ne correspondent pas aux noms attendus
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'clients'
      AND policyname NOT IN (
        'Users can view clients from their organization',
        'Users can insert clients for their organization',
        'Users can update clients from their organization',
        'Users can delete clients from their organization'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON clients', policy_record.policyname);
    RAISE NOTICE '✅ Policy supprimée: % sur clients', policy_record.policyname;
  END LOOP;
END $$;

-- Supprimer les policies templates qui ne correspondent pas aux noms attendus
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'templates'
      AND policyname NOT IN (
        'Users can view templates from their organization',
        'Users can insert templates for their organization',
        'Users can update templates from their organization',
        'Users can delete templates from their organization'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON templates', policy_record.policyname);
    RAISE NOTICE '✅ Policy supprimée: % sur templates', policy_record.policyname;
  END LOOP;
END $$;

-- Supprimer les policies offers qui ne correspondent pas aux noms attendus
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'offers'
      AND policyname NOT IN (
        'Users can view offers from their organization',
        'Users can insert offers for their organization',
        'Users can update offers from their organization',
        'Users can delete offers from their organization'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON offers', policy_record.policyname);
    RAISE NOTICE '✅ Policy supprimée: % sur offers', policy_record.policyname;
  END LOOP;
END $$;
*/

-- ============================================================================
-- 3. Vérifier l'état final après nettoyage
-- ============================================================================
SELECT 
  tablename,
  COUNT(DISTINCT CASE WHEN cmd = 'SELECT' THEN policyname END) AS select_policies,
  COUNT(DISTINCT CASE WHEN cmd = 'INSERT' THEN policyname END) AS insert_policies,
  COUNT(DISTINCT CASE WHEN cmd = 'UPDATE' THEN policyname END) AS update_policies,
  COUNT(DISTINCT CASE WHEN cmd = 'DELETE' THEN policyname END) AS delete_policies,
  COUNT(DISTINCT policyname) AS total_policies,
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN cmd = 'SELECT' THEN policyname END) = 1
     AND COUNT(DISTINCT CASE WHEN cmd = 'INSERT' THEN policyname END) = 1
     AND COUNT(DISTINCT CASE WHEN cmd = 'UPDATE' THEN policyname END) = 1
     AND COUNT(DISTINCT CASE WHEN cmd = 'DELETE' THEN policyname END) = 1
    THEN '✅ Toutes les policies correctes (1 par opération)'
    ELSE '⚠️ Policies manquantes ou en trop'
  END AS status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('clients', 'templates', 'offers')
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- Ce script identifie et supprime les policies dupliquées.
--
-- ÉTAPES :
-- 1. Exécutez d'abord scripts/list-all-rls-policies.sql pour voir toutes les policies
-- 2. Vérifiez la section 1 de ce script pour voir quelles policies seront supprimées
-- 3. Si OK, décommentez la section 2 pour supprimer les doublons
-- 4. Vérifiez le résultat avec la section 3
--
-- Après nettoyage, chaque table devrait avoir exactement 4 policies :
-- - 1 SELECT
-- - 1 INSERT
-- - 1 UPDATE
-- - 1 DELETE


