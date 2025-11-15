-- Script SQL de vérification des corrections de l'audit technique
-- 
-- Ce script vérifie que toutes les corrections de l'audit ont été correctement appliquées :
-- 1. Table crm_users supprimée (ou n'existe pas)
-- 2. RLS activé sur admin_allowed_emails avec toutes les policies
-- 3. Enum offer_status existe avec toutes les valeurs
--
-- Usage: Exécuter dans Supabase SQL Editor

-- ============================================================================
-- VÉRIFICATION 1: Table crm_users supprimée
-- ============================================================================

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'crm_users'
    ) THEN '❌ Table crm_users existe encore'
    ELSE '✅ Table crm_users n''existe pas (ou a été supprimée)'
  END AS verification_1;

-- ============================================================================
-- VÉRIFICATION 2: RLS sur admin_allowed_emails
-- ============================================================================

-- Vérifier que RLS est activé
SELECT 
  relname AS table_name,
  CASE 
    WHEN relrowsecurity THEN '✅ RLS activé'
    ELSE '❌ RLS non activé'
  END AS rls_status
FROM pg_class
WHERE relname = 'admin_allowed_emails'
  AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Vérifier les policies
SELECT 
  cmd AS operation,
  COUNT(*) AS policy_count,
  CASE 
    WHEN COUNT(*) = 1 THEN '✅ Policy présente'
    ELSE '❌ Policy manquante'
  END AS status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'admin_allowed_emails'
GROUP BY cmd
ORDER BY cmd;

-- Liste détaillée des policies
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN '✅'
    WHEN cmd = 'INSERT' THEN '✅'
    WHEN cmd = 'UPDATE' THEN '✅'
    WHEN cmd = 'DELETE' THEN '✅'
    ELSE '⚠️'
  END AS status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'admin_allowed_emails'
ORDER BY cmd;

-- ============================================================================
-- VÉRIFICATION 3: Enum offer_status
-- ============================================================================

-- Vérifier l'existence de l'enum
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1
      FROM pg_type
      WHERE typname = 'offer_status'
    ) THEN '✅ Enum offer_status existe'
    ELSE '❌ Enum offer_status n''existe pas'
  END AS verification_3;

-- Vérifier les valeurs de l'enum
SELECT 
  enumlabel AS value,
  CASE 
    WHEN enumlabel IN ('draft', 'sent', 'accepted', 'rejected') THEN '✅'
    ELSE '⚠️'
  END AS status
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'offer_status')
ORDER BY enumsortorder;

-- Résumé des valeurs attendues vs présentes
SELECT 
  'draft' AS expected_value,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'offer_status')
        AND enumlabel = 'draft'
    ) THEN '✅ Présent'
    ELSE '❌ Manquant'
  END AS status
UNION ALL
SELECT 
  'sent' AS expected_value,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'offer_status')
        AND enumlabel = 'sent'
    ) THEN '✅ Présent'
    ELSE '❌ Manquant'
  END AS status
UNION ALL
SELECT 
  'accepted' AS expected_value,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'offer_status')
        AND enumlabel = 'accepted'
    ) THEN '✅ Présent'
    ELSE '❌ Manquant'
  END AS status
UNION ALL
SELECT 
  'rejected' AS expected_value,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'offer_status')
        AND enumlabel = 'rejected'
    ) THEN '✅ Présent'
    ELSE '❌ Manquant'
  END AS status;

-- ============================================================================
-- RÉSUMÉ GLOBAL
-- ============================================================================

SELECT 
  'RÉSUMÉ DES VÉRIFICATIONS' AS summary,
  '' AS details
UNION ALL
SELECT 
  '1. Table crm_users',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'crm_users'
    ) THEN '❌ Existe encore'
    ELSE '✅ Supprimée ou n''existe pas'
  END
UNION ALL
SELECT 
  '2. RLS admin_allowed_emails',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_class
      WHERE relname = 'admin_allowed_emails' 
        AND relrowsecurity = true
        AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN '✅ Activé'
    ELSE '❌ Non activé'
  END
UNION ALL
SELECT 
  '3. Policies admin_allowed_emails',
  CASE 
    WHEN (
      SELECT COUNT(DISTINCT cmd) FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'admin_allowed_emails'
    ) = 4 THEN '✅ 4 policies présentes'
    ELSE '❌ Policies manquantes'
  END
UNION ALL
SELECT 
  '4. Enum offer_status',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_type WHERE typname = 'offer_status'
    ) THEN '✅ Existe'
    ELSE '❌ N''existe pas'
  END
UNION ALL
SELECT 
  '5. Valeurs enum offer_status',
  CASE 
    WHEN (
      SELECT COUNT(*) FROM pg_enum
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'offer_status')
        AND enumlabel IN ('draft', 'sent', 'accepted', 'rejected')
    ) = 4 THEN '✅ 4 valeurs présentes'
    ELSE '❌ Valeurs manquantes'
  END;


