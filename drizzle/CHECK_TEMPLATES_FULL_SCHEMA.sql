-- Script de vérification complète de la structure de la table templates
-- À exécuter pour comprendre la structure réelle de la table

-- 1. Vérifier si la table existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'templates'
) AS table_exists;

-- 2. Lister TOUTES les colonnes de la table templates avec leurs détails
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'templates'
ORDER BY ordinal_position;

-- 3. Vérifier les contraintes existantes (PRIMARY KEY, UNIQUE, etc.)
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  CASE contype
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'c' THEN 'CHECK'
    ELSE contype::text
  END AS constraint_type_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'templates'::regclass
ORDER BY contype, conname;

-- 4. Vérifier TOUS les index existants (déjà fourni par l'utilisateur)
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'templates'
ORDER BY indexname;

-- 5. Vérifier spécifiquement si les colonnes clés existent
SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'templates' 
    AND column_name = 'slug'
  ) THEN 'EXISTS' ELSE 'MISSING' END AS slug_status,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'templates' 
    AND column_name = 'org_id'
  ) THEN 'EXISTS' ELSE 'MISSING' END AS org_id_status,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'templates' 
    AND column_name = 'organization_id'
  ) THEN 'EXISTS' ELSE 'MISSING' END AS organization_id_status,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'templates' 
    AND column_name = 'is_draft'
  ) THEN 'EXISTS' ELSE 'MISSING' END AS is_draft_status;

