-- Script de vérification des migrations Templates
-- À exécuter après avoir appliqué les migrations 0000 et 0005

-- ============================================================================
-- VÉRIFICATION 1: Colonnes requises existent
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
  AND column_name IN ('slug', 'tags', 'org_id', 'title', 'content', 'category')
ORDER BY column_name;

-- Résultat attendu:
-- - slug: VARCHAR(255), NOT NULL
-- - tags: JSONB, NOT NULL, DEFAULT '[]'
-- - org_id: TEXT, NOT NULL
-- - title, content, category: existent

-- ============================================================================
-- VÉRIFICATION 2: Contrainte unique composite (org_id, slug)
-- ============================================================================

SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'templates' 
  AND indexname = 'templates_org_id_slug_unique';

-- Résultat attendu:
-- - templates_org_id_slug_unique existe
-- - CREATE UNIQUE INDEX templates_org_id_slug_unique ON templates(org_id, slug)

-- ============================================================================
-- VÉRIFICATION 3: Ancienne contrainte unique sur slug seul supprimée
-- ============================================================================

SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'templates'::regclass
  AND contype = 'u'
  AND array_length(conkey, 1) = 1
  AND conkey[1] = (
    SELECT attnum
    FROM pg_attribute
    WHERE attrelid = 'templates'::regclass
      AND attname = 'slug'
  );

-- Résultat attendu:
-- - 0 lignes (aucune contrainte unique sur slug seul)

-- ============================================================================
-- VÉRIFICATION 4: Index mis à jour (org_id au lieu de organization_id)
-- ============================================================================

SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'templates'
  AND indexname IN ('templates_org_category_idx', 'templates_org_draft_idx')
ORDER BY indexname;

-- Résultat attendu:
-- - templates_org_category_idx utilise org_id (text), pas organization_id (uuid)
-- - templates_org_draft_idx utilise org_id (text), pas organization_id (uuid)

-- ============================================================================
-- VÉRIFICATION 5: Test de la contrainte unique composite
-- ============================================================================

-- Si la table n'est pas vide, vérifier qu'il n'y a pas de doublons (org_id, slug)
SELECT 
  org_id, 
  slug, 
  COUNT(*) as count
FROM templates
GROUP BY org_id, slug
HAVING COUNT(*) > 1;

-- Résultat attendu:
-- - 0 lignes (pas de doublons)

-- ============================================================================
-- RÉSUMÉ: Structure finale de la table
-- ============================================================================

SELECT 
  'Total colonnes' AS check_type,
  COUNT(*)::text AS result
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'templates'

UNION ALL

SELECT 
  'Colonnes requises présentes' AS check_type,
  CASE 
    WHEN COUNT(*) = 6 THEN 'OK'
    ELSE 'MANQUANTES: ' || (6 - COUNT(*))::text
  END AS result
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'templates'
  AND column_name IN ('id', 'org_id', 'title', 'slug', 'content', 'tags')

UNION ALL

SELECT 
  'Contrainte unique composite' AS check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'templates' 
      AND indexname = 'templates_org_id_slug_unique'
    ) THEN 'OK'
    ELSE 'MANQUANTE'
  END AS result;

