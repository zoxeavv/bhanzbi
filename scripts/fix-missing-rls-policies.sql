-- Script SQL pour corriger les policies RLS manquantes
-- 
-- PROBLÈME DÉTECTÉ :
-- - clients : Manque SELECT et INSERT policies
-- - templates : Manque SELECT policy
-- - offers : Manque SELECT et INSERT policies
--
-- Ce script crée les policies manquantes selon la migration 0002_enable_rls.sql

-- ============================================================================
-- 1. Vérifier l'état actuel des policies
-- ============================================================================
SELECT 
  tablename,
  cmd,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('clients', 'templates', 'offers')
GROUP BY tablename, cmd
ORDER BY tablename, cmd;

-- ============================================================================
-- 2. Créer les policies SELECT manquantes pour 'clients'
-- ============================================================================
DO $$
BEGIN
  -- Vérifier si la policy SELECT existe déjà
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'clients'
      AND cmd = 'SELECT'
  ) THEN
    CREATE POLICY "Users can view clients from their organization"
    ON clients
    FOR SELECT
    USING (org_id = public.org_id());
    
    RAISE NOTICE '✅ Policy SELECT créée pour clients';
  ELSE
    RAISE NOTICE '⚠️  Policy SELECT existe déjà pour clients';
  END IF;
END $$;

-- ============================================================================
-- 3. Créer les policies INSERT manquantes pour 'clients'
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'clients'
      AND cmd = 'INSERT'
  ) THEN
    CREATE POLICY "Users can insert clients for their organization"
    ON clients
    FOR INSERT
    WITH CHECK (org_id = public.org_id());
    
    RAISE NOTICE '✅ Policy INSERT créée pour clients';
  ELSE
    RAISE NOTICE '⚠️  Policy INSERT existe déjà pour clients';
  END IF;
END $$;

-- ============================================================================
-- 4. Créer les policies SELECT manquantes pour 'templates'
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'templates'
      AND cmd = 'SELECT'
  ) THEN
    CREATE POLICY "Users can view templates from their organization"
    ON templates
    FOR SELECT
    USING (org_id = public.org_id());
    
    RAISE NOTICE '✅ Policy SELECT créée pour templates';
  ELSE
    RAISE NOTICE '⚠️  Policy SELECT existe déjà pour templates';
  END IF;
END $$;

-- ============================================================================
-- 5. Créer les policies SELECT manquantes pour 'offers'
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'offers'
      AND cmd = 'SELECT'
  ) THEN
    CREATE POLICY "Users can view offers from their organization"
    ON offers
    FOR SELECT
    USING (org_id = public.org_id());
    
    RAISE NOTICE '✅ Policy SELECT créée pour offers';
  ELSE
    RAISE NOTICE '⚠️  Policy SELECT existe déjà pour offers';
  END IF;
END $$;

-- ============================================================================
-- 6. Créer les policies INSERT manquantes pour 'offers'
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'offers'
      AND cmd = 'INSERT'
  ) THEN
    CREATE POLICY "Users can insert offers for their organization"
    ON offers
    FOR INSERT
    WITH CHECK (
      org_id = public.org_id()
      AND EXISTS (
        SELECT 1 FROM clients
        WHERE clients.id = offers.client_id
        AND clients.org_id = public.org_id()
      )
    );
    
    RAISE NOTICE '✅ Policy INSERT créée pour offers';
  ELSE
    RAISE NOTICE '⚠️  Policy INSERT existe déjà pour offers';
  END IF;
END $$;

-- ============================================================================
-- 7. Vérifier que toutes les policies sont créées
-- ============================================================================
SELECT 
  tablename,
  cmd,
  policyname,
  CASE 
    WHEN cmd = 'SELECT' THEN '✅'
    WHEN cmd = 'INSERT' THEN '✅'
    WHEN cmd = 'UPDATE' THEN '✅'
    WHEN cmd = 'DELETE' THEN '✅'
    ELSE '❓'
  END AS status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('clients', 'templates', 'offers')
ORDER BY tablename, 
  CASE cmd
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
    ELSE 5
  END;

-- ============================================================================
-- 8. Résumé final
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
    THEN '✅ Toutes les policies présentes'
    ELSE '⚠️ Policies manquantes'
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
-- Ce script corrige les policies RLS manquantes détectées lors de l'audit.
--
-- Après exécution, toutes les tables métier devraient avoir :
-- - clients : 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- - templates : 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- - offers : 4 policies (SELECT, INSERT, UPDATE, DELETE)
--
-- Les policies utilisent toutes public.org_id() pour le filtrage multi-tenant.
-- La policy INSERT pour offers vérifie aussi que le client appartient à la même org.


