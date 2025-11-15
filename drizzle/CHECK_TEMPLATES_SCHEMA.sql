-- Script de vérification de la structure de la table templates
-- À exécuter pour diagnostiquer le problème de colonne manquante

-- 1. Vérifier si la table existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'templates'
) AS table_exists;

-- 2. Lister toutes les colonnes de la table templates (si elle existe)
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

-- 3. Vérifier les contraintes existantes
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'templates'::regclass;

-- 4. Vérifier les index existants
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'templates';

