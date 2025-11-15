-- Script SQL pour inspecter le schéma réel de la base de données
-- À exécuter dans Supabase SQL Editor pour comparer avec Drizzle schema

-- ============================================================================
-- 1. Vérifier l'existence des tables
-- ============================================================================
SELECT 
  table_name,
  table_schema
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('clients', 'templates', 'offers', 'admin_allowed_emails', 'crm_users')
ORDER BY table_name;

-- ============================================================================
-- 2. Colonnes de la table 'clients'
-- ============================================================================
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'clients'
ORDER BY ordinal_position;

-- ============================================================================
-- 3. Colonnes de la table 'templates'
-- ============================================================================
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'templates'
ORDER BY ordinal_position;

-- ============================================================================
-- 4. Colonnes de la table 'offers'
-- ============================================================================
SELECT 
  column_name,
  data_type,
  numeric_precision,
  numeric_scale,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'offers'
ORDER BY ordinal_position;

-- ============================================================================
-- 5. Colonnes de la table 'admin_allowed_emails'
-- ============================================================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'admin_allowed_emails'
ORDER BY ordinal_position;

-- ============================================================================
-- 6. Contraintes PRIMARY KEY
-- ============================================================================
SELECT 
  tc.table_name,
  kc.column_name,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kc
  ON tc.constraint_name = kc.constraint_name
  AND tc.table_schema = kc.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('clients', 'templates', 'offers', 'admin_allowed_emails')
ORDER BY tc.table_name, kc.ordinal_position;

-- ============================================================================
-- 7. Contraintes FOREIGN KEY
-- ============================================================================
SELECT 
  tc.table_name,
  kc.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kc
  ON tc.constraint_name = kc.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('clients', 'templates', 'offers', 'admin_allowed_emails')
ORDER BY tc.table_name;

-- ============================================================================
-- 8. Contraintes UNIQUE (indexes uniques)
-- ============================================================================
SELECT 
  tc.table_name,
  kc.column_name,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kc
  ON tc.constraint_name = kc.constraint_name
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('clients', 'templates', 'offers', 'admin_allowed_emails')
ORDER BY tc.table_name, tc.constraint_name, kc.ordinal_position;

-- ============================================================================
-- 9. Indexes (tous les indexes, pas seulement uniques)
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('clients', 'templates', 'offers', 'admin_allowed_emails')
ORDER BY tablename, indexname;

-- ============================================================================
-- 10. RLS (Row Level Security) - Vérifier si activé
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('clients', 'templates', 'offers', 'admin_allowed_emails')
ORDER BY tablename;

-- ============================================================================
-- 11. Policies RLS
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('clients', 'templates', 'offers', 'admin_allowed_emails')
ORDER BY tablename, policyname;

-- ============================================================================
-- 12. Types ENUM (pour vérifier offer_status)
-- ============================================================================
SELECT 
  t.typname AS enum_name,
  e.enumlabel AS enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname LIKE '%status%' OR t.typname LIKE '%offer%'
ORDER BY t.typname, e.enumsortorder;

-- ============================================================================
-- 13. Fonctions (pour vérifier public.org_id())
-- ============================================================================
SELECT 
  routine_name,
  routine_type,
  data_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'org_id';

-- ============================================================================
-- 14. Vérifier les colonnes org_id (nullability)
-- ============================================================================
SELECT 
  table_name,
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'org_id'
ORDER BY table_name;


